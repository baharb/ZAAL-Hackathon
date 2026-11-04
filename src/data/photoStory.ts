// Magic Story PHOTO + DRAWING pipeline — pure data and gates (no React
// Native imports, so scripts/test-photo-story.mjs can check them in Node).
// Photo/drawing → Spark finds things → Muse Image makes each a character →
// buddy + ALL cartoon items auto-start one 4-page story at one fixed
// location → one referenced picture per page. Every page names its own
// cast; every cast member appears at least once; only cast members appear.
import { STORY_BANNED } from './magicStory';

export type FoundThing = { fa: string; en: string; look: string };

export const PHOTO_LOCATIONS = [
  { id: 'garden', en: 'garden', fa: 'باغ' },
  { id: 'beach', en: 'beach', fa: 'ساحل' },
  { id: 'park', en: 'park', fa: 'پارک' },
  { id: 'kitchen', en: 'kitchen', fa: 'آشپزخونه' },
  { id: 'forest picnic', en: 'forest picnic', fa: 'پیک‌نیک تو جنگل' },
  { id: 'snowy hill', en: 'snowy hill', fa: 'تپه‌ی برفی' },
] as const;
export type PhotoLocation = (typeof PHOTO_LOCATIONS)[number];
export type PhotoLocationId = PhotoLocation['id'];

export type PhotoStoryPage = { text: string; scene: string; cast: string[] };
export type PhotoStory = { title: string; pages: PhotoStoryPage[] };

const BANNED_LOOK = ['scary', 'sad', 'dead', 'blood', 'monster', 'gun', 'knife'];

/** STEP 1 gate: clean Spark's thing list — simple names, no people/faces
 * (the prompt asks for objects or drawn things only). Null when nothing is
 * left, so the child is asked for another photo or drawing. */
export function cleanFoundThings(items: unknown, max = 4): FoundThing[] | null {
  if (!Array.isArray(items)) return null;
  const out: FoundThing[] = [];
  for (const raw of items) {
    const it = raw as { fa?: unknown; en?: unknown; look?: unknown };
    const fa = typeof it?.fa === 'string' ? it.fa.trim() : '';
    const en = typeof it?.en === 'string' ? it.en.trim().toLowerCase() : '';
    const look = typeof it?.look === 'string' ? it.look.trim().toLowerCase() : '';
    if (!fa || fa.length > 14 || fa.split(/\s+/).length > 3) continue;
    if (!/^[a-z][a-z ]{1,24}$/.test(en)) continue;
    if (!/^[a-z0-9 ,'-]{4,90}$/.test(look)) continue;
    const blob = `${fa} ${en} ${look}`;
    if (STORY_BANNED.some(w => blob.includes(w)) || BANNED_LOOK.some(w => blob.includes(w))) continue;
    if (/person|people|man|woman|boy|girl|face|human/.test(en)) continue;
    if (out.some(o => o.en === en)) continue;
    out.push({ fa, en, look });
    if (out.length >= max) break;
  }
  return out.length > 0 ? out : null;
}

/** STEP 4 gate: title + the SAME location + exactly 4 clean pages, each
 * naming only cast members in "cast", with every member covered at least
 * once. Null means retry once, then a hand-written fallback. */
export function validPhotoStory(
  parsed: Record<string, unknown> | null,
  location: PhotoLocation,
  castNames: string[],
): PhotoStory | null {
  if (!parsed) return null;
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  if (!title || title.length > 60 || STORY_BANNED.some(w => title.includes(w))) return null;
  if (parsed.location !== location.en) return null;
  const pages = Array.isArray(parsed.pages) ? parsed.pages : null;
  if (!pages || pages.length !== 4) return null;
  const names = castNames.map(n => n.trim()).filter(Boolean);
  if (names.length === 0) return null;
  const covered = new Set<string>();
  const out: PhotoStoryPage[] = [];
  for (const raw of pages) {
    const p = raw as { text?: unknown; scene?: unknown; cast?: unknown };
    const text = typeof p?.text === 'string' ? p.text.trim() : '';
    const scene = typeof p?.scene === 'string' ? p.scene.trim() : '';
    const words = text.split(/\s+/).filter(Boolean).length;
    if (!text || words < 3 || words > 14) return null;
    if (STORY_BANNED.some(w => text.includes(w))) return null;
    if (!/^[ -~]{8,200}$/.test(scene)) return null;
    const cast = Array.isArray(p?.cast) ? p.cast : null;
    if (!cast || cast.length === 0) return null;
    const clean: string[] = [];
    for (const c of cast) {
      if (typeof c !== 'string') return null;
      const name = c.trim();
      if (!names.includes(name)) return null;
      if (!clean.includes(name)) clean.push(name);
      covered.add(name);
    }
    out.push({ text, scene, cast: clean });
  }
  if (!names.every(n => covered.has(n))) return null;
  return { title, pages: out };
}

export type FallbackNames = { buddy: string; items: string[]; place: string };

// Five hand-written safety nets at the model level (4 mom-told pages
// each: problem, dialogue, clever fix together, feeling, happy end).
// Only the buddy and the found items ever appear. Used only when the
// model fails twice — the child always gets a real story, never an error.
const FALLBACK_TEMPLATES: ((n: { buddy: string; a: string; c: string; d: string; place: string }) => PhotoStory)[] = [
  n => ({
    title: `پیدا شد!`,
    pages: [
      { text: `${n.buddy} و ${n.a} توی ${n.place} بازی می‌کردن و می‌خندیدن.`, scene: 'Two cute friends play and laugh together', cast: [n.buddy, n.a] },
      { text: `یهو ${n.c} گم شد و هیچ‌جا پیداش نکردن.`, scene: 'One friend is lost and cannot be found', cast: [n.buddy, n.c] },
      { text: `${n.buddy} گفت: «نگران نباش، با هم پیداش می‌کنیم!»`, scene: 'One friend cheers the other up and they search together', cast: [n.buddy, n.d] },
      { text: `${n.d} پیدا شد و هر دو ذوق کردن و خندیدن.`, scene: 'The lost friend is found and both cheer happily', cast: [n.buddy, n.a] },
    ],
  }),
  n => ({
    title: `بازی با دوست تازه`,
    pages: [
      { text: `${n.buddy} و ${n.a} رفتن توی ${n.place} قدم بزنن.`, scene: 'Two cute friends walk together outside', cast: [n.buddy, n.a] },
      { text: `سر راه ${n.c} رو دیدن و بهش سلام کردن.`, scene: 'They meet another friend on the way and say hello', cast: [n.buddy, n.c] },
      { text: `${n.d} گفت: «بیا با ما بازی کن!»`, scene: 'The new friend invites everyone to play', cast: [n.buddy, n.d] },
      { text: `همه با هم بازی کردن و حسابی خوشحال شدن.`, scene: 'Everyone plays together, happy and laughing', cast: [n.buddy, n.a] },
    ],
  }),
  n => ({
    title: `بارون تابستونی`,
    pages: [
      { text: `${n.buddy} و ${n.a} داشتن توی ${n.place} بازی می‌کردن.`, scene: 'Two cute friends play together outside', cast: [n.buddy, n.a] },
      { text: `یهو بارون اومد و ${n.c} خیس شد.`, scene: 'Sudden rain starts and one friend gets wet', cast: [n.buddy, n.c] },
      { text: `${n.d} گفت: «بدو بریم زیر سایه‌بان!»`, scene: 'One friend points to a shelter and they run there', cast: [n.buddy, n.d] },
      { text: `بارون بند اومد و همه ذوق کردن و خندیدن.`, scene: 'The rain stops and everyone cheers happily', cast: [n.buddy, n.a] },
    ],
  }),
  n => ({
    title: `پیک‌نیک کوچولو`,
    pages: [
      { text: `${n.buddy} و ${n.a} توی ${n.place} پیک‌نیک گرفتن.`, scene: 'Two cute friends have a little picnic', cast: [n.buddy, n.a] },
      { text: `${n.c} رو هم آوردن و گذاشتن روی سفره.`, scene: 'They bring another friend to the picnic cloth', cast: [n.buddy, n.c] },
      { text: `${n.buddy} گفت: «چه پیک‌نیک قشنگی شد!»`, scene: 'One friend admires the pretty picnic', cast: [n.buddy, n.d] },
      { text: `همه با هم خوردن و حسابی خوشحال شدن.`, scene: 'Everyone eats together, happy and laughing', cast: [n.buddy, n.a] },
    ],
  }),
  n => ({
    title: `قایم‌موشک`,
    pages: [
      { text: `${n.buddy} و ${n.a} توی ${n.place} قایم‌موشک بازی می‌کردن.`, scene: 'Two cute friends play hide and seek', cast: [n.buddy, n.a] },
      { text: `${n.c} پشت یه چیز قایم شد و ساکت موند.`, scene: 'One friend hides quietly behind something', cast: [n.buddy, n.c] },
      { text: `${n.d} گفت: «پیدات کردم!» و همه خندیدن.`, scene: 'The hider is found and everyone laughs', cast: [n.buddy, n.d] },
      { text: `بعد نوبت ${n.a} شد و هر دو ذوق کردن.`, scene: 'They swap roles and play again, excited', cast: [n.buddy, n.a] },
    ],
  }),
];

export function fallbackPhotoStory(names: FallbackNames, salt = 0): PhotoStory {
  const items = names.items.filter(i => i && i.trim().length > 0);
  const a = items[0] ?? names.buddy;
  const c = items[1] ?? a;
  const d = items[2] ?? a;
  return FALLBACK_TEMPLATES[salt % FALLBACK_TEMPLATES.length]!({
    buddy: names.buddy,
    a,
    c,
    d,
    place: names.place,
  });
}
