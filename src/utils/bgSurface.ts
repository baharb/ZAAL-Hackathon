// Background surface math (quality pass). Every scene background is drawn
// bottom-anchored with cover(): the box bottom sits on the screen bottom
// and React Native centers the artwork inside the box, so any overflow is
// cropped SYMMETRICALLY (never left-aligned). A surface line lives at fixed
// fractions OF THE ARTWORK — fx from the left, fb above the bottom — minus
// the centering offsets, and lands on the same drawn furniture at EVERY
// aspect ratio. Screen fractions drift (that's what the old slots did);
// artwork fractions don't.

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

/** Cover scale + artwork size for a bottom-anchored box of (boxW, boxH),
 * plus the centering offsets: cover() centers, so half the overflow hides
 * on each side (offX), and half of any vertical overflow hides below the
 * box bottom (offYBelow). In all our scenes the box is taller than the art
 * (box aspect < art aspect), so height binds and offYBelow is 0. */
export function bgCover(
  kind: BgKind,
  screenW: number,
  screenH: number,
  boxW: number,
  boxH: number,
): { s: number; imgW: number; imgH: number; offX: number; offYBelow: number } {
  const v = screenW / screenH >= 1.95 ? DIMS[kind].phone : DIMS[kind].universal;
  const s = Math.max(boxW / v.w, boxH / v.h);
  return {
    s,
    imgW: v.w,
    imgH: v.h,
    offX: Math.max(0, (v.w * s - boxW) / 2),
    offYBelow: Math.max(0, (v.h * s - boxH) / 2),
  };
}

/** Screen x (from left) of artwork fraction fx, minus the centered crop. */
export function surfX(fx: number, imgW: number, s: number, offX = 0): number {
  return fx * imgW * s - offX;
}

/** Screen y (from top) of a surface fb above the artwork bottom, when the
 * box bottom sits exactly on the screen bottom (both our background
 * renderers do this). */
export function surfTop(fb: number, imgH: number, s: number, screenH: number, offYBelow = 0): number {
  return screenH + offYBelow - fb * imgH * s;
}
