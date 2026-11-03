// Background surface math (quality pass). Every scene background is drawn
// bottom-anchored with cover(): the artwork's bottom edge sits at the box
// bottom, its left edge at the box left, and cover() crops the top and the
// right. So a surface line lives at fixed fractions OF THE ARTWORK —
// fx from the left, fb above the bottom — and lands on the same drawn
// furniture at EVERY aspect ratio. Screen fractions drift (that's what the
// old slots did); artwork fractions don't.

export type BgKind = 'kitchenCheerful' | 'bedroom' | 'playground';

type Dims = { w: number; h: number };

// Pixel sizes of the variants pickRoomBackground actually returns for our
// two test shapes: landscape phones (aspect >= 1.95) get `phone`,
// landscape tablets get `universal`.
const DIMS: Record<BgKind, { phone: Dims; universal: Dims }> = {
  kitchenCheerful: {
    phone: { w: 2796, h: 1290 },
    universal: { w: 3840, h: 2160 },
  },
  bedroom: {
    phone: { w: 1280, h: 720 },
    universal: { w: 1920, h: 1080 },
  },
  playground: {
    phone: { w: 2796, h: 1290 },
    universal: { w: 3840, h: 2160 },
  },
};

/** Cover scale + artwork size for a bottom-anchored box of (boxW, boxH). */
export function bgCover(
  kind: BgKind,
  screenW: number,
  screenH: number,
  boxW: number,
  boxH: number,
): { s: number; imgW: number; imgH: number } {
  const v = screenW / screenH >= 1.95 ? DIMS[kind].phone : DIMS[kind].universal;
  return { s: Math.max(boxW / v.w, boxH / v.h), imgW: v.w, imgH: v.h };
}

/** Screen x (from left) of artwork fraction fx. Left-aligned: artwork
 * fractions past the box width are cropped, never squeezed. */
export function surfX(fx: number, imgW: number, s: number): number {
  return fx * imgW * s;
}

/** Screen y (from top) of a surface fb above the artwork bottom, when the
 * box bottom sits exactly on the screen bottom (both our background
 * renderers do this). */
export function surfTop(fb: number, imgH: number, s: number, screenH: number): number {
  return screenH - fb * imgH * s;
}
