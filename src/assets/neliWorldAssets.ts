import { characterAssets } from './characterAssets';

type RoomVariantSet = {
  phone?: any;
  tabletPortrait?: any;
  tabletLandscape?: any;
  universal?: any;
  premium?: any;
  master?: any;
};

function pickRoomBackground(variants: RoomVariantSet, width: number, height: number) {
  const isLandscape = width >= height;
  const aspect = width / height;
  const largestSide = Math.max(width, height);

  // Pick by SHAPE first, then by resolution. These are drawn with cover(), so
  // whatever doesn't match the screen's aspect gets cropped — and a landscape
  // phone at 2.2:1 handed the 16:9 art loses ~20% of its HEIGHT, which is
  // where floors, tables and counters sit. The `phone` variants are
  // 2796x1290 (2.17) — landscape-shaped, and were unreachable in landscape
  // because this branch only ever returned `universal`.
  if (isLandscape) {
    if (aspect >= 1.95) {
      return variants.phone ?? variants.universal ?? variants.premium ?? variants.master ?? variants.tabletLandscape;
    }
    if (aspect <= 1.48 && variants.tabletLandscape) return variants.tabletLandscape;
    if (largestSide >= 1400) {
      return variants.master ?? variants.premium ?? variants.universal ?? variants.tabletLandscape;
    }
    return variants.universal ?? variants.premium ?? variants.master ?? variants.tabletLandscape;
  }

  if (largestSide >= 1400) {
    return variants.master ?? variants.premium ?? variants.universal ?? variants.phone ?? variants.tabletPortrait ?? variants.tabletLandscape;
  }

  if (aspect >= 0.68 && variants.tabletPortrait) return variants.tabletPortrait;
  return variants.phone ?? variants.universal ?? variants.premium ?? variants.tabletPortrait ?? variants.tabletLandscape;
}

const bathroomSceneBackgrounds = {
  phone: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_phone_2796x1290_app_webp_q95.webp'),
  tabletPortrait: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_tablet_2732x2048_app_webp_q95.webp'),
  tabletLandscape: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_tablet_2732x2048_app_webp_q95.webp'),
  universal: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_universal_3840x2160_app_webp_q95.webp'),
  premium: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_premium_4096x2304_app_webp_q95.webp'),
  master: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_master_8000x4500_app_webp_q95.webp'),
} as const;

const livingRoomBackgrounds = {
  phone: require('../../assets/neli-world/backgrounds/Living Room/living_room_lavender_phone_2796x1290_app_webp_q95.webp'),
  tabletPortrait: require('../../assets/neli-world/backgrounds/Living Room/living_room_lavender_tablet_2732x2048_app_webp_q95.webp'),
  tabletLandscape: require('../../assets/neli-world/backgrounds/Living Room/living_room_lavender_tablet_2732x2048_app_webp_q95.webp'),
  universal: require('../../assets/neli-world/backgrounds/Living Room/living_room_lavender_universal_3840x2160_app_webp_q95.webp'),
  premium: require('../../assets/neli-world/backgrounds/Living Room/living_room_lavender_premium_4096x2304_app_webp_q95.webp'),
  master: require('../../assets/neli-world/backgrounds/Living Room/living_room_lavender_master_8000x4500_app_webp_q95.webp'),
} as const;

const brushTeethRoomBackgrounds = {
  phone: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_phone_2796x1290_app_webp_q95.webp'),
  tabletPortrait: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_tablet_2732x2048_app_webp_q95.webp'),
  tabletLandscape: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_tablet_2732x2048_app_webp_q95.webp'),
  universal: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_universal_3840x2160_app_webp_q95.webp'),
  premium: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_premium_4096x2304_app_webp_q95.webp'),
  master: require('../../assets/neli-world/backgrounds/Bathroom/bathroom_scene_master_8000x4500_app_webp_q95.webp'),
} as const;

const bedroomBackgrounds = {
  final: {
    phone: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_1448x1086.webp'),
    tabletPortrait: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_ipad_pro_2732x2048.webp'),
    tabletLandscape: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_tablet_2048x1536.webp'),
    universal: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_4096x3072.webp'),
    premium: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_4096x3072.webp'),
    master: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_max_5792x4344.webp'),
  },
  v2: {
    phone: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_1448x1086.webp'),
    tabletPortrait: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_ipad_pro_2732x2048.webp'),
    tabletLandscape: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_tablet_2048x1536.webp'),
    universal: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_4096x3072.webp'),
    premium: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_4096x3072.webp'),
    master: require('../../assets/neli-world/backgrounds/Bedroom/kids_bedroom_max_5792x4344.webp'),
  },
  dressUp: {
    phone: require('../../assets/neli-world/backgrounds/Bedroom-dressup/landscape_16x9_1280x720.webp'),
    tabletPortrait: require('../../assets/neli-world/backgrounds/Bedroom-dressup/landscape_4x3_2048x1536.webp'),
    tabletLandscape: require('../../assets/neli-world/backgrounds/Bedroom-dressup/landscape_16x10_1920x1200.webp'),
    universal: require('../../assets/neli-world/backgrounds/Bedroom-dressup/landscape_16x9_1920x1080.webp'),
    premium: require('../../assets/neli-world/backgrounds/Bedroom-dressup/landscape_16x9_2560x1440.webp'),
    master: require('../../assets/neli-world/backgrounds/Bedroom-dressup/landscape_16x9_3840x2160.webp'),
  },
} as const;

const kitchenBackgrounds = {
  brightAndCheerful: {
    phone: require('../../assets/neli-world/backgrounds/Kitchen/bright_and_cheerful_kitchen_interior_phone_2796x1290.webp'),
    tabletPortrait: require('../../assets/neli-world/backgrounds/Kitchen/bright_and_cheerful_kitchen_interior_tablet_2732x2048.webp'),
    tabletLandscape: require('../../assets/neli-world/backgrounds/Kitchen/bright_and_cheerful_kitchen_interior_tablet_2732x2048.webp'),
    universal: require('../../assets/neli-world/backgrounds/Kitchen/bright_and_cheerful_kitchen_interior_universal_3840x2160.webp'),
    premium: require('../../assets/neli-world/backgrounds/Kitchen/bright_and_cheerful_kitchen_interior_premium_4096x2304.webp'),
    master: require('../../assets/neli-world/backgrounds/Kitchen/bright_and_cheerful_kitchen_interior_master_8000x4500.webp'),
  },
  colorfulAndCozy: {
    phone: require('../../assets/neli-world/backgrounds/Kitchen/colorful_and_cozy_kitchen_interior_phone_2796x1290.webp'),
    tabletPortrait: require('../../assets/neli-world/backgrounds/Kitchen/colorful_and_cozy_kitchen_interior_tablet_2732x2048.webp'),
    tabletLandscape: require('../../assets/neli-world/backgrounds/Kitchen/colorful_and_cozy_kitchen_interior_tablet_2732x2048.webp'),
    universal: require('../../assets/neli-world/backgrounds/Kitchen/colorful_and_cozy_kitchen_interior_universal_3840x2160.webp'),
    premium: require('../../assets/neli-world/backgrounds/Kitchen/colorful_and_cozy_kitchen_interior_premium_4096x2304.webp'),
    master: require('../../assets/neli-world/backgrounds/Kitchen/colorful_and_cozy_kitchen_interior_master_8000x4500.webp'),
  },
  landscape: {
    phone: require('../../assets/neli-world/backgrounds/Kitchen/kitchen_landscape_1280x720.webp'),
    tabletPortrait: require('../../assets/neli-world/backgrounds/Kitchen/kitchen_landscape_2048x1536.webp'),
    tabletLandscape: require('../../assets/neli-world/backgrounds/Kitchen/kitchen_landscape_2048x1536.webp'),
    universal: require('../../assets/neli-world/backgrounds/Kitchen/kitchen_landscape_1920x1080.webp'),
    premium: require('../../assets/neli-world/backgrounds/Kitchen/kitchen_landscape_2560x1440.webp'),
    master: require('../../assets/neli-world/backgrounds/Kitchen/kitchen_landscape_3840x2160.webp'),
  },
} as const;

const playgroundBackgrounds = {
  phone: require('../../assets/neli-world/backgrounds/Playground/playground_final_phone_2796x1290_app_webp_q95.webp'),
  tabletPortrait: require('../../assets/neli-world/backgrounds/Playground/playground_final_tablet_2732x2048_app_webp_q95.webp'),
  tabletLandscape: require('../../assets/neli-world/backgrounds/Playground/playground_final_tablet_2732x2048_app_webp_q95.webp'),
  universal: require('../../assets/neli-world/backgrounds/Playground/playground_final_universal_3840x2160_app_webp_q95.webp'),
  premium: require('../../assets/neli-world/backgrounds/Playground/playground_final_premium_4096x2304_app_webp_q95.webp'),
  master: require('../../assets/neli-world/backgrounds/Playground/playground_final_master_8000x4500_app_webp_q95.webp'),
} as const;

const yardBackgrounds = {
  phone: require('../../assets/neli-world/backgrounds/Yard/outside_yard_scene_phone_2796x1290.webp'),
  tabletPortrait: require('../../assets/neli-world/backgrounds/Yard/outside_yard_scene_tablet_2732x2048.webp'),
  tabletLandscape: require('../../assets/neli-world/backgrounds/Yard/outside_yard_scene_tablet_2732x2048.webp'),
  universal: require('../../assets/neli-world/backgrounds/Yard/outside_yard_scene_universal_3840x2160.webp'),
  premium: require('../../assets/neli-world/backgrounds/Yard/outside_yard_scene_premium_4096x2304.webp'),
  master: require('../../assets/neli-world/backgrounds/Yard/outside_yard_scene_master_8000x4500.webp'),
} as const;

// The jungle set has no ultra-wide "phone" landscape variant, only a
// landscape/tabletLandscape pair and a separate portrait/tabletPortrait pair.
// pickRoomBackground's `phone` key does double duty (ultra-wide landscape
// fallback AND narrow-portrait fallback), which would misuse the portrait
// asset in landscape here — so jungle gets its own picker mirroring the
// thresholds FeedAnimalsGame already ships with, instead of the shared helper.
const jungleBackgrounds = {
  landscape: require('../../assets/neli-world/backgrounds/Jungle/jungle_landscape_3840x2160.webp'),
  tabletLandscape: require('../../assets/neli-world/backgrounds/Jungle/jungle_tablet_landscape_2732x2048.webp'),
  portrait: require('../../assets/neli-world/backgrounds/Jungle/jungle_phone_portrait_1080x1920.webp'),
  tabletPortrait: require('../../assets/neli-world/backgrounds/Jungle/jungle_tablet_portrait_1668x2224.webp'),
} as const;

function pickJungleBackground(width: number, height: number) {
  const isLandscape = width >= height;
  if (isLandscape) {
    return width / height > 1.45 ? jungleBackgrounds.landscape : jungleBackgrounds.tabletLandscape;
  }
  return height / width > 1.4 ? jungleBackgrounds.portrait : jungleBackgrounds.tabletPortrait;
}

export const roomBackgroundVariants = {
  bathroom: bathroomSceneBackgrounds,
  brushTeethBathroom: brushTeethRoomBackgrounds,
  bedroom: bedroomBackgrounds,
  kitchen: kitchenBackgrounds,
} as const;

export const roomBackgroundPickers = {
  bathroom: (width: number, height: number) => pickRoomBackground(bathroomSceneBackgrounds, width, height),
  brushTeethBathroom: (width: number, height: number) => pickRoomBackground(brushTeethRoomBackgrounds, width, height),
  bedroom: (width: number, height: number) => pickRoomBackground(bedroomBackgrounds.dressUp, width, height),
  talkPlay: (width: number, height: number) => pickRoomBackground(livingRoomBackgrounds, width, height),
  kitchen: (width: number, height: number) => pickRoomBackground(kitchenBackgrounds.landscape, width, height),
  kitchenCheerful: (width: number, height: number) => pickRoomBackground(kitchenBackgrounds.brightAndCheerful, width, height),
  garden: (width: number, height: number) => pickRoomBackground(yardBackgrounds, width, height),
  splash: (width: number, height: number) => pickRoomBackground(yardBackgrounds, width, height),
  feedAnimalsJungle: (width: number, height: number) => pickJungleBackground(width, height),
  playground: (width: number, height: number) => pickRoomBackground(playgroundBackgrounds, width, height),
} as const;

export const neliWorldAssets = {
  traceLetters: {
    alef: require('../../assets/neli-world/trace-letters/alef.webp'),
    be: require('../../assets/neli-world/trace-letters/be.webp'),
  },
  characters: {
    aidin: characterAssets.aidin.base,
    dara: characterAssets.dara.base,
    lila: characterAssets.lila.base,
    mila: characterAssets.mila.base,
    neli: characterAssets.neli.base,
    roboBoombo: characterAssets.roboBoombo.base,
    neliBlinkOverlay: require('../../assets/neli-world/characters/Neli/01_nelly_blink_overlay.webp'),
  },
  animals: {
    bear: require('../../assets/neli-world/animals/bear_kids_app_clean_transparent.webp'),
    cat: require('../../assets/neli-world/animals/cat_kids_app_clean_transparent.webp'),
    elephant: require('../../assets/neli-world/animals/giraffe_kids_app_clean_transparent.webp'),
    giraffe: require('../../assets/neli-world/animals/giraffe_kids_app_clean_transparent.webp'),
    monkey: require('../../assets/neli-world/animals/monkey.webp'),
    panda: require('../../assets/neli-world/animals/panda_kids_app_clean_transparent.webp'),
    rabbit: require('../../assets/neli-world/animals/rabbit_kids_app_clean_transparent.webp'),
  },
  bathroom: {
    toothbrush: require('../../assets/neli-world/bathroom/toothbrush.webp'),
    toothpaste: require('../../assets/neli-world/bathroom/toothpaste.webp'),
    bubbles: require('../../assets/neli-world/bathroom/bubbles.webp'),
    waterSplash: require('../../assets/neli-world/bathroom/water_splash.webp'),
    soap: require('../../assets/neli-world/bathroom/soap_dish.webp'),
    towel: require('../../assets/neli-world/bathroom/towel.webp'),
  },
    clothes: {
      apron: require('../../assets/neli-world/clothes/apron_blue.webp'),
      backpack: require('../../assets/neli-world/clothes/backpack.webp'),
      beanie: require('../../assets/neli-world/clothes/beanie_blue.webp'),
      boots: require('../../assets/neli-world/clothes/boots_purple.webp'),
      bag: require('../../assets/neli-world/clothes/bag_pink.webp'),
      book: require('../../assets/neli-world/clothes/book.webp'),
      bow: require('../../assets/neli-world/clothes/bow_pink.webp'),
    crown: require('../../assets/neli-world/clothes/crown_yellow.webp'),
    hanger: require('../../assets/neli-world/clothes/hanger.webp'),
    dress: require('../../assets/neli-world/clothes/dress_yellow.webp'),
      dressBlue: require('../../assets/neli-world/clothes/dress_blue.webp'),
      dressGreen: require('../../assets/neli-world/clothes/dress_green.webp'),
      dressLong: require('../../assets/neli-world/clothes/dress_long_purple.webp'),
      dressOrange: require('../../assets/neli-world/clothes/dress_orange.webp'),
      dressPink: require('../../assets/neli-world/clothes/dress_pink.webp'),
      dressRed: require('../../assets/neli-world/clothes/dress_red.webp'),
      gloves: require('../../assets/neli-world/clothes/gloves_blue.webp'),
      hat: require('../../assets/neli-world/clothes/hat_orange.webp'),
      hatBlue: require('../../assets/neli-world/clothes/hat_blue.webp'),
      hatPink: require('../../assets/neli-world/clothes/hat_pink.webp'),
      pants: require('../../assets/neli-world/clothes/pants_green.webp'),
      raincoat: require('../../assets/neli-world/clothes/raincoat_yellow.webp'),
      scarf: require('../../assets/neli-world/clothes/scarf_blue.webp'),
      shirt: require('../../assets/neli-world/clothes/shirt_blue.webp'),
      shirtPink: require('../../assets/neli-world/clothes/shirt_pink.webp'),
      shoes: require('../../assets/neli-world/clothes/shoes_blue.webp'),
      shoesGold: require('../../assets/neli-world/clothes/shoes_gold.webp'),
      shoesPink: require('../../assets/neli-world/clothes/shoes_pink.webp'),
      shoesWhite: require('../../assets/neli-world/clothes/shoes_white.webp'),
      shorts: require('../../assets/neli-world/clothes/shorts_purple.webp'),
      skirt: require('../../assets/neli-world/clothes/skirt_pink.webp'),
      socks: require('../../assets/neli-world/clothes/socks_pink.webp'),
      sunglasses: require('../../assets/neli-world/clothes/sunglasses.webp'),
      sunglassesBlack: require('../../assets/neli-world/clothes/sunglasses_black.webp'),
      sunglassesGold: require('../../assets/neli-world/clothes/sunglasses_gold.webp'),
      sunglassesPink: require('../../assets/neli-world/clothes/sunglasses_pink.webp'),
      sunhat: require('../../assets/neli-world/clothes/sunhat_yellow.webp'),
      sunhatCream: require('../../assets/neli-world/clothes/sunhat_cream.webp'),
      sweater: require('../../assets/neli-world/clothes/sweater_green.webp'),
  },
  foods: {
    apple: require('../../assets/neli-world/fruits/apple_1024.webp'),
    apricot: require('../../assets/neli-world/fruits/apricot_1024.webp'),
    banana: require('../../assets/neli-world/fruits/banana_1024.webp'),
    blueberries: require('../../assets/neli-world/fruits/blueberries_1024.webp'),
    blueberry: require('../../assets/neli-world/fruits/blueberry.webp'),
    cherries: require('../../assets/neli-world/fruits/cherries_1024.webp'),
    coconutHalf: require('../../assets/neli-world/fruits/coconut_half_1024.webp'),
    fig: require('../../assets/neli-world/fruits/fig_1024.webp'),
    grapes: require('../../assets/neli-world/fruits/grapes_1024.webp'),
    kiwi: require('../../assets/neli-world/fruits/kiwi_1024.webp'),
    lime: require('../../assets/neli-world/fruits/lime_1024.webp'),
    mango: require('../../assets/neli-world/fruits/mango_1024.webp'),
    orange: require('../../assets/neli-world/fruits/orange_1024.webp'),
    peach: require('../../assets/neli-world/fruits/peach_1024.webp'),
    pear: require('../../assets/neli-world/fruits/pear_1024.webp'),
    pineapple: require('../../assets/neli-world/fruits/pineapple_1024.webp'),
    plum: require('../../assets/neli-world/fruits/plum_1024.webp'),
    pomegranate: require('../../assets/neli-world/fruits/pomegranate_1024.webp'),
    raspberry: require('../../assets/neli-world/fruits/raspberry_1024.webp'),
    strawberry: require('../../assets/neli-world/fruits/strawberry_1024.webp'),
    watermelon: require('../../assets/neli-world/fruits/watermelon_slice_1024.webp'),
    bread: require('../../assets/neli-world/food-flat/toast.webp'),
    beans: require('../../assets/neli-world/ingredients/beans.webp'),
    chickpea: require('../../assets/neli-world/ingredients/chickpea.webp'),
    filletChickenRaw: require('../../assets/neli-world/ingredients/fillet_chicken_raw.webp'),
    cookingOil: require('../../assets/neli-world/ingredients/cooking_oil.webp'),
    jambon: require('../../assets/neli-world/ingredients/jambon.webp'),
    bellPepper: require('../../assets/neli-world/vegetables/bell_pepper.webp'),
    broccoli: require('../../assets/neli-world/vegetables/broccoli.webp'),
    cabbage: require('../../assets/neli-world/vegetables/cabbage.webp'),
    carrot: require('../../assets/neli-world/vegetables/carrot.webp'),
    carrotSticks: require('../../assets/neli-world/ingredients/carrot_sticks.webp'),
    cauliflower: require('../../assets/neli-world/vegetables/cauliflower.webp'),
    celery: require('../../assets/neli-world/vegetables/celery.webp'),
    cheese: require('../../assets/neli-world/ingredients/cheese.webp'),
    corn: require('../../assets/neli-world/vegetables/corn.webp'),
    cucumber: require('../../assets/neli-world/vegetables/cucumber.webp'),
    cucamberSlice: require('../../assets/neli-world/food-flat/cucamber_slice.webp'),
    cucumberSlice: require('../../assets/neli-world/food-flat/cucamber_slice.webp'),
    egg: require('../../assets/neli-world/ingredients/egg_whole.webp'),
    eggFried: require('../../assets/neli-world/ingredients/egg_fried.webp'),
    eggWhole: require('../../assets/neli-world/ingredients/egg_whole.webp'),
    eggplant: require('../../assets/neli-world/vegetables/eggplant.webp'),
    fish: require('../../assets/neli-world/ingredients/salmon.webp'),
    grapeLeaves: require('../../assets/neli-world/ingredients/grape_leaves.webp'),
    garlic: require('../../assets/neli-world/vegetables/garlic.webp'),
    groundBeefRaw: require('../../assets/neli-world/ingredients/ground_beef_raw.webp'),
    cutRawBeefForStew: require('../../assets/neli-world/ingredients/cut_raw_beef_for_stew.webp'),
    kalam: require('../../assets/neli-world/ingredients/kalam.webp'),
    honey: require('../../assets/neli-world/food-flat/honey.webp'),
    herbs: require('../../assets/neli-world/ingredients/herbs.webp'),
    driedMint: require('../../assets/neli-world/ingredients/herbs.webp'),
    lemon: require('../../assets/neli-world/ingredients/lemon_slice.webp'),
    lemonSlice: require('../../assets/neli-world/ingredients/lemon_slice.webp'),
    lentils: require('../../assets/neli-world/ingredients/lentils.webp'),
    lettuce: require('../../assets/neli-world/vegetables/lettuce.webp'),
    lappeh: require('../../assets/neli-world/ingredients/lappeh.webp'),
    milk: require('../../assets/neli-world/food-flat/milk.webp'),
    mushroom: require('../../assets/neli-world/vegetables/mushroom.webp'),
    onionSlice: require('../../assets/neli-world/vegetables/onion.webp'),
    onion: require('../../assets/neli-world/vegetables/onion.webp'),
    parsley: require('../../assets/neli-world/vegetables/parsley.webp'),
    peas: require('../../assets/neli-world/vegetables/peas.webp'),
    pepper: require('../../assets/neli-world/vegetables/pepper.webp'),
    pasta: require('../../assets/neli-world/food-flat/pasta.webp'),
    rawPasta: require('../../assets/neli-world/ingredients/raw_pasta.webp'),
    pizzaBread: require('../../assets/neli-world/ingredients/pizza_bread.webp'),
    pizzaCheese: require('../../assets/neli-world/ingredients/pizza_cheese.webp'),
    olive: require('../../assets/neli-world/ingredients/olive.webp'),
    potato: require('../../assets/neli-world/vegetables/potato.webp'),
    pumpkin: require('../../assets/neli-world/vegetables/pumpkin.webp'),
    radish: require('../../assets/neli-world/vegetables/radish.webp'),
    reshtehAshRaw: require('../../assets/neli-world/ingredients/reshteh_ash_raw.webp'),
    rice: require('../../assets/neli-world/ingredients/rice.webp'),
    salt: require('../../assets/neli-world/ingredients/salt.webp'),
    spinach: require('../../assets/neli-world/vegetables/spinach.webp'),
    somagh: require('../../assets/neli-world/ingredients/somagh.webp'),
    saffron: require('../../assets/neli-world/ingredients/saffron.webp'),
    tomato: require('../../assets/neli-world/vegetables/tomato.webp'),
    walnuts: require('../../assets/neli-world/ingredients/walnuts.webp'),
    zereshk: require('../../assets/neli-world/ingredients/zereshk.webp'),
    yogurt: require('../../assets/neli-world/ingredients/yogurt.webp'),
    water: require('../../assets/neli-world/ingredients/water.webp'),
    zucchini: require('../../assets/neli-world/vegetables/zucchini.webp'),
  },
  ingredients: {
    bamboo: require('../../assets/neli-world/ingredients/bamboo.webp'),
    book: require('../../assets/neli-world/ingredients/book.webp'),
    leaves: require('../../assets/neli-world/ingredients/leaves.webp'),
  },
  giraffe: {
    brushing: characterAssets.dara.poses.walking,
    cooking: characterAssets.dara.poses.cooking,
    happy: characterAssets.dara.poses.reading,
    waving: characterAssets.dara.poses.waving,
  },
  giraffePosesPremium: {
    brushingTeeth: characterAssets.dara.poses.brushing,
    cooking: characterAssets.dara.poses.cooking,
    happy: characterAssets.dara.poses.jumping,
    runningLaughing: characterAssets.dara.poses.running,
    talking: characterAssets.dara.poses.walking,
    waving: characterAssets.dara.poses.celebration,
  },
  kitchen: {
    bowl: require('../../assets/neli-world/kitchen/bowl.webp'),
    oil: require('../../assets/neli-world/ingredients/cooking_oil.webp'),
    pan: require('../../assets/neli-world/kitchen/pan.webp'),
    plate: require('../../assets/neli-world/kitchen/plate.webp'),
    pot: require('../../assets/neli-world/kitchen/pot.webp'),
  },
  persianFoods: {
    ashReshteh: require('../../assets/neli-world/persian-foods/ash_reshteh.webp'),
    dolme: require('../../assets/neli-world/persian-foods/dolmeh.webp'),
    fesenjan: require('../../assets/neli-world/persian-foods/fesenjan.webp'),
    gheimeh: require('../../assets/neli-world/persian-foods/gheimeh.webp'),
    kalamPolo: require('../../assets/neli-world/persian-foods/kalam_polo.webp'),
    ghormeSabzi: require('../../assets/neli-world/persian-foods/ghormeh_sabzi_bowl.webp'),
    jooje: require('../../assets/neli-world/persian-foods/jooje_kebab.webp'),
    kebab: require('../../assets/neli-world/persian-foods/kebab.webp'),
    kukuSabzi: require('../../assets/neli-world/persian-foods/kuku_sabzi.webp'),
    lavash: require('../../assets/neli-world/persian-foods/lavash.webp'),
    mastKhiar: require('../../assets/neli-world/persian-foods/mast_o_khiar_bowl.webp'),
    omelette: require('../../assets/neli-world/persian-foods/omelette.webp'),
    pasta: require('../../assets/neli-world/persian-foods/ready_pasta_dish.webp'),
    pizza: require('../../assets/neli-world/persian-foods/pizza.webp'),
    sabziPolo: require('../../assets/neli-world/persian-foods/sabzi_polo_ba_mahi.webp'),
    shiraziSalad: require('../../assets/neli-world/ingredients/salad_shirazi.webp'),
    tahchin: require('../../assets/neli-world/persian-foods/tahchin.webp'),
    tea: require('../../assets/neli-world/persian-foods/tea.webp'),
    zereshkPolo: require('../../assets/neli-world/persian-foods/zereshk_polo.webp'),
    zereshkPoloBaMorgh: require('../../assets/neli-world/persian-foods/zereshk_polo_ba_morgh.webp'),
  },
  rooms: {
    bathroom: bathroomSceneBackgrounds.universal,
    brushTeethBathroom: bathroomSceneBackgrounds.universal,
    brushTeethBathroomPortrait: bathroomSceneBackgrounds.phone,
    brushTeethBathroomTabletLandscape: bathroomSceneBackgrounds.tabletLandscape,
    brushTeethBathroomTabletPortrait: bathroomSceneBackgrounds.tabletPortrait,
    cookingTable: kitchenBackgrounds.landscape.universal,
    cookingTableTabletLandscape: kitchenBackgrounds.landscape.tabletLandscape,
    cookingTableTabletPortrait: kitchenBackgrounds.landscape.tabletPortrait,
    feedAnimalsJungle: require('../../assets/neli-world/backgrounds/Jungle/jungle_landscape_3840x2160.webp'),
    feedAnimalsJunglePortrait: require('../../assets/neli-world/backgrounds/Jungle/jungle_phone_portrait_1080x1920.webp'),
    feedAnimalsJungleTabletLandscape: require('../../assets/neli-world/backgrounds/Jungle/jungle_tablet_landscape_2732x2048.webp'),
    feedAnimalsJungleTabletPortrait: require('../../assets/neli-world/backgrounds/Jungle/jungle_tablet_portrait_1668x2224.webp'),
    bedroom: bedroomBackgrounds.final.universal,
    garden: yardBackgrounds.universal,
    kitchen: kitchenBackgrounds.landscape.universal,
    livingRoom: livingRoomBackgrounds.universal,
    talkPlay: livingRoomBackgrounds.universal,
    talkPlayPortrait: livingRoomBackgrounds.phone,
    talkPlayTabletLandscape: livingRoomBackgrounds.tabletLandscape,
    talkPlayTabletPortrait: livingRoomBackgrounds.tabletPortrait,
    talkPlayStageLandscape: livingRoomBackgrounds.universal,
    talkPlayWide: livingRoomBackgrounds.master,
    splashLandscape: yardBackgrounds.universal,
    splashPortrait: yardBackgrounds.phone,
    studyRoom: bedroomBackgrounds.final.universal,
    // Widest available variant of each set, for short/wide banner cards
    // (fixed-height, full-width panels) where `cover` needs a panoramic
    // source to avoid cropping most of the vertical content away — see
    // CLAUDE.md's "art anchored differently" note. Not a per-device pick;
    // these panels are always wider-than-tall regardless of screen size.
    gardenWide: yardBackgrounds.phone,
    kitchenWide: kitchenBackgrounds.landscape.phone,
    bedroomWide: bedroomBackgrounds.final.phone,
    bathroomWide: bathroomSceneBackgrounds.phone,
    livingRoomWide: livingRoomBackgrounds.phone,
  },
  puzzle: {
    solarSystem: require('../../assets/neli-world/puzzle/Solarsystem/solarsystem.webp'),
  },
  painting: {
    cardBunny: require('../../assets/neli-world/painting/painting_card_bunny.webp'),
  },
  ui: {
    back: require('../../assets/neli-world/ui-icons/ui/back.webp'),
    book: require('../../assets/neli-world/ui-icons/book.webp'),
    camera: require('../../assets/neli-world/ui-icons/camera.webp'),
    close: require('../../assets/neli-world/ui-icons/ui/close.webp'),
    gamepad: require('../../assets/neli-world/ui-icons/gamepad.webp'),
    heart: require('../../assets/neli-world/ui-icons/heart.webp'),
    home: require('../../assets/neli-world/ui-icons/home.webp'),
    lock: require('../../assets/neli-world/ui-icons/lock.webp'),
    microphone: require('../../assets/neli-world/ui-icons/microphone.webp'),
    next: require('../../assets/neli-world/ui-icons/ui/next.webp'),
    ok: require('../../assets/neli-world/ui-icons/ui/ok.webp'),
    paintbrush: require('../../assets/neli-world/ui-icons/paintbrush.webp'),
    pause: require('../../assets/neli-world/ui-icons/ui/pause.webp'),
    play: require('../../assets/neli-world/ui-icons/ui/play.webp'),
    point: require('../../assets/neli-world/ui-icons/point.webp'),
    restart: require('../../assets/neli-world/ui-icons/restart.webp'),
    rainbow: require('../../assets/neli-world/ui-icons/rainbow.webp'),
    settings: require('../../assets/neli-world/ui-icons/settings.webp'),
    settingsIcon: require('../../assets/neli-world/ui-icons/ui/setting.webp'),
    flagIran: require('../../assets/neli-world/ui-icons/flags/iran_sun_lion.webp'),
    sparkle: require('../../assets/neli-world/ui-icons/sparkle.webp'),
    spoon: require('../../assets/neli-world/ui-icons/spoon.webp'),
    star: require('../../assets/neli-world/ui-icons/star.webp'),
    brush: require('../../assets/neli-world/ui-icons/brush.webp'),
    toothbrush: require('../../assets/neli-world/ui-icons/toothbrush.webp'),
    trophy: require('../../assets/neli-world/ui-icons/trophy.webp'),
    voice: require('../../assets/neli-world/ui-icons/voice.webp'),
    stop: require('../../assets/neli-world/ui-icons/ui/stop.webp'),
    toyWagon: require('../../assets/neli-world/ui-icons/toy_wagon_transparent_1024.webp'),
    trainHead: require('../../assets/neli-world/ui-icons/trainhead.webp'),
  },
} as const;
