/**
 * YUMYUMPO — AI Search Edge Function
 * Proxies natural language restaurant queries to Claude API.
 * Never exposes the Anthropic API key to the browser.
 *
 * Deploy: supabase functions deploy ai-search
 * Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-20241022'; // fast + cost-efficient for search

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/* ── system prompt ── */
const SYSTEM_PROMPT = `You are YAI, the friendly AI food guide for YUMYUMPO — the Philippines' premier restaurant discovery platform.

Your personality:
- Warm, enthusiastic, traveler-friendly
- Use food emojis naturally (not excessively)
- Keep responses concise — 2-4 sentences max for the opening
- Speak like a knowledgeable local food guide, not a corporate chatbot
- Use Philippine cultural context (Tagalog words like "masarap", "sulit", "sarap")

Your task: Given a user's natural language restaurant query and a list of matching restaurants, generate a conversational response that:
1. Acknowledges their craving/vibe/occasion warmly
2. Highlights 1-2 specific things about the top result
3. Ends with an engaging follow-up hook

Always respond in JSON format:
{
  "opening": "Your warm 2-4 sentence opening message",
  "highlight": "One specific thing to highlight about the top restaurant",
  "closing": "A short follow-up hook (1 sentence)",
  "followUp": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

serve(async (req: Request) => {
  /* preflight */
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI service unavailable', fallback: true }), {
        status: 503,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { query, restaurants = [], context = {} } = body;

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    /* build restaurant summary for Claude */
    const restaurantList = restaurants.slice(0, 6).map((r: any, i: number) => {
      return `${i + 1}. ${r.name} (${r.cuisine}) — ${r.location || r.address || 'Philippines'} · Rating: ${r.rating || '4.0'}/5 · Tags: ${(r.tags || []).slice(0, 4).join(', ')}`;
    }).join('\n');

    const userMessage = `User query: "${query}"

${context.previousQuery ? `Previous query: "${context.previousQuery}"` : ''}

Matching restaurants found:
${restaurantList || 'No restaurants found matching this query.'}

Please generate a warm, conversational response for YAI.`;

    /* call Claude */
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[ai-search] Claude API error:', claudeRes.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed', fallback: true }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text || '{}';

    /* parse JSON from Claude response */
    let parsed: any = {};
    try {
      /* extract JSON block if Claude wrapped it in markdown */
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = { opening: rawText };
    }

    return new Response(JSON.stringify({
      opening:  parsed.opening  || null,
      highlight: parsed.highlight || null,
      closing:  parsed.closing  || null,
      followUp: Array.isArray(parsed.followUp) ? parsed.followUp : [],
      model: MODEL,
      enhanced: true,
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ai-search] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', fallback: true }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
