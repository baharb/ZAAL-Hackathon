// Finger-drawing -> PNG (base64), with zero dependencies.
//
// The app has no screenshot/canvas library (and none can be installed
// from here), so the drawing is rasterized by hand: thick round strokes
// stamped onto a white RGB buffer, then encoded as a real PNG. The PNG
// uses stored (uncompressed) DEFLATE blocks — bigger bytes, but no
// compression library needed, and every decoder on earth reads them.
// A 384px export is ~440 KB raw (~590 KB base64), well under the Edge
// Function's 6 MB cap.

export type DrawPoint = { x: number; y: number };
export type DrawStroke = {
  /** Points normalized 0..1 across the (square) paper. */
  points: DrawPoint[];
  /** '#rrggbb' or '#rgb'. Anything else draws black. */
  color: string;
  /** Line thickness as a fraction of the paper side (e.g. 0.035). */
  width: number;
};

function parseColor(color: string): [number, number, number] {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (m) {
    const v = parseInt(m[1]!, 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const s = /^#([0-9a-fA-F]{3})$/.exec(color);
  if (s) {
    const v = s[1]!;
    return [parseInt(v[0]! + v[0]!, 16), parseInt(v[1]! + v[1]!, 16), parseInt(v[2]! + v[2]!, 16)];
  }
  return [20, 20, 60];
}

// CRC-32 (IEEE) over the chunk type + data — what PNG decoders check.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: number[]): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: number[]): number {
  let a = 1;
  let b = 0;
  for (const v of bytes) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  return (((b << 16) | a) >>> 0);
}

function u32be(v: number): number[] {
  return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
}

function u16le(v: number): number[] {
  return [v & 255, (v >>> 8) & 255];
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >>> 18) & 63]! + B64[(n >>> 12) & 63]!;
    out += i + 1 < bytes.length ? B64[(n >>> 6) & 63]! : '=';
    out += i + 2 < bytes.length ? B64[n & 63]! : '=';
  }
  return out;
}

function chunk(type: string, data: number[]): number[] {
  const typeBytes = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)];
  const crc = crc32([...typeBytes, ...data]);
  return [...u32be(data.length), ...typeBytes, ...data, ...u32be(crc)];
}

/** Rasterize strokes onto a white square and return a base64 PNG (no data: prefix). */
export function drawingToPngBase64(strokes: DrawStroke[], size = 384): string {
  const S = Math.max(64, Math.min(1024, Math.floor(size)));
  const px = new Uint8Array(S * S * 3).fill(255);

  const set = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const o = (y * S + x) * 3;
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
  };

  const stamp = (cx: number, cy: number, rad: number, r: number, g: number, b: number) => {
    const rr = Math.max(0.5, rad);
    const x0 = Math.max(0, Math.floor(cx - rr));
    const x1 = Math.min(S - 1, Math.ceil(cx + rr));
    const y0 = Math.max(0, Math.floor(cy - rr));
    const y1 = Math.min(S - 1, Math.ceil(cy + rr));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rr * rr) set(x, y, r, g, b);
      }
    }
  };

  for (const st of strokes) {
    if (!st.points || st.points.length === 0) continue;
    const [r, g, b] = parseColor(st.color);
    const rad = Math.max(1, ((st.width > 0 ? st.width : 0.03) * S) / 2);
    const pts = st.points.map(p => ({
      x: Math.min(1, Math.max(0, p.x)) * (S - 1),
      y: Math.min(1, Math.max(0, p.y)) * (S - 1),
    }));
    if (pts.length === 1) {
      stamp(pts[0]!.x, pts[0]!.y, rad, r, g, b);
      continue;
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!;
      const c = pts[i + 1]!;
      const dist = Math.hypot(c.x - a.x, c.y - a.y);
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, rad / 2)));
      for (let sIdx = 0; sIdx <= steps; sIdx++) {
        const t = sIdx / steps;
        stamp(a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, rad, r, g, b);
      }
    }
  }

  // Raw zlib stream: header + stored blocks + adler32. One stored block
  // holds whole scanlines (scanline = 1 filter byte + 3*S pixels).
  const rowLen = 1 + S * 3;
  const zlib: number[] = [0x78, 0x01];
  const adlerBytes: number[] = [];
  let block: number[] = [];
  const flushBlock = (final: boolean) => {
    zlib.push(final ? 0x01 : 0x00);
    zlib.push(...u16le(block.length), ...u16le(0xffff ^ block.length), ...block);
    block = [];
  };
  for (let y = 0; y < S; y++) {
    const row = [0];
    for (let x = 0; x < S; x++) {
      const o = (y * S + x) * 3;
      row.push(px[o]!, px[o + 1]!, px[o + 2]!);
    }
    adlerBytes.push(...row);
    if (block.length + row.length > 65535) flushBlock(false);
    block.push(...row);
  }
  flushBlock(true);
  const adler = adler32(adlerBytes);

  const png: number[] = [137, 80, 78, 71, 13, 10, 26, 10];
  png.push(...chunk('IHDR', [...u32be(S), ...u32be(S), 8, 2, 0, 0, 0]));
  png.push(...chunk('IDAT', [...zlib, ...u32be(adler)]));
  png.push(...chunk('IEND', []));
  return base64Encode(png);
}
