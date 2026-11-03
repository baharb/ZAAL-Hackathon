from __future__ import annotations

import argparse
import io
import os
import re
import csv
import mimetypes
import struct
import sys
import threading
import time
import wave
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.etree import ElementTree as ET

from google import genai
from google.genai import types

DEFAULT_MODEL = "gemini-3.1-flash-tts-preview"
DEFAULT_VOICE = "Callirrhoe"
DEFAULT_SPEAKER = "Speaker 1"
XLSX_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
}

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except AttributeError:
    pass


@dataclass
class Row:
    file: str
    text: str
    voice: str
    speaker: str


def save_binary_file(file_name: Path, data: bytes) -> None:
    file_name.parent.mkdir(parents=True, exist_ok=True)
    file_name.write_bytes(data)
    print(f"File saved to: {file_name}")


def parse_audio_mime_type(mime_type: str) -> dict[str, int | None]:
    bits_per_sample = 16
    rate = 24000

    parts = mime_type.split(";")
    for param in parts:
        param = param.strip()
        if param.lower().startswith("rate="):
            try:
                rate = int(param.split("=", 1)[1])
            except (ValueError, IndexError):
                pass
        elif param.startswith("audio/L"):
            try:
                bits_per_sample = int(param.split("L", 1)[1])
            except (ValueError, IndexError):
                pass

    return {"bits_per_sample": bits_per_sample, "rate": rate}


def convert_to_wav(audio_data: bytes, mime_type: str) -> bytes:
    params = parse_audio_mime_type(mime_type)
    bits_per_sample = int(params["bits_per_sample"] or 16)
    sample_rate = int(params["rate"] or 24000)
    num_channels = 1
    data_size = len(audio_data)
    bytes_per_sample = bits_per_sample // 8
    block_align = num_channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    chunk_size = 36 + data_size

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,
        1,
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + audio_data


def audio_is_silent(audio_data: bytes, mime_type: str) -> bool:
    try:
        if mime_type.lower().startswith("audio/wav") or audio_data[:4] == b"RIFF":
            with wave.open(io.BytesIO(audio_data), "rb") as wf:
                frames = wf.readframes(wf.getnframes())
                if not frames:
                    return True
                sample_width = wf.getsampwidth()
                if sample_width != 2:
                    return False
                samples = struct.unpack("<" + "h" * (len(frames) // 2), frames[: len(frames) - (len(frames) % 2)])
        else:
            if len(audio_data) < 2:
                return True
            samples = struct.unpack("<" + "h" * (len(audio_data) // 2), audio_data[: len(audio_data) - (len(audio_data) % 2)])

        if not samples:
            return True
        peak = max(abs(s) for s in samples)
        rms = (sum(s * s for s in samples) / len(samples)) ** 0.5
        active_ratio = sum(1 for s in samples if abs(s) > 500) / len(samples)
        return peak < 600 or rms < 120 or active_ratio < 0.01
    except Exception:
        return False




def should_chunk_row(row: Row) -> bool:
    normalized = row.file.replace("\\", "/")
    return normalized.startswith("conversation/prompt/") or normalized.startswith("conversation/helper/")


def split_tts_text(text: str) -> list[str]:
    clean = " ".join(text.replace("\r", " ").replace("\n", " ").split())
    if len(clean) <= 42:
        return [clean]

    parts = [part.strip() for part in re.split(r"(?<=[.!\u061f?\u060c])\s+", clean) if part.strip()]
    if len(parts) <= 1:
        parts = [part.strip() for part in re.split(r"\s+(?=\u0648|\u06a9\u0647|\u0631\u0627|\u0628\u0647|\u0627\u0632|\u0628\u0627)", clean) if part.strip()]

    chunks: list[str] = []
    current = ""
    for part in parts:
        candidate = f"{current} {part}".strip()
        if current and len(candidate) > 48:
            chunks.append(current)
            current = part
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks or [clean]


def concatenate_wav_chunks(chunks: list[bytes], silence_ms: int = 120) -> bytes:
    if not chunks:
        raise ValueError("No WAV chunks to concatenate")

    params = None
    frames_out: list[bytes] = []
    silence = b""
    for index, data in enumerate(chunks):
        with wave.open(io.BytesIO(data), "rb") as wf:
            current_params = wf.getparams()
            if params is None:
                params = current_params
                silence_frames = int(wf.getframerate() * silence_ms / 1000)
                silence = b"\x00" * silence_frames * wf.getnchannels() * wf.getsampwidth()
            elif current_params[:3] != params[:3] or current_params.framerate != params.framerate:
                raise ValueError("Cannot concatenate WAV chunks with different audio formats")
            frames_out.append(wf.readframes(wf.getnframes()))
            if index < len(chunks) - 1:
                frames_out.append(silence)

    output = io.BytesIO()
    with wave.open(output, "wb") as out_wav:
        assert params is not None
        out_wav.setnchannels(params.nchannels)
        out_wav.setsampwidth(params.sampwidth)
        out_wav.setframerate(params.framerate)
        out_wav.writeframes(b"".join(frames_out))
    return output.getvalue()
def load_rows(csv_path: Path) -> list[Row]:
    raw_text = csv_path.read_text(encoding="utf-8-sig")
    sample = raw_text[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",	;")
        delimiter = dialect.delimiter
    except csv.Error:
        if "	" in sample and "," not in sample:
            delimiter = "	"

    reader = csv.DictReader(raw_text.splitlines(), delimiter=delimiter)
    if reader.fieldnames:
        reader.fieldnames = [header.lstrip("\ufeff" ).strip() for header in reader.fieldnames]
    required = {"file", "text"}
    missing = required - set(reader.fieldnames or [])
    if missing:
        raise ValueError(f"CSV is missing required column(s): {', '.join(sorted(missing))}")

    rows: list[Row] = []
    for idx, raw in enumerate(reader, start=2):
        file_name = (raw.get("file") or "").strip()
        text = (raw.get("text") or "").strip()
        voice = (raw.get("voice") or DEFAULT_VOICE).strip() or DEFAULT_VOICE
        speaker = (raw.get("speaker") or DEFAULT_SPEAKER).strip() or DEFAULT_SPEAKER

        if not file_name:
            raise ValueError(f"Row {idx}: missing file")
        if not text:
            raise ValueError(f"Row {idx}: missing text")

        rows.append(Row(file=file_name, text=text, voice=voice, speaker=speaker))
    return rows
def _cell_text_from_xml(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        inline_text = cell.find(".//main:t", XLSX_NS)
        return (inline_text.text or "") if inline_text is not None else ""

    value = cell.find("main:v", XLSX_NS)
    if value is None or value.text is None:
        return ""

    if cell_type == "s":
        try:
            return shared_strings[int(value.text)]
        except (ValueError, IndexError):
            return ""
    return value.text


def load_rows_xlsx(xlsx_path: Path) -> list[Row]:
    with zipfile.ZipFile(xlsx_path) as zf:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            shared_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("main:si", XLSX_NS):
                parts = []
                for text_node in item.findall(".//main:t", XLSX_NS):
                    parts.append(text_node.text or "")
                shared_strings.append("".join(parts))

        workbook_root = ET.fromstring(zf.read("xl/workbook.xml"))
        sheets = workbook_root.find("main:sheets", XLSX_NS)
        if sheets is None:
            raise ValueError("XLSX workbook has no sheets")

        first_sheet = sheets.find("main:sheet", XLSX_NS)
        if first_sheet is None:
            raise ValueError("XLSX workbook has no worksheet entries")

        rel_id = first_sheet.attrib.get(f"{{{XLSX_NS['rel']}}}id")
        if not rel_id:
            raise ValueError("XLSX workbook sheet is missing relationship id")

        rels_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        target = None
        for rel in rels_root.findall("pkg:Relationship", XLSX_NS):
            if rel.attrib.get("Id") == rel_id:
                target = rel.attrib.get("Target")
                break
        if not target:
            raise ValueError("Unable to resolve first worksheet in XLSX")

        sheet_path = target.lstrip("/").replace("\\", "/")
        if not sheet_path.startswith("xl/"):
            sheet_path = "xl/" + sheet_path
        sheet_root = ET.fromstring(zf.read(sheet_path))
        rows_xml = sheet_root.find("main:sheetData", XLSX_NS)
        if rows_xml is None:
            raise ValueError("XLSX worksheet has no data")

        table_rows: list[list[str]] = []
        for row in rows_xml.findall("main:row", XLSX_NS):
            values_by_col: dict[int, str] = {}
            max_col = 0
            for cell in row.findall("main:c", XLSX_NS):
                ref = cell.attrib.get("r", "")
                col_letters = "".join(ch for ch in ref if ch.isalpha())
                if not col_letters:
                    continue
                col_idx = 0
                for ch in col_letters:
                    col_idx = col_idx * 26 + (ord(ch.upper()) - 64)
                values_by_col[col_idx] = _cell_text_from_xml(cell, shared_strings)
                max_col = max(max_col, col_idx)
            if max_col:
                table_rows.append([values_by_col.get(i, "") for i in range(1, max_col + 1)])

    if not table_rows:
        raise ValueError("XLSX file contains no usable rows")

    headers = [header.strip().lstrip('\ufeff') for header in table_rows[0]]
    required = {"file", "text"}
    missing = required - set(headers)
    if missing:
        raise ValueError(f"XLSX is missing required column(s): {', '.join(sorted(missing))}")

    header_index = {name: idx for idx, name in enumerate(headers)}
    rows: list[Row] = []
    for idx, data in enumerate(table_rows[1:], start=2):
        file_idx = header_index["file"]
        text_idx = header_index["text"]
        voice_idx = header_index.get("voice")
        speaker_idx = header_index.get("speaker")

        file_name = (data[file_idx] if file_idx < len(data) else "").strip()
        text = (data[text_idx] if text_idx < len(data) else "").strip()
        voice = (data[voice_idx] if voice_idx is not None and voice_idx < len(data) else "").strip() or DEFAULT_VOICE
        speaker = (data[speaker_idx] if speaker_idx is not None and speaker_idx < len(data) else "").strip() or DEFAULT_SPEAKER

        if not file_name:
            raise ValueError(f"Row {idx}: missing file")
        if not text:
            raise ValueError(f"Row {idx}: missing text")
        rows.append(Row(file=file_name, text=text, voice=voice, speaker=speaker))
    return rows


def load_rows_from_input(input_path: Path) -> list[Row]:
    suffix = input_path.suffix.lower()
    if suffix == ".csv":
        return load_rows(input_path)
    if suffix == ".xlsx":
        return load_rows_xlsx(input_path)
    raise ValueError("Input must be a .csv or .xlsx file")



def build_config(voice_name: str, speaker_name: str) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        temperature=0.2,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            language_code="fa-IR",
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            ),
        ),
    )


def build_contents(text: str, speaker_name: str) -> list[types.Content]:
    clean_text = text.strip()
    return [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=clean_text)],
        )
    ]


def run_with_heartbeat(func, *args, label: str = "", heartbeat_seconds: float = 10.0, **kwargs):
    """Run func(*args, **kwargs) in a background thread, printing a periodic
    heartbeat while it's waiting so a slow-but-alive API call doesn't look
    identical to a genuine hang. The real safety net against an infinite
    hang is still the client's http_options timeout; this is purely so a
    person watching the terminal isn't tempted to Ctrl+C a call that's
    actually still in progress.
    """
    result_box: dict = {}
    error_box: dict = {}

    def _worker() -> None:
        try:
            result_box["value"] = func(*args, **kwargs)
        except BaseException as exc:  # re-raised on the calling thread below
            error_box["error"] = exc

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    waited = 0.0
    while thread.is_alive():
        thread.join(timeout=heartbeat_seconds)
        if thread.is_alive():
            waited += heartbeat_seconds
            suffix = f" for {label}" if label else ""
            print(f"  ... still waiting on the API{suffix} ({int(waited)}s so far - this is normal; it will error out on its own if truly stuck, no need to Ctrl+C)")

    if "error" in error_box:
        raise error_box["error"]
    return result_box.get("value")


def pick_audio_chunk(stream) -> tuple[bytes, str] | None:
    audio_parts: list[bytes] = []
    mime_type = "audio/L16;rate=24000"

    for chunk in stream:
        if not chunk.parts:
            continue
        for part in chunk.parts:
            if part.inline_data and part.inline_data.data:
                audio_parts.append(part.inline_data.data)
                if part.inline_data.mime_type:
                    mime_type = part.inline_data.mime_type
            elif chunk.text:
                print(chunk.text)

    if not audio_parts:
        return None
    return b"".join(audio_parts), mime_type


def output_path_for(row: Row, output_dir: Path, mime_type: str) -> Path:
    requested = Path(row.file)
    if requested.suffix:
        return output_dir / requested

    guessed = mimetypes.guess_extension(mime_type)
    if not guessed:
        guessed = ".wav"
    return output_dir / requested.with_suffix(guessed)


def get_gemini_api_keys() -> list[str]:
    api_keys: list = []
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if api_key:
        return [api_key]

    key_file = os.environ.get("GEMINI_API_KEY_FILE", "").strip()
    if key_file:
        key_path = Path(key_file).expanduser()
        if key_path.exists():
            key_text = key_path.read_text(encoding="utf-8")
            for line in key_text.splitlines():
                candidate = line.strip()
                if candidate:
                    api_keys.append(candidate)

    if api_keys:
        return api_keys
    raise RuntimeError(
        "Missing Gemini API key. Set GEMINI_API_KEY or GEMINI_API_KEY_FILE before running the generator."
    )


PERSIAN_LETTER_NAMES = {
    "alef": "\u0627\u0644\u0641",
    "be": "\u0628\u0650",
    "pe": "\u067e\u0650",
    "te": "\u062a\u0650",
    "se": "\u062b\u0650",
    "jim": "\u062c\u06cc\u0645",
    "che": "\u0686\u0650",
    "haa": "\u062d\u0650",
    "khe": "\u062e\u0650",
    "dal": "\u062f\u0627\u0644",
    "zal": "\u0630\u0627\u0644",
    "re": "\u0631\u0650",
    "ze": "\u0632\u0650",
    "zhe": "\u0698\u0650",
    "sin": "\u0633\u06cc\u0646",
    "shin": "\u0634\u06cc\u0646",
    "sad": "\u0635\u0627\u062f",
    "zad": "\u0636\u0627\u062f",
    "taa": "\u0637\u0627",
    "zaa": "\u0638\u0627",
    "eyn": "\u0639\u06cc\u0646",
    "gheyn": "\u063a\u06cc\u0646",
    "fe": "\u0641\u0650",
    "ghaf": "\u0642\u0627\u0641",
    "kaf": "\u06a9\u0627\u0641",
    "gaf": "\u06af\u0627\u0641",
    "lam": "\u0644\u0627\u0645",
    "mim": "\u0645\u06cc\u0645",
    "nun": "\u0646\u0648\u0646",
    "vav": "\u0648\u0627\u0648",
    "heh": "\u0647\u0650",
    "ye": "\u06cc\u0650",
}


def generate_rows(rows: list[Row], output_dir: Path, model: str, overwrite: bool = False, pause_seconds: float = 0.0, pending_path: Path | None = None) -> None:
    # A read timeout keeps a stalled/slow API response from hanging the
    # script forever; without it a stuck streaming call blocks indefinitely
    # and the only way out is Ctrl+C, which raises KeyboardInterrupt and
    # crashes past the retry/except logic below.
    client = genai.Client(
        api_key=get_gemini_api_keys()[0],
        http_options=types.HttpOptions(timeout=60_000),
    )
    api_keys = get_gemini_api_keys()
    print(f"Loaded {len(api_keys)} API key(s).")
    pending_rows: list[Row] = []

    def write_pending() -> None:
        if pending_path is None:
            return
        if pending_rows:
            pending_path.parent.mkdir(parents=True, exist_ok=True)
            with pending_path.open("w", encoding="utf-8-sig", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["file", "text", "voice", "speaker", "category"])
                for row in pending_rows:
                    writer.writerow([row.file, row.text, row.voice, row.speaker, ""])
            print(f"Queued {len(pending_rows)} row(s) for retry later: {pending_path}")
        elif pending_path.exists():
            pending_path.unlink()
            print(f"All queued rows completed; removed retry file: {pending_path}")

    # write_pending() runs in `finally` so that any crash or manual
    # interrupt (Ctrl+C) still saves the retry queue built up so far,
    # instead of silently losing track of which rows still need audio.
    try:
        _run_rows(rows, output_dir, model, overwrite, pause_seconds, client, pending_rows, api_keys, {"index": 0})
    finally:
        write_pending()


def _run_rows(rows: list[Row], output_dir: Path, model: str, overwrite: bool, pause_seconds: float, client, pending_rows: list[Row], api_keys: list | None = None, key_state: dict | None = None) -> None:
    for i, row in enumerate(rows, start=1):
        requested_path = Path(row.file)
        existing_path = output_dir / (requested_path if requested_path.suffix else requested_path.with_suffix(".wav"))
        replace_invalid_existing = False

        if existing_path.exists() and existing_path.stat().st_size > 0 and not overwrite:
            existing_mime = "audio/wav" if existing_path.suffix.lower() == ".wav" else "application/octet-stream"
            if not audio_is_silent(existing_path.read_bytes(), existing_mime):
                print(f"[{i}/{len(rows)}] Skipping existing file: {existing_path}")
                continue
            print(f"[{i}/{len(rows)}] Existing file is silent; regenerating {row.file} ...")
            replace_invalid_existing = True

        config = build_config(row.voice, row.speaker)
        contents = build_contents(row.text, row.speaker)
        out_path: Path | None = None
        rate_limit_attempts = 0
        server_error_attempts = 0

        while True:
            try:
                print(f"[{i}/{len(rows)}] Generating {row.file} ...")
                chunks = split_tts_text(row.text) if should_chunk_row(row) else [row.text.strip()]
                if len(chunks) > 1:
                    print(f"Splitting {row.file} into {len(chunks)} short TTS chunk(s).")
                    wav_chunks: list[bytes] = []
                    for chunk_index, chunk_text in enumerate(chunks, start=1):
                        print(f"  chunk {chunk_index}/{len(chunks)}: {chunk_text}")
                        stream = client.models.generate_content_stream(
                            model=model,
                            contents=build_contents(chunk_text, row.speaker),
                            config=config,
                        )
                        chunk_result = run_with_heartbeat(pick_audio_chunk, stream, label=row.file)
                        if chunk_result is None:
                            result = None
                            break
                        chunk_audio, chunk_mime = chunk_result
                        if not chunk_mime.lower().startswith("audio/wav"):
                            chunk_audio = convert_to_wav(chunk_audio, chunk_mime)
                            chunk_mime = "audio/wav"
                        if audio_is_silent(chunk_audio, chunk_mime):
                            result = None
                            break
                        wav_chunks.append(chunk_audio)
                    else:
                        result = (concatenate_wav_chunks(wav_chunks), "audio/wav")
                else:
                    stream = client.models.generate_content_stream(
                        model=model,
                        contents=contents,
                        config=config,
                    )
                    result = run_with_heartbeat(pick_audio_chunk, stream, label=row.file)
                if result is None:
                    fallbacks = []
                    short_text = row.text.strip()
                    if len(short_text) <= 2:
                        letter_id = Path(row.file).name
                        fallbacks.append(PERSIAN_LETTER_NAMES.get(letter_id, short_text))
                    else:
                        fallbacks.extend([
                            f"\u0644\u0637\u0641\u0627\u064b \u0641\u0642\u0637 \u0647\u0645\u06cc\u0646 \u0645\u062a\u0646 \u0631\u0627 \u0628\u062e\u0648\u0627\u0646: {short_text}",
                            f"\u0641\u0642\u0637 \u0627\u06cc\u0646 \u0645\u062a\u0646 \u0631\u0627 \u0628\u062e\u0648\u0627\u0646: {short_text}",
                        ])

                    for fallback_text in fallbacks:
                        print(f"No audio for {row.file}; retrying with fallback prompt: {fallback_text}")
                        fallback_contents = build_contents(fallback_text, row.speaker)
                        stream = client.models.generate_content_stream(
                            model=model,
                            contents=fallback_contents,
                            config=config,
                        )
                        result = run_with_heartbeat(pick_audio_chunk, stream, label=row.file)
                        if result is not None:
                            break

                    if result is None:
                        print(f"No audio returned for {row.file}; queuing this row for retry later.")
                        pending_rows.append(row)
                        break

                audio_data, mime_type = result
                out_path = output_path_for(row, output_dir, mime_type)
                if out_path.suffix.lower() != ".wav" and out_path.suffix == "":
                    out_path = out_path.with_suffix(mimetypes.guess_extension(mime_type) or ".wav")

                if out_path.suffix.lower() == ".wav" and not mime_type.lower().startswith("audio/wav"):
                    audio_data = convert_to_wav(audio_data, mime_type)
                    mime_type = "audio/wav"

                if audio_is_silent(audio_data, mime_type):
                    print(f"Silent audio for {row.file}; queuing this row for retry later.")
                    pending_rows.append(row)
                    break

                if out_path.exists() and out_path.stat().st_size > 0 and not overwrite and not replace_invalid_existing:
                    print(f"Skipping existing file: {out_path}")
                else:
                    save_binary_file(out_path, audio_data)
                break
            except Exception as exc:
                msg = str(exc)
                if 'RESOURCE_EXHAUSTED' in msg or '429' in msg:
                    rate_limit_attempts += 1
                    if key_state is not None and api_keys and key_state["index"] + 1 < len(api_keys):
                        key_state["index"] += 1
                        client = genai.Client(api_key=api_keys[key_state["index"]], http_options=types.HttpOptions(timeout=60_000))
                        print(f"Rate limit hit; switching to key {key_state['index'] + 1}/{len(api_keys)} and retrying {row.file} ...")
                        continue
                    retry_match = re.search(r"retryDelay': '([0-9]+)s'", msg)
                    retry_seconds = int(retry_match.group(1)) + 2 if retry_match else 0
                    if retry_seconds > 0:
                        print(f"Rate limit hit for {row.file}; retry suggested after {retry_seconds}s. Queuing this row for retry later.")
                    else:
                        print(f"Rate limit hit for {row.file}; queuing this row for retry later.")
                    pending_rows.append(row)
                    break
                if '500' in msg or 'INTERNAL' in msg:
                    server_error_attempts += 1
                    if server_error_attempts <= 2:
                        wait_seconds = 2 * server_error_attempts
                        print(f"Server error for {row.file}; retrying in {wait_seconds}s ({server_error_attempts}/2).")
                        time.sleep(wait_seconds)
                        continue
                    print(f"Server error for {row.file}; queuing this row for retry later.")
                    pending_rows.append(row)
                    break
                print(f"Error for {row.file}: {exc}")
                print(f"Queuing {row.file} for retry later and continuing.")
                pending_rows.append(row)
                break

        if pause_seconds > 0 and i < len(rows):
            time.sleep(pause_seconds)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate batch Persian speech files from a CSV or XLSX using Gemini TTS.")
    parser.add_argument("--input", required=True, help="Path to CSV or XLSX with columns: file,text[,voice,speaker,category]")
    parser.add_argument("--out", default=".", help="Output directory for generated files")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini speech model")
    parser.add_argument("--limit", type=int, default=0, help="Optional maximum number of rows to generate")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing output files")
    parser.add_argument("--pause-seconds", type=float, default=0.0, help="Pause between rows to reduce rate limits")
    parser.add_argument("--pending-out", default="", help="Optional CSV path for rows that need retry later")
    args = parser.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    output_dir = Path(args.out).expanduser().resolve()
    rows = load_rows_from_input(input_path)
    if args.limit and args.limit > 0:
        rows = rows[: args.limit]
    if args.pending_out:
        pending_path = Path(args.pending_out).expanduser().resolve()
    elif input_path.name.endswith('.pending.csv'):
        pending_path = input_path
    else:
        pending_path = input_path.with_name(f"{input_path.stem}.pending.csv")

    generate_rows(rows, output_dir, args.model, overwrite=args.overwrite, pause_seconds=args.pause_seconds, pending_path=pending_path)


if __name__ == "__main__":
    main()




