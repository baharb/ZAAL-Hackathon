// Supabase Edge Function: story picture -> picture-book illustration (Meta Global AI Hackathon).
//
// Same pattern as `cartoon` / `meta-ai`: the app NEVER holds the Meta API
// key. The app calls this function with its normal Supabase credentials;
// this function adds the MODEL_API_KEY server secret and forwards to
// Meta's image model.
//
// Privacy: the only input is a one-sentence picture description the
// story model wrote (model-generated text — no child data, no photos).
// The picture is returned as base64 and kept in app memory only.
//
// Deploy:
//   supabase functions deploy illustrate
// (MODEL_API_KEY is the same secret `meta-ai` already uses.)
//
// Request body (JSON):
//   { "prompt": "<one-sentence English picture description>" }
// Response: { "imageBase64": "<base64 PNG>" } | { "error": "..." }

const META_GEN_URL = 'https://api.meta.ai/v1/images/generations';
const IMAGE_MODEL = 'muse-image-1.0';

// Fixed picture-book style. The scene sentence comes from our own story
// model, never typed by the child, and this wrapper keeps every page in
// the same kind storybook look with no text in the picture.
const BOOK_STYLE =
  "Children's picture-book illustration, cute ZAAL style: soft rounded shapes, " +
  'thick outlines, bright flat colors, warm sunny light, kind happy faces, ' +
  'simple cozy background, one clear moment from a story. ' +
  'No text, no words, no letters, no watermark. Safe and sweet for a 3-year-old. Scene: ';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const apiKey = Deno.env.get('MODEL_API_KEY');
  if (!apiKey) return json({ error: 'MODEL_API_KEY secret is not set on the server' }, 500);

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  const scene = (body.prompt ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 500);
  if (!scene) return json({ error: 'prompt is required' }, 400);

  try {
    const res = await fetch(META_GEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: `${BOOK_STYLE}${scene}`,
        n: 1,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[illustrate] Meta image API error', res.status, detail.slice(0, 500));
      return json({ error: `Meta image API returned ${res.status}` }, 502);
    }

    const data = await res.json();
    const first = data?.data?.[0];
    let outBase64: string | null = null;
    if (first && typeof first.b64_json === 'string' && first.b64_json.length > 0) {
      outBase64 = first.b64_json;
    } else if (first && typeof first.url === 'string' && first.url.length > 0) {
      // URL reply: fetch it server-side so the app still only ever
      // receives throwaway base64 (and the key stays here).
      const img = await fetch(first.url);
      if (!img.ok) return json({ error: 'Could not fetch illustration' }, 502);
      const buf = new Uint8Array(await img.arrayBuffer());
      let bin = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
      }
      outBase64 = btoa(bin);
    }
    if (!outBase64) {
      console.error('[illustrate] Meta image API returned no image');
      return json({ error: 'Model returned no image' }, 502);
    }
    return json({ imageBase64: outBase64 });
  } catch (err) {
    console.error('[illustrate] Meta image API request failed', err);
    return json({ error: 'Could not reach the Meta image API' }, 502);
  }
});
