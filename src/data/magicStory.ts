// Magic Story picker content (Meta hackathon).
// The story TEXT comes from Muse Spark; the only SPOKEN word is the focus
// word, which must have a shipped WAV (same voice-safe rule as Photo Farsi).
// Emoji art is placeholder so no copied assets ship with this screen.

export type StoryHero = { id: string; fa: string; en: string; emoji: string };
export type StoryPlace = { id: string; fa: string; en: string; emoji: string };
export type StoryFocus = { id: string; fa: string; en: string; emoji: string; audioKey: string };

export const STORY_HEROES: StoryHero[] = [
  { id: 'cat', fa: 'پیشی', en: 'Kitty', emoji: '🐱' },
  { id: 'fish', fa: 'ماهی', en: 'Fish', emoji: '🐟' },
  { id: 'monkey', fa: 'میمون', en: 'Monkey', emoji: '🐵' },
];

export const STORY_PLACES: StoryPlace[] = [
  { id: 'home', fa: 'خانه', en: 'Home', emoji: '🏠' },
  { id: 'garden', fa: 'باغ', en: 'Garden', emoji: '🌳' },
  { id: 'sea', fa: 'دریا', en: 'Sea', emoji: '🌊' },
];

// Every focus word reuses a shipped recording — never add one without a WAV.
export const STORY_FOCUS_WORDS: StoryFocus[] = [
  { id: 'apple', fa: 'سیب', en: 'Apple', emoji: '🍎', audioKey: 'conversation/choice/apple' },
  { id: 'fish', fa: 'ماهی', en: 'Fish', emoji: '🐟', audioKey: 'conversation/choice/fish' },
  { id: 'book', fa: 'کتاب', en: 'Book', emoji: '📕', audioKey: 'conversation/choice/book' },
  { id: 'water', fa: 'آب', en: 'Water', emoji: '💧', audioKey: 'conversation/choice/water' },
];

// Banned in every tale: fear, darkness, monsters, sleep, crying.
export const STORY_BANNED = ['ترس', 'ترسید', 'تاریک', 'هیولا', 'خواب', 'خوابید', 'گریه'];

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Model-output gate: exactly 6 short clean lines, or it never reaches a child. */
export function validStoryLines(lines: unknown, banned: string[] = STORY_BANNED): lines is string[] {
  if (!Array.isArray(lines) || lines.length !== 6) return false;
  return lines.every(
    l =>
      typeof l === 'string' &&
      l.trim().length > 0 &&
      countWords(l) <= 10 &&
      !banned.some(b => l.includes(b)),
  );
}

export type FilledStory = { title: string; lines: string[]; recap: string; lesson: string };
export type FallbackNames = { buddy: string; friend: string; obj: string };

// Five hand-written safety nets (mom-Farsi, 6 lines each). Used only when
// the model fails twice — the child always gets a real story, never an error.
const FALLBACK_TEMPLATES: ((n: FallbackNames) => FilledStory)[] = [
  n => ({
    title: `${n.friend} و توپ قرمز`,
    lines: [
      `${n.buddy} یه توپ قرمز داشت.`,
      `توپ قل خورد و رفت زیر میز.`,
      `${n.buddy} گفت: توپ جونی کجایی؟`,
      `${n.friend} اومد و زیر میز رو نگاه کرد.`,
      `توپ اونجا بود! ${n.friend} خندید.`,
      `${n.buddy} و ${n.friend} با هم توپ‌بازی کردن.`,
    ],
    recap: `${n.friend} توپش رو پیدا کرد.`,
    lesson: `دوستا به هم کمک می‌کنن.`,
  }),
  n => ({
    title: `${n.friend} و حلزون`,
    lines: [
      `${n.buddy} و ${n.friend} رفتن تو باغ.`,
      `یه حلزون کوچولو اونجا بود.`,
      `حلزون آروم آروم راه می‌رفت.`,
      `${n.friend} براش برگ تازه آورد.`,
      `حلزون برگ رو خورد و خوشحال شد.`,
      `همه با هم زیر آفتاب نشستن.`,
    ],
    recap: `${n.buddy} و ${n.friend} به حلزون کمک کردن.`,
    lesson: `با حیوونا مهربون باشیم.`,
  }),
  n => ({
    title: `برج بلند ${n.friend}`,
    lines: [
      `${n.buddy} و ${n.friend} مکعب چیدن.`,
      `برج خیلی بلند شد.`,
      `یهو برج افتاد پایین!`,
      `هر دوتاشون قاه‌قاه خندیدن.`,
      `دوباره از اول ساختن.`,
      `این دفعه برج محکم وایساد.`,
    ],
    recap: `برج افتاد ولی دوباره ساختن.`,
    lesson: `اگه خراب شد، دوباره بساز.`,
  }),
  n => ({
    title: `تولد ${n.friend}`,
    lines: [
      `امروز تولد ${n.friend} بود.`,
      `${n.buddy} یه کیک کوچیک آورد.`,
      `شمع رو فوت کردن.`,
      `همه دست زدن و شادی کردن.`,
      `${n.friend} یه آرزو کرد.`,
      `کیک رو با هم خوردن.`,
    ],
    recap: `${n.buddy} برای ${n.friend} تولد گرفت.`,
    lesson: `دوستا روزای خوب رو جشن می‌گیرن.`,
  }),
  n => ({
    title: `قایق‌های حموم`,
    lines: [
      `${n.buddy} و ${n.friend} رفتن حموم.`,
      `دو تا قایق کاغذی داشتن.`,
      `قایقا روی آب شناور شدن.`,
      `یه موج کوچیک اومد!`,
      `قایقا تکون خوردن ولی غرق نشدن.`,
      `هر دوتاشون برنده شدن.`,
    ],
    recap: `قایق‌ها توی حموم مسابقه دادن.`,
    lesson: `بازی کردن با دوستا کیف می‌ده.`,
  }),
];

export function fallbackStory(names: FallbackNames, salt = 0): FilledStory {
  return FALLBACK_TEMPLATES[salt % FALLBACK_TEMPLATES.length]!(names);
}
