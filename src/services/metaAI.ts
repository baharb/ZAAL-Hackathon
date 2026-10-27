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
};

export type MetaResult = { text: string } | { error: string };

export async function askMeta(req: MetaRequest): Promise<MetaResult> {
  if (!supabaseConfigured) {
    return { error: 'Supabase is not configured (.env is missing EXPO_PUBLIC_SUPABASE_URL / ANON_KEY).' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('meta-ai', { body: req });
    if (error) return { error: error.message ?? 'Request failed' };
    if (data?.error) return { error: String(data.error) };
    return { text: String(data?.text ?? '') };
  } catch (e: any) {
    return { error: e?.message ?? 'Network error' };
  }
}
