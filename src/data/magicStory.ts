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

export type FilledStory = {
  title: string;
  lines: string[];
  recap: string;
  lesson: string;
  /** One short ENGLISH picture description per line — the picture-book
   * illustration prompt for that page (model-written, no child data). */
  scenes?: string[];
};
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
    scenes: [
      'Two cute friends play with a toy in a cozy living room and laugh',
      'The toy rolls away and hides under a big soft sofa',
      'One friend kneels and looks under the sofa, searching',
      'The other friend smiles and says they will find it together',
      'One friend shines a small flashlight under the sofa',
      'The other friend reaches under the sofa and grabs the toy corner',
      'The toy comes out and both friends cheer happily',
      'The two friends play together again, joyful and giggling',
    ],
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
    scenes: [
      'Two cute friends walk in a sunny garden in the morning',
      'A tiny snail walks slowly beside red flowers',
      'The tired snail stops in the middle of the path',
      'One friend promises the snail a fresh leaf',
      'The other friend brings a big soft green leaf',
      'The snail eats the leaf and walks happily again',
      'The two friends walk beside the snail to its home',
      'Both friends smile, happy they helped a tiny friend',
    ],
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
    scenes: [
      'Two cute friends sit on a rug stacking colorful blocks',
      'Their block tower grows taller and taller toward the ceiling',
      'The tower wobbles and all the blocks tumble down',
      'One friend laughs and says they will build it stronger',
      'One friend puts the biggest blocks at the bottom for a wide base',
      'The other friend gently stacks small blocks on top',
      'The new tower stands tall and strong',
      'Both friends clap happily for their beautiful tower',
    ],
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
    scenes: [
      'A cute birthday table with a small cake for two friends',
      'Wind from the window blows out the birthday candle',
      'One friend looks surprised that the candle went out',
      'The other friend laughs about the naughty wind',
      'Both friends close the window together',
      'One friend lights the candle again and shields it with a hand',
      'The birthday friend closes their eyes, wishes, and blows the candle',
      'Both friends eat the yummy cake together, laughing',
    ],
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
    scenes: [
      'After rain, two cute friends stand by a little stream',
      'Each friend holds a colorful paper boat, excited',
      "One friend's paper boat is stuck on a small rock in the water",
      'One friend says they will rescue it with a long stick',
      'The other friend brings a long stick',
      'One friend gently pushes the boat off the rock with the stick',
      'The paper boat floats away again, sailing fast',
      'Both friends wave happily at the little boat',
    ],
  }),
];

export function fallbackStory(names: FallbackNames, salt = 0): FilledStory {
  return FALLBACK_TEMPLATES[salt % FALLBACK_TEMPLATES.length]!(names);
}
