// Supabase Edge Function: drawing/photo -> cartoon sticker (Meta Global AI Hackathon).
//
// Same pattern as `meta-ai`: the app NEVER holds the Meta API key. The app
// calls this function with its normal Supabase credentials; this function
// adds the MODEL_API_KEY server secret and forwards to Meta's image model.
// The input picture is processed and discarded — never stored anywhere,
// consistent with ZAAL's child-privacy rule (photos stay on the device,
// except for this one server-side repaint which is thrown away).
//
// Deploy:
//   supabase functions deploy cartoon
// (MODEL_API_KEY is the same secret `meta-ai` already uses.)
//
// Request body (JSON):
//   {
//     "imageBase64": "<base64 PNG or JPEG, no data: prefix>",  // required
//     "kind": "drawing" | "photo"                             // required
//   }
// Response: { "imageBase64": "<base64 PNG cartoon>" } | { "error": "..." }

// Same call shape as scripts/generate_family_images.py (Meta docs).
const META_EDIT_URL = 'https://api.meta.ai/v1/images/edits';
const IMAGE_MODEL = 'muse-image-1.0';

const MAX_IMAGE_BASE64_CHARS = 6_000_000; // ~4.5 MB

// Fixed cartoon style. The child never controls this prompt — only the
// drawing/photo pixels come from the app — so the output cannot be
// steered into anything but a kind kids' sticker.
const CARTOON_STYLE =
  'A cute, polished children\'s picture-book character INSPIRED by this child\'s drawing: ' +
  'same subject and main colors, but redrawn beautifully — soft rounded shapes, ' +
  'big friendly eyes if it is a creature, clean outlines, bright colors, ' +
  'plain white background, no text. Do not copy or trace the drawing itself; ' +
  're-imagine it as a finished picture-book character. Safe and kind for a 3-year-old.';
const KIND_INSTRUCTION = {
  drawing: 'The source is a young child\'s finger drawing — take only its subject and main colors as inspiration.',
  photo: "The source is a photo of a child's toy or room — redraw its main subject in the same polished picture-book way.",
} as const;

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

  let body: { imageBase64?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  const imageBase64 = (body.imageBase64 ?? '').trim();
  if (!imageBase64) return json({ error: 'imageBase64 is required' }, 400);
  if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) return json({ error: 'image is too large' }, 413);
  const kind = body.kind === 'photo' ? 'photo' : body.kind === 'drawing' ? 'drawing' : null;
  if (!kind) return json({ error: 'kind must be "drawing" or "photo"' }, 400);

  try {
    const res = await fetch(META_EDIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: `${CARTOON_STYLE} ${KIND_INSTRUCTION[kind]}`,
        // The source picture to repaint, as a data URL.
        images: [{ image_url: `data:image/png;base64,${imageBase64}` }],
        n: 1,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Meta image API error', res.status, detail.slice(0, 500));
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
      if (!img.ok) return json({ error: 'Could not fetch cartoon image' }, 502);
      const buf = new Uint8Array(await img.arrayBuffer());
      let bin = '';
      const CHUNK = 0x8000;
      for (let i = 0; i < buf.length; i += CHUNK) {
        bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
      }
      outBase64 = btoa(bin);
    }
    if (!outBase64) {
      console.error('Meta image API returned no image');
      return json({ error: 'Model returned no image' }, 502);
    }
    return json({ imageBase64: outBase64 });
  } catch (err) {
    console.error('Meta image API request failed', err);
    return json({ error: 'Could not reach the Meta image API' }, 502);
  }
});
