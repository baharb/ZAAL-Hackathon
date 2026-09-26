import React, { createContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { createPasswordSalt, derivePasswordVerifier } from '../utils/passwordHash';

export type Lang = 'en' | 'fa' | 'fr' | 'es' | 'zh' | 'ko' | 'ar';

export const LANGUAGES: {
  code: Lang; flag: string; label: string; nativeLabel: string;
  rtl: boolean; speechCode: string;
}[] = [
  { code: 'en', flag: '🇺🇸', label: 'English',  nativeLabel: 'English',  rtl: false, speechCode: 'en-US' },
  { code: 'fa', flag: '🇮🇷', label: 'Farsi',    nativeLabel: 'فارسی',    rtl: true,  speechCode: 'fa-IR' },
  { code: 'fr', flag: '🇫🇷', label: 'French',   nativeLabel: 'Français', rtl: false, speechCode: 'fr-FR' },
  { code: 'es', flag: '🇪🇸', label: 'Spanish',  nativeLabel: 'Español',  rtl: false, speechCode: 'es-ES' },
];

export function isRTL(lang: Lang) { return lang === 'fa' || lang === 'ar'; }
export function getLang(lang: Lang) { return LANGUAGES.find(l => l.code === lang)!; }

// Local device-clock date key (YYYY-MM-DD), used so the daily screen-time
// allowance resets based on the phone/tablet's own calendar day.
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface AppContextType {
  lang: Lang; setLang: (l: Lang) => void; rtl: boolean;
  settingsLang: Lang; setSettingsLang: (l: Lang) => void;
  age: number; setAge: (a: number) => void;
  stars: number; addStars: (n: number) => void;
  streak: number;
  badges: string[]; addBadge: (b: string) => void;
  stickers: string[]; addSticker: (s: string) => void;
  completedSections: string[]; completeSection: (id: string) => void;
  pathProgress: number; setPathProgress: (n: number) => void;
  selectedCharacterId: string; setSelectedCharacter: (id: string) => void;
  authReady: boolean; hasAccount: boolean; accountContact: string | null;
  parentBirthYear: number | null;
  activateAccount: (contact: string, password: string, parentBirthYear?: number) => Promise<void>;
  verifySettingsPassword: (password: string) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  // Wipes everything stored on the device and resets in-memory state, so the
  // app is back to a fresh install. The server-side half of account deletion
  // lives in services/accountActivation.ts — call that first.
  deleteLocalAccount: () => Promise<void>;
  // Premium/subscription status. Not wired to a real payment provider yet —
  // see PremiumScreen.tsx for where the purchase call will set this.
  isPremium: boolean; setIsPremium: (v: boolean) => void;
  // Daily screen-time limit — gated by the same account password as the rest of Settings.
  dailyLimitEnabled: boolean; setDailyLimitEnabled: (on: boolean) => void;
  dailyLimitMinutes: number; setDailyLimitMinutes: (mins: number) => void;
  usedTodayMs: number;
  bonusMinutesToday: number; addBonusMinutes: (mins: number) => void;
  dailyLimitMs: number; remainingMs: number; timeExpired: boolean;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang] = useState<Lang>('fa');
  const [settingsLang, setSettingsLangState] = useState<Lang>('fa');
  const [age, setAgeState] = useState(0);
  const [stars, setStars] = useState(0);
  const [streak] = useState(3);
  const [badges, setBadges] = useState<string[]>([]);
  const [stickers, setStickers] = useState<string[]>([]);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [pathProgress, setPathProgressState] = useState(0);
  const [selectedCharacterId, setSelectedCharacterState] = useState('neli');
  const [authReady, setAuthReady] = useState(false);
  const [accountContact, setAccountContact] = useState<string | null>(null);
  const [parentBirthYear, setParentBirthYearState] = useState<number | null>(null);
  const [passwordSalt, setPasswordSalt] = useState('');
  const [passwordVerifier, setPasswordVerifier] = useState('');
  const [isPremium, setIsPremiumState] = useState(false);

  // Daily screen-time limit
  const [dailyLimitEnabled, setDailyLimitEnabledState] = useState(false);
  const [dailyLimitMinutes, setDailyLimitMinutesState] = useState(60);
  const [usedTodayMs, setUsedTodayMs] = useState(0);
  const [bonusMinutesToday, setBonusMinutesTodayState] = useState(0);
  const [usageDate, setUsageDateState] = useState('');

  const save = async (patch: object) => {
    try {
      const cur = await AsyncStorage.getItem('lz_state_v2');
      const state = cur ? JSON.parse(cur) : {};
      await AsyncStorage.setItem('lz_state_v2', JSON.stringify({ ...state, ...patch }));
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('lz_state_v2');
        if (saved) {
          const s = JSON.parse(saved);
          if (LANGUAGES.some(language => language.code === s.settingsLang)) setSettingsLangState(s.settingsLang);
          if (s.age) setAgeState(s.age);
          if (s.stars) setStars(s.stars);
          if (s.badges) setBadges(s.badges);
          if (s.stickers) setStickers(s.stickers);
          if (s.completedSections) setCompletedSections(s.completedSections);
          if (s.pathProgress) setPathProgressState(s.pathProgress);
          if (s.selectedCharacterId) setSelectedCharacterState(s.selectedCharacterId);
          if (s.accountContact) setAccountContact(s.accountContact);
          if (s.parentBirthYear) setParentBirthYearState(s.parentBirthYear);
          if (s.passwordSalt) setPasswordSalt(s.passwordSalt);
          if (s.passwordVerifier) setPasswordVerifier(s.passwordVerifier);
          if (s.isPremium) setIsPremiumState(true);

          if (s.dailyLimitEnabled) setDailyLimitEnabledState(true);
          if (s.dailyLimitMinutes) setDailyLimitMinutesState(s.dailyLimitMinutes);

          const key = todayKey();
          const savedDate: string = s.usageDate || '';
          if (savedDate === key) {
            setUsedTodayMs(s.usedTodayMs || 0);
            setBonusMinutesTodayState(s.bonusMinutesToday || 0);
            setUsageDateState(key);
          } else {
            // New device day: the previous day's usage/bonus don't carry over.
            setUsedTodayMs(0);
            setBonusMinutesTodayState(0);
            setUsageDateState(key);
            save({ usageDate: key, usedTodayMs: 0, bonusMinutesToday: 0 });
          }
        } else {
          setUsageDateState(todayKey());
        }
      } catch {
        // Keep first-run setup available when persisted state cannot be read.
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  // Refs so the interval below always sees fresh values without resubscribing.
  const usageDateRef = useRef(usageDate);
  useEffect(() => { usageDateRef.current = usageDate; }, [usageDate]);
  const usedTodayMsRef = useRef(usedTodayMs);
  useEffect(() => { usedTodayMsRef.current = usedTodayMs; }, [usedTodayMs]);
  const bonusMinutesRef = useRef(bonusMinutesToday);
  useEffect(() => { bonusMinutesRef.current = bonusMinutesToday; }, [bonusMinutesToday]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track how long the app has been open today, driven by the device clock.
  // Ticks once per second while the app is in the foreground; persists
  // periodically and immediately when the app leaves the foreground.
  useEffect(() => {
    if (!authReady) return;

    const persistNow = () => {
      save({ usedTodayMs: usedTodayMsRef.current, usageDate: usageDateRef.current, bonusMinutesToday: bonusMinutesRef.current });
    };

    const rollDayIfNeeded = () => {
      const key = todayKey();
      if (usageDateRef.current !== key) {
        usageDateRef.current = key;
        setUsageDateState(key);
        setBonusMinutesTodayState(0);
        setUsedTodayMs(0);
        usedTodayMsRef.current = 0;
        save({ usageDate: key, usedTodayMs: 0, bonusMinutesToday: 0 });
        return true;
      }
      return false;
    };

    rollDayIfNeeded();

    let ticks = 0;
    const interval = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      if (rollDayIfNeeded()) return;
      const next = usedTodayMsRef.current + 1000;
      usedTodayMsRef.current = next;
      setUsedTodayMs(next);
      ticks += 1;
      if (ticks % 5 === 0) save({ usedTodayMs: next, usageDate: usageDateRef.current });
    }, 1000);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const goingBackground = appStateRef.current === 'active' && next !== 'active';
      appStateRef.current = next;
      if (next === 'active') {
        rollDayIfNeeded();
      } else if (goingBackground) {
        persistNow();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      persistNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const setLang = (_l: Lang) => { save({ lang: 'fa' }); };
  const setSettingsLang = (l: Lang) => { setSettingsLangState(l); save({ settingsLang: l }); };
  const setAge = (a: number) => { setAgeState(a); save({ age: a }); };
  const addStars = (n: number) => setStars(p => { const v = p + n; save({ stars: v }); return v; });
  const addBadge = (b: string) => setBadges(p => { if (p.includes(b)) return p; const v = [...p, b]; save({ badges: v }); return v; });
  const addSticker = (s: string) => setStickers(p => { const v = [...p, s]; save({ stickers: v }); return v; });
  const completeSection = (id: string) => setCompletedSections(p => { if (p.includes(id)) return p; const v = [...p, id]; save({ completedSections: v }); return v; });
  const setPathProgress = (n: number) => { setPathProgressState(n); save({ pathProgress: n }); };
  const setSelectedCharacter = (id: string) => { setSelectedCharacterState(id); save({ selectedCharacterId: id }); };
  const activateAccount = async (contact: string, password: string, parentBirthYear?: number) => {
    const salt = createPasswordSalt();
    const verifier = derivePasswordVerifier(password, salt);
    setAccountContact(contact);
    setPasswordSalt(salt);
    setPasswordVerifier(verifier);
    if (parentBirthYear) setParentBirthYearState(parentBirthYear);
    await save({ accountContact: contact, passwordSalt: salt, passwordVerifier: verifier, ...(parentBirthYear ? { parentBirthYear } : {}) });
  };
  const verifySettingsPassword = (password: string) => Boolean(passwordSalt && passwordVerifier) && derivePasswordVerifier(password, passwordSalt) === passwordVerifier;
  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!verifySettingsPassword(currentPassword)) return false;
    const salt = createPasswordSalt();
    const verifier = derivePasswordVerifier(newPassword, salt);
    setPasswordSalt(salt);
    setPasswordVerifier(verifier);
    await save({ passwordSalt: salt, passwordVerifier: verifier });
    return true;
  };
  const deleteLocalAccount = async () => {
    try { await AsyncStorage.clear(); } catch {}
    setAgeState(0);
    setStars(0);
    setBadges([]);
    setStickers([]);
    setCompletedSections([]);
    setPathProgressState(0);
    setSelectedCharacterState('neli');
    setAccountContact(null);
    setParentBirthYearState(null);
    setPasswordSalt('');
    setPasswordVerifier('');
    setIsPremiumState(false);
    setDailyLimitEnabledState(false);
    setDailyLimitMinutesState(60);
    usedTodayMsRef.current = 0;
    setUsedTodayMs(0);
    setBonusMinutesTodayState(0);
  };
  const setIsPremium = (v: boolean) => { setIsPremiumState(v); save({ isPremium: v }); };

  // Daily screen-time limit — no separate PIN; gated by the account password.
  const setDailyLimitEnabled = (on: boolean) => { setDailyLimitEnabledState(on); save({ dailyLimitEnabled: on }); };
  const setDailyLimitMinutes = (mins: number) => { const v = Math.max(0, Math.round(mins)); setDailyLimitMinutesState(v); save({ dailyLimitMinutes: v }); };
  const addBonusMinutes = (mins: number) => setBonusMinutesTodayState(p => { const v = Math.max(0, p + mins); save({ bonusMinutesToday: v, usageDate: usageDateRef.current }); return v; });

  const dailyLimitMs = (dailyLimitMinutes + bonusMinutesToday) * 60000;
  const remainingMs = Math.max(0, dailyLimitMs - usedTodayMs);
  const timeExpired = dailyLimitEnabled && dailyLimitMs > 0 && usedTodayMs >= dailyLimitMs;

  return (
    <AppContext.Provider value={{
      lang, setLang, rtl: isRTL(lang),
      settingsLang, setSettingsLang,
      age, setAge, stars, addStars, streak,
      badges, addBadge, stickers, addSticker,
      completedSections, completeSection,
      pathProgress, setPathProgress,
      selectedCharacterId, setSelectedCharacter,
      authReady, hasAccount: Boolean(accountContact && passwordVerifier), accountContact,
      parentBirthYear,
      activateAccount, verifySettingsPassword, changePassword, deleteLocalAccount,
      isPremium, setIsPremium,
      dailyLimitEnabled, setDailyLimitEnabled,
      dailyLimitMinutes, setDailyLimitMinutes,
      usedTodayMs, bonusMinutesToday, addBonusMinutes,
      dailyLimitMs, remainingMs, timeExpired,
    }}>
      {children}
    </AppContext.Provider>
  );
}
