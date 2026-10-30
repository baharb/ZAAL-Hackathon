// Photo Farsi word list (Meta hackathon: kids-room demo set).
// 9 entries reuse shipped recordings, so they speak on day one. The other 6
// have audioKey: null until Bahar records them with the same voice — the
// screen shows their text but never fakes their audio (see PhotoFarsiGame).
// Emoji art is placeholder so no copied assets ship with this screen.

export type PhotoFarsiWord = {
  id: string;
  fa: string;
  en: string;
  emoji: string;
  /** Full key into FA_TEST_AUDIO, or null while unrecorded. */
  audioKey: string | null;
};

export const PHOTO_FARSI_WORDS: PhotoFarsiWord[] = [
  // --- recorded already (conversation/choice pack) ---
  { id: 'book', fa: 'کتاب', en: 'Book', emoji: '📕', audioKey: 'conversation/choice/book' },
  { id: 'backpack', fa: 'کوله‌پشتی', en: 'Backpack', emoji: '🎒', audioKey: 'conversation/choice/backpack' },
  { id: 'hat', fa: 'کلاه', en: 'Hat', emoji: '🧢', audioKey: 'conversation/choice/hat' },
  { id: 'shoe', fa: 'کفش', en: 'Shoe', emoji: '👟', audioKey: 'conversation/choice/shoe' },
  { id: 'apple', fa: 'سیب', en: 'Apple', emoji: '🍎', audioKey: 'conversation/choice/apple' },
  { id: 'orange', fa: 'پرتقال', en: 'Orange', emoji: '🍊', audioKey: 'conversation/choice/orange' },
  { id: 'bread', fa: 'نان', en: 'Bread', emoji: '🍞', audioKey: 'conversation/choice/bread' },
  { id: 'fish', fa: 'ماهی', en: 'Fish', emoji: '🐟', audioKey: 'conversation/choice/fish' },
  { id: 'water', fa: 'آب', en: 'Water', emoji: '💧', audioKey: 'conversation/choice/water' },
  // --- record later with the same voice (text-only until then) ---
  { id: 'bed', fa: 'تخت', en: 'Bed', emoji: '🛏️', audioKey: null },
  { id: 'lamp', fa: 'چراغ', en: 'Lamp', emoji: '💡', audioKey: null },
  { id: 'chair', fa: 'صندلی', en: 'Chair', emoji: '🪑', audioKey: null },
  { id: 'table', fa: 'میز', en: 'Table', emoji: '🍽️', audioKey: null },
  { id: 'doll', fa: 'عروسک', en: 'Doll', emoji: '🧸', audioKey: null },
  { id: 'ball', fa: 'توپ', en: 'Ball', emoji: '⚽', audioKey: null },
];

export const PHOTO_FARSI_IDS = PHOTO_FARSI_WORDS.map(w => w.id);

export function findPhotoFarsiWord(id: string | null | undefined): PhotoFarsiWord | null {
  if (!id) return null;
  return PHOTO_FARSI_WORDS.find(w => w.id === id) ?? null;
}
