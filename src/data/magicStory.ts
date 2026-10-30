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
