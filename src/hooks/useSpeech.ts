/**
 * useSpeech - Robust bilingual TTS for ZAAL
 * FIXED: fa-IR always used for Persian. Speech.stop() before every call.
 * Supports all 7 languages. Child-friendly pitch + slow rate for Persian.
 */
import { useContext, useRef } from 'react';
import * as Speech from 'expo-speech';
import { AppContext } from '../store/AppContext';
import { tryPlayGeneratedFaVoice, stopFaAudio } from '../utils/faAudio';

export const LANG_TAG: Record<string, string> = {
  fa: 'fa-IR', en: 'en-US', fr: 'fr-FR',
  es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN', ko: 'ko-KR',
};
export const LANG_RATE: Record<string, number> = {
  fa: 0.65, ar: 0.68, zh: 0.76, ko: 0.76,
  en: 0.80, fr: 0.80, es: 0.80,
};
const PITCH = 1.18;
let voiceCache: Speech.Voice[] | null = null;

async function getBestVoice(tag: string) {
  try {
    if (!voiceCache) voiceCache = await Speech.getAvailableVoicesAsync();
    const base = tag.split('-')[0];
    const exact = voiceCache.find(v => v.language?.toLowerCase() === tag.toLowerCase());
    const sameLang = voiceCache.find(v => v.language?.toLowerCase().startsWith(base));
    const voice = exact ?? sameLang;
    return voice?.identifier ? { voice: voice.identifier, language: voice.language ?? tag } : { language: tag };
  } catch {
    return { language: tag };
  }
}

/** Whether the device can actually speak this language. Callers that have a
 *  recorded fallback (see utils/faAudio) can use this to choose it instead of
 *  letting TTS produce nothing. */
export async function hasVoiceFor(tag: string): Promise<boolean> {
  const options = await getBestVoice(tag);
  return 'voice' in options;
}

export function useSpeech() {
  const { lang } = useContext(AppContext);
  const active = useRef(false);

  // Silences both output paths — see stopFaAudio(). Calling only Speech.stop()
  // here left a recorded clip playing underneath the next utterance.
  const stop = () => { Speech.stop(); void stopFaAudio(); active.current = false; };

  const speakSegment = async (
    text: string,
    tag: string,
    rate: number,
    onDone?: () => void,
    interrupt = true,
  ) => {
    if (interrupt) Speech.stop();
    const played = await tryPlayGeneratedFaVoice(text, { interrupt, awaitFinish: true });
    if (played) {
      onDone?.();
      return true;
    }
    const voiceOptions = await getBestVoice(tag);
    if (!active.current) return false;

    // iOS ships no Persian voice, and most Android builds don't either. With
    // no fa voice installed, Speech.speak falls back to the system default and
    // reads Arabic script as a garbled syllable — users hear a nonsense word
    // instead of the prompt. Silence is better than noise: bail out and let
    // the caller's onDone continue the flow.
    //
    // Only skip when we actually enumerated voices and found none for this
    // language; if the lookup itself failed we still try, since some platforms
    // speak fine without returning an identifier.
    const missingVoice = !('voice' in voiceOptions) && (voiceCache?.length ?? 0) > 0;
    if (missingVoice) {
      onDone?.();
      return false;
    }

    Speech.speak(text, {
      ...voiceOptions,
      rate,
      pitch: PITCH,
      onDone: () => { onDone?.(); },
      onError: () => { onDone?.(); },
    });
    return false;
  };

  /** Speak item: primary language first, then translation */
  const speakItem = (item: { fa: string; en: string; [k: string]: string }, onDone?: () => void) => {
    stop();
    const isPfa = lang === 'fa' || lang === 'ar';
    const pri = isPfa ? item.fa : (item[lang] ?? item.en);
    const priTag = isPfa ? 'fa-IR' : (LANG_TAG[lang] ?? 'en-US');
    const priRate = LANG_RATE[lang] ?? 0.80;
    const sec = isPfa ? item.en : item.fa;
    const secTag = isPfa ? 'en-US' : 'fa-IR';
    const secRate = isPfa ? LANG_RATE.en : LANG_RATE.fa;

    active.current = true;
    speakSegment(pri, priTag, priRate, () => {
      if (!active.current) return;
      setTimeout(() => {
        if (!active.current) return;
        void speakSegment(sec, secTag, secRate, () => {
          active.current = false;
          onDone?.();
        }, false);
      }, 380);
    }, false);
  };

  /** Speak Farsi only. Optional `rate` overrides the default Farsi speaking rate
   *  (e.g. a screen that wants to move a bit faster). The caller should still
   *  wait for `onDone` before moving on so speech never gets cut off mid-word. */
  const speakFarsiOnly = (text: string, onDone?: () => void, rate: number = LANG_RATE.fa) => {
    stop(); active.current = true;
    speakSegment(text, 'fa-IR', rate, () => { active.current = false; onDone?.(); });
  };

  /** Speak in current UI language */
  const speakText = (text: string, onDone?: () => void) => {
    stop(); active.current = true;
    speakSegment(text, LANG_TAG[lang] ?? 'en-US', LANG_RATE[lang] ?? 0.80, () => { active.current = false; onDone?.(); });
  };

  /** Speak letter - always with stop+delay to prevent repeat bug */
  const speakLetter = (name: string, letterLang?: string) => {
    Speech.stop(); void stopFaAudio(); active.current = false;
    const useLang = letterLang ?? lang;
    const tag = LANG_TAG[useLang] ?? 'en-US';
    const rate = LANG_RATE[useLang] ?? 0.68;
    setTimeout(() => {
      active.current = true;
      speakSegment(name, tag, rate, () => { active.current = false; });
    }, 120);
  };

  /** Speak in any given language */
  const speakInLang = (text: string, langCode: string, onDone?: () => void) => {
    stop(); active.current = true;
    speakSegment(text, LANG_TAG[langCode] ?? 'en-US', LANG_RATE[langCode] ?? 0.80, () => { active.current = false; onDone?.(); });
  };

  /** Farsi first, then current language */
  const speakBilingual = (fa: string, other: string, otherLang?: string, onDone?: () => void) => {
    stop(); active.current = true;
    const tag = LANG_TAG[otherLang ?? lang] ?? 'en-US';
    const rate = LANG_RATE[otherLang ?? lang] ?? 0.80;
    speakSegment(fa, 'fa-IR', LANG_RATE.fa, () => {
      if (!active.current) return;
      setTimeout(() => {
        if (!active.current) return;
        void speakSegment(other, tag, rate, () => {
          active.current = false;
          onDone?.();
        }, false);
      }, 350);
    });
  };

  return { speakItem, speakFarsiOnly, speakText, speakLetter, speakInLang, speakBilingual, stop, lang };
}