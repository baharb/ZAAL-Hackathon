import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Screen =
  | { name: 'Splash' }
  | { name: 'AccountSetup' }
  | { name: 'SettingsUnlock' }
  | { name: 'PremiumUnlock' }
  | { name: 'Premium' }
  | { name: 'Age' }
  | { name: 'Main'; tab?: string }
  | { name: 'Home' }
  | { name: 'AlphabetHub' }
  | { name: 'Section'; id: string }
  | { name: 'Game'; gameId: string }
  | { name: 'Characters' }
  | { name: 'StickerReward'; sticker: string; message: string }
  | { name: 'Coloring' }
  | { name: 'VideoShows' }
  | { name: 'AlphabetShow' }
  | { name: 'AlphabetTrain' }
  | { name: 'InteractiveFarsiTrace'; letterId?: string }
  | { name: 'FirstLettersTracing' }
  | { name: 'LearningPath' }
  | { name: 'Audiobooks' }
  | { name: 'PhysicalActivity' }
  | { name: 'SEL' }
  | { name: 'BabyWorld' }
  | { name: 'DailyRoutine' }
  | { name: 'FeedAnimals' }
  | { name: 'BuildScene' }
  | { name: 'DressUp' }
  | { name: 'InteractiveGames' }
  | { name: 'Cooking' }
  | { name: 'ToothBrush' }
  | { name: 'ConversationGame' }
  | { name: 'SolarPuzzle' }
  | { name: 'TimeUp' };

interface NavContextType {
  screen: Screen;
  navigate: (s: Screen) => void;
  reset: (s: Screen) => void;
  goBack: () => void;
}
export const NavContext = createContext<NavContextType>({} as NavContextType);
export function NavProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Screen[]>([{ name: 'Splash' }]);
  const screen = history[history.length - 1];
  const navigate = (s: Screen) => setHistory(p => {
    const top = p[p.length - 1];
    const sameMain = top.name === 'Main' && s.name === 'Main';
    const sameScreen = JSON.stringify(top) === JSON.stringify(s);
    if (sameScreen) return p;
    if (sameMain) return [...p.slice(0, -1), s];
    return [...p, s];
  });
  const reset = (s: Screen) => setHistory([s]);
  const goBack = () => setHistory(p => p.length > 1 ? p.slice(0, -1) : p);
  // TEMP QA HOOK — lets the device-size sweep jump straight to any route
  // from the browser console instead of clicking through the whole app.
  // Remove before shipping.
  if (typeof window !== 'undefined') (window as any).__zaalNav = { screen, navigate, reset, goBack };
  return <NavContext.Provider value={{ screen, navigate, reset, goBack }}>{children}</NavContext.Provider>;
}
export function useNav() { return useContext(NavContext); }
