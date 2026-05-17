/**
 * YUMYUMPO — Menu Scan Edge Function
 * Takes a photo / screenshot of a restaurant menu and uses Claude
 * vision to extract structured categories + items. Powers the
 * "Scan a menu photo" feature in the Digital Menu Builder.
 *
 * Deploy:  supabase functions deploy menu-scan
 * Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Request  (POST, JSON):
 *   { image: "data:image/jpeg;base64,...."     // required
 *     category_hint?: "Mains"                  // optional }
 * Response (JSON):
 *   { categories: [ { name, items: [ { name, description, price } ] } ] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
/* Sonnet — vision accuracy matters for reading prices + item names. */
const MODEL = 'claude-sonnet-4-6';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const CORS = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

const SYSTEM_PROMPT = `You read photos and screenshots of restaurant menus and return their contents as structured data.

Rules:
- Extract every distinct menu item you can read.
- Group items under their category/section heading exactly as printed on the menu (e.g. "Starters", "Mains", "Drinks"). If the menu shows no section headings, put everything under one category named "Menu".
- For each item capture: name (required), a short description if printed, and price if printed.
- Keep prices exactly as written, including the currency symbol (e.g. "₱180", "180", "P 250"). If no price is shown, use an empty string.
- Do NOT invent items, descriptions, or prices. Only transcribe what is visibly on the menu.
- Ignore non-menu text (restaurant name, address, hours, social handles, decorative text).

Respond with valid JSON ONLY, no markdown, in exactly this shape:
{
  "categories": [
    { "name": "Category name", "items": [ { "name": "Item", "description": "", "price": "" } ] }
  ]
}`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'AI service unavailable' }, 503);

    const { image, category_hint } = await req.json();
    if (!image || typeof image !== 'string') {
      return json({ error: 'image is required' }, 400);
    }

    /* Accept a data URL or a bare base64 string. */
    const m = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    const mediaType = m ? m[1] : 'image/jpeg';
    const b64       = m ? m[2] : image;

    const hint = category_hint && typeof category_hint === 'string'
      ? `\n\nThe restaurant says this image is for the category: "${category_hint}". Prefer that category name unless the image clearly shows different section headings.`
      : '';

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        /* cache the (static) system prompt across scans */
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text', text: `Extract this menu into the JSON structure.${hint}` },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[menu-scan] Claude API error:', claudeRes.status, errText);
      return json({ error: 'Could not read the menu image. Try a clearer photo.' }, 502);
    }

    const data = await claudeRes.json();
    const rawText = data.content?.[0]?.text || '{}';

    let parsed: any = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    /* Normalise + guard the shape. */
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const clean = categories
      .map((c: any) => ({
        name: String(c?.name || 'Menu').trim() || 'Menu',
        items: (Array.isArray(c?.items) ? c.items : [])
          .map((it: any) => ({
            name:        String(it?.name || '').trim(),
            description: String(it?.description || '').trim(),
            price:       String(it?.price || '').trim(),
          }))
          .filter((it: any) => it.name),
      }))
      .filter((c: any) => c.items.length);

    return json({ categories: clean, model: MODEL });

  } catch (err) {
    console.error('[menu-scan] Unhandled error:', err);
    return json({ error: 'Internal error' }, 500);
  }

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
