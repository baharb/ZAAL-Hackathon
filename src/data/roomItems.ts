// Room-item catalog (Meta hackathon): the cartoon cast of the new Magic
// Story. Neli recognizes objects in the child's room photo (Muse Spark,
// multimodal) and each recognized item is matched here to shipped,
// professional cartoon art — so the story stars the child's OWN things.
// Only add an entry with a real required asset below; unmatched words are
// still woven into the story text, they just get no sticker.

export type RoomItem = {
  id: string;
  fa: string[];
  en: string[];
  art: any;
  audioKey?: string;
};

const ALPHA = (name: string): any => {
  const map: Record<string, any> = {
    ball: require('../../assets/neli-world/alphabet-icons/ball.webp'),
    boat: require('../../assets/neli-world/alphabet-icons/boat.webp'),
    house: require('../../assets/neli-world/alphabet-icons/house.webp'),
    tree: require('../../assets/neli-world/alphabet-icons/tree.webp'),
    fish: require('../../assets/neli-world/alphabet-icons/fish.webp'),
    flower: require('../../assets/neli-world/alphabet-icons/flower.webp'),
    kite: require('../../assets/neli-world/alphabet-icons/kite.webp'),
    umbrella: require('../../assets/neli-world/alphabet-icons/umbrella.webp'),
    chick: require('../../assets/neli-world/alphabet-icons/chick.webp'),
    bee: require('../../assets/neli-world/alphabet-icons/bee.webp'),
    clock: require('../../assets/neli-world/alphabet-icons/clock.webp'),
    parrot: require('../../assets/neli-world/alphabet-icons/parrot.webp'),
    frog: require('../../assets/neli-world/alphabet-icons/frog.png'),
    elephant: require('../../assets/neli-world/alphabet-icons/elephant.webp'),
    jellyfish: require('../../assets/neli-world/alphabet-icons/jellyfish.png'),
  };
  return map[name] ?? null;
};

export const ROOM_ITEMS: RoomItem[] = [
  { id: 'ball', fa: ['توپ'], en: ['ball'], art: ALPHA('ball') },
  { id: 'boat', fa: ['قایق'], en: ['boat', 'ship'], art: ALPHA('boat') },
  { id: 'house', fa: ['خانه'], en: ['house', 'home'], art: ALPHA('house') },
  { id: 'tree', fa: ['درخت'], en: ['tree'], art: ALPHA('tree') },
  { id: 'fish', fa: ['ماهی'], en: ['fish'], art: ALPHA('fish'), audioKey: 'conversation/choice/fish' },
  { id: 'flower', fa: ['گل'], en: ['flower'], art: ALPHA('flower') },
  { id: 'kite', fa: ['بادبادک'], en: ['kite'], art: ALPHA('kite') },
  { id: 'umbrella', fa: ['چتر'], en: ['umbrella'], art: ALPHA('umbrella') },
  { id: 'chick', fa: ['جوجه'], en: ['chick'], art: ALPHA('chick') },
  { id: 'bee', fa: ['زنبور'], en: ['bee'], art: ALPHA('bee') },
  { id: 'clock', fa: ['ساعت'], en: ['clock', 'watch'], art: ALPHA('clock') },
  { id: 'parrot', fa: ['طوطی'], en: ['parrot'], art: ALPHA('parrot') },
  { id: 'frog', fa: ['قورباغه'], en: ['frog'], art: ALPHA('frog') },
  { id: 'elephant', fa: ['فیل'], en: ['elephant'], art: ALPHA('elephant') },
  { id: 'jellyfish', fa: ['عروس دریایی'], en: ['jellyfish'], art: ALPHA('jellyfish') },
  { id: 'banana', fa: ['موز'], en: ['banana'], art: require('../../assets/neli-world/fruits/banana_1024.webp') },
  { id: 'watermelon', fa: ['هندوانه'], en: ['watermelon'], art: require('../../assets/neli-world/fruits/watermelon_slice_1024.webp') },
  { id: 'milk', fa: ['شیر'], en: ['milk'], art: require('../../assets/neli-world/food-flat/milk.webp') },
  { id: 'egg', fa: ['تخم\u200cمرغ'], en: ['egg', 'eggs'], art: require('../../assets/neli-world/food-flat/egg.png') },
  { id: 'cheese', fa: ['پنیر'], en: ['cheese'], art: require('../../assets/neli-world/food-flat/cheese.png') },
  { id: 'honey', fa: ['عسل'], en: ['honey'], art: require('../../assets/neli-world/food-flat/honey.webp') },
  { id: 'jam', fa: ['مربا'], en: ['jam'], art: require('../../assets/neli-world/food-flat/jam.png') },
  { id: 'cup', fa: ['فنجان', 'لیوان'], en: ['cup', 'mug', 'glass'], art: require('../../assets/neli-world/kitchen/cup.png') },
  { id: 'plate', fa: ['بشقاب'], en: ['plate'], art: require('../../assets/neli-world/kitchen/plate.webp') },
  { id: 'spoon', fa: ['قاشق'], en: ['spoon'], art: require('../../assets/neli-world/kitchen/spoon.png') },
  { id: 'cat', fa: ['پیشی', 'گربه'], en: ['cat', 'kitty'], art: require('../../assets/neli-world/animals/cat_kids_app_clean_transparent.webp') },
  { id: 'monkey', fa: ['میمون'], en: ['monkey'], art: require('../../assets/neli-world/animals/monkey.webp') },
  { id: 'bear', fa: ['خرس'], en: ['bear', 'teddy'], art: require('../../assets/neli-world/animals/bear_kids_app_clean_transparent.webp') },
  { id: 'panda', fa: ['پاندا'], en: ['panda'], art: require('../../assets/neli-world/animals/panda_kids_app_clean_transparent.webp') },
  { id: 'rabbit', fa: ['خرگوش'], en: ['rabbit', 'bunny'], art: require('../../assets/neli-world/animals/rabbit_kids_app_clean_transparent.webp') },
  { id: 'apple', fa: ['سیب'], en: ['apple'], art: require('../../assets/neli-world/fruits/apple_1024.webp'), audioKey: 'conversation/choice/apple' },
  { id: 'orange', fa: ['پرتقال'], en: ['orange'], art: require('../../assets/neli-world/fruits/orange_1024.webp') },
  { id: 'bread', fa: ['نان'], en: ['bread', 'toast'], art: require('../../assets/neli-world/food-flat/toast.webp') },
  { id: 'water', fa: ['آب'], en: ['water'], art: require('../../assets/neli-world/ingredients/water.webp'), audioKey: 'conversation/choice/water' },
  { id: 'book', fa: ['کتاب'], en: ['book'], art: require('../../assets/neli-world/clothes/book.webp'), audioKey: 'conversation/choice/book' },
  { id: 'backpack', fa: ['کوله\u200cپشتی', 'کیف'], en: ['backpack', 'bag'], art: require('../../assets/neli-world/clothes/backpack.webp') },
  { id: 'hat', fa: ['کلاه'], en: ['hat', 'cap'], art: require('../../assets/neli-world/clothes/hat_orange.webp') },
  { id: 'shoe', fa: ['کفش'], en: ['shoe', 'shoes'], art: require('../../assets/neli-world/clothes/shoes_blue.webp') },
  { id: 'bed', fa: ['تخت', 'تختخواب'], en: ['bed'], art: require('../../assets/neli-world/word-art/bed.webp') },
  { id: 'lamp', fa: ['چراغ', 'لامپ'], en: ['lamp', 'light'], art: require('../../assets/neli-world/word-art/lamp.webp') },
  { id: 'table', fa: ['میز'], en: ['table', 'desk'], art: require('../../assets/neli-world/word-art/table.webp') },
];

export type RecognizedWord = { fa: string; en: string };

/** Match one recognized word to the catalog. Exact English id/keyword
 * wins, then partial English, then Farsi. Returns null when nothing fits —
 * the word still joins the story text, just without a sticker. */
export function matchRoomItem(fa: string, en: string): RoomItem | null {
  const e = en.toLowerCase().trim();
  const f = fa.trim();
  let best: RoomItem | null = null;
  let bestScore = 0;
  for (const item of ROOM_ITEMS) {
    let score = 0;
    if (item.id === e || item.en.some(k => k === e)) score = 3;
    else if (e && item.en.some(k => e.includes(k) || k.includes(e))) score = 2;
    else if (f && item.fa.some(k => f.includes(k))) score = 1;
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}
