# Runs the app's Gemini voice generator with a different temperature (the app script hard-codes 0.2).
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "scripts"))  # the app's generator
import generate_gemini_voice_pack as g
from google.genai import types

TEMP = float(os.environ.get("TTS_TEMP", "0.8"))
def build_config(voice_name, speaker_name):
    return types.GenerateContentConfig(
        temperature=TEMP,
        response_modalities=["audio"],
        speech_config=types.SpeechConfig(
            language_code="fa-IR",
            voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)),
        ),
    )
g.build_config = build_config
if __name__ == "__main__":
    g.main()
