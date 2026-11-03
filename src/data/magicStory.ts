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

/** Model-output gate: exactly 8 clean full lines, or it never reaches a child. */
export function validStoryLines(lines: unknown, banned: string[] = STORY_BANNED): lines is string[] {
  if (!Array.isArray(lines) || lines.length !== 8) return false;
  return lines.every(
    l =>
      typeof l === 'string' &&
      l.trim().length > 0 &&
      countWords(l) <= 14 &&
      !banned.some(b => l.includes(b)),
  );
}

export type FilledStory = { title: string; lines: string[]; recap: string; lesson: string };
export type FallbackNames = { buddy: string; friend: string; obj: string };

// Five hand-written safety nets at the model level (8 mom-told lines
// each: problem, dialogue, clever fix together, feeling, happy end).
// Used only when the model fails twice — the child always gets a real
// story, never an error.
const FALLBACK_TEMPLATES: ((n: FallbackNames) => FilledStory)[] = [
  n => ({
    title: `توپ گمشده‌ی ${n.friend}`,
    lines: [
      `${n.buddy} و ${n.friend} توی خونه با ${n.obj} بازی می‌کردن و می‌خندیدن.`,
      `${n.obj} قل خورد و آروم رفت زیر مبل قایم شد.`,
      `${n.buddy} خم شد و زیر مبل رو نگاه کرد، ولی پیداش نکرد.`,
      `${n.friend} گفت: «ناراحت نباش، با هم پیداش می‌کنیم رفیق!»`,
      `${n.buddy} چراغ‌قوه رو آورد و نورش رو زیر مبل انداخت.`,
      `${n.friend} دستش رو دراز کرد و گوشه‌ی ${n.obj} رو گرفت.`,
      `${n.obj} بیرون اومد و هر دو خوشحال شدن و جیغ کشیدن.`,
      `بعدش دوباره با هم بازی کردن و حسابی بهشون خوش گذشت.`,
    ],
    recap: `${n.buddy} و ${n.friend} با هم ${n.obj} رو پیدا کردن.`,
    lesson: `دوستا با هم هر چیزی رو پیدا می‌کنن.`,
  }),
  n => ({
    title: `${n.friend} و حلزون کوچولو`,
    lines: [
      `${n.buddy} و ${n.friend} صبح زود رفتن توی باغ قدم بزنن.`,
      `کنار گل‌های قرمز، یه حلزون کوچولو آروم‌آروم راه می‌رفت.`,
      `حلزون خسته شد و وسط راه وایساد و جلوتر نرفت.`,
      `${n.buddy} گفت: «حلزون جون، برات یه برگ تازه میارم!»`,
      `${n.friend} یه برگ سبز و نرم از بوته کند و آورد.`,
      `حلزون برگ رو خورد و دوباره شاد و سرحال راه افتاد.`,
      `${n.buddy} و ${n.friend} کنارش راه رفتن تا برسه به خونه‌اش.`,
      `هر دو ذوق کردن که تونستن به یه دوست کوچیک کمک کنن.`,
    ],
    recap: `${n.buddy} و ${n.friend} به حلزون خسته کمک کردن.`,
    lesson: `مهربونی با حیوونا خیلی قشنگه.`,
  }),
  n => ({
    title: `برج بلند ${n.friend}`,
    lines: [
      `${n.buddy} و ${n.friend} روی فرش نشستن و مکعب‌ها رو چیدن.`,
      `برجشون هر لحظه بلندتر می‌شد و به سقف نزدیک می‌شد.`,
      `یه دفعه برج تکون خورد و همه‌ی مکعب‌ها ریختن پایین!`,
      `${n.friend} گفت: «اشکال نداره، این دفعه محکم‌تر می‌سازیم!»`,
      `${n.buddy} مکعب‌های بزرگ رو گذاشت پایین تا پایه‌ی برج پهن بشه.`,
      `${n.friend} هم آروم‌آروم مکعب‌های کوچیک رو گذاشت روی اونا.`,
      `برج جدید بلند شد و این دفعه محکم سر جاش وایساد.`,
      `هر دو خوشحال شدن و برای برج قشنگشون دست زدن.`,
    ],
    recap: `برج افتاد، ولی با یه فکر خوب دوباره ساختنش.`,
    lesson: `اگه چیزی خراب شد، دوباره و بهتر بسازش.`,
  }),
  n => ({
    title: `تولد ${n.friend}`,
    lines: [
      `امروز تولد ${n.friend} بود و ${n.buddy} یه کیک کوچیک براش خریده بود.`,
      `وقتی شمع رو روشن کردن، باد پنجره اومد و شمع رو خاموش کرد!`,
      `${n.friend} تعجب کرد و گفت: «اِ! شمعم چرا خاموش شد؟»`,
      `${n.buddy} خندید و گفت: «باد شیطون اومده بود فوت کنه!»`,
      `هر دو با هم پنجره رو بستن تا باد دیگه نیاد تو.`,
      `${n.buddy} دوباره شمع رو روشن کرد و جلوش رو با دستش گرفت.`,
      `${n.friend} چشماشو بست، آرزو کرد و شمع رو فوت کرد.`,
      `بعدش کیک خوشمزه رو با هم خوردن و کلی خندیدن.`,
    ],
    recap: `${n.buddy} برای تولد ${n.friend} یه کیک قشنگ آورد.`,
    lesson: `جشن گرفتن با دوستا خیلی کیف می‌ده.`,
  }),
  n => ({
    title: `قایق‌های کاغذی`,
    lines: [
      `بعد از بارون، ${n.buddy} و ${n.friend} رفتن کنار جوی آب.`,
      `هر کدوم یه قایق کاغذی رنگی دستشون بود و خیلی ذوق داشتن.`,
      `قایق ${n.friend} به یه سنگ کوچیک گیر کرد و وسط آب وایساد.`,
      `${n.buddy} گفت: «صبر کن، با یه چوب بلند نجاتش می‌دیم!»`,
      `${n.friend} یه چوب بلند پیدا کرد و آورد پیش ${n.buddy}.`,
      `${n.buddy} آروم با نوک چوب قایق رو از کنار سنگ هل داد.`,
      `قایق دوباره روی آب راه افتاد و تندتند جلو رفت.`,
      `هر دو خوشحال شدن و برای قایق کوچولو دست تکون دادن.`,
    ],
    recap: `قایق ${n.friend} گیر کرده بود، ولی با هم نجاتش دادن.`,
    lesson: `با یه فکر ساده می‌شه مشکل رو حل کرد.`,
  }),
];

export function fallbackStory(names: FallbackNames, salt = 0): FilledStory {
  return FALLBACK_TEMPLATES[salt % FALLBACK_TEMPLATES.length]!(names);
}
