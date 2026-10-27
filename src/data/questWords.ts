// "My Daily Word Quest" catalog (hackathon step 1).
// Every entry has BOTH a picture and a voice recording. Groups that could
// not meet that rule (counting numbers, coat/tshirt) are left out on purpose
// and listed in the step-1 report. Nothing here touches the network.

import { ImageSourcePropType } from 'react-native';
import { FaTestAudioKey } from '../assets/faTestAudio.generated';
import { neliWorldAssets } from '../assets/neliWorldAssets';
import { ALPHABET_EXAMPLE_ASSETS } from '../assets/alphabetExampleAssets';
import { SOLAR_SYSTEM_PLANETS } from '../assets/solarSystemPuzzle';

// Tracker vocabulary groups from the quest spec. counting/number stays in
// the union for the word log (count_it steps play those clips later) even
// though no number has its own picture yet, so it has no catalog entries.
export type QuestWordCategory =
  | 'ingredients'
  | 'clothes'
  | 'painting/color'
  | 'counting/number'
  | 'feed-animals/food'
  | 'cooking/name'
  | 'alphabet/example'
  | 'solar-system';

export type QuestWord = {
  // Full audio key, e.g. 'ingredients/apple'. The quest validator (step 3)
  // checks this exact string against FA_TEST_AUDIO.
  id: string;
  category: QuestWordCategory;
  fa: string;
  art: ImageSourcePropType;
  audioKey: FaTestAudioKey;
  // Letter id from src/data/farsiLetters.ts, e.g. 'gaf' for گربه.
  firstLetterId: string;
};

const planetArt = Object.fromEntries(
  SOLAR_SYSTEM_PLANETS.map(p => [p.id, p.source]),
) as Record<string, ImageSourcePropType>;

export const QUEST_WORDS: QuestWord[] = [
  // --- ingredients (Food & ingredients; Farsi + art from CookingGame) ---
  { id: 'ingredients/apple', category: 'ingredients', fa: 'سیب', art: neliWorldAssets.foods.apple, audioKey: 'ingredients/apple', firstLetterId: 'sin' },
  { id: 'ingredients/orange', category: 'ingredients', fa: 'پرتقال', art: neliWorldAssets.foods.orange, audioKey: 'ingredients/orange', firstLetterId: 'pe' },
  { id: 'ingredients/rice', category: 'ingredients', fa: 'برنج', art: neliWorldAssets.foods.rice, audioKey: 'ingredients/rice', firstLetterId: 'be' },
  { id: 'ingredients/herb', category: 'ingredients', fa: 'سبزی', art: neliWorldAssets.foods.herbs, audioKey: 'ingredients/herb', firstLetterId: 'sin' },
  { id: 'ingredients/egg', category: 'ingredients', fa: 'تخم مرغ', art: neliWorldAssets.foods.eggWhole, audioKey: 'ingredients/egg', firstLetterId: 'te' },
  { id: 'ingredients/tomato', category: 'ingredients', fa: 'گوجه', art: neliWorldAssets.foods.tomato, audioKey: 'ingredients/tomato', firstLetterId: 'gaf' },
  { id: 'ingredients/pasta', category: 'ingredients', fa: 'پاستا', art: neliWorldAssets.foods.rawPasta, audioKey: 'ingredients/pasta', firstLetterId: 'pe' },
  { id: 'ingredients/cheese', category: 'ingredients', fa: 'پنیر', art: neliWorldAssets.foods.cheese, audioKey: 'ingredients/cheese', firstLetterId: 'pe' },
  { id: 'ingredients/pizzaBread', category: 'ingredients', fa: 'خمیر پیتزا', art: neliWorldAssets.foods.pizzaBread, audioKey: 'ingredients/pizzaBread', firstLetterId: 'khe' },
  { id: 'ingredients/pizzaCheese', category: 'ingredients', fa: 'پنیر پیتزا', art: neliWorldAssets.foods.pizzaCheese, audioKey: 'ingredients/pizzaCheese', firstLetterId: 'pe' },
  { id: 'ingredients/mushroom', category: 'ingredients', fa: 'قارچ', art: neliWorldAssets.foods.mushroom, audioKey: 'ingredients/mushroom', firstLetterId: 'ghaf' },
  { id: 'ingredients/bellPepper', category: 'ingredients', fa: 'فلفل دلمه', art: neliWorldAssets.foods.bellPepper, audioKey: 'ingredients/bellPepper', firstLetterId: 'fe' },
  { id: 'ingredients/olive', category: 'ingredients', fa: 'زیتون', art: neliWorldAssets.foods.olive, audioKey: 'ingredients/olive', firstLetterId: 'ze' },
  { id: 'ingredients/kalam', category: 'ingredients', fa: 'کلم', art: neliWorldAssets.foods.kalam, audioKey: 'ingredients/kalam', firstLetterId: 'kaf' },
  { id: 'ingredients/water', category: 'ingredients', fa: 'آب', art: neliWorldAssets.foods.water, audioKey: 'ingredients/water', firstLetterId: 'alef' },
  { id: 'ingredients/salt', category: 'ingredients', fa: 'نمک', art: neliWorldAssets.foods.salt, audioKey: 'ingredients/salt', firstLetterId: 'nun' },
  { id: 'ingredients/cucumber', category: 'ingredients', fa: 'خیار', art: neliWorldAssets.foods.cucumber, audioKey: 'ingredients/cucumber', firstLetterId: 'khe' },
  { id: 'ingredients/yogurt', category: 'ingredients', fa: 'ماست', art: neliWorldAssets.foods.yogurt, audioKey: 'ingredients/yogurt', firstLetterId: 'mim' },
  { id: 'ingredients/driedMint', category: 'ingredients', fa: 'نعنا خشک', art: neliWorldAssets.foods.driedMint, audioKey: 'ingredients/driedMint', firstLetterId: 'nun' },
  { id: 'ingredients/lemon', category: 'ingredients', fa: 'لیمو', art: neliWorldAssets.foods.lemon, audioKey: 'ingredients/lemon', firstLetterId: 'lam' },
  { id: 'ingredients/lentils', category: 'ingredients', fa: 'عدس', art: neliWorldAssets.foods.lentils, audioKey: 'ingredients/lentils', firstLetterId: 'eyn' },
  { id: 'ingredients/chickpea', category: 'ingredients', fa: 'نخود', art: neliWorldAssets.foods.chickpea, audioKey: 'ingredients/chickpea', firstLetterId: 'nun' },
  { id: 'ingredients/lappeh', category: 'ingredients', fa: 'لپه', art: neliWorldAssets.foods.lappeh, audioKey: 'ingredients/lappeh', firstLetterId: 'lam' },
  { id: 'ingredients/beans', category: 'ingredients', fa: 'لوبیا', art: neliWorldAssets.foods.beans, audioKey: 'ingredients/beans', firstLetterId: 'lam' },
  { id: 'ingredients/fish', category: 'ingredients', fa: 'ماهی', art: neliWorldAssets.foods.fish, audioKey: 'ingredients/fish', firstLetterId: 'mim' },
  { id: 'ingredients/oil', category: 'ingredients', fa: 'روغن', art: neliWorldAssets.kitchen.oil, audioKey: 'ingredients/oil', firstLetterId: 're' },
  { id: 'ingredients/onion', category: 'ingredients', fa: 'پیاز', art: neliWorldAssets.foods.onion, audioKey: 'ingredients/onion', firstLetterId: 'pe' },
  { id: 'ingredients/filletChickenRaw', category: 'ingredients', fa: 'فیله', art: neliWorldAssets.foods.filletChickenRaw, audioKey: 'ingredients/filletChickenRaw', firstLetterId: 'fe' },
  { id: 'ingredients/groundBeefRaw', category: 'ingredients', fa: 'گوشت چرخ کرده', art: neliWorldAssets.foods.groundBeefRaw, audioKey: 'ingredients/groundBeefRaw', firstLetterId: 'gaf' },
  { id: 'ingredients/cutRawBeefForStew', category: 'ingredients', fa: 'گوشت خورشتی', art: neliWorldAssets.foods.cutRawBeefForStew, audioKey: 'ingredients/cutRawBeefForStew', firstLetterId: 'gaf' },
  { id: 'ingredients/grapeLeaves', category: 'ingredients', fa: 'برگ مو', art: neliWorldAssets.foods.grapeLeaves, audioKey: 'ingredients/grapeLeaves', firstLetterId: 'be' },
  { id: 'ingredients/reshtehAshRaw', category: 'ingredients', fa: 'رشته', art: neliWorldAssets.foods.reshtehAshRaw, audioKey: 'ingredients/reshtehAshRaw', firstLetterId: 're' },
  { id: 'ingredients/zereshk', category: 'ingredients', fa: 'زرشک', art: neliWorldAssets.foods.zereshk, audioKey: 'ingredients/zereshk', firstLetterId: 'ze' },
  { id: 'ingredients/saffron', category: 'ingredients', fa: 'زعفران', art: neliWorldAssets.foods.saffron, audioKey: 'ingredients/saffron', firstLetterId: 'ze' },
  { id: 'ingredients/bread', category: 'ingredients', fa: 'نان', art: neliWorldAssets.foods.bread, audioKey: 'ingredients/bread', firstLetterId: 'nun' },
  // --- clothes (Farsi from DressUpGame) ---
  // clothes/coat and clothes/tshirt have recordings but no art: skipped.
  { id: 'clothes/backpack', category: 'clothes', fa: 'کوله‌پشتی', art: neliWorldAssets.clothes.backpack, audioKey: 'clothes/backpack', firstLetterId: 'kaf' },
  { id: 'clothes/bag', category: 'clothes', fa: 'کیف', art: neliWorldAssets.clothes.bag, audioKey: 'clothes/bag', firstLetterId: 'kaf' },
  { id: 'clothes/boots', category: 'clothes', fa: 'چکمه', art: neliWorldAssets.clothes.boots, audioKey: 'clothes/boots', firstLetterId: 'che' },
  { id: 'clothes/dress', category: 'clothes', fa: 'پیراهن', art: neliWorldAssets.clothes.dress, audioKey: 'clothes/dress', firstLetterId: 'pe' },
  { id: 'clothes/glasses', category: 'clothes', fa: 'عینک', art: neliWorldAssets.clothes.sunglassesBlack, audioKey: 'clothes/glasses', firstLetterId: 'eyn' },
  { id: 'clothes/hat', category: 'clothes', fa: 'کلاه', art: neliWorldAssets.clothes.hat, audioKey: 'clothes/hat', firstLetterId: 'kaf' },
  { id: 'clothes/scarf', category: 'clothes', fa: 'شال', art: neliWorldAssets.clothes.scarf, audioKey: 'clothes/scarf', firstLetterId: 'shin' },
  { id: 'clothes/shirt', category: 'clothes', fa: 'پیراهن', art: neliWorldAssets.clothes.shirt, audioKey: 'clothes/shirt', firstLetterId: 'pe' },
  { id: 'clothes/shoes', category: 'clothes', fa: 'کفش', art: neliWorldAssets.clothes.shoes, audioKey: 'clothes/shoes', firstLetterId: 'kaf' },
  { id: 'clothes/shorts', category: 'clothes', fa: 'شلوارک', art: neliWorldAssets.clothes.shorts, audioKey: 'clothes/shorts', firstLetterId: 'shin' },
  // --- painting/color (Farsi + crayon art from ColoringScreen) ---
  { id: 'painting/color/red', category: 'painting/color', fa: 'قرمز', art: require('../../assets/neli-world/painting/crayons/crayon_red.webp'), audioKey: 'painting/color/red', firstLetterId: 'ghaf' },
  { id: 'painting/color/orange', category: 'painting/color', fa: 'نارنجی', art: require('../../assets/neli-world/painting/crayons/crayon_orange.webp'), audioKey: 'painting/color/orange', firstLetterId: 'nun' },
  { id: 'painting/color/amber', category: 'painting/color', fa: 'کهربایی', art: require('../../assets/neli-world/painting/crayons/crayon_amber.webp'), audioKey: 'painting/color/amber', firstLetterId: 'kaf' },
  { id: 'painting/color/yellow', category: 'painting/color', fa: 'زرد', art: require('../../assets/neli-world/painting/crayons/crayon_yellow.webp'), audioKey: 'painting/color/yellow', firstLetterId: 'ze' },
  { id: 'painting/color/lime', category: 'painting/color', fa: 'لیمویی', art: require('../../assets/neli-world/painting/crayons/crayon_lime.webp'), audioKey: 'painting/color/lime', firstLetterId: 'lam' },
  { id: 'painting/color/green', category: 'painting/color', fa: 'سبز', art: require('../../assets/neli-world/painting/crayons/crayon_green.webp'), audioKey: 'painting/color/green', firstLetterId: 'sin' },
  { id: 'painting/color/teal', category: 'painting/color', fa: 'سبزآبی', art: require('../../assets/neli-world/painting/crayons/crayon_teal.webp'), audioKey: 'painting/color/teal', firstLetterId: 'sin' },
  { id: 'painting/color/aqua', category: 'painting/color', fa: 'فیروزه‌ای', art: require('../../assets/neli-world/painting/crayons/crayon_aqua.webp'), audioKey: 'painting/color/aqua', firstLetterId: 'fe' },
  { id: 'painting/color/blue', category: 'painting/color', fa: 'آبی', art: require('../../assets/neli-world/painting/crayons/crayon_blue.webp'), audioKey: 'painting/color/blue', firstLetterId: 'alef' },
  { id: 'painting/color/indigo', category: 'painting/color', fa: 'نیلی', art: require('../../assets/neli-world/painting/crayons/crayon_indigo.webp'), audioKey: 'painting/color/indigo', firstLetterId: 'nun' },
  { id: 'painting/color/purple', category: 'painting/color', fa: 'بنفش', art: require('../../assets/neli-world/painting/crayons/crayon_purple.webp'), audioKey: 'painting/color/purple', firstLetterId: 'be' },
  { id: 'painting/color/rose', category: 'painting/color', fa: 'رز', art: require('../../assets/neli-world/painting/crayons/crayon_rose.webp'), audioKey: 'painting/color/rose', firstLetterId: 're' },
  { id: 'painting/color/pink', category: 'painting/color', fa: 'صورتی', art: require('../../assets/neli-world/painting/crayons/crayon_pink.webp'), audioKey: 'painting/color/pink', firstLetterId: 'sad' },
  { id: 'painting/color/brown', category: 'painting/color', fa: 'قهوه‌ای', art: require('../../assets/neli-world/painting/crayons/crayon_brown.webp'), audioKey: 'painting/color/brown', firstLetterId: 'ghaf' },
  { id: 'painting/color/gray', category: 'painting/color', fa: 'خاکستری', art: require('../../assets/neli-world/painting/crayons/crayon_gray.webp'), audioKey: 'painting/color/gray', firstLetterId: 'khe' },
  { id: 'painting/color/black', category: 'painting/color', fa: 'مشکی', art: require('../../assets/neli-world/painting/crayons/crayon_black.webp'), audioKey: 'painting/color/black', firstLetterId: 'mim' },
  // --- feed-animals/food (Farsi + art from FeedAnimalsGame) ---
  { id: 'feed-animals/food/apple', category: 'feed-animals/food', fa: 'برگ', art: neliWorldAssets.ingredients.leaves, audioKey: 'feed-animals/food/apple', firstLetterId: 'be' },
  { id: 'feed-animals/food/banana', category: 'feed-animals/food', fa: 'موز', art: neliWorldAssets.foods.banana, audioKey: 'feed-animals/food/banana', firstLetterId: 'mim' },
  { id: 'feed-animals/food/carrot', category: 'feed-animals/food', fa: 'هویج', art: neliWorldAssets.foods.carrot, audioKey: 'feed-animals/food/carrot', firstLetterId: 'heh' },
  { id: 'feed-animals/food/fish', category: 'feed-animals/food', fa: 'ماهی', art: neliWorldAssets.foods.fish, audioKey: 'feed-animals/food/fish', firstLetterId: 'mim' },
  { id: 'feed-animals/food/honey', category: 'feed-animals/food', fa: 'عسل', art: neliWorldAssets.foods.honey, audioKey: 'feed-animals/food/honey', firstLetterId: 'eyn' },
  { id: 'feed-animals/food/bamboo', category: 'feed-animals/food', fa: 'بامبو', art: neliWorldAssets.ingredients.bamboo, audioKey: 'feed-animals/food/bamboo', firstLetterId: 'be' },
  // --- cooking/name (dishes; Farsi from CookingGame RECIPES) ---
  { id: 'cooking/name/sabzi-polo', category: 'cooking/name', fa: 'سبزی پلو با ماهی', art: neliWorldAssets.persianFoods.sabziPolo, audioKey: 'cooking/name/sabzi-polo', firstLetterId: 'sin' },
  { id: 'cooking/name/omelette', category: 'cooking/name', fa: 'املت', art: neliWorldAssets.persianFoods.omelette, audioKey: 'cooking/name/omelette', firstLetterId: 'alef' },
  { id: 'cooking/name/pasta', category: 'cooking/name', fa: 'پاستا', art: neliWorldAssets.persianFoods.pasta, audioKey: 'cooking/name/pasta', firstLetterId: 'pe' },
  { id: 'cooking/name/mast-khiar', category: 'cooking/name', fa: 'ماست و خیار', art: neliWorldAssets.persianFoods.mastKhiar, audioKey: 'cooking/name/mast-khiar', firstLetterId: 'mim' },
  { id: 'cooking/name/shirazi-salad', category: 'cooking/name', fa: 'سالاد شیرازی', art: neliWorldAssets.persianFoods.shiraziSalad, audioKey: 'cooking/name/shirazi-salad', firstLetterId: 'sin' },
  { id: 'cooking/name/kuku-sabzi', category: 'cooking/name', fa: 'کوکو سبزی', art: neliWorldAssets.persianFoods.kukuSabzi, audioKey: 'cooking/name/kuku-sabzi', firstLetterId: 'kaf' },
  { id: 'cooking/name/tahchin', category: 'cooking/name', fa: 'ته چین', art: neliWorldAssets.persianFoods.tahchin, audioKey: 'cooking/name/tahchin', firstLetterId: 'te' },
  { id: 'cooking/name/ash-reshteh', category: 'cooking/name', fa: 'آش رشته', art: neliWorldAssets.persianFoods.ashReshteh, audioKey: 'cooking/name/ash-reshteh', firstLetterId: 'alef' },
  { id: 'cooking/name/kebab', category: 'cooking/name', fa: 'چلو کباب', art: neliWorldAssets.persianFoods.kebab, audioKey: 'cooking/name/kebab', firstLetterId: 'che' },
  { id: 'cooking/name/dolmeh', category: 'cooking/name', fa: 'دلمه', art: neliWorldAssets.persianFoods.dolme, audioKey: 'cooking/name/dolmeh', firstLetterId: 'dal' },
  { id: 'cooking/name/ghormeh-sabzi', category: 'cooking/name', fa: 'قورمه سبزی', art: neliWorldAssets.persianFoods.ghormeSabzi, audioKey: 'cooking/name/ghormeh-sabzi', firstLetterId: 'ghaf' },
  { id: 'cooking/name/kalam-polo', category: 'cooking/name', fa: 'کلم پلو', art: neliWorldAssets.persianFoods.kalamPolo, audioKey: 'cooking/name/kalam-polo', firstLetterId: 'kaf' },
  { id: 'cooking/name/gheimeh', category: 'cooking/name', fa: 'قیمه', art: neliWorldAssets.persianFoods.gheimeh, audioKey: 'cooking/name/gheimeh', firstLetterId: 'ghaf' },
  { id: 'cooking/name/pizza', category: 'cooking/name', fa: 'پیتزا', art: neliWorldAssets.persianFoods.pizza, audioKey: 'cooking/name/pizza', firstLetterId: 'pe' },
  { id: 'cooking/name/zereshk-polo', category: 'cooking/name', fa: 'زرشک پلو', art: neliWorldAssets.persianFoods.zereshkPolo, audioKey: 'cooking/name/zereshk-polo', firstLetterId: 'ze' },
  // --- alphabet/example (example words; Farsi from farsiLetters.ts) ---
  { id: 'alphabet/example/alef', category: 'alphabet/example', fa: 'آب', art: ALPHABET_EXAMPLE_ASSETS.alef, audioKey: 'alphabet/example/alef', firstLetterId: 'alef' },
  { id: 'alphabet/example/be', category: 'alphabet/example', fa: 'برگ', art: ALPHABET_EXAMPLE_ASSETS.be, audioKey: 'alphabet/example/be', firstLetterId: 'be' },
  { id: 'alphabet/example/pe', category: 'alphabet/example', fa: 'پرتقال', art: ALPHABET_EXAMPLE_ASSETS.pe, audioKey: 'alphabet/example/pe', firstLetterId: 'pe' },
  { id: 'alphabet/example/te', category: 'alphabet/example', fa: 'توت فرنگی', art: ALPHABET_EXAMPLE_ASSETS.te, audioKey: 'alphabet/example/te', firstLetterId: 'te' },
  { id: 'alphabet/example/se', category: 'alphabet/example', fa: 'ثانیه', art: ALPHABET_EXAMPLE_ASSETS.se, audioKey: 'alphabet/example/se', firstLetterId: 'se' },
  { id: 'alphabet/example/jim', category: 'alphabet/example', fa: 'جوجه', art: ALPHABET_EXAMPLE_ASSETS.jim, audioKey: 'alphabet/example/jim', firstLetterId: 'jim' },
  { id: 'alphabet/example/che', category: 'alphabet/example', fa: 'چتر', art: ALPHABET_EXAMPLE_ASSETS.che, audioKey: 'alphabet/example/che', firstLetterId: 'che' },
  { id: 'alphabet/example/haa', category: 'alphabet/example', fa: 'حوله', art: ALPHABET_EXAMPLE_ASSETS.haa, audioKey: 'alphabet/example/haa', firstLetterId: 'haa' },
  { id: 'alphabet/example/khe', category: 'alphabet/example', fa: 'خرس', art: ALPHABET_EXAMPLE_ASSETS.khe, audioKey: 'alphabet/example/khe', firstLetterId: 'khe' },
  { id: 'alphabet/example/dal', category: 'alphabet/example', fa: 'درخت', art: ALPHABET_EXAMPLE_ASSETS.dal, audioKey: 'alphabet/example/dal', firstLetterId: 'dal' },
  { id: 'alphabet/example/zal', category: 'alphabet/example', fa: 'ذرت', art: ALPHABET_EXAMPLE_ASSETS.zal, audioKey: 'alphabet/example/zal', firstLetterId: 'zal' },
  { id: 'alphabet/example/re', category: 'alphabet/example', fa: 'رنگ', art: ALPHABET_EXAMPLE_ASSETS.re, audioKey: 'alphabet/example/re', firstLetterId: 're' },
  { id: 'alphabet/example/ze', category: 'alphabet/example', fa: 'زنبور', art: ALPHABET_EXAMPLE_ASSETS.ze, audioKey: 'alphabet/example/ze', firstLetterId: 'ze' },
  { id: 'alphabet/example/zhe', category: 'alphabet/example', fa: 'ژله', art: ALPHABET_EXAMPLE_ASSETS.zhe, audioKey: 'alphabet/example/zhe', firstLetterId: 'zhe' },
  { id: 'alphabet/example/sin', category: 'alphabet/example', fa: 'سیب', art: ALPHABET_EXAMPLE_ASSETS.sin, audioKey: 'alphabet/example/sin', firstLetterId: 'sin' },
  { id: 'alphabet/example/shin', category: 'alphabet/example', fa: 'شیر', art: ALPHABET_EXAMPLE_ASSETS.shin, audioKey: 'alphabet/example/shin', firstLetterId: 'shin' },
  { id: 'alphabet/example/sad', category: 'alphabet/example', fa: 'صابون', art: ALPHABET_EXAMPLE_ASSETS.sad, audioKey: 'alphabet/example/sad', firstLetterId: 'sad' },
  { id: 'alphabet/example/zad', category: 'alphabet/example', fa: 'ضربدر', art: ALPHABET_EXAMPLE_ASSETS.zad, audioKey: 'alphabet/example/zad', firstLetterId: 'zad' },
  { id: 'alphabet/example/taa', category: 'alphabet/example', fa: 'طوطی', art: ALPHABET_EXAMPLE_ASSETS.taa, audioKey: 'alphabet/example/taa', firstLetterId: 'taa' },
  { id: 'alphabet/example/zaa', category: 'alphabet/example', fa: 'ظرف', art: ALPHABET_EXAMPLE_ASSETS.zaa, audioKey: 'alphabet/example/zaa', firstLetterId: 'zaa' },
  { id: 'alphabet/example/eyn', category: 'alphabet/example', fa: 'عینک', art: ALPHABET_EXAMPLE_ASSETS.eyn, audioKey: 'alphabet/example/eyn', firstLetterId: 'eyn' },
  { id: 'alphabet/example/gheyn', category: 'alphabet/example', fa: 'غذا', art: ALPHABET_EXAMPLE_ASSETS.gheyn, audioKey: 'alphabet/example/gheyn', firstLetterId: 'gheyn' },
  { id: 'alphabet/example/fe', category: 'alphabet/example', fa: 'فیل', art: ALPHABET_EXAMPLE_ASSETS.fe, audioKey: 'alphabet/example/fe', firstLetterId: 'fe' },
  { id: 'alphabet/example/ghaf', category: 'alphabet/example', fa: 'قلب', art: ALPHABET_EXAMPLE_ASSETS.ghaf, audioKey: 'alphabet/example/ghaf', firstLetterId: 'ghaf' },
  { id: 'alphabet/example/kaf', category: 'alphabet/example', fa: 'کتاب', art: ALPHABET_EXAMPLE_ASSETS.kaf, audioKey: 'alphabet/example/kaf', firstLetterId: 'kaf' },
  { id: 'alphabet/example/gaf', category: 'alphabet/example', fa: 'گل', art: ALPHABET_EXAMPLE_ASSETS.gaf, audioKey: 'alphabet/example/gaf', firstLetterId: 'gaf' },
  { id: 'alphabet/example/lam', category: 'alphabet/example', fa: 'لیمو', art: ALPHABET_EXAMPLE_ASSETS.lam, audioKey: 'alphabet/example/lam', firstLetterId: 'lam' },
  { id: 'alphabet/example/mim', category: 'alphabet/example', fa: 'ماهی', art: ALPHABET_EXAMPLE_ASSETS.mim, audioKey: 'alphabet/example/mim', firstLetterId: 'mim' },
  { id: 'alphabet/example/nun', category: 'alphabet/example', fa: 'نان', art: ALPHABET_EXAMPLE_ASSETS.nun, audioKey: 'alphabet/example/nun', firstLetterId: 'nun' },
  { id: 'alphabet/example/vav', category: 'alphabet/example', fa: 'ورزش', art: ALPHABET_EXAMPLE_ASSETS.vav, audioKey: 'alphabet/example/vav', firstLetterId: 'vav' },
  { id: 'alphabet/example/heh', category: 'alphabet/example', fa: 'هویج', art: ALPHABET_EXAMPLE_ASSETS.heh, audioKey: 'alphabet/example/heh', firstLetterId: 'heh' },
  { id: 'alphabet/example/ye', category: 'alphabet/example', fa: 'یخ', art: ALPHABET_EXAMPLE_ASSETS.ye, audioKey: 'alphabet/example/ye', firstLetterId: 'ye' },
  // --- solar-system (Farsi + art from solarSystemPuzzle.ts) ---
  { id: 'solar-system/mercury', category: 'solar-system', fa: 'تیر', art: planetArt.mercury, audioKey: 'solar-system/mercury', firstLetterId: 'te' },
  { id: 'solar-system/venus', category: 'solar-system', fa: 'ونوس', art: planetArt.venus, audioKey: 'solar-system/venus', firstLetterId: 'vav' },
  { id: 'solar-system/earth', category: 'solar-system', fa: 'زمین', art: planetArt.earth, audioKey: 'solar-system/earth', firstLetterId: 'ze' },
  { id: 'solar-system/moon', category: 'solar-system', fa: 'ماه', art: planetArt.moon, audioKey: 'solar-system/moon', firstLetterId: 'mim' },
  { id: 'solar-system/mars', category: 'solar-system', fa: 'مریخ', art: planetArt.mars, audioKey: 'solar-system/mars', firstLetterId: 'mim' },
  { id: 'solar-system/jupiter', category: 'solar-system', fa: 'مشتری', art: planetArt.jupiter, audioKey: 'solar-system/jupiter', firstLetterId: 'mim' },
  { id: 'solar-system/saturn', category: 'solar-system', fa: 'کیوان', art: planetArt.saturn, audioKey: 'solar-system/saturn', firstLetterId: 'kaf' },
  { id: 'solar-system/uranus', category: 'solar-system', fa: 'اورانوس', art: planetArt.uranus, audioKey: 'solar-system/uranus', firstLetterId: 'alef' },
  { id: 'solar-system/neptune', category: 'solar-system', fa: 'نپتون', art: planetArt.neptune, audioKey: 'solar-system/neptune', firstLetterId: 'nun' },
];

export const QUEST_WORD_BY_ID: Record<string, QuestWord> = Object.fromEntries(
  QUEST_WORDS.map(w => [w.id, w]),
);

export const QUEST_WORD_IDS = new Set(QUEST_WORDS.map(w => w.id));
