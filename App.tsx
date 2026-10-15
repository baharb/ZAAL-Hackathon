import React, { useContext } from 'react';
import { View, ActivityIndicator, I18nManager, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { usePreventScreenCapture } from 'expo-screen-capture';
import * as NavigationBar from 'expo-navigation-bar';
import { setAudioModeAsync } from 'expo-audio';
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_600SemiBold,
  Vazirmatn_700Bold,
  Vazirmatn_800ExtraBold,
} from '@expo-google-fonts/vazirmatn';
import { AppProvider } from './src/store/AppContext';
import { NavProvider, NavContext } from './src/store/NavContext';

import SplashScreen        from './src/screens/SplashScreen';
import AccountSetupScreen  from './src/screens/AccountSetupScreen';
import SettingsUnlockScreen from './src/screens/SettingsUnlockScreen';
import PremiumUnlockScreen  from './src/screens/PremiumUnlockScreen';
import PremiumScreen        from './src/screens/PremiumScreen';
import AgeScreen           from './src/screens/AgeScreen';
import MainTabs            from './src/screens/MainTabs';
import HomeScreen           from './src/screens/HomeScreen';
import AlphabetHubScreen   from './src/screens/AlphabetHubScreen';
import SectionScreen       from './src/screens/SectionScreen';
import GameScreen          from './src/screens/GameScreen';
import CharactersScreen    from './src/screens/CharactersScreen';
import BabyWorldScreen     from './src/screens/BabyWorldScreen';
import StickerRewardScreen from './src/screens/StickerRewardScreen';
import ColoringScreen      from './src/screens/ColoringScreen';
import VideoShowsScreen    from './src/screens/VideoLibraryScreen';
import AlphabetShowScreen  from './src/screens/VideoShowsScreen';
import AlphabetTrainScreen from './src/screens/AlphabetTrainScreen';
import InteractiveFarsiTraceScreen from './src/screens/InteractiveFarsiTraceScreen';
import FirstLettersTracingScreen from './src/screens/FirstLettersTracingScreen';
import LearningPathScreen  from './src/screens/LearningPathScreen';
import AudiobooksScreen    from './src/screens/AudiobooksScreen';
import PhysicalActivityScreen from './src/screens/PhysicalActivityScreen';
import SELScreen           from './src/screens/SELScreen';
import InteractiveGamesHub from './src/screens/interactive/InteractiveGamesHub';
import DailyRoutineGame    from './src/screens/interactive/DailyRoutineGame';
import FeedAnimalsGame     from './src/screens/interactive/FeedAnimalsGame';
import BuildSceneGame      from './src/screens/interactive/BuildSceneGame';
import DressUpGame         from './src/screens/interactive/DressUpGame';
import CookingGame         from './src/screens/interactive/CookingGame';
import ToothBrushGame      from './src/screens/interactive/ToothBrushGame';
import ConversationGame    from './src/screens/interactive/ConversationGame';
import GrandmaCallGame     from './src/screens/interactive/GrandmaCallGame';
import SolarSystemPuzzleGame from './src/screens/interactive/SolarSystemPuzzleGame';
import GameLandscapeFrame  from './src/components/GameLandscapeFrame';
import PortraitFallback    from './src/layout/PortraitFallback';
import TimeUpScreen        from './src/screens/TimeUpScreen';
import { AppContext } from './src/store/AppContext';
import { getCurrentCustomerInfo, hasPremiumEntitlement, initPurchases, subscribeToCustomerInfo } from './src/services/purchases';
import { PREMIUM_ENABLED } from './src/config/features';

// Force LTR at the OS level so Persian text is controlled by per-element styles
I18nManager.forceRTL(false);

function Router() {
  const { screen } = useContext(NavContext);
  switch (screen.name) {
    case 'Splash':           return <SplashScreen />;
    case 'AccountSetup':     return <AccountSetupScreen />;
    case 'SettingsUnlock':   return <SettingsUnlockScreen />;
    case 'PremiumUnlock':    return <PremiumUnlockScreen />;
    case 'Premium':          return <PremiumScreen />;
    case 'Age':              return <AgeScreen />;
    case 'Main':             return <MainTabs initialTab={screen.tab} />;
    case 'Home':              return <HomeScreen />;
    case 'AlphabetHub':      return <AlphabetHubScreen />;
    case 'BabyWorld':        return <BabyWorldScreen />;
    case 'Section':          return <SectionScreen id={screen.id} />;
    case 'Game':             return <GameLandscapeFrame><GameScreen gameId={screen.gameId} /></GameLandscapeFrame>;
    case 'Characters':       return <CharactersScreen />;
    case 'StickerReward':    return <StickerRewardScreen sticker={screen.sticker} message={screen.message} />;
    case 'Coloring':         return <ColoringScreen />;
    case 'VideoShows':       return <VideoShowsScreen />;
    case 'AlphabetShow':     return <AlphabetShowScreen />;
    case 'AlphabetTrain':    return <AlphabetTrainScreen />;
    case 'InteractiveFarsiTrace': return <InteractiveFarsiTraceScreen />;
    case 'FirstLettersTracing': return <InteractiveFarsiTraceScreen />;
    case 'LearningPath':     return <LearningPathScreen />;
    case 'Audiobooks':       return <AudiobooksScreen />;
    case 'PhysicalActivity': return <PhysicalActivityScreen />;
    case 'SEL':              return <SELScreen />;
    case 'InteractiveGames': return <InteractiveGamesHub />;
    case 'DailyRoutine':     return <GameLandscapeFrame><DailyRoutineGame /></GameLandscapeFrame>;
    case 'FeedAnimals':      return <GameLandscapeFrame><FeedAnimalsGame /></GameLandscapeFrame>;
    case 'BuildScene':       return <GameLandscapeFrame><BuildSceneGame /></GameLandscapeFrame>;
    case 'DressUp':          return <GameLandscapeFrame><DressUpGame /></GameLandscapeFrame>;
    case 'Cooking':          return <GameLandscapeFrame><CookingGame /></GameLandscapeFrame>;
    case 'ToothBrush':       return <GameLandscapeFrame><ToothBrushGame /></GameLandscapeFrame>;
    case 'ConversationGame':  return <GameLandscapeFrame><ConversationGame /></GameLandscapeFrame>;
    case 'GrandmaCall':       return <GameLandscapeFrame><GrandmaCallGame /></GameLandscapeFrame>;
    case 'SolarPuzzle':      return <GameLandscapeFrame><SolarSystemPuzzleGame /></GameLandscapeFrame>;
    case 'TimeUp':           return <TimeUpScreen />;
    default:                 return <SplashScreen />;
  }
}

// Screens a kid could otherwise be left staring at once the daily limit is
// hit. Parent-facing / pre-app screens are exempt so a parent who is already
// inside settings (or entering the settings password) isn't bounced out.
// (The Settings page itself — Main/Profile — is exempted separately below,
// since unlocking from TimeUp now lands there directly.)
const TIME_GATE_EXEMPT = new Set(['TimeUp', 'SettingsUnlock', 'AccountSetup', 'Splash', 'PremiumUnlock', 'Premium']);

// Boots the RevenueCat SDK once auth/local state has loaded, then keeps
// AppContext.isPremium in sync with the user's real subscription status —
// renewals, cancellations, billing issues, and restores done on another
// device all flow through this listener automatically. A no-op (and
// isPremium stays whatever was last saved locally) until real RevenueCat
// API keys are set in src/config/revenuecat.ts.
function PurchasesBridge() {
  const { authReady, setIsPremium } = useContext(AppContext);
  React.useEffect(() => {
    if (!authReady || !PREMIUM_ENABLED) return;
    let unsubscribe = () => {};
    let cancelled = false;
    (async () => {
      await initPurchases();
      const info = await getCurrentCustomerInfo();
      if (cancelled) return;
      if (info) setIsPremium(hasPremiumEntitlement(info));
      unsubscribe = subscribeToCustomerInfo(nextInfo => setIsPremium(hasPremiumEntitlement(nextInfo)));
    })();
    return () => { cancelled = true; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);
  return null;
}

// The app has no other error boundary anywhere, so any uncaught error during
// render — from any screen — unmounts the entire tree and leaves a
// permanent blank/white screen with no way back in, which is exactly the
// "white screen" behavior reported (and traced, for one case, to a render
// crash in ColoringScreen — see its paintAt() comments — but a boundary here
// covers every screen, not just that one). Recovering to Home beats a dead
// screen a child has no way to explain or escape from.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Let the fallback view commit first, then recover on the next tick.
    setTimeout(() => {
      this.props.onError();
      this.setState({ hasError: false });
    }, 50);
  }
  render() {
    if (this.state.hasError) {
      return <View style={{ flex: 1, backgroundColor: '#2D1B69' }} />;
    }
    return this.props.children;
  }
}

function RootErrorBoundaryWithNav({ children }: { children: React.ReactNode }) {
  const { reset } = useContext(NavContext);
  return <RootErrorBoundary onError={() => reset({ name: 'Home' })}>{children}</RootErrorBoundary>;
}

function ScreenTimeGate() {
  const { timeExpired } = useContext(AppContext);
  const { screen, reset } = useContext(NavContext);
  React.useEffect(() => {
    if (!timeExpired) return;
    const isProfileTab = screen.name === 'Main' && screen.tab === 'Profile';
    if (isProfileTab || TIME_GATE_EXEMPT.has(screen.name)) return;
    reset({ name: 'TimeUp' });
  }, [timeExpired, screen, reset]);
  return null;
}

export default function App() {
  // Blocks in-app screenshots/screen recording for the whole app (every
  // screen, not just this one) for as long as App is mounted. On Android
  // this sets FLAG_SECURE (screenshot + recent-apps preview are blank).
  // On iOS a screenshot still fires (Apple gives apps no way to block the
  // shutter itself), but the captured image comes out blank.
  // TEMP: disabled for testing so screenshots can be sent for bug reports.
  // Re-enable by uncommenting before publishing.
  // usePreventScreenCapture();

  // Android 16 (API 36, the target SDK 54 builds against) forces
  // edge-to-edge — the OS no longer reserves layout space for the bottom
  // gesture/nav bar, so app content can end up drawn underneath it. Rather
  // than padding every screen for a bar that might sit at the bottom OR a
  // side depending on the device's nav mode (this app is landscape-only),
  // just hide it: 'overlay-swipe' keeps it tucked away and lets a user
  // swipe from the edge to reveal it briefly when they need it, then it
  // hides itself again. Android only — iOS/web have no such bar.
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
    NavigationBar.setVisibilityAsync('hidden').catch(() => {});
  }, []);

  // Nothing in this app ever configured the iOS audio session, so it ran on
  // whatever expo-audio's undocumented default is — which does not
  // guarantee playback continues when the device's physical silent switch
  // is on. That's a very plausible reason the splash screen's "yay" cheer
  // (the very first sound the app ever plays, before any other clip has
  // established the session) went silent on iPhone. This has to run once,
  // early, before anything tries to play.
  React.useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_600SemiBold,
    Vazirmatn_700Bold,
    Vazirmatn_800ExtraBold,
    Nunito_400Regular: require('./assets/fonts/Nunito_400Regular.ttf'),
    Nunito_700Bold: require('./assets/fonts/Nunito_700Bold.ttf'),
    Nunito_800ExtraBold: require('./assets/fonts/Nunito_800ExtraBold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#6B4EFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      {/* Android 16 (API 36, the target SDK 54 builds against) forces
          edge-to-edge for every app — the status bar is always
          translucent/overlaid now regardless of this prop, so screens pad
          for it themselves via react-native-safe-area-context (see
          TopBar.tsx / AgeScreen.tsx / CookingGame.tsx) instead of relying
          on the OS to reserve space the way `translucent={false}` used to.
          The bottom nav/gesture bar is handled separately above by hiding
          it outright (see the NavigationBar effect), so screens don't also
          need to pad for that edge. */}
      <AppProvider>
        <NavProvider>
          <StatusBar style="light" backgroundColor="#2D1B69" translucent />
          <PurchasesBridge />
          <ScreenTimeGate />
          {/* Landscape: pass-through. Portrait (iPad ignoring the lock): the
              whole app in a landscape-shaped box — see PortraitFallback. */}
          <PortraitFallback>
            <RootErrorBoundaryWithNav>
              <Router />
            </RootErrorBoundaryWithNav>
          </PortraitFallback>
        </NavProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
