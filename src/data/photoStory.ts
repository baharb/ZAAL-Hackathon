// Magic Story PHOTO pipeline — pure data and gates (no React Native
// imports, so scripts/test-photo-story.mjs can check them in Node).
// Photo → Spark finds things → Muse Image makes each a character →
// child picks ONE hero → + one random buddy → one 6-page story at one
// fixed location → one referenced picture per page.
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

export type PhotoStoryPage = { text: string; scene: string };
export type PhotoStory = { title: string; pages: PhotoStoryPage[] };

const BANNED_LOOK = ['scary', 'sad', 'dead', 'blood', 'monster', 'gun', 'knife'];

/** STEP 1 gate: clean Spark's thing list — max 4, simple names, no
 * people/faces (the prompt asks for objects only; anything with a banned
 * word, a long name, or a duplicate is dropped). Null when nothing is
 * left, so the child is asked for another photo. */
export function cleanFoundThings(items: unknown): FoundThing[] | null {
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
    if (out.length >= 4) break;
  }
  return out.length > 0 ? out : null;
}

/** STEP 4 gate: title + the SAME location + exactly 6 clean pages, or
 * null (the caller retries once, then uses a hand-written fallback). */
export function validPhotoStory(parsed: Record<string, unknown> | null, location: PhotoLocation): PhotoStory | null {
  if (!parsed) return null;
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  if (!title || title.length > 60 || STORY_BANNED.some(w => title.includes(w))) return null;
  if (parsed.location !== location.en) return null;
  const pages = Array.isArray(parsed.pages) ? parsed.pages : null;
  if (!pages || pages.length !== 6) return null;
  const out: PhotoStoryPage[] = [];
  for (const raw of pages) {
    const p = raw as { text?: unknown; scene?: unknown };
    const text = typeof p?.text === 'string' ? p.text.trim() : '';
    const scene = typeof p?.scene === 'string' ? p.scene.trim() : '';
    const words = text.split(/\s+/).filter(Boolean).length;
    if (!text || words < 3 || words > 14) return null;
    if (STORY_BANNED.some(w => text.includes(w))) return null;
    if (!/^[ -~]{8,200}$/.test(scene)) return null;
    out.push({ text, scene });
  }
  return { title, pages: out };
}
