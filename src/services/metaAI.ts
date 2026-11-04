// App-side helper for Meta Model API features (Meta Global AI Developer Hackathon).
//
// The app NEVER talks to api.meta.ai directly and NEVER holds the Meta API key.
// It calls the Supabase Edge Function `meta-ai` (supabase/functions/meta-ai),
// which adds the key on the server and forwards the request to Meta.
//
// Usage:
//   const { text } = await askMeta({ prompt: 'Say "apple" in Farsi for a 4 year old' });
//   const { text } = await askMeta({ prompt: 'What is in this photo? Answer in Farsi.', imageBase64 });
import { supabase, supabaseConfigured } from './supabaseClient';

export type MetaRequest = {
  prompt: string;
  /** Base64 JPEG (no "data:" prefix). Keep it small: resize to ~768px first. */
  imageBase64?: string;
  /** Extra instructions; the server always prepends ZAAL's child-safety rules. */
  system?: string;
  maxTokens?: number;
  /** 0..2, forwarded only when set (the server omits it otherwise). */
  temperature?: number;
};

export type MetaResult = { text: string } | { error: string };

export type CartoonRequest = {
  /** Base64 PNG or JPEG (no "data:" prefix). Drawings export at ~384px. */
  imageBase64: string;
  /** Same cartoon model repaints both; the prompt differs slightly. */
  kind: 'drawing' | 'photo';
  /** What the drawing/photo shows (e.g. "cat"), so the picture-book
   * character is that subject. Short simple English, server-validated. */
  subject?: string;
};

export type CartoonResult = { base64: string } | { error: string };

const BASE64_RE = /^[A-Za-z0-9+/=\s]+$/;

/** Dev-terminal only: the exact server failure (HTTP status + body) so
 * Bahar can read WHY a call failed. Never shown to the child. */
function devLogHttpError(prefix: string, error: any) {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const ctx = (error as any)?.context;
  const status = ctx?.status ?? (error as any)?.status ?? 'unknown';
  if (ctx && typeof ctx.clone === 'function') {
    ctx
      .clone()
      .text()
      .then((body: string) => console.warn(`${prefix} HTTP ${status}:`, body))
      .catch(() => console.warn(`${prefix} HTTP ${status}:`, error?.message ?? error));
  } else {
    console.warn(`${prefix} HTTP ${status}:`, error?.message ?? error);
  }
}

/** A hung Edge Function must never hang the child: cap every invoke so
 * the caller's fallback (hand-written story / the drawing itself) fires. */
const INVOKE_TIMEOUT_MS = 45000;
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('invoke timeout')), ms)),
  ]);
}

export async function askMeta(req: MetaRequest, retries = 1): Promise<MetaResult> {
  if (!supabaseConfigured) {
    return { error: 'Supabase is not configured (.env is missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).' };
  }
  // Photo answers are flaky (model thinking varies per image), so retry
  // failures and empty replies instead of bothering the child.
  let last: MetaResult = { error: 'Request failed' };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await withTimeout(supabase.functions.invoke('meta-ai', { body: req }), INVOKE_TIMEOUT_MS);
      if (error) {
        devLogHttpError('[story]', error);
        last = { error: error.message ?? 'Request failed' };
        continue;
      }
      if (data?.error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[story] function error:', data.error);
        last = { error: String(data.error) };
        continue;
      }
      const text = String(data?.text ?? '');
      if (!text.trim()) {
        last = { error: 'Empty reply' };
        continue;
      }
      return { text };
    } catch (e: any) {
      last = { error: e?.message ?? 'Network error' };
    }
  }
  return last;
}

/** Drawing/photo -> cartoon sticker, via the Supabase Edge Function
 * `cartoon` (supabase/functions/cartoon). Same key rules as askMeta: the
 * app never sees MODEL_API_KEY. Photos are processed and discarded. */
export async function askCartoon(req: CartoonRequest, retries = 1): Promise<CartoonResult> {
  if (!supabaseConfigured) {
    return { error: 'Supabase is not configured (.env is missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).' };
  }
  const clean = (req.imageBase64 ?? '').replace(/\s/g, '');
  if (!clean || !BASE64_RE.test(req.imageBase64)) {
    return { error: 'Bad image' };
  }
  let last: CartoonResult = { error: 'Request failed' };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('cartoon', {
          body: { imageBase64: clean, kind: req.kind, ...(req.subject ? { subject: req.subject } : {}) },
        }),
        INVOKE_TIMEOUT_MS,
      );
      if (error) {
        // Dev terminal only (never to the child): HTTP status + body.
        devLogHttpError('[cartoon]', error);
        last = { error: error.message ?? 'Request failed' };
        continue;
      }
      if (data?.error) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[cartoon] function error:', data.error);
        }
        last = { error: String(data.error) };
        continue;
      }
      const out = String(data?.imageBase64 ?? '').replace(/\s/g, '');
      if (!out || !BASE64_RE.test(out)) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[cartoon] reply had no image, keys were:', data ? Object.keys(data) : data);
        }
        last = { error: 'Empty reply' };
        continue;
      }
      return { base64: out };
    } catch (e: any) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[cartoon] network threw:', e?.message ?? e);
      }
      last = { error: e?.message ?? 'Network error' };
    }
  }
  return last;
}

/** One picture-book page illustration from a one-sentence English scene
 * description, via the Supabase Edge Function `illustrate`. The picture
 * is generated from model-written text (no child data) and kept in app
 * memory only — never stored. Failure just leaves the page with its
 * buddy+friend art; it never blocks the story. */
export async function askIllustration(scene: string): Promise<CartoonResult> {
  if (!supabaseConfigured) {
    return { error: 'Supabase is not configured (.env is missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).' };
  }
  const prompt = (scene ?? '').trim().slice(0, 500);
  if (!prompt) return { error: 'Empty scene' };
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('illustrate', { body: { prompt } }),
      INVOKE_TIMEOUT_MS,
    );
    if (error) {
      devLogHttpError('[illustrate]', error);
      return { error: error.message ?? 'Request failed' };
    }
    if (data?.error) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[illustrate] function error:', data.error);
      return { error: String(data.error) };
    }
    const out = String(data?.imageBase64 ?? '').replace(/\s/g, '');
    if (!out || !BASE64_RE.test(out)) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[illustrate] reply had no image, keys were:', data ? Object.keys(data) : data);
      }
      return { error: 'Empty reply' };
    }
    return { base64: out };
  } catch (e: any) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[illustrate] network threw:', e?.message ?? e);
    }
    return { error: e?.message ?? 'Network error' };
  }
}
