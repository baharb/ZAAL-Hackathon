# Makes Neli's grandma from Neli's own art: silver curls, a longer berry dress, round glasses, pearls.
# Works on the 2x art so the edges stay clean, then saves grandma.png (1254px, like Neli's base art),
# grandma@2x.png, grandma_head.png (for round avatars) and grandma_preview.jpg (Neli and grandma side by side).
# All coordinates below are in the 1254px frame and scaled by K.
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
NELI = os.path.join(HERE, '../../../assets/neli-world/characters/Neli/')
src = Image.open(NELI + '01_base_standing@2x.png').convert('RGBA')
K = src.width / 1254
im = np.array(src).astype(float) / 255
H, W = im.shape[:2]
rgb, a = im[..., :3], im[..., 3]
mx, mn = rgb.max(-1), rgb.min(-1)
d = np.maximum(mx - mn, 1e-6)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
hue = np.select([mx == rgb[..., 0], mx == rgb[..., 1]],
                [((rgb[..., 1] - rgb[..., 2]) / d) % 6, (rgb[..., 2] - rgb[..., 0]) / d + 2],
                (rgb[..., 0] - rgb[..., 1]) / d + 4) / 6
hue = np.where(mx > mn, hue, 0)
yy, xx = np.mgrid[0:H, 0:W] / K
lum = rgb @ [0.299, 0.587, 0.114]

def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([(x * K, y * K) for x, y in pts], fill=255)
    return np.array(m) > 0
near = lambda cx, cy, r: (xx - cx) ** 2 + (yy - cy) ** 2 < r * r
soften = lambda m, r: np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r * K))) / 255

# --- hair: silver curls ---------------------------------------------------------------
face_bits = near(636, 552, 60) | near(636, 640, 90)                                 # nose, mouth
# the ears, traced from Neli's art: the pink inside stays pink, the skin around it stays skin
INNER_L = [(425, 220), (442, 220), (518, 312), (420, 378), (408, 300)]
INNER_R = [(826, 203), (840, 203), (852, 300), (840, 354), (770, 314), (774, 280)]
OUTER_L = [(398, 178), (432, 182), (542, 280), (532, 402), (370, 402), (372, 228)]
OUTER_R = [(820, 166), (844, 166), (894, 250), (894, 386), (718, 386), (722, 266)]
ears = (poly(INNER_L) | poly(INNER_R)) & ((hue > 0.85) | (hue < 0.03)) & (sat > 0.2)
face = ((xx - 632) / 262) ** 2 + ((yy - 505) / 222) ** 2 < 1                         # Neli's round face
near_face = (((xx - 632) / 314) ** 2 + ((yy - 505) / 266) ** 2 < 1)     | poly(OUTER_L) | poly(OUTER_R)
skin = (((hue > 0.015) & (hue < 0.08) & (sat < 0.5)) | (sat < 0.06)) & (mx > 0.82) & near_face        # peachy skin and its pale highlights: ear rims, face edge
hair = (a > 0.02) & (yy < 720) & ~ears & ~face_bits & ~skin & (~face | ((sat > 0.42) & (mx > 0.3)))   # not the dark eyes
hair = soften(hair, 0.8)
l = ((lum - 0.25) / 0.7).clip(0, 1)
silver = np.stack([0.74 + 0.25 * l, 0.72 + 0.26 * l, 0.82 + 0.17 * l], -1)        # soft silver with a hint of lilac
rgb = rgb * (1 - hair[..., None]) + silver * hair[..., None]

# --- dress: purple -> berry, and longer ------------------------------------------------
dress = (yy > 690) & (hue > 0.70) & (hue < 0.86) & (sat > 0.25) & (a > 0.02)
berry = np.array([0.80, 0.25, 0.45])
shade = (lum / 0.45).clip(0.45, 1.35)[..., None]
dm = soften(dress, 0.6)[..., None]
rgb = rgb * (1 - dm) + (berry * shade).clip(0, 1) * dm

out = Image.fromarray((np.dstack([rgb, a]) * 255).round().astype(np.uint8), 'RGBA')

# the longer skirt: continue the dress below its hem, flaring a little, with rounded corners
CUT, LONGER, FLARE = 1030, 105, 16
row = np.array(out)[int(CUT * K)]
xs = np.where(row[:, 3] > 200)[0]
inside = [x for x in xs if 477 * K - 4 < x < 795 * K + 4]
x0, x1 = min(inside), max(inside)
skirt = Image.new('RGBA', out.size, (0, 0, 0, 0))
px = skirt.load()
y0, y1 = int(CUT * K), int((CUT + LONGER) * K)
for y in range(y0, y1):
    f = (y - y0) / (y1 - y0)
    l0, r0 = x0 - FLARE * K * f, x1 + FLARE * K * f
    for x in range(int(l0), int(r0) + 1):
        src_x = int(x0 + (x - l0) / (r0 - l0) * (x1 - x0))       # keep the dress's side-to-side shading
        c = row[min(max(src_x, x0), x1)]
        dk = 1 - 0.10 * f                                        # a touch darker towards the hem
        px[x, y] = (int(c[0] * dk), int(c[1] * dk), int(c[2] * dk), 255)
mask = Image.new('L', out.size, 0)                               # rounded bottom corners
ImageDraw.Draw(mask).rounded_rectangle([x0 - FLARE * K - 2, y0, x1 + FLARE * K + 2, y1], radius=int(26 * K), fill=255)
ImageDraw.Draw(mask).rectangle([x0 - FLARE * K - 2, y0, x1 + FLARE * K + 2, y0 + 40 * K], fill=255)
skirt.putalpha(Image.fromarray(np.minimum(np.array(skirt)[..., 3], np.array(mask.filter(ImageFilter.GaussianBlur(1.2))))))
out.alpha_composite(skirt)

# --- glasses and pearls, drawn at 4x of this frame and scaled down for smooth lines -------
S = 4
ov = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
dr = ImageDraw.Draw(ov)
P = lambda v: v * K * S
frame = (96, 46, 38, 255)
R, LW, EY, NOSE = 100, 14, 508, 636   # NOSE: the bridge sits right above the nose
for cx in (NOSE - 119, NOSE + 119):
    dr.ellipse([P(cx - R), P(EY - R), P(cx + R), P(EY + R)], fill=(255, 255, 255, 22), outline=frame, width=int(P(LW)))
    dr.arc([P(cx - R + 26), P(EY - R + 26), P(cx + R - 26), P(EY + R - 26)], 205, 245, fill=(255, 255, 255, 170), width=int(P(7)))   # glint
dr.arc([P(NOSE - 41), P(EY - 22), P(NOSE + 41), P(EY + 36)], 205, 335, fill=frame, width=int(P(LW)))                                 # bridge
dr.line([P(NOSE - 219), P(EY - 8), P(NOSE - 257), P(EY - 30)], fill=frame, width=int(P(LW)))                                                     # arms
dr.line([P(NOSE + 219), P(EY - 8), P(NOSE + 257), P(EY - 30)], fill=frame, width=int(P(LW)))
for i in range(13):                                                                                                                 # pearls
    tt = i / 12
    x, y, r = 556 + 168 * tt, 728 + 34 * np.sin(np.pi * tt), 12.5
    dr.ellipse([P(x - r), P(y - r), P(x + r), P(y + r)], fill=(255, 251, 246, 255), outline=(222, 204, 198, 255), width=int(P(1.6)))
    dr.ellipse([P(x - 6), P(y - 7), P(x - 1), P(y - 2)], fill=(255, 255, 255, 255))
out.alpha_composite(ov.resize((W, H), Image.LANCZOS))

out.save(os.path.join(HERE, 'grandma@2x.png'))
small = out.resize((1254, 1254), Image.LANCZOS)
small.save(os.path.join(HERE, 'grandma.png'))
small.crop((137, 0, 1127, 990)).resize((600, 600), Image.LANCZOS).save(os.path.join(HERE, 'grandma_head.png'))

neli = Image.open(NELI + '01_base_standing.webp').convert('RGBA')
pv = Image.new('RGBA', (2508, 1254), (255, 155, 133, 255))
pv.alpha_composite(neli, (0, 0)); pv.alpha_composite(small, (1254, 0))
pv.convert('RGB').resize((1254, 627), Image.LANCZOS).save(os.path.join(HERE, 'grandma_preview.jpg'), quality=90)
print('ok')
