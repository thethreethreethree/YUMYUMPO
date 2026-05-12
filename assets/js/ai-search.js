/* ============================================================
   YUMYUMPO — AI Restaurant Discovery Engine  v1.0
   ============================================================
   Architecture:
     Layer 1 · QueryParser        — intent extraction from free text
     Layer 2 · RecommendationEngine — multi-signal scoring & ranking
     Layer 3 · ResponseGenerator  — natural language output
     Layer 4 · ConversationManager — session state + history
     Layer 5 · ClaudeProxy        — Claude API integration hook

   Works fully offline (local intelligence).
   Claude API enhances but is never required.
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════
   KNOWLEDGE BASE — semantic mappings
══════════════════════════════════════════════════════════ */

const KB = {

  /* ── CUISINE SYNONYMS ───────────────────────────────── */
  cuisine: {
    'Filipino':  ['filipino','pinoy','local food','sinigang','lechon','adobo','kare','lugaw','tapsilog','sisig','pancit','kaldereta','pinakbet','balut','palitaw','halo-halo','inasal','lechon','bangus'],
    'Japanese':  ['japanese','ramen','sushi','sashimi','izakaya','yakitori','udon','tempura','tonkotsu','miso','sake','noodles','gyoza','karaage','donburi','takoyaki','matcha','wasabi'],
    'Korean':    ['korean','kbbq','korean bbq','samgyupsal','bibimbap','kimchi','bulgogi','tteokbokki','kpop','k-grill','galbi','doenjang','sundubu'],
    'Seafood':   ['seafood','fish','shrimp','prawns','crab','lobster','squid','grilled fish','lapu-lapu','shellfish','clams','oysters','tuna','salmon','bangus','tilapia','sea bass'],
    'Café':      ['café','cafe','coffee','brunch','breakfast','latte','cappuccino','espresso','pastry','bread','bakery','flat white','cold brew','pour over','matcha latte'],
    'Italian':   ['italian','pizza','pasta','risotto','tiramisu','bruschetta','carbonara','bolognese','neapolitan','pesto','focaccia','gelato','lasagna','calzone'],
    'BBQ':       ['bbq','barbecue','grill','smoked','ribs','brisket','pulled pork','wings','charcoal','smokehouse','pit'],
    'Vegan':     ['vegan','plant-based','plant based','vegetarian','salad','healthy','green','organic','raw food','tofu','tempeh','acai'],
    'Chinese':   ['chinese','dimsum','dim sum','dumplings','noodles','fried rice','peking duck','wonton','char siu','lo mein','mapo tofu','hot pot'],
    'Burgers':   ['burger','burgers','smash burger','cheeseburger','patty','beef burger','wagyu burger','fries','milkshake'],
    'Mexican':   ['mexican','taco','tacos','burrito','nachos','guacamole','salsa','quesadilla','enchilada','birria','horchata'],
    'Desserts':  ['dessert','desserts','ice cream','cake','pastry','sweet','halo-halo','churros','crepe','waffle','pudding','cheesecake','gelato'],
  },

  /* ── MOOD → TAG MAPPINGS ────────────────────────────── */
  mood: {
    'Romantic':            ['romantic','romance','date','anniversary','couples','candlelit','intimate','special night','love','proposal','honeymoon','valentine'],
    'Hidden Gem':          ['hidden','hidden gem','underrated','secret','off the beaten','local secret','unknown','undiscovered','not touristy','gem'],
    'Local Favorite':      ['local','authentic','genuine','real','neighborhood','community','traditional','classic','staple','institution'],
    'Budget-Friendly':     ['cheap','budget','affordable','inexpensive','value','low cost','pocket friendly','economical','bang for buck','reasonable'],
    'Fine Dining':         ['fine dining','upscale','luxury','fancy','elegant','michelin','premium','high end','special occasion','tasting menu'],
    'Instagrammable':      ['instagram','instagrammable','aesthetic','photogenic','beautiful','pretty','picture perfect','social media','photo','insta'],
    'Backpacker-Approved': ['backpacker','backpacking','solo travel','solo traveler','hostel','budget travel','traveler','wanderer','nomad','gap year'],
    'Tourist Favorite':    ['tourist','tourism','must visit','attraction','popular','landmark','visitor','sightseeing'],
    'Family-Friendly':     ['family','kids','children','child friendly','wholesome','group','parents','toddler'],
    'Group-Friendly':      ['group','gang','large group','friends','celebration','party','gathering','team'],
    'Late Night':          ['late night','midnight','after midnight','night owl','2am','all night','late','nocturnal'],
    'Healthy':             ['healthy','nutritious','clean eating','wholesome','fresh','organic','light','low calorie','fit','wellness'],
    'Beach Dining':        ['beach','seaside','oceanfront','waterfront','ocean view','island','coastal','by the sea','water'],
    'Scenic View':         ['view','scenic','panoramic','rooftop','hilltop','overlooking','sunset view','beautiful view','overlook'],
    'WiFi-Friendly':       ['wifi','wi-fi','internet','remote work','laptop','work cafe','coworking','digital nomad','hotspot'],
    'Date Spot':           ['date spot','date night','date place','impress','second date','first date'],
    'Must Try':            ['must try','must have','best ever','legendary','famous','iconic','world class','blow your mind','life changing'],
    'Outdoor Seating':     ['outdoor','outside','alfresco','terrace','garden','open air','patio'],
  },

  /* ── TIME OF DAY ────────────────────────────────────── */
  timeOfDay: {
    morning:   ['breakfast','morning','early','sunrise','7am','8am','9am'],
    brunch:    ['brunch','late morning','10am','11am','weekend morning'],
    lunch:     ['lunch','noon','midday','12pm','1pm','afternoon'],
    dinner:    ['dinner','evening','supper','night','6pm','7pm','8pm','9pm'],
    lateNight: ['late night','midnight','after 10','2am','3am','after hours'],
  },

  /* ── BUDGET SIGNALS ─────────────────────────────────── */
  budget: {
    low:    ['cheap','budget','affordable','₱100','₱200','under 300','under 200','under 100','free','inexpensive'],
    mid:    ['mid range','moderate','reasonable','decent price','₱300','₱400','₱500'],
    high:   ['fine dining','luxury','upscale','₱1000','₱2000','premium','expensive','splurge'],
  },

  /* ── LOCATION SIGNALS ───────────────────────────────── */
  location: {
    'El Nido':   ['el nido','elnido','palawan'],
    'Coron':     ['coron','palawan'],
    'Siargao':   ['siargao','cloud 9','general luna'],
    'Makati':    ['makati','bgc','bonifacio','taguig','salcedo'],
    'Cebu':      ['cebu','cebu city','mactan'],
    'Boracay':   ['boracay','bora','aklan'],
    'Manila':    ['manila','intramuros','malate','ermita','binondo'],
    'Quezon City':['quezon city','qc','tomas morato','katipunan','cubao'],
    'Bohol':     ['bohol','tagbilaran','chocolate hills'],
  },

  /* ── INTENT CLASSIFIERS ─────────────────────────────── */
  intent: {
    discover:  ['find','show me','where can i','recommend','suggest','best','top','what are','any good','know any'],
    specific:  ['i want','looking for','craving','need','i\'m in the mood for','give me'],
    compare:   ['vs','versus','or','which is better','difference'],
    revisit:   ['again','been before','went to','remember','came back'],
    tourist:   ['visiting','tourist','travel','trip','vacation','holiday','first time'],
  },

  /* ── RESPONSE TEMPLATES per scenario ────────────────── */
  responses: {
    romantic: [
      "💕 Ooh, planning something special? Here are my top picks for a romantic night out:",
      "🕯️ I know exactly what you need — these places set the perfect mood for romance:",
      "💑 Date night sorted! These restaurants consistently deliver on atmosphere and food:",
    ],
    budget: [
      "💸 Great food doesn't have to break the bank! Here's where to eat well for less:",
      "🤑 Budget-friendly and delicious — these spots deliver serious value:",
      "💰 Found some incredible eats that won't wreck your wallet:",
    ],
    hidden: [
      "💎 Oh, you want the real insider spots? Here's what the locals actually eat at:",
      "🗺️ Let me show you what most tourists completely miss:",
      "🤫 These hidden gems are exactly what locals don't want you to know about:",
    ],
    cafe: [
      "☕ Great taste in vibe! Here are the best café spots to settle into:",
      "🍵 Perfect for slow mornings and good conversations — here are my top café picks:",
      "💻 Whether you're working or relaxing, these cafés have you covered:",
    ],
    seafood: [
      "🦞 The Philippines has some of the world's best seafood — here's where to find it:",
      "🐟 Fresh from the ocean to your plate — these are the seafood spots worth visiting:",
      "🌊 You're in the right place for seafood. Here are my top recommendations:",
    ],
    japanese: [
      "🍜 Excellent choice. Here's where to find the best Japanese food on the platform:",
      "🍶 From ramen to izakaya vibes — these Japanese restaurants are the real deal:",
      "🥢 I've found your ramen fix. These spots know their craft:",
    ],
    healthy: [
      "🥗 Eating well and eating good — here's where to find healthy and delicious food:",
      "🌿 Fresh, nutritious, and actually satisfying — these spots have it sorted:",
      "💪 Clean eating without sacrificing flavour. Here's where to go:",
    ],
    tourist: [
      "🗺️ First time exploring? These restaurants are loved by visitors for good reason:",
      "✈️ Making the most of your trip — here are the restaurants you genuinely shouldn't miss:",
      "🏝️ These places will make your visit unforgettable:",
    ],
    general: [
      "🍽️ Based on what you're looking for, here are my top picks:",
      "✨ Found some great options that match your vibe perfectly:",
      "🎯 Here's what I'd recommend based on your search:",
    ],
    noResults: [
      "Hmm, I couldn't find an exact match — but here are some great alternatives that might work:",
      "Nothing came up for that specific search, but these popular spots might surprise you:",
    ],
  },

  /* ── FOLLOW-UP SUGGESTIONS per scenario ─────────────── */
  followUps: {
    romantic:   ['Near Makati', 'Near BGC', 'With outdoor seating', 'Under ₱500pp'],
    budget:     ['Under ₱200', 'Best value in Manila', 'Budget eats in El Nido'],
    seafood:    ['Fresh catch daily', 'Grilled seafood', 'Budget seafood', 'Seafood in Palawan'],
    japanese:   ['Best ramen', 'Izakaya vibes', 'Open late', 'Near Makati'],
    cafe:       ['With WiFi', 'Best brunch', 'Best coffee', 'Instagrammable cafés'],
    tourist:    ['Hidden gems', 'Local favorites', 'El Nido food', 'Island dining'],
    healthy:    ['Vegan options', 'Best acai bowls', 'Plant-based', 'Organic cafés'],
    general:    ['Hidden gems', 'Budget-friendly', 'Romantic spots', 'Best in Palawan'],
  },
};


/* ══════════════════════════════════════════════════════════
   LAYER 1 — QUERY PARSER
   Extracts structured intent from free-text queries
══════════════════════════════════════════════════════════ */
class QueryParser {

  parse(rawQuery) {
    const q       = rawQuery.toLowerCase().trim();
    const tokens  = q.split(/[\s,!?.]+/).filter(Boolean);

    return {
      raw:       rawQuery,
      normalised: q,
      tokens,
      cuisines:  this._extractCuisines(q, tokens),
      moods:     this._extractMoods(q, tokens),
      timeOfDay: this._extractTime(q, tokens),
      budget:    this._extractBudget(q, tokens),
      location:  this._extractLocation(q),
      intent:    this._classifyIntent(q),
      scenario:  this._inferScenario(q, tokens),
    };
  }

  _extractCuisines(q, tokens) {
    const found = new Set();
    for (const [cuisine, keywords] of Object.entries(KB.cuisine)) {
      for (const kw of keywords) {
        if (q.includes(kw)) { found.add(cuisine); break; }
      }
    }
    return [...found];
  }

  _extractMoods(q, tokens) {
    const found = new Set();
    for (const [tag, keywords] of Object.entries(KB.mood)) {
      for (const kw of keywords) {
        if (q.includes(kw)) { found.add(tag); break; }
      }
    }
    return [...found];
  }

  _extractTime(q, tokens) {
    for (const [period, keywords] of Object.entries(KB.timeOfDay)) {
      if (keywords.some(kw => q.includes(kw))) return period;
    }
    return null;
  }

  _extractBudget(q, tokens) {
    for (const [level, keywords] of Object.entries(KB.budget)) {
      if (keywords.some(kw => q.includes(kw))) return level;
    }
    return null;
  }

  _extractLocation(q) {
    for (const [place, keywords] of Object.entries(KB.location)) {
      if (keywords.some(kw => q.includes(kw))) return place;
    }
    return null;
  }

  _classifyIntent(q) {
    for (const [intent, keywords] of Object.entries(KB.intent)) {
      if (keywords.some(kw => q.includes(kw))) return intent;
    }
    return 'discover';
  }

  _inferScenario(q, tokens) {
    // Ordered priority — first match wins
    if (KB.mood['Romantic'].some(kw => q.includes(kw)))          return 'romantic';
    if (KB.mood['Budget-Friendly'].some(kw => q.includes(kw)))   return 'budget';
    if (KB.mood['Hidden Gem'].some(kw => q.includes(kw)))        return 'hidden';
    if (KB.mood['Healthy'].some(kw => q.includes(kw)))           return 'healthy';
    if (KB.mood['Tourist Favorite'].some(kw => q.includes(kw)))  return 'tourist';
    if (KB.mood['Backpacker-Approved'].some(kw => q.includes(kw))) return 'tourist';
    if (KB.cuisine['Café'].some(kw => q.includes(kw)))           return 'cafe';
    if (KB.cuisine['Seafood'].some(kw => q.includes(kw)))        return 'seafood';
    if (KB.cuisine['Japanese'].some(kw => q.includes(kw)))       return 'japanese';
    return 'general';
  }
}


/* ══════════════════════════════════════════════════════════
   LAYER 2 — RECOMMENDATION ENGINE
   Scores every restaurant against parsed query (0–100)
══════════════════════════════════════════════════════════ */
class RecommendationEngine {

  /* Weights must sum to 100 */
  static WEIGHTS = {
    cuisine:    28,  // exact cuisine match
    mood:       24,  // mood/tag alignment
    rating:     18,  // Google rating signal
    popularity: 14,  // review count (social proof)
    text:       10,  // description keyword match
    location:    6,  // location match
  };

  score(restaurant, parsed) {
    const scores = {
      cuisine:    this._scoreCuisine(restaurant, parsed),
      mood:       this._scoreMood(restaurant, parsed),
      rating:     this._scoreRating(restaurant),
      popularity: this._scorePopularity(restaurant),
      text:       this._scoreText(restaurant, parsed),
      location:   this._scoreLocation(restaurant, parsed),
    };

    const W = RecommendationEngine.WEIGHTS;
    const total = Object.entries(scores)
      .reduce((sum, [key, val]) => sum + (val * W[key] / 100), 0);

    return { total: Math.round(total), breakdown: scores };
  }

  _scoreCuisine(r, parsed) {
    if (!parsed.cuisines.length) return 50; // no cuisine filter → neutral
    const rCuisine = (r.cuisine || '').toLowerCase();
    for (const c of parsed.cuisines) {
      if (rCuisine.includes(c.toLowerCase())) return 100;
      // Partial match (e.g. "BBQ & Grill" matches "BBQ")
      if (c.toLowerCase().split(/\s+/).some(word => rCuisine.includes(word))) return 70;
    }
    return 0;
  }

  _scoreMood(r, parsed) {
    if (!parsed.moods.length) return 50;
    const rTags = (r.tags || []).map(t => t.toLowerCase());
    let matched = 0;
    for (const mood of parsed.moods) {
      if (rTags.includes(mood.toLowerCase())) matched++;
    }
    if (matched === 0) return 10;
    return Math.min(100, (matched / parsed.moods.length) * 100 + 10);
  }

  _scoreRating(r) {
    const rating = parseFloat(r.rating) || 0;
    // 4.9 → 100, 4.5 → 80, 4.0 → 60, 3.5 → 40
    return Math.min(100, Math.max(0, (rating - 3) / 2 * 100));
  }

  _scorePopularity(r) {
    const reviews = parseInt(r.reviews) || 0;
    // Log scale: 5000+ → 100, 1000 → 70, 100 → 40, 0 → 0
    if (reviews === 0) return 10;
    return Math.min(100, Math.log10(reviews) / Math.log10(5000) * 100);
  }

  _scoreText(r, parsed) {
    const desc   = ((r.description || '') + ' ' + (r.name || '')).toLowerCase();
    const tokens = parsed.tokens;
    let hits = 0;
    for (const token of tokens) {
      if (token.length > 3 && desc.includes(token)) hits++;
    }
    return Math.min(100, hits * 25);
  }

  _scoreLocation(r, parsed) {
    if (!parsed.location) return 50;
    const rLoc = (r.location || '').toLowerCase();
    return rLoc.includes(parsed.location.toLowerCase()) ? 100 : 0;
  }

  rank(restaurants, parsed, limit = 6) {
    return restaurants
      .map(r => ({ ...r, _score: this.score(r, parsed) }))
      .sort((a, b) => b._score.total - a._score.total)
      .slice(0, limit);
  }
}


/* ══════════════════════════════════════════════════════════
   LAYER 3 — RESPONSE GENERATOR
   Produces natural, warm, contextual text
══════════════════════════════════════════════════════════ */
class ResponseGenerator {

  opening(parsed, resultCount) {
    if (resultCount === 0) return this._pick(KB.responses.noResults);
    const templates = KB.responses[parsed.scenario] || KB.responses.general;
    return this._pick(templates);
  }

  restaurantBlurb(restaurant, parsed) {
    const highlights = this._buildHighlights(restaurant, parsed);
    return highlights.length ? highlights[0] : restaurant.description?.split('.')[0] || '';
  }

  closing(parsed, results) {
    if (!results.length) return '';
    const topRated = results[0];
    const lines = [];

    if (parsed.scenario === 'romantic')
      lines.push(`💡 My top pick for a special night: **${topRated.name}** — ${topRated.location}.`);
    else if (parsed.scenario === 'budget')
      lines.push(`💡 Best value: **${topRated.name}** at ${topRated.location}.`);
    else if (results.length > 1)
      lines.push(`✨ ${results.length} restaurants matched your vibe. **${topRated.name}** scores highest overall.`);

    if (parsed.moods.includes('Late Night'))
      lines.push('🌙 Heads up: call ahead to confirm closing times!');
    if (parsed.moods.includes('Budget-Friendly'))
      lines.push('💸 Prices shown are approximate and may vary by order.');

    return lines.join('\n');
  }

  followUpSuggestions(parsed) {
    return KB.followUps[parsed.scenario] || KB.followUps.general;
  }

  _buildHighlights(r, parsed) {
    const highlights = [];
    const rTags = r.tags || [];

    if (parsed.moods.includes('Romantic') && rTags.includes('Romantic'))
      highlights.push(`Perfect for a romantic evening — ${r.description?.split('.')[0]?.toLowerCase() || ''}`);
    if (parsed.moods.includes('Budget-Friendly') && rTags.includes('Budget-Friendly'))
      highlights.push(`Great value for money — one of the best budget spots in ${r.location}`);
    if (parsed.moods.includes('Hidden Gem') && rTags.includes('Hidden Gem'))
      highlights.push(`A true local secret — most tourists walk straight past this one`);
    if (rTags.includes('Must Try'))
      highlights.push(`Widely considered a must-try in ${r.location}`);

    return highlights;
  }

  _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
}


/* ══════════════════════════════════════════════════════════
   LAYER 4 — CONVERSATION MANAGER
   Tracks history, context, and follow-up context
══════════════════════════════════════════════════════════ */
class ConversationManager {

  constructor() {
    this.history      = [];   // [{ role, content, results? }]
    this.context      = {};   // accumulated filter context across turns
    this.sessionStart = Date.now();
  }

  addUserMessage(text) {
    this.history.push({ role: 'user', content: text, ts: Date.now() });
  }

  addAIMessage(text, results = [], parsed = null) {
    this.history.push({ role: 'ai', content: text, results, parsed, ts: Date.now() });
    // Accumulate context across turns
    if (parsed) {
      if (parsed.location) this.context.location  = parsed.location;
      if (parsed.budget)   this.context.budget    = parsed.budget;
    }
  }

  /* Merge context from previous turns so follow-ups work naturally */
  enrichParsed(parsed) {
    if (!parsed.location && this.context.location) parsed.location = this.context.location;
    if (!parsed.budget   && this.context.budget)   parsed.budget   = this.context.budget;
    return parsed;
  }

  getLastResults() {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'ai' && this.history[i].results?.length) {
        return this.history[i].results;
      }
    }
    return [];
  }

  isFollowUp(text) {
    const q = text.toLowerCase();
    const followUpPhrases = ['what about','and','near','with','any','show me more','more like this','something cheaper','more options','filter by','also','too'];
    return this.history.length > 0 && followUpPhrases.some(p => q.startsWith(p));
  }

  reset() {
    this.history = [];
    this.context = {};
  }
}


/* ══════════════════════════════════════════════════════════
   LAYER 5 — CLAUDE API PROXY
   Never exposes API key. Routes through Supabase Edge Function.
   Falls back gracefully to local engine if unavailable.
══════════════════════════════════════════════════════════ */
class ClaudeProxy {

  /* Resolves the AI endpoint at call time so config.js can be loaded after this file. */
  static endpoint() {
    return window.YUMYUMPO_CONFIG?.AI_ENDPOINT || '';
  }

  /* Returns { opening, closing, followUp } on success, or null on failure. */
  static async enhance(query, localResults, context = {}) {
    const url = this.endpoint();
    if (!url || /YOUR_/.test(url)) return null;

    /* AbortController with timeout (Safari < 16.4 compatibility) */
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 8000);

    try {
      const restaurants = (localResults || []).slice(0, 6).map(r => ({
        name:     r.name,
        cuisine:  r.cuisine,
        location: r.location,
        rating:   r.rating,
        tags:     (r.tags || []).slice(0, 4),
      }));

      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query, restaurants, context }),
        signal:  controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      if (data.fallback || !data.opening) return null;

      return {
        opening:  data.opening  || null,
        closing:  data.closing  || null,
        followUp: Array.isArray(data.followUp) ? data.followUp : [],
      };

    } catch (err) {
      clearTimeout(timeoutId);
      if (window.YYP?.mode === 'development') {
        console.warn('[Fred] Claude enhancement unavailable, using local engine:', err.message);
      }
      return null;
    }
  }
}


/* ══════════════════════════════════════════════════════════
   PUBLIC API — YAI (YUMYUMPO AI)
   Single entry point used by the UI
══════════════════════════════════════════════════════════ */
const YAI = (() => {

  const parser      = new QueryParser();
  const engine      = new RecommendationEngine();
  const respGen     = new ResponseGenerator();
  const convo       = new ConversationManager();

  /* Restaurant pool — populated from ALL_RESTAURANTS or Supabase */
  let restaurantPool = [];

  function setPool(restaurants) {
    restaurantPool = restaurants;
  }

  /* ── MAIN QUERY HANDLER ── */
  async function query(rawQuery, options = {}) {
    const { useClaudeIfAvailable = true, limit = 6 } = options;

    convo.addUserMessage(rawQuery);

    let parsed = parser.parse(rawQuery);
    parsed     = convo.enrichParsed(parsed);

    // If follow-up with no new intent, blend previous context
    if (convo.isFollowUp(rawQuery)) {
      const prevParsed = convo.getLastResults()[0]?._parsed;
      if (prevParsed) {
        parsed.cuisines = [...new Set([...parsed.cuisines, ...prevParsed.cuisines])];
        parsed.moods    = [...new Set([...parsed.moods,    ...prevParsed.moods])];
      }
    }

    const results = engine.rank(restaurantPool, parsed, limit);
    results.forEach(r => r._parsed = parsed); // carry parsed onto results for follow-ups

    /* Local response as the always-available baseline */
    let openingText = respGen.opening(parsed, results.length);
    let closingText = respGen.closing(parsed, results);
    let followUp   = respGen.followUpSuggestions(parsed);

    /* Optionally upgrade with Claude-generated copy */
    if (useClaudeIfAvailable && results.length > 0) {
      const enhanced = await ClaudeProxy.enhance(rawQuery, results, {
        previousQuery: convo.history.length > 1 ? convo.history[convo.history.length - 2]?.text : null,
      });
      if (enhanced) {
        if (enhanced.opening)         openingText = enhanced.opening;
        if (enhanced.closing)         closingText = enhanced.closing;
        if (enhanced.followUp?.length) followUp   = enhanced.followUp;
      }
    }

    const aiMessage = {
      opening:     openingText,
      closing:     closingText,
      followUp,                              // primary name
      suggestions: followUp,                 // backwards-compatible alias
      restaurants: results,                  // primary name (matches UI expectations)
      results,                               // backwards-compatible alias
      parsed,
    };

    convo.addAIMessage(openingText, results, parsed);

    if (window.YAn) {
      YAn.track(YAn.EVENT_TYPES.SEARCH, {
        query:        rawQuery,
        scenario:     parsed.scenario,
        cuisines:     parsed.cuisines,
        moods:        parsed.moods,
        result_count: results.length,
      });
    }

    return aiMessage;
  }

  /* ── QUICK SCORE (for on-page relevance sorting) ── */
  function scoreRestaurant(restaurant, queryText) {
    const parsed = parser.parse(queryText);
    return engine.score(restaurant, parsed).total;
  }

  /* ── SUGGEST QUERIES based on current context ── */
  function suggestQueries(context = '') {
    const base = [
      'Best ramen nearby 🍜',
      'Romantic dinner places 🕯️',
      'Cheap seafood by the beach 🦞',
      'Hidden local gems 💎',
      'Best cafés with WiFi ☕',
      'Healthy brunch spots 🥗',
      'Budget-friendly local food 💸',
      'Late night eats 🌙',
      'Best sunset dining 🌅',
      'Backpacker-friendly spots 🎒',
      'Best Filipino food 🇵🇭',
      'Instagrammable restaurants 📸',
    ];
    // Shuffle and return 6
    return base.sort(() => Math.random() - 0.5).slice(0, 6);
  }

  /* ── MOOD COLLECTIONS ── */
  function getMoodCollections() {
    return [
      { id: 'romantic',   label: 'Romantic Night',     emoji: '🕯️',  tags: ['Romantic', 'Date Spot', 'Scenic View'] },
      { id: 'budget',     label: 'Budget Eats',         emoji: '💸',  tags: ['Budget-Friendly', 'Local Favorite'] },
      { id: 'backpacker', label: 'Backpacker Picks',    emoji: '🎒',  tags: ['Backpacker-Approved', 'Budget-Friendly', 'Hidden Gem'] },
      { id: 'tourist',    label: 'Tourist Favorites',   emoji: '🗺️',  tags: ['Tourist Favorite', 'Must Try'] },
      { id: 'hidden',     label: 'Hidden Gems',         emoji: '💎',  tags: ['Hidden Gem', 'Local Favorite'] },
      { id: 'beach',      label: 'Beach Dining',        emoji: '🏖️',  tags: ['Beach Dining', 'Scenic View'] },
      { id: 'healthy',    label: 'Healthy & Fresh',     emoji: '🥗',  tags: ['Healthy', 'Vegan'] },
      { id: 'latenight',  label: 'Late Night',          emoji: '🌙',  tags: ['Late Night'] },
      { id: 'instagram',  label: 'Instagrammable',      emoji: '📸',  tags: ['Instagrammable', 'Scenic View'] },
    ];
  }

  /* ── CUISINE INTELLIGENCE ── */
  function getCuisineIntelligence(cuisineName) {
    const restaurants = restaurantPool.filter(r =>
      (r.cuisine || '').toLowerCase().includes(cuisineName.toLowerCase())
    );
    if (!restaurants.length) return null;
    const avgRating = (restaurants.reduce((s, r) => s + (parseFloat(r.rating) || 0), 0) / restaurants.length).toFixed(1);
    const topTags   = countTags(restaurants).slice(0, 5);
    return { cuisine: cuisineName, count: restaurants.length, avgRating, topTags, restaurants };
  }

  function countTags(restaurants) {
    const counts = {};
    restaurants.forEach(r => (r.tags || []).forEach(t => counts[t] = (counts[t] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }

  /* ── TOURISM RECOMMENDATIONS ── */
  function getTourismRecommendations(location) {
    const pool = location
      ? restaurantPool.filter(r => (r.location || '').toLowerCase().includes(location.toLowerCase()))
      : restaurantPool;

    const parsed = parser.parse('tourist favorites hidden gems must try');
    return engine.rank(pool, parsed, 6);
  }

  /* ── CONVERSATION RESET ── */
  function resetConversation() { convo.reset(); }
  function getHistory()        { return convo.history; }

  return {
    setPool,
    query,
    scoreRestaurant,
    suggestQueries,
    getMoodCollections,
    getCuisineIntelligence,
    getTourismRecommendations,
    resetConversation,
    getHistory,
    /* expose internals for debugging */
    _parser:  parser,
    _engine:  engine,
    _convo:   convo,
  };

})();

window.YAI = YAI;
