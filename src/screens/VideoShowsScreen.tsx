import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useWindowDimensions } from '../layout/PortraitFallback';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import TopBar from '../components/TopBar';
import { useNav } from '../store/NavContext';
import { useSpeech } from '../hooks/useSpeech';
import { ff } from '../theme/fonts';
import { C } from '../theme/colors';
import { neliWorldAssets, roomBackgroundPickers } from '../assets/neliWorldAssets';
import { characterAssets } from '../assets/characterAssets';
import { ALPHABET_AUDIO_ID_OVERRIDE, FA_AUDIO_KEYS, FALLBACK_LETTER_NAME_FA, makeAlphabetAudioKey, playFaAudio, playFaAudioOrSpeak } from '../utils/faAudio';
import PopperCelebration from '../components/PopperCelebration';

type AlphabetItem = {
  id: string;
  letter: string;
  wordFa: string;
  wordEn: string;
  hintFa: string;
  color: string;
  accent: string;
  soft: string;
};

export const ALPHABETS: AlphabetItem[] = [
  { id: 'alef', letter: 'ا', wordFa: 'آب', wordEn: 'Water', hintFa: 'آب از حرف ا شروع می‌شود.', color: '#38BDF8', accent: '#FDE047', soft: '#E0F2FE' },
  { id: 'be', letter: 'ب', wordFa: 'بادبادک', wordEn: 'Kite', hintFa: 'بادبادک با ب پرواز می‌کند.', color: '#FB7185', accent: '#60A5FA', soft: '#FCE7F3' },
  { id: 'pe', letter: 'پ', wordFa: 'پرتقال', wordEn: 'Orange', hintFa: 'پرتقالی شیرین و نارنجی.', color: '#F97316', accent: '#FACC15', soft: '#FFEDD5' },
  { id: 'te', letter: 'ت', wordFa: 'توپ', wordEn: 'Ball', hintFa: 'توپ را می‌توان غلت داد و پرید.', color: '#8B5CF6', accent: '#34D399', soft: '#EDE9FE' },
  { id: 'se', letter: 'ث', wordFa: 'ثانیه', wordEn: 'Second', hintFa: 'ثانیه یک بخش کوچک از زمان است.', color: '#06B6D4', accent: '#FDE047', soft: '#ECFEFF' },
  { id: 'jim', letter: 'ج', wordFa: 'جوجه', wordEn: 'Chick', hintFa: 'جوجه کوچک و زرد است.', color: '#F59E0B', accent: '#FB7185', soft: '#FEF3C7' },
  { id: 'che', letter: 'چ', wordFa: 'چتر', wordEn: 'Umbrella', hintFa: 'چتر ما را از باران نگه می‌دارد.', color: '#EC4899', accent: '#38BDF8', soft: '#FCE7F3' },
  { id: 'he-jimi', letter: 'ح', wordFa: 'حوله', wordEn: 'Towel', hintFa: 'حوله نرم و تمیز است.', color: '#14B8A6', accent: '#FDE047', soft: '#CCFBF1' },
  { id: 'khe', letter: 'خ', wordFa: 'خانه', wordEn: 'Home', hintFa: 'خانه جای گرم و امن ماست.', color: '#F97316', accent: '#A78BFA', soft: '#FFEDD5' },
  { id: 'dal', letter: 'د', wordFa: 'درخت', wordEn: 'Tree', hintFa: 'درخت شاخه و برگ دارد.', color: '#22C55E', accent: '#FACC15', soft: '#DCFCE7' },
  { id: 'zal', letter: 'ذ', wordFa: 'ذرت', wordEn: 'Corn', hintFa: 'ذرت دانه‌های زرد دارد.', color: '#EAB308', accent: '#22C55E', soft: '#FEF9C3' },
  { id: 're', letter: 'ر', wordFa: 'رود', wordEn: 'River', hintFa: 'رود آرام آرام حرکت می‌کند.', color: '#06B6D4', accent: '#A3E635', soft: '#ECFEFF' },
  { id: 'ze', letter: 'ز', wordFa: 'زنبور', wordEn: 'Bee', hintFa: 'زنبور کوچک پرواز می‌کند.', color: '#F59E0B', accent: '#1F2937', soft: '#FEF3C7' },
  { id: 'zhe', letter: 'ژ', wordFa: 'ژله', wordEn: 'Jelly', hintFa: 'ژله رنگی و لرزان است.', color: '#A855F7', accent: '#FB7185', soft: '#F3E8FF' },
  { id: 'sin', letter: 'س', wordFa: 'سیب', wordEn: 'Apple', hintFa: 'سیب سالم و خوشمزه است.', color: '#10B981', accent: '#F97316', soft: '#DCFCE7' },
  { id: 'shin', letter: 'ش', wordFa: 'شیر', wordEn: 'Milk', hintFa: 'شیر یک نوشیدنی سفید است.', color: '#38BDF8', accent: '#FFFFFF', soft: '#E0F2FE' },
  { id: 'sad', letter: 'ص', wordFa: 'صابون', wordEn: 'Soap', hintFa: 'صابون دست‌ها را تمیز می‌کند.', color: '#0EA5E9', accent: '#F9A8D4', soft: '#E0F2FE' },
  { id: 'zad', letter: 'ض', wordFa: 'ضربدر', wordEn: 'Cross', hintFa: 'ضربدر از دو خط ساخته می‌شود.', color: '#F43F5E', accent: '#FFFFFF', soft: '#FFE4E6' },
  { id: 'ta', letter: 'ط', wordFa: 'طوطی', wordEn: 'Parrot', hintFa: 'طوطی پرهای رنگی دارد.', color: '#22C55E', accent: '#FACC15', soft: '#DCFCE7' },
  { id: 'za', letter: 'ظ', wordFa: 'ظرف', wordEn: 'Dish', hintFa: 'ظرف برای نگه داشتن غذاست.', color: '#8B5CF6', accent: '#FDE047', soft: '#EDE9FE' },
  { id: 'eyn', letter: 'ع', wordFa: 'عینک', wordEn: 'Glasses', hintFa: 'عینک کمک می‌کند بهتر ببینیم.', color: '#6366F1', accent: '#FACC15', soft: '#E0E7FF' },
  { id: 'gheyn', letter: 'غ', wordFa: 'غذا', wordEn: 'Food', hintFa: 'غذا به بدن انرژی می‌دهد.', color: '#F97316', accent: '#22C55E', soft: '#FFEDD5' },
  { id: 'fe', letter: 'ف', wordFa: 'فیل', wordEn: 'Elephant', hintFa: 'فیل بزرگ و مهربان است.', color: '#64748B', accent: '#F9A8D4', soft: '#F1F5F9' },
  { id: 'ghaf', letter: 'ق', wordFa: 'قایق', wordEn: 'Boat', hintFa: 'قایق روی آب حرکت می‌کند.', color: '#0EA5E9', accent: '#F97316', soft: '#E0F2FE' },
  { id: 'kaf', letter: 'ک', wordFa: 'کتاب', wordEn: 'Book', hintFa: 'کتاب پر از قصه و یادگیری است.', color: '#7C3AED', accent: '#FACC15', soft: '#EDE9FE' },
  { id: 'gaf', letter: 'گ', wordFa: 'گل', wordEn: 'Flower', hintFa: 'گل زیبا و خوش‌بو است.', color: '#EC4899', accent: '#22C55E', soft: '#FCE7F3' },
  { id: 'lam', letter: 'ل', wordFa: 'لیمو', wordEn: 'Lemon', hintFa: 'لیمو ترش و زرد است.', color: '#EAB308', accent: '#22C55E', soft: '#FEF9C3' },
  { id: 'mim', letter: 'م', wordFa: 'ماهی', wordEn: 'Fish', hintFa: 'ماهی در آب شنا می‌کند.', color: '#14B8A6', accent: '#A78BFA', soft: '#CCFBF1' },
  { id: 'noon', letter: 'ن', wordFa: 'نان', wordEn: 'Bread', hintFa: 'نان گرم و خوشمزه است.', color: '#F43F5E', accent: '#FACC15', soft: '#FFE4E6' },
  { id: 'vav', letter: 'و', wordFa: 'ورزش', wordEn: 'Exercise', hintFa: 'ورزش بدن را قوی می‌کند.', color: '#16A34A', accent: '#38BDF8', soft: '#DCFCE7' },
  { id: 'he', letter: 'ه', wordFa: 'هویج', wordEn: 'Carrot', hintFa: 'هویج نارنجی و ترد است.', color: '#F97316', accent: '#22C55E', soft: '#FFEDD5' },
  { id: 'ye', letter: 'ی', wordFa: 'یخ', wordEn: 'Ice', hintFa: 'یخ سرد و شفاف است.', color: '#38BDF8', accent: '#FFFFFF', soft: '#E0F2FE' },
];

function AlphabetShowPlayer({
  initialIndex,
  onClose,
  speak,
  stop,
}: {
  initialIndex: number;
  onClose: () => void;
  speak: (text: string) => void;
  stop: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const item = ALPHABETS[index];
  const letterX = useRef(new Animated.Value(-360)).current;
  const letterY = useRef(new Animated.Value(-70)).current;
  const letterScale = useRef(new Animated.Value(0.25)).current;
  const letterSpin = useRef(new Animated.Value(0)).current;
  const wordOpacity = useRef(new Animated.Value(0)).current;
  const wordY = useRef(new Animated.Value(55)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const dance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    letterX.setValue(-360);
    letterY.setValue(-70);
    letterScale.setValue(0.25);
    letterSpin.setValue(0);
    wordOpacity.setValue(0);
    wordY.setValue(55);
    burst.setValue(0);
    dance.setValue(0);

    stop();
    speak(`${item.letter}. ${item.wordFa}`);

    const entrance = Animated.sequence([
      Animated.parallel([
        Animated.spring(letterX, { toValue: 0, tension: 44, friction: 6, useNativeDriver: true }),
        Animated.spring(letterY, { toValue: 0, tension: 48, friction: 5, useNativeDriver: true }),
        Animated.spring(letterScale, { toValue: 1, tension: 48, friction: 5, useNativeDriver: true }),
        Animated.timing(letterSpin, { toValue: 1, duration: 760, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.spring(wordY, { toValue: 0, tension: 54, friction: 6, useNativeDriver: true }),
        Animated.timing(burst, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(dance, { toValue: 1, duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(dance, { toValue: -1, duration: 360, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.spring(dance, { toValue: 0, tension: 58, friction: 5, useNativeDriver: true }),
      ]),
    ]);
    entrance.start();

    if (!playing) return () => entrance.stop();
    const timer = setTimeout(() => setIndex(current => (current + 1) % ALPHABETS.length), 4200);
    return () => {
      clearTimeout(timer);
      entrance.stop();
    };
  }, [burst, dance, index, item.letter, item.wordFa, letterScale, letterSpin, letterX, letterY, playing, speak, stop, wordOpacity, wordY]);

  const goTo = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIndex((next + ALPHABETS.length) % ALPHABETS.length);
  };

  const close = () => {
    stop();
    onClose();
  };

  const spin = letterSpin.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });
  const danceRotate = dance.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] });
  const danceY = dance.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, -18] });

  return (
    <View style={[styles.showStage, { backgroundColor: item.soft }]}>
      <View style={[styles.showBlob, styles.showBlobOne, { backgroundColor: item.color }]} />
      <View style={[styles.showBlob, styles.showBlobTwo, { backgroundColor: item.accent }]} />
      <View style={styles.showProgress}>
        {ALPHABETS.map((letter, progressIndex) => (
          <View
            key={letter.id}
            style={[
              styles.showProgressDot,
              progressIndex === index && { width: 24, backgroundColor: item.color },
              progressIndex < index && styles.showProgressDone,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.showClose} onPress={close} activeOpacity={0.82}>
        <Text style={styles.showCloseText}>×</Text>
      </TouchableOpacity>

      {[0, 1, 2, 3, 4, 5].map(sparkIndex => {
        const angle = (Math.PI * 2 * sparkIndex) / 6;
        const radius = 118;
        return (
          <Animated.View
            key={sparkIndex}
            style={[
              styles.showSpark,
              {
                backgroundColor: sparkIndex % 2 ? item.color : item.accent,
                opacity: burst.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * radius] }) },
                  { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * radius] }) },
                  { scale: burst.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 1.3, 0.5] }) },
                ],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.showLetter,
          {
            backgroundColor: item.color,
            transform: [
              { translateX: letterX },
              { translateY: Animated.add(letterY, danceY) },
              { scale: letterScale },
              { rotate: spin },
              { rotateZ: danceRotate },
            ],
          },
        ]}
      >
        <View style={[styles.showLetterShine, { backgroundColor: item.accent }]} />
        <Text style={styles.showLetterText}>{item.letter}</Text>
        <View style={styles.showFace}>
          <View style={styles.showEye} />
          <View style={styles.showEye} />
        </View>
        <View style={styles.showSmile} />
      </Animated.View>

      <Animated.View style={[styles.showWordCard, { opacity: wordOpacity, transform: [{ translateY: wordY }] }]}>
        <Text style={styles.showWord}>{item.wordFa}</Text>
        <Text style={styles.showHint}>{item.hintFa}</Text>
      </Animated.View>

      <View style={styles.showControls}>
        <TouchableOpacity style={styles.showControlButton} onPress={() => goTo(index - 1)} activeOpacity={0.82}>
          <Text style={styles.showControlText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.showPlayButton, { backgroundColor: item.color }]}
          onPress={() => setPlaying(current => !current)}
          activeOpacity={0.82}
        >
          <Text style={styles.showPlayText}>{playing ? '❚❚' : '▶'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.showControlButton} onPress={() => goTo(index + 1)} activeOpacity={0.82}>
          <Text style={styles.showControlText}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const EXAMPLE_IMAGE_BY_ID: Partial<Record<string, any>> = {
  alef: neliWorldAssets.foods.water,
  be: require('../../assets/neli-world/alphabet-icons/kite.webp'),
  pe: require('../../assets/neli-world/fruits/orange.webp'),
  te: require('../../assets/neli-world/alphabet-icons/ball.webp'),
  se: require('../../assets/neli-world/alphabet-icons/clock.webp'),
  jim: require('../../assets/neli-world/alphabet-icons/chick.webp'),
  che: require('../../assets/neli-world/alphabet-icons/umbrella.webp'),
  'he-jimi': neliWorldAssets.bathroom.towel,
  khe: require('../../assets/neli-world/alphabet-icons/house.webp'),
  dal: require('../../assets/neli-world/alphabet-icons/tree.webp'),
  zal: neliWorldAssets.foods.corn,
  re: require('../../assets/neli-world/alphabet-icons/river.webp'),
  ze: require('../../assets/neli-world/alphabet-icons/bee.webp'),
  zhe: require('../../assets/neli-world/alphabet-icons/jelly.webp'),
  sin: require('../../assets/neli-world/fruits/apple.webp'),
  shin: neliWorldAssets.foods.milk,
  sad: neliWorldAssets.bathroom.soap,
  zad: require('../../assets/neli-world/alphabet-icons/cross.webp'),
  ta: require('../../assets/neli-world/alphabet-icons/parrot.webp'),
  za: neliWorldAssets.kitchen.plate,
  eyn: neliWorldAssets.clothes.sunglasses,
  gheyn: neliWorldAssets.persianFoods.ashReshteh,
  fe: require('../../assets/neli-world/alphabet-icons/elephant.webp'),
  ghaf: require('../../assets/neli-world/alphabet-icons/boat.webp'),
  kaf: neliWorldAssets.ingredients.book,
  gaf: require('../../assets/neli-world/alphabet-icons/flower.webp'),
  lam: require('../../assets/neli-world/fruits/lime.webp'),
  mim: neliWorldAssets.foods.fish,
  noon: neliWorldAssets.foods.bread,
  vav: require('../../assets/neli-world/alphabet-icons/exercise.webp'),
  he: neliWorldAssets.foods.carrot,
  ye: require('../../assets/neli-world/alphabet-icons/ice.webp'),
};

const MASCOTS = [
  neliWorldAssets.characters.lila,
  neliWorldAssets.animals.rabbit,
  neliWorldAssets.animals.monkey,
];

const ALPHABET_PUSHERS = [
  characterAssets.neli.poses.walking,
  characterAssets.dara.poses.walking,
  characterAssets.lila.poses.walking,
  characterAssets.mila.poses.walking,
  characterAssets.aidin.poses.walking,
];

type SceneBubbleProps = {
  item: AlphabetItem;
  source?: any;
  index: number;
  active: boolean;
  revealed: boolean;
  selected: boolean;
  size: number;
  onPress: () => void;
};

function SceneBubble({ item, source, index, active, revealed, selected, size, onPress }: SceneBubbleProps) {
  const reveal = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!revealed) return;
    Animated.spring(reveal, {
      toValue: 1,
      delay: (index % 4) * 24,
      tension: 72,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [index, reveal, revealed]);

  useEffect(() => {
    if (!active && !selected) {
      Animated.spring(pulse, { toValue: 0, tension: 90, friction: 8, useNativeDriver: true }).start();
      return;
    }
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1, tension: 90, friction: 5, useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 0.35, tension: 80, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [active, pulse, selected]);

  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <Animated.View
      style={[
        styles.sceneBubbleWrap,
        {
          width: size,
          opacity: reveal,
          transform: [
            { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
            { scale: revealScale },
            { scale: pulseScale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onPress}
        style={[
          styles.sceneBubble,
          {
            minHeight: size * 1.05,
            borderColor: selected ? '#FFE66D' : '#FFFFFF',
            backgroundColor: selected ? '#FFF8CE' : item.soft,
          },
        ]}
      >
        <View style={[styles.letterBadge, { backgroundColor: item.color }]}>
          <Text style={styles.letterBadgeText}>{item.letter}</Text>
        </View>
        <View style={[styles.imageCloud, { backgroundColor: item.accent }]}>
          {source ? <Image source={source} style={styles.bubbleImage} resizeMode="contain" /> : <Text style={styles.fallbackLetter}>{item.letter}</Text>}
        </View>
        <Text style={styles.bubbleWord} numberOfLines={1}>{item.wordFa}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function AlphabetScenePlayer({
  onClose,
  speak,
  stop,
}: {
  onClose: () => void;
  speak: (text: string) => void;
  stop: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [revealedCount, setRevealedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = ALPHABETS[selectedIndex];
  const selectedSource = EXAMPLE_IMAGE_BY_ID[selected.id];
  const isWide = width >= height;
  const bubbleSize = Math.max(104, Math.min(142, (width - 72) / (isWide ? 8 : 4)));

  useEffect(() => {
    const revealTimer = setInterval(() => {
      setRevealedCount(current => {
        if (current >= ALPHABETS.length) {
          clearInterval(revealTimer);
          return current;
        }
        return current + 1;
      });
    }, 95);
    return () => clearInterval(revealTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setActiveIndex(current => (current + 1) % ALPHABETS.length), 950);
    return () => clearInterval(timer);
  }, []);

  const playItem = (item: AlphabetItem, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stop();
    setSelectedIndex(index);
    setActiveIndex(index);
    speak(`${item.letter}! ${item.wordFa}! ${item.wordFa}!`);
  };

  const close = () => {
    stop();
    onClose();
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={roomBackgroundPickers.garden(width, height)} style={StyleSheet.absoluteFill} imageStyle={styles.bgImage} resizeMode="cover">
        <LinearGradient colors={['rgba(74, 210, 255, 0.56)', 'rgba(255, 250, 217, 0.35)', 'rgba(71, 190, 118, 0.38)']} style={StyleSheet.absoluteFill} />
      </ImageBackground>
      <TopBar title="Alphabet Show" titleFa="نمایش الفبا" showClose dark topInset={10} onBack={close} />

      <View style={styles.stage}>
        <View style={styles.mascotRail}>
          {MASCOTS.map((mascot, index) => (
            <Animated.Image
              key={index}
              source={mascot}
              resizeMode="contain"
              style={[
                styles.mascot,
                {
                  transform: [
                    { rotate: index === 1 ? '-6deg' : index === 2 ? '7deg' : '0deg' },
                    { translateY: index === activeIndex % MASCOTS.length ? -8 : 0 },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introKicker}>بزن، ببین، بگو!</Text>
          <Text style={styles.introTitle}>هر تصویر یک حرف قایم کرده</Text>
          <Text style={styles.introSub}>روی عکس‌ها بزن تا حرف بزرگ شود و اسمش را با صدای بلند بشنوی.</Text>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.spotlight}>
            <View style={[styles.spotlightLetter, { backgroundColor: selected.color }]}>
              <Text style={styles.spotlightLetterText}>{selected.letter}</Text>
            </View>
            <View style={styles.spotlightImageWrap}>
              {selectedSource ? <Image source={selectedSource} style={styles.spotlightImage} resizeMode="contain" /> : null}
            </View>
            <Text style={styles.spotlightWord}>{selected.wordFa}</Text>
            <TouchableOpacity activeOpacity={0.86} style={[styles.sayButton, { backgroundColor: selected.color }]} onPress={() => playItem(selected, selectedIndex)}>
              <Text style={styles.sayButtonText}>دوباره بگو</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sceneScroll} contentContainerStyle={styles.sceneGrid} showsVerticalScrollIndicator={false}>
            {ALPHABETS.map((item, index) => (
              <SceneBubble
                key={item.id}
                item={item}
                source={EXAMPLE_IMAGE_BY_ID[item.id]}
                index={index}
                active={index === activeIndex}
                revealed={index < revealedCount}
                selected={index === selectedIndex}
                size={bubbleSize}
                onPress={() => playItem(item, index)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function SequentialAlphabetShowPlayer({
  onClose,
  speak,
  stop,
}: {
  onClose: () => void;
  speak: (text: string) => void;
  stop: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const item = ALPHABETS[index];
  const exampleSource = EXAMPLE_IMAGE_BY_ID[item.id];
  const characterSource = ALPHABET_PUSHERS[index % ALPHABET_PUSHERS.length];
  const isWide = width >= height;
  const motion = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const bounceStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Separate from `timerRef` (which holds the audio-sequence timeout) so
  // both can be tracked/cleared independently — see `tryAdvance` below.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // speak/stop/onClose come from hooks that hand back a new function identity on
  // every render (e.g. useSpeech is re-created whenever the app-wide usage-timer
  // context ticks, once a second). Keeping them out of the sequencing effect's
  // dependency array - via refs - stops that unrelated re-render from tearing
  // down and restarting the entrance animation before it can ever finish, which
  // is what was freezing the show on the first letter.
  const speakRef = useRef(speak);
  const stopRef = useRef(stop);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    speakRef.current = speak;
    stopRef.current = stop;
    onCloseRef.current = onClose;
  }, [speak, stop, onClose]);
  const characterSize = Math.max(150, Math.min(isWide ? 250 : 210, width * (isWide ? 0.22 : 0.38)));
  const letterSize = Math.max(150, Math.min(isWide ? 230 : 200, width * (isWide ? 0.20 : 0.36)));
  const letterLift = item.id === 'gheyn' ? -8 : 0;
  const characterLift = item.id === 'gheyn' ? -characterSize * 0.05 : 0;

  useEffect(() => {
    setFinished(false);
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    animationRef.current?.stop();
    animationRef.current = null;
    bounceLoopRef.current?.stop();
    bounceLoopRef.current = null;
    if (bounceStartTimerRef.current) clearTimeout(bounceStartTimerRef.current);
    if (bounceStopTimerRef.current) clearTimeout(bounceStopTimerRef.current);
    bounce.setValue(0);

    motion.setValue(0);
    stopRef.current();

    // The letter's audio (name, then example) doesn't always finish inside the
    // same fixed window as the visual slide/bounce animation — the name falls
    // back to on-device TTS for a few letters whose recorded clip is broken
    // (e.g. "jim"/ج), and that can take longer to finish speaking than the
    // animation takes to run. Advancing to the next letter — or closing out on
    // the last one — as soon as the ANIMATION finished used to call
    // stopRef.current() for the new letter while the previous letter's TTS was
    // still talking, cutting it off mid-word. Now advancing waits for BOTH the
    // animation and the full name+example audio sequence to finish.
    let cancelled = false;
    let animationDone = false;
    let audioDone = false;

    const tryAdvance = () => {
      if (cancelled || !animationDone || !audioDone) return;
      if (index >= ALPHABETS.length - 1) {
        setFinished(true);
        setShowCelebration(true);
        void playFaAudio(FA_AUDIO_KEYS.feedback.afarin).then(() => {
          if (!cancelled) setTimeout(() => onCloseRef.current(), 3500);
        });
        return;
      }
      advanceTimerRef.current = setTimeout(() => {
        if (!cancelled) setIndex(current => current + 1);
      }, 90);
    };

    // Only hop gently while the character is settled on stage (not while sliding
    // in/out), so the bounce doesn't fight with the slide-in motion and read as messy.
    bounceStartTimerRef.current = setTimeout(() => {
      bounceLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, { toValue: 1, duration: 340, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0, duration: 340, easing: Easing.in(Easing.sin), useNativeDriver: true }),
          Animated.delay(320),
        ]),
      );
      bounceLoopRef.current.start();
    }, 700);
    bounceStopTimerRef.current = setTimeout(() => {
      bounceLoopRef.current?.stop();
      bounceLoopRef.current = null;
      Animated.timing(bounce, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, 1480);

    animationRef.current = Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(150),
      Animated.timing(motion, { toValue: 1.65, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(motion, { toValue: 2, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);

    animationRef.current.start(({ finished: animationFinished }) => {
      animationRef.current = null;
      if (!animationFinished) return;
      animationDone = true;
      tryAdvance();
    });

    timerRef.current = setTimeout(async () => {
      // A handful of ids used by ALPHABETS below (he-jimi/ta/za/noon/he)
      // differ from the ids the recorded voice clips are keyed under
      // (haa/taa/zaa/nun/heh) — translate first so those letters find their
      // recorded clip too, instead of always falling back to TTS.
      const audioId = ALPHABET_AUDIO_ID_OVERRIDE[item.id] ?? item.id;
      const nameKey = makeAlphabetAudioKey('name', audioId);
      const exampleKey = makeAlphabetAudioKey('example', audioId);
      // playFaAudioOrSpeak already skips known-broken/garbled recorded clips
      // (BROKEN_ALPHABET_AUDIO) and falls back to TTS — a raw playFaAudio()
      // here would happily play a broken clip just because the file exists.
      // `rate: 1.0` only speeds up that TTS fallback (recorded clips always
      // play at their own fixed speed regardless of this option).
      await playFaAudioOrSpeak(nameKey, FALLBACK_LETTER_NAME_FA[audioId] ?? item.letter, { awaitFinish: true, rate: 1.0 });
      if (cancelled) return;
      await new Promise(r => setTimeout(r, 90));
      if (cancelled) return;
      await playFaAudioOrSpeak(exampleKey, item.wordFa, { awaitFinish: true, rate: 1.0 });
      if (cancelled) return;
      audioDone = true;
      tryAdvance();
    }, 550);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
      animationRef.current?.stop();
      animationRef.current = null;
      bounceLoopRef.current?.stop();
      bounceLoopRef.current = null;
      if (bounceStartTimerRef.current) {
        clearTimeout(bounceStartTimerRef.current);
        bounceStartTimerRef.current = null;
      }
      if (bounceStopTimerRef.current) {
        clearTimeout(bounceStopTimerRef.current);
        bounceStopTimerRef.current = null;
      }
    };
    // Intentionally NOT depending on speak/stop/onClose: those are read via refs
    // above so that their unstable identity (see comment near the ref
    // declarations) doesn't restart this sequence on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounce, index, item.letter, item.wordFa, motion]);

  const close = () => {
    stop();
    bounceLoopRef.current?.stop();
    if (bounceStartTimerRef.current) clearTimeout(bounceStartTimerRef.current);
    if (bounceStopTimerRef.current) clearTimeout(bounceStopTimerRef.current);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    animationRef.current?.stop();
    onClose();
  };

  return (
    <View style={[styles.sequenceRoot, { backgroundColor: item.soft }]}>
      <View style={[styles.sequenceBlob, styles.sequenceBlobA, { backgroundColor: item.color }]} />
      <View style={[styles.sequenceBlob, styles.sequenceBlobB, { backgroundColor: item.accent }]} />
      <TopBar title="Alphabet Show" titleFa="نمایش الفبا" showClose dark topInset={10} onBack={close} />

      <View style={styles.sequenceProgress}>
        {ALPHABETS.map((letter, progressIndex) => (
          <View
            key={letter.id}
            style={[
              styles.sequenceProgressDot,
              progressIndex < index && styles.sequenceProgressDone,
              progressIndex === index && { width: 24, backgroundColor: item.color },
            ]}
          />
        ))}
      </View>

      <View style={styles.sequenceStage}>
        <Animated.View
          style={[
            styles.sequencePushGroup,
            {
              transform: [
                {
                  translateX: motion.interpolate({
                    inputRange: [0, 1, 1.65, 2],
                    outputRange: [-900, 0, 0, 620],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.Image
            source={characterSource}
            resizeMode="contain"
            style={[
              styles.sequenceCharacter,
              {
                width: characterSize,
                height: characterSize * 1.24,
                transform: [
                  { translateY: characterLift },
                  {
                    translateY: bounce.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -characterSize * 0.08],
                    }),
                  },
                  {
                    scaleY: bounce.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.035],
                    }),
                  },
                  {
                    scaleX: bounce.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.975],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sequenceLetterCard,
              {
                width: letterSize,
                height: letterSize,
                transform: [
                  { translateY: letterLift },
                  {
                    scale: motion.interpolate({
                      inputRange: [0, 0.35, 1, 1.65, 2],
                      outputRange: [0.78, 0.94, 1, 1, 0.96],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={[styles.sequenceLetter, { fontSize: letterSize * 0.54, lineHeight: letterSize * 0.7 }]}>{item.letter}</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[
            styles.sequenceExample,
            {
              opacity: motion.interpolate({
                inputRange: [0, 0.86, 1, 1.6, 1.85, 2],
                outputRange: [0, 0, 1, 1, 0.15, 0],
              }),
              transform: [
                {
                  scale: motion.interpolate({
                    inputRange: [0, 1, 1.65, 2],
                    outputRange: [0.72, 1, 0.96, 0.9],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sequenceExampleImageWrap}>
            {exampleSource ? (
              <Image source={exampleSource} style={styles.sequenceExampleImage} resizeMode="contain" />
            ) : null}
          </View>
          <Text style={styles.sequenceWord}>{item.wordFa}</Text>
        </Animated.View>

      </View>
      <PopperCelebration visible={showCelebration} onComplete={() => setShowCelebration(false)} />
    </View>
  );
}

export default function VideoShowsScreen() {
  const { reset } = useNav();
  const { speakFarsiOnly, stop } = useSpeech();
  return <SequentialAlphabetShowPlayer onClose={() => reset({ name: 'Main', tab: 'Games' })} speak={speakFarsiOnly} stop={stop} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#27105F' },
  // Without an explicit imageStyle, react-native-web can leave the background
  // <img> unsized in some nested-flex layouts, so it falls back to its own
  // huge natural pixel size and only a random cropped sliver shows.
  bgImage: { width: '100%', height: '100%' },
  sequenceRoot: { flex: 1, overflow: 'hidden' },
  sequenceBlob: { position: 'absolute', borderRadius: 999, opacity: 0.18 },
  sequenceBlobA: { width: 320, height: 320, top: -120, right: -88 },
  sequenceBlobB: { width: 260, height: 260, bottom: -94, left: -72 },
  sequenceProgress: {
    position: 'absolute',
    top: 74,
    left: 72,
    right: 72,
    zIndex: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  sequenceProgressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(37,16,92,0.18)' },
  sequenceProgressDone: { backgroundColor: 'rgba(37,16,92,0.42)' },
  sequenceStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 18 },
  sequencePushGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 8,
  },
  sequenceCharacter: { marginRight: -18, zIndex: 9 },
  sequenceLetterCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sequenceLetter: {
    color: '#FFFFFF',
    fontFamily: ff('fa', 'black'),
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.13)',
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 8,
  },
  sequenceExample: {
    marginTop: 18,
    minWidth: 260,
    maxWidth: '84%',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    zIndex: 7,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#170736',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  sequenceExampleImageWrap: {
    width: 138,
    height: 116,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sequenceExampleImage: { width: '86%', height: '86%' },
  sequenceWord: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 30, lineHeight: 39, textAlign: 'center' },
  sequenceEnglish: { color: '#6B5A89', fontFamily: ff('en', 'bold'), fontSize: 13, lineHeight: 18, textAlign: 'center', textTransform: 'uppercase' },
  sequenceRestart: {
    position: 'absolute',
    bottom: 18,
    minWidth: 118,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    zIndex: 20,
  },
  sequenceRestartText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 16 },
  stage: { flex: 1, paddingHorizontal: 18, paddingBottom: 18 },
  mascotRail: {
    position: 'absolute',
    top: 78,
    right: 18,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  mascot: {
    width: 82,
    height: 108,
  },
  introCard: {
    alignSelf: 'center',
    width: '72%',
    maxWidth: 560,
    marginTop: 0,
    marginBottom: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#1F5B3B',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  introKicker: { color: '#F97316', fontFamily: ff('fa', 'black'), fontSize: 15, textAlign: 'center' },
  introTitle: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 25, lineHeight: 33, textAlign: 'center' },
  introSub: { color: '#5A5572', fontFamily: ff('fa', 'regular'), fontSize: 13, lineHeight: 20, textAlign: 'center' },
  contentRow: { flex: 1, flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  spotlight: {
    width: 238,
    borderRadius: 34,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#153B2E',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  spotlightLetter: {
    width: 118,
    height: 118,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#FFFFFF',
  },
  spotlightLetterText: {
    color: '#FFFFFF',
    fontFamily: ff('fa', 'black'),
    fontSize: 70,
    lineHeight: 90,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  spotlightImageWrap: {
    width: 162,
    height: 136,
    marginTop: 10,
    borderRadius: 38,
    backgroundColor: '#FFF7D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightImage: { width: '86%', height: '86%' },
  spotlightWord: {
    marginTop: 8,
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 28,
    lineHeight: 38,
    textAlign: 'center',
  },
  sayButton: {
    marginTop: 8,
    minWidth: 132,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  sayButtonText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 14 },
  sceneScroll: { flex: 1 },
  sceneGrid: {
    padding: 8,
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  sceneBubbleWrap: { alignItems: 'center' },
  sceneBubble: {
    width: '100%',
    padding: 8,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 4,
    shadowColor: '#164A3A',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  letterBadge: {
    position: 'absolute',
    top: -7,
    left: -7,
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  letterBadgeText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 23, lineHeight: 31 },
  imageCloud: {
    width: '88%',
    aspectRatio: 1,
    marginTop: 8,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
  },
  bubbleImage: { width: '86%', height: '86%' },
  fallbackLetter: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 42 },
  bubbleWord: {
    color: C.textDark,
    fontFamily: ff('fa', 'black'),
    fontSize: 15,
    lineHeight: 23,
    marginTop: 4,
    textAlign: 'center',
  },
  bgBlobA: { position: 'absolute', top: -60, right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)' },
  bgBlobB: { position: 'absolute', bottom: 90, left: -70, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)' },
  scroll: { paddingHorizontal: 14, paddingBottom: 28 },
  hero: {
    marginTop: 8,
    marginBottom: 18,
    padding: 16,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  heroCopy: { flex: 1 },
  heroKicker: { color: C.purple, fontSize: 13, marginBottom: 6 },
  heroTitle: { color: C.textDark, fontSize: 28, lineHeight: 35 },
  heroSub: { color: '#6B5A89', fontSize: 13, lineHeight: 20, marginTop: 6 },
  heroArt: { width: 146, height: 146, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    borderRadius: 28,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 228,
    borderWidth: 6,
    borderColor: '#FFFFFF',
    shadowColor: '#170736',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardWord: { color: C.textDark, fontSize: 18, marginTop: 10, textAlign: 'center' },
  cardHint: { color: '#6B5A89', fontSize: 11.5, lineHeight: 16, marginTop: 4, textAlign: 'center' },
  cardPill: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  cardPillText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 11 },
  letterOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  letterOrbSmall: { width: 104, height: 104, borderRadius: 34 },
  letterOrbLarge: { width: 146, height: 146, borderRadius: 48 },
  letterGlow: { position: 'absolute', top: 14, right: 14, width: 42, height: 42, borderRadius: 21, opacity: 0.28 },
  letterText: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },
  letterTextSmall: { fontSize: 48 },
  letterTextLarge: { fontSize: 70 },
  orbDot: { position: 'absolute', borderRadius: 999 },
  orbDotLeft: { width: 16, height: 16, left: 16, bottom: 16, opacity: 0.6 },
  orbDotRight: { width: 10, height: 10, right: 18, bottom: 22, opacity: 0.85 },
  showStage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  showBlob: { position: 'absolute', borderRadius: 999, opacity: 0.18 },
  showBlobOne: { width: 310, height: 310, top: -120, right: -90 },
  showBlobTwo: { width: 250, height: 250, bottom: -100, left: -70 },
  showProgress: { position: 'absolute', top: 22, left: 72, right: 72, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  showProgressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(37,16,92,0.18)' },
  showProgressDone: { backgroundColor: 'rgba(37,16,92,0.42)' },
  showClose: { position: 'absolute', top: 16, left: 16, width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 20, elevation: 8 },
  showCloseText: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 34, lineHeight: 38 },
  showSpark: { position: 'absolute', width: 20, height: 20, borderRadius: 6, zIndex: 4 },
  showLetter: { width: 220, height: 220, borderRadius: 72, alignItems: 'center', justifyContent: 'center', zIndex: 5, shadowColor: '#170736', shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  showLetterShine: { position: 'absolute', top: 24, right: 26, width: 64, height: 64, borderRadius: 32, opacity: 0.28 },
  showLetterText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 112, lineHeight: 140, textShadowColor: 'rgba(0,0,0,0.12)', textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 8 },
  showFace: { position: 'absolute', left: 70, right: 70, bottom: 46, flexDirection: 'row', justifyContent: 'space-between' },
  showEye: { width: 9, height: 12, borderRadius: 6, backgroundColor: '#25105C' },
  showSmile: { position: 'absolute', bottom: 28, width: 28, height: 13, borderBottomWidth: 4, borderBottomColor: '#25105C', borderRadius: 14 },
  showWordCard: { minWidth: 260, maxWidth: '84%', marginTop: 28, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', zIndex: 6, shadowColor: '#170736', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 7 },
  showWord: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 31, lineHeight: 40, textAlign: 'center' },
  showHint: { color: '#6B5A89', fontFamily: ff('fa', 'regular'), fontSize: 13, lineHeight: 20, marginTop: 2, textAlign: 'center' },
  showControls: { position: 'absolute', bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14, zIndex: 20 },
  showControlButton: { width: 52, height: 52, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#170736', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  showControlText: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 30, lineHeight: 34 },
  showPlayButton: { width: 68, height: 68, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: '#FFFFFF', shadowColor: '#170736', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
  showPlayText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(23, 10, 51, 0.62)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 34,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  modalTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontFamily: ff('fa', 'black'), color: C.purpleDeep, fontSize: 28, lineHeight: 32 },
  counterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)' },
  counterText: { fontFamily: ff('fa', 'bold'), color: C.textDark, fontSize: 12 },
  modalArtWrap: { marginTop: 4, marginBottom: 10 },
  modalLetter: { color: C.textDark, fontSize: 40, lineHeight: 48, textAlign: 'center' },
  modalWord: { color: C.textDark, fontSize: 24, lineHeight: 32, textAlign: 'center', marginTop: 4 },
  modalHint: { color: '#5D4B7C', fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  speakBtn: { minWidth: 108, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  speakText: { color: '#FFFFFF', fontFamily: ff('fa', 'black'), fontSize: 14 },
  closeBtn: { minWidth: 108, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 18 },
  closeText: { color: C.textDark, fontFamily: ff('fa', 'black'), fontSize: 14 },
});
