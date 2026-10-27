// Supabase Edge Function: the ONLY place ZAAL talks to the Meta Model API.
//
// Why this exists: the Meta API key must never ship inside the app bundle
// (anyone can unpack an .apk/.ipa and read it). The app calls this function
// with its normal Supabase credentials; this function adds the secret key
// server-side and forwards the request to Meta.
//
// The key lives in a Supabase secret, set once from a terminal:
//   supabase secrets set MODEL_API_KEY=your-key-from-dev.meta.ai
//
// Deploy:
//   supabase functions deploy meta-ai
//
// Request body (JSON):
//   {
//     "prompt": "text for the model",          // required
//     "imageBase64": "<base64 jpeg>",          // optional, for photo features
//     "system": "extra instructions",          // optional, appended to the child-safety rules
//     "maxTokens": 400                          // optional, capped at 1000
//   }
// Response: { "text": "..." } or { "error": "..." }

const META_BASE_URL = 'https://api.meta.ai/v1';

// Standard tier on purpose. Do NOT switch to "muse-spark-1.3-contributor":
// that tier lets Meta train on prompts and answers, and this is a kids' app.
const MODEL = 'muse-spark-1.3';

const MAX_TOKENS_CAP = 1000;
const MAX_IMAGE_BASE64_CHARS = 6_000_000; // ~4.5 MB image

const CHILD_SAFETY_RULES = `You are part of ZAAL, a Persian (Farsi) learning app for children aged 3 to 8 in diaspora families.
Rules you always follow:
- Content must be safe, kind and appropriate for a young child.
- Use simple, short sentences. Write Farsi in Persian script.
- Never ask for or repeat personal information (names of places, addresses, phone numbers, school names).
- If a request or image is not suitable for a child, reply only with a gentle, short redirect to a fun learning activity.`;

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

  let body: { prompt?: string; imageBase64?: string; system?: string; maxTokens?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) return json({ error: 'prompt is required' }, 400);
  if (prompt.length > 4000) return json({ error: 'prompt is too long' }, 400);
  if (body.imageBase64 && body.imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
    return json({ error: 'image is too large' }, 413);
  }

  const systemText = body.system ? `${CHILD_SAFETY_RULES}\n\n${body.system}` : CHILD_SAFETY_RULES;

  const userContent: unknown[] = [{ type: 'text', text: prompt }];
  if (body.imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${body.imageBase64}` },
    });
  }

  const maxTokens = Math.min(Math.max(Number(body.maxTokens) || 400, 1), MAX_TOKENS_CAP);

  try {
    const res = await fetch(`${META_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemText },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Meta API error', res.status, detail.slice(0, 500));
      return json({ error: `Meta API returned ${res.status}` }, 502);
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    return json({ text });
  } catch (err) {
    console.error('Meta API request failed', err);
    return json({ error: 'Could not reach the Meta API' }, 502);
  }
});
