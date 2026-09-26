import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { neliWorldAssets, roomBackgroundPickers } from '../../assets/neliWorldAssets';
import { AppContext, Lang } from '../../store/AppContext';
import { useNav } from '../../store/NavContext';
import { useSpeech } from '../../hooks/useSpeech';
import { useLandscapeDimensions } from '../../hooks/useLandscapeDimensions';
import BlinkingNeliImage from '../../components/BlinkingNeliImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar, { topBarHeight } from '../../components/TopBar';
import { C } from '../../theme/colors';
import { dir, ff } from '../../theme/fonts';
import { FA_TEST_AUDIO } from '../../assets/faTestAudio.generated';
import { FA_AUDIO_KEYS, playFaAudio, stopFaAudio } from '../../utils/faAudio';
import PopperCelebration from '../../components/PopperCelebration';
import GameEndOverlay from '../../components/GameEndOverlay';

function conversationAudioKey(kind: string, type: 'prompt' | 'choice' | 'helper') {
  const key = `conversation/${type}/${kind}` as keyof typeof FA_TEST_AUDIO;
  return key in FA_TEST_AUDIO ? key : null;
}

type Choice = {
  id: string;
  fa: string;
  en: string;
  es: string;
  fr: string;
  kind: 'water' | 'bread' | 'book' | 'hat' | 'shoe' | 'apple' | 'orange' | 'fish' | 'moon' | 'cucumber' | 'bed' | 'backpack' | 'sabzeh';
  color: string;
};

type Scene = {
  id: string;
  place: 'home' | 'rain' | 'table' | 'night' | 'nowruz';
  character: string;
  color: string;
  promptFa: string;
  promptEn: string;
  promptEs: string;
  promptFr: string;
  helperFa: string;
  helperEn: string;
  helperEs: string;
  helperFr: string;
  answer: string;
  choices: Choice[];
};

const SCENES: Scene[] = [
  {
    id: 'thirsty',
    place: 'home',
    character: 'نلی',
    color: '#6C4EFF',
    promptFa: 'سلام! من تشنه‌ام. لطفا آب بده.',
    promptEn: 'Hi! I am thirsty. Please give water.',
    promptEs: 'Hola. Tengo sed. Dame agua, por favor.',
    promptFr: "Salut. J'ai soif. Donne de l'eau, s'il te plait.",
    helperFa: 'کدام یکی آب است؟',
    helperEn: 'Which one is water?',
    helperEs: 'Cual es agua?',
    helperFr: "Lequel est l'eau?",
    answer: 'water',
    choices: [
      { id: 'water', fa: 'آب', en: 'Water', es: 'Agua', fr: 'Eau', kind: 'water', color: '#38BDF8' },
      { id: 'bread', fa: 'نان', en: 'Bread', es: 'Pan', fr: 'Pain', kind: 'bread', color: '#D97706' },
      { id: 'book', fa: 'کتاب', en: 'Book', es: 'Libro', fr: 'Livre', kind: 'book', color: '#EC4899' },
    ],
  },
  {
    id: 'cold',
    place: 'rain',
    character: 'دارا',
    color: '#38BDF8',
    promptFa: 'هوا سرد است. من کلاه می‌خواهم.',
    promptEn: 'It is cold. I want a hat.',
    promptEs: 'Hace frio. Quiero un gorro.',
    promptFr: 'Il fait froid. Je veux un bonnet.',
    helperFa: 'کلاه را پیدا کن.',
    helperEn: 'Find the hat.',
    helperEs: 'Busca el gorro.',
    helperFr: 'Trouve le bonnet.',
    answer: 'hat',
    choices: [
      { id: 'shoe', fa: 'کفش', en: 'Shoe', es: 'Zapato', fr: 'Chaussure', kind: 'shoe', color: '#7C2D12' },
      { id: 'hat', fa: 'کلاه', en: 'Hat', es: 'Gorro', fr: 'Bonnet', kind: 'hat', color: '#A855F7' },
      { id: 'apple', fa: 'سیب', en: 'Apple', es: 'Manzana', fr: 'Pomme', kind: 'apple', color: '#EF4444' },
    ],
  },
  {
    id: 'hungry',
    place: 'table',
    character: 'شیرین',
    color: '#EC4899',
    promptFa: 'من گرسنه‌ام. سیب می‌خواهم.',
    promptEn: 'I am hungry. I want an apple.',
    promptEs: 'Tengo hambre. Quiero una manzana.',
    promptFr: "J'ai faim. Je veux une pomme.",
    helperFa: 'سیب کجاست؟',
    helperEn: 'Where is the apple?',
    helperEs: 'Donde esta la manzana?',
    helperFr: 'Ou est la pomme?',
    answer: 'apple',
    choices: [
      { id: 'apple', fa: 'سیب', en: 'Apple', es: 'Manzana', fr: 'Pomme', kind: 'apple', color: '#EF4444' },
      { id: 'fish', fa: 'ماهی', en: 'Fish', es: 'Pez', fr: 'Poisson', kind: 'fish', color: '#38BDF8' },
      { id: 'orange', fa: 'پرتقال', en: 'Orange', es: 'Naranja', fr: 'Orange', kind: 'orange', color: '#FB923C' },
    ],
  },
  {
    id: 'sleepy',
    place: 'night',
    character: 'لونا',
    color: '#A855F7',
    promptFa: 'من می‌خواهم کتاب بخوانم. کتاب را به من بده.',
    promptEn: "I'd like to read a book. Give me the book.",
    promptEs: 'Quiero leer un libro. Dame el libro.',
    promptFr: "J'aimerais lire un livre. Donne-moi le livre.",
    helperFa: 'کدام یک کتاب است؟',
    helperEn: 'Which one is the book?',
    helperEs: 'Cual es el libro?',
    helperFr: 'Lequel est le livre?',
    answer: 'book',
    choices: [
      { id: 'book', fa: 'کتاب', en: 'Book', es: 'Libro', fr: 'Livre', kind: 'book', color: '#EC4899' },
      { id: 'cucumber', fa: 'خیار', en: 'Cucumber', es: 'Pepino', fr: 'Concombre', kind: 'cucumber', color: '#22C55E' },
      { id: 'fish', fa: 'ماهی', en: 'Fish', es: 'Pez', fr: 'Poisson', kind: 'fish', color: '#38BDF8' },
    ],
  },
  {
    id: 'nowruz',
    place: 'nowruz',
    character: 'گلناز',
    color: '#22C55E',
    promptFa: 'من می‌خواهم به مدرسه بروم. کیفم را می‌خواهم.',
    promptEn: "I wanna go to school. I want my backpack.",
    promptEs: 'Quiero ir a la escuela. Quiero mi mochila.',
    promptFr: "Je veux aller à l'école. Je veux mon sac à dos.",
    helperFa: 'کدام یک کیف مدرسه است؟',
    helperEn: 'Which one is the backpack?',
    helperEs: 'Cual es la mochila?',
    helperFr: 'Lequel est le sac à dos?',
    answer: 'backpack',
    choices: [
      { id: 'backpack', fa: 'کیف مدرسه', en: 'Backpack', es: 'Mochila', fr: 'Sac à dos', kind: 'backpack', color: '#3B82F6' },
      { id: 'hat', fa: 'کلاه', en: 'Hat', es: 'Gorro', fr: 'Bonnet', kind: 'hat', color: '#A855F7' },
      { id: 'orange', fa: 'پرتقال', en: 'Orange', es: 'Naranja', fr: 'Orange', kind: 'orange', color: '#FB923C' },
    ],
  },
];

function promptFor(scene: Scene, lang: Lang) {
  if (lang === 'fa' || lang === 'ar') return scene.promptFa;
  if (lang === 'es') return scene.promptEs;
  if (lang === 'fr') return scene.promptFr;
  return scene.promptEn;
}

function choiceLabel(choice: Choice, lang: Lang) {
  if (lang === 'fa' || lang === 'ar') return choice.fa;
  if (lang === 'es') return choice.es;
  if (lang === 'fr') return choice.fr;
  return choice.en;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

const CHOICE_IMAGES: Partial<Record<Choice['kind'], any>> = {
  apple: neliWorldAssets.foods.apple,
  bread: neliWorldAssets.foods.bread,
  book: neliWorldAssets.ingredients.book,
  fish: neliWorldAssets.foods.fish,
  hat: neliWorldAssets.clothes.hat,
  backpack: neliWorldAssets.clothes.backpack,
  shoe: neliWorldAssets.clothes.boots,
  cucumber: neliWorldAssets.foods.cucumber,
  orange: neliWorldAssets.foods.orange,
  water: neliWorldAssets.foods.water,
};

function NeliTalkCharacter({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size * 1.18, alignItems: 'center', justifyContent: 'center' }}>
      <BlinkingNeliImage size={size} height={size * 1.18} preview overlayOffsetX={size * 0.01} overlayOffsetY={size * 0.025} />
    </View>
  );
}

function ChoiceArt({ choice, size = 92 }: { choice: Choice; size?: number }) {
  const innerSize = size * 0.82;
  const asset = CHOICE_IMAGES[choice.kind];
  if (asset && choice.kind === 'hat') return <View style={{ width: innerSize, height: innerSize, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}><Image source={asset} style={{ width: innerSize * 1.5, height: innerSize * 1.5, transform: [{ translateY: innerSize * 0.25 }] }} resizeMode="contain" /></View>;
  if (asset) return <Image source={asset} style={[styles.choiceImage, { width: innerSize, height: innerSize }]} resizeMode="contain" />;
  const color = choice.color;
  const scaled = { transform: [{ scale: innerSize / 70 }] };
  if (choice.kind === 'water') return <View style={[styles.waterDrop, { backgroundColor: color }, scaled]} />;
  if (choice.kind === 'bread') return <View style={[styles.bread, { backgroundColor: color }, scaled]} />;
  if (choice.kind === 'book') return <View style={[styles.artMini, { width: innerSize, height: innerSize }]}><View style={[styles.book, { backgroundColor: color }, scaled]}><View style={styles.bookPage} /></View></View>;
  if (choice.kind === 'hat') return <View style={[styles.artMini, { width: innerSize, height: innerSize }]}><View style={[styles.hatTop, { backgroundColor: color }, scaled]} /><View style={[styles.hatBrim, { backgroundColor: color }, scaled]} /></View>;
  if (choice.kind === 'shoe') return <View style={[styles.shoe, { backgroundColor: color }, scaled]} />;
  if (choice.kind === 'apple') return <View style={[styles.artMini, { width: innerSize, height: innerSize }]}><View style={[styles.apple, { backgroundColor: color }, scaled]} /><View style={[styles.appleLeaf, scaled]} /></View>;
  if (choice.kind === 'fish') return <View style={[styles.artMini, { width: innerSize, height: innerSize }]}><View style={[styles.fishBody, { backgroundColor: color }, scaled]} /><View style={[styles.fishTail, { borderLeftColor: '#0EA5E9' }, scaled]} /></View>;
  if (choice.kind === 'moon') return <View style={[styles.moonChoice, { backgroundColor: color, width: innerSize * 0.72, height: innerSize * 0.72, borderRadius: innerSize * 0.36 }]} />;
  if (choice.kind === 'cucumber') return <Image source={asset} style={[styles.choiceImage, { width: innerSize, height: innerSize }]} resizeMode="contain" />;
  if (choice.kind === 'orange') return <Image source={asset} style={[styles.choiceImage, { width: innerSize, height: innerSize }]} resizeMode="contain" />;
  if (choice.kind === 'backpack') return <Image source={asset} style={[styles.choiceImage, { width: innerSize, height: innerSize }]} resizeMode="contain" />;
  if (choice.kind === 'bed') return <View style={[styles.artMini, { width: innerSize, height: innerSize }]}><View style={[styles.bed, { backgroundColor: color }, scaled]} /><View style={[styles.pillow, scaled]} /></View>;
  return <View style={[styles.artMini, { width: innerSize, height: innerSize }]}><View style={[styles.sabzehCup, { backgroundColor: color }, scaled]} /><View style={[styles.sabzehLeafA, scaled]} /><View style={[styles.sabzehLeafB, scaled]} /></View>;
}

export default function ConversationGame() {
  const { lang, addStars } = useContext(AppContext);
  const { reset } = useNav();
  const { speakFarsiOnly, speakInLang, stop } = useSpeech();
  const { width, height } = useLandscapeDimensions();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const slide = useRef(new Animated.Value(18)).current;
  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const scene = SCENES[idx];
  const isFa = lang === 'fa' || lang === 'ar';
  const isLandscape = width > height;
  const backgroundSource = roomBackgroundPickers.talkPlay(width, height);
  // The prompt bubble plus 3 choice cards (a flat 96pt each) were sized for
  // a tablet's spare height — on a short landscape phone the three didn't
  // fit even after the bubble stopped overlapping them, so the third one
  // needed a scroll to reach. Scale both down together below the tablet
  // breakpoint; untouched above it.
  const heightScale = Math.min(1, height / 620);
  const avatarMinFloor = 200 + 50 * heightScale;
  const avatarSize = Math.min(Math.max(width * 0.26, avatarMinFloor), isLandscape ? 360 : 320) * 1.02;
  const choiceStackGap = Math.max(4, Math.round(10 * heightScale));
  // heightScale alone still left prompt + 3 cards ~20pt taller than the
  // space under the bar on a ~400pt phone (and scrolling is off there), so
  // the third card was cut in half. Fit the cards to what's actually left
  // after the bar, paddings and a two-line prompt.
  const insets = useSafeAreaInsets();
  const promptSize = Math.max(16, Math.round(20 * heightScale));
  const promptLineH = Math.round(promptSize * 1.4);
  const promptPadV = Math.max(6, Math.round(10 * heightScale));
  const promptMarginBottom = Math.round(10 * heightScale);
  const columnFreeH = height
    - topBarHeight(height, insets.top, { topInset: 10 })
    - Math.round(10 * heightScale) - Math.round(20 * heightScale) // scroll padding
    - 2 * Math.round(8 * heightScale) // column padding
    - (2 * promptLineH + 2 * promptPadV + 2) - promptMarginBottom;
  const choiceCardHeight = Math.max(48, Math.min(Math.round(96 * heightScale), Math.floor((columnFreeH - 2 * choiceStackGap) / 3)));
  const choiceScale = choiceCardHeight / 96;
  const choiceIconSize = Math.round((isLandscape ? 94 : 84) * choiceScale);
  // Below the tablet breakpoint the layout is now sized to fit without
  // scrolling, and the step-progress dots are the first thing cut to buy
  // back vertical room on a short phone screen.
  const isSmallPhone = height < 620;
  const needsScroll = !isSmallPhone;
  const choices = useMemo(() => shuffle(scene.choices), [scene.id]);
  const choiceCardWidth = useMemo(() => {
    const labels = choices.map(choice => choiceLabel(choice, lang));
    const widestChars = labels.reduce((max, label) => Math.max(max, label.length), 0);
    const estimatedTextWidth = widestChars * (isFa ? 18 : 17);
    return Math.min(Math.max(estimatedTextWidth + 176, 320), 460);
  }, [choices, lang, isFa]);

  // Resolves once the prompt (and, for non-Farsi UI languages, the translation
  // that follows it) has fully finished playing - so callers can measure the
  // 6-second "no answer yet" window from the end of the speech, not from when
  // it started (otherwise the gap before a repeat shrinks by however long the
  // audio itself takes to play).
  const speakScene = (): Promise<void> => {
    stop();
    void stopFaAudio();
    return new Promise<void>(resolve => {
      const playTranslationThenResolve = () => {
        if (!isFa) {
          setTimeout(() => speakInLang(promptFor(scene, lang), lang, () => resolve()), 260);
        } else {
          resolve();
        }
      };
      const promptKey = conversationAudioKey(scene.id, 'prompt');
      if (promptKey) {
        void playFaAudio(promptKey as any, { awaitFinish: true }).then(playTranslationThenResolve);
      } else {
        speakFarsiOnly(scene.promptFa, playTranslationThenResolve);
      }
    });
  };

  useEffect(() => {
    setSelected(null);
    slide.setValue(18);
    Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    let cancelled = false;
    let repeatTimer: ReturnType<typeof setTimeout> | null = null;

    // Waits 6s of silence, then (if still unanswered) speaks the question again
    // and re-arms itself once that repeat finishes - so consecutive repeats are
    // always 6s of *silence* apart, never 6s including however long the speech runs.
    const scheduleRepeat = () => {
      repeatTimer = setTimeout(async () => {
        if (cancelled) return;
        if (!selectedRef.current) {
          await speakScene();
          if (cancelled) return;
        }
        scheduleRepeat();
      }, 6000);
    };

    const t = setTimeout(() => {
      void speakScene().then(() => {
        if (!cancelled) scheduleRepeat();
      });
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(t);
      if (repeatTimer) clearTimeout(repeatTimer);
      stop();
      void stopFaAudio();
    };
  }, [idx, lang]);

  const choose = (choice: Choice) => {
    if (selected) return;
    setSelected(choice.id);
    const ok = choice.id === scene.answer;
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addStars(2);
      setCorrectCount(prev => prev + 1);
      const choiceKey = conversationAudioKey(choice.kind, 'choice');
      const advance = () => {
        setTimeout(() => {
          if (idx < SCENES.length - 1) setIdx(prev => prev + 1);
          else {
            setDone(true);
            setShowCelebration(true);
            setTimeout(async () => {
              await playFaAudio(FA_AUDIO_KEYS.feedback.afarin, { awaitFinish: true });
            }, 400);
          }
        }, 220);
      };
      if (choiceKey) {
        void playFaAudio(choiceKey as any, { awaitFinish: true }).then(advance);
      } else {
        speakFarsiOnly(choice.fa, advance);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speakInLang(isFa ? 'دوباره تلاش کن' : 'Try again', isFa ? 'fa' : lang, () => {
        setTimeout(() => setSelected(null), 300);
      });
    }
  };

  return (
    <View style={styles.root}>
      <TopBar title="Talk & Play" titleFa="گفت و گو" showClose dark topInset={10} onBack={() => reset({ name: 'Main', tab: 'Games' })} />
      <View style={styles.sceneBackground}>
        <ImageBackground source={backgroundSource} style={styles.sceneBackdrop} imageStyle={styles.sceneBackdropImage} resizeMode="cover">
          <View style={styles.sceneWash} />
          <ScrollView
            style={styles.scrollFlex}
            contentContainerStyle={[styles.scroll, { paddingTop: Math.round(10 * heightScale), paddingBottom: Math.round(20 * heightScale) }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={needsScroll}
          >
            <View style={[styles.sceneLayout, isLandscape ? styles.sceneLayoutLandscape : styles.sceneLayoutPortrait]}>
              <Animated.View style={[styles.leftColumn, { paddingVertical: Math.round(8 * heightScale), transform: [{ translateY: slide }] }]}>
                <TouchableOpacity style={[styles.scenePrompt, { minHeight: Math.round(54 * heightScale), marginBottom: promptMarginBottom, paddingVertical: promptPadV }]} onPress={speakScene} activeOpacity={0.88}>
                  <Image source={neliWorldAssets.ui.voice} style={[styles.speechIcon, { width: Math.max(32, Math.round(43 * heightScale)), height: Math.max(32, Math.round(43 * heightScale)) }]} resizeMode="contain" />
                  <Text style={[styles.promptBubbleText, { fontFamily: ff(lang === 'fa' || lang === 'ar' ? 'fa' : lang, 'black'), fontSize: promptSize, lineHeight: promptLineH }, dir(lang)]}>
                    {promptFor(scene, lang)}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.choiceStack, { gap: choiceStackGap }]}>
                  {choices.map(choice => {
                    const isPicked = selected === choice.id;
                    const showCorrect = !!selected && choice.id === scene.answer;
                    const showWrong = isPicked && choice.id !== scene.answer;
                    const isDimmed = !!selected && !showCorrect && !showWrong;
                      return (
                        <TouchableOpacity
                          key={choice.id}
                          style={[
                            styles.choiceCard,
                            { width: choiceCardWidth, height: choiceCardHeight, paddingVertical: Math.round(12 * choiceScale) },
                            isDimmed && styles.choiceCardDimmed,
                            showCorrect && styles.choiceCardCorrect,
                            showWrong && styles.choiceCardWrong,
                          ]}
                        onPress={() => choose(choice)}
                        activeOpacity={0.9}
                      >
                        <View style={[styles.choiceArtWrap, { width: Math.round(102 * choiceScale), padding: Math.round(10 * choiceScale) }]}>
                          <ChoiceArt choice={choice} size={choiceIconSize} />
                        </View>
                        <View style={styles.choiceTextWrap}>
                          <Text style={[styles.choiceLabel, { fontFamily: ff(lang, 'black') }, dir(lang)]} numberOfLines={1}>
                            {choiceLabel(choice, lang)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>

              <View style={styles.rightColumn}>
                <View style={[styles.characterStage, { minHeight: Math.round(320 * heightScale), paddingBottom: Math.round(24 * heightScale) }]}>
                  <NeliTalkCharacter size={avatarSize} />
                </View>
              </View>
            </View>
            {!isSmallPhone && (
              <View style={styles.progressRow}>
                {SCENES.map((s, i) => (
                  <View key={s.id} style={[styles.stepDot, i <= idx && { backgroundColor: C.yellow }, i === idx && styles.stepDotActive]} />
                ))}
              </View>
            )}
          </ScrollView>
        </ImageBackground>
      </View>
      <PopperCelebration
        visible={showCelebration}
        onComplete={() => { setShowCelebration(false); setShowEndOverlay(true); }}
      />
      {showEndOverlay && (
        <GameEndOverlay onGo={() => { setShowEndOverlay(false); reset({ name: 'Main', tab: 'Games' }); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#AEEBFF' },
  sceneBackground: { flex: 1, overflow: 'hidden' },
  sceneBackdrop: { flex: 1 },
  // Every other room screen (CountingGame, GamesScreen tiles, ...) passes an
  // explicit imageStyle here. Without it, react-native-web has nothing to
  // resolve the background <img>'s box against in this nested flex layout,
  // so it falls back to the image's own natural pixel size (thousands of px)
  // and only a random cropped sliver is visible instead of the room.
  sceneBackdropImage: { width: '100%', height: '100%' },
  sceneWash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(41, 20, 77, 0.14)' },
  // ScrollView needs `flex:1` on the component itself, not just its content
  // container — without it, react-native-web can't resolve the ImageBackground
  // ancestor to a definite height, so the absolutely-positioned background
  // <img> falls back to its own natural pixel size (thousands of px) instead
  // of filling the screen, and only a random cropped sliver of it is visible.
  scrollFlex: { flex: 1 },
  scroll: { flexGrow: 1, paddingLeft: 4, paddingRight: 14, paddingTop: 10, paddingBottom: 20 },
  sceneLayout: { flex: 1, gap: 16, position: 'relative' },
  sceneLayoutLandscape: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' },
  sceneLayoutPortrait: { flexDirection: 'column' },
  scenePrompt: {
    alignSelf: 'stretch',
    maxWidth: 520,
    marginBottom: 10,
    minHeight: 54,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.52)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  leftColumn: {
    flex: 1.08,
    paddingVertical: 8,
    paddingLeft: 40.8,
    paddingRight: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightColumn: { flex: 0.92, alignItems: 'center', justifyContent: 'center', paddingRight: 16 },
  characterStage: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    minHeight: 320,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6, marginBottom: 10, width: '100%' },
  stepDot: { width: 34, height: 10, borderRadius: 7, backgroundColor: 'rgba(37,16,92,0.22)' },
  stepDotActive: { width: 50 },
  speechIcon: { width: 43, height: 43 },
  promptBubbleText: { color: C.textDark, fontSize: 20, lineHeight: 28, flex: 1, textAlign: 'center' },
  choiceStack: { gap: 10, alignItems: 'flex-start', width: '100%', maxWidth: 460, alignSelf: 'flex-start', paddingLeft: 40.8 },
  choiceCard: {
    height: 96,
    width: '100%',
    maxWidth: 460,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  choiceCardCorrect: {
    backgroundColor: '#E4FBEA',
    borderWidth: 3,
    borderColor: '#22C55E',
  },
  choiceCardWrong: {
    backgroundColor: '#FFE0E0',
    borderWidth: 3,
    borderColor: '#EF4444',
  },
  choiceCardDimmed: { opacity: 0.5 },
  choiceArtWrap: { width: 102, padding: 10, alignItems: 'center', justifyContent: 'center' },
  choiceTextWrap: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  choiceLabel: { color: C.textDark, fontSize: 18, lineHeight: 24, textAlign: 'right', flexShrink: 1, paddingHorizontal: 10 },
  choiceImage: { width: 92, height: 92 },
  artMini: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  waterDrop: { width: 42, height: 58, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, transform: [{ rotate: '45deg' }] },
  bread: { width: 62, height: 46, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  book: { width: 58, height: 66, borderRadius: 10, padding: 7 },
  bookPage: { flex: 1, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.78)' },
  hatTop: { width: 46, height: 38, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  hatBrim: { width: 70, height: 14, borderRadius: 7, marginTop: -2 },
  shoe: { width: 68, height: 34, borderTopLeftRadius: 20, borderBottomLeftRadius: 13, borderBottomRightRadius: 17, marginTop: 24 },
  apple: { width: 52, height: 52, borderRadius: 26 },
  appleLeaf: { position: 'absolute', top: 5, right: 16, width: 20, height: 12, borderRadius: 10, backgroundColor: '#22C55E', transform: [{ rotate: '-25deg' }] },
  fishBody: { width: 54, height: 34, borderRadius: 20 },
  fishTail: {
    position: 'absolute',
    right: 6,
    width: 0,
    height: 0,
    borderTopWidth: 18,
    borderBottomWidth: 18,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  moonChoice: { width: 56, height: 56, borderRadius: 28 },
  bed: { width: 70, height: 40, borderRadius: 13 },
  pillow: { position: 'absolute', left: 8, top: 16, width: 22, height: 17, borderRadius: 8, backgroundColor: '#FFFFFF' },
  sabzehCup: { position: 'absolute', bottom: 4, width: 52, height: 34, borderRadius: 12 },
  sabzehLeafA: { position: 'absolute', top: 10, width: 12, height: 42, borderRadius: 8, backgroundColor: '#16A34A', transform: [{ rotate: '-18deg' }] },
  sabzehLeafB: { position: 'absolute', top: 6, width: 12, height: 46, borderRadius: 8, backgroundColor: '#15803D', transform: [{ rotate: '20deg' }] },
});

