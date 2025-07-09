import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { LRUCache } from 'lru-cache';

// Enhanced caching for translations
const translationCache = new LRUCache<string, string>({
  max: 5000, // Store up to 5000 translations
  ttl: 1000 * 60 * 60 * 24, // Cache for 24 hours
});

// Rate limiting configuration
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute
  MAX_REQUESTS: 30, // Max requests per window
};

// In-memory rate limit store
const rateLimitCache = new LRUCache<string, number[]>({
  max: 1000, // Max number of unique IPs to track
  ttl: RATE_LIMIT.WINDOW_MS,
});

// Helper function to check rate limit
function checkRateLimit(ip: string): { isRateLimited: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.WINDOW_MS;
  
  const requestTimestamps = rateLimitCache.get(ip) || [];
  const recentRequests = requestTimestamps.filter(timestamp => timestamp > windowStart);
  
  // Add current request
  recentRequests.push(now);
  rateLimitCache.set(ip, recentRequests);
  
  const isRateLimited = recentRequests.length > RATE_LIMIT.MAX_REQUESTS;
  
  return {
    isRateLimited,
    retryAfter: isRateLimited ? Math.ceil((recentRequests[0] + RATE_LIMIT.WINDOW_MS - now) / 1000) : 0,
  };
}

// Comprehensive list of A1 level Dutch words to filter out
const A1_LEVEL_WORDS = new Set([
  // Basic pronouns and determiners
  'ik', 'jij', 'je', 'hij', 'zij', 'het', 'we', 'jullie', 'ze', 'mijn', 'jouw', 'zijn', 'haar', 'ons', 'hun', 'deze', 'die', 'dit', 'dat',
  
  // Common verbs (present tense)
  'ben', 'is', 'zijn', 'heb', 'hebt', 'heeft', 'hebben', 'ga', 'gaat', 'gaan', 'doe', 'doet', 'doen', 'kan', 'kunt', 'kunnen',
  'mag', 'moet', 'moeten', 'wil', 'wilt', 'willen', 'zie', 'ziet', 'zien', 'kom', 'komt', 'komen', 'eet', 'eet', 'eten',
  'drink', 'drinkt', 'drinken', 'leef', 'leeft', 'leven', 'leer', 'leert', 'leren', 'maak', 'maakt', 'maken', 'neem', 'neemt', 'nemen',
  'geef', 'geeft', 'geven', 'zeg', 'zegt', 'zeggen', 'weet', 'weten', 'vind', 'vindt', 'vinden', 'sta', 'staat', 'staan', 'loop', 'loopt', 'lopen',
  
  // Common nouns
  'man', 'vrouw', 'kind', 'kindje', 'huis', 'appel', 'brood', 'water', 'melk', 'koffie', 'thee', 'bier', 'wijn', 'eten', 'drinken',
  'dag', 'nacht', 'ochtend', 'middag', 'avond', 'week', 'maand', 'jaar', 'uur', 'minuut', 'seconde', 'vandaag', 'morgen', 'gisteren',
  'straat', 'weg', 'plein', 'park', 'winkel', 'school', 'werk', 'thuis', 'land', 'stad', 'dorp', 'straat', 'huis', 'kamer', 'deur', 'raam',
  
  // Common adjectives
  'goed', 'slecht', 'mooi', 'lelijk', 'groot', 'klein', 'lang', 'kort', 'jong', 'oud', 'nieuw', 'oud', 'leuk', 'stom', 'moeilijk', 'makkelijk',
  'duur', 'goedkoop', 'dik', 'dun', 'zwaar', 'licht', 'sterk', 'zwak', 'snel', 'langzaam', 'vroeg', 'laat', 'veel', 'weinig', 'meer', 'minder',
  
  // Common adverbs and prepositions
  'hier', 'daar', 'ergens', 'overal', 'nergens', 'binnen', 'buiten', 'boven', 'onder', 'naast', 'tussen', 'tegenover', 'achter', 'voor', 'in', 'uit',
  'op', 'aan', 'bij', 'naar', 'van', 'tot', 'door', 'met', 'zonder', 'voor', 'na', 'tijdens', 'sinds', 'totdat', 'omdat', 'want', 'maar', 'of', 'als',
  
  // Common greetings and expressions
  'hallo', 'hoi', 'goedemorgen', 'goedemiddag', 'goedenavond', 'goedenacht', 'dankjewel', 'dank u', 'alsjeblieft', 'alstublieft', 'sorry', 'pardon',
  'ja', 'nee', 'misschien', 'oké', 'prima', 'goed', 'slecht', 'dank', 'bedankt', 'tot ziens', 'doei', 'dag', 'hallo', 'hoi', 'hey'
]);

// Initialize OpenAI
let openai: OpenAI;

// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable');
} else {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] [${clientIp}] [translate/route] Received request`);
  
  // Check rate limit
  const rateLimit = checkRateLimit(clientIp);
  if (rateLimit.isRateLimited) {
    console.warn(`[${requestId}] Rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { 
        error: 'Too many requests',
        details: `Please try again in ${rateLimit.retryAfter} seconds`,
        retryAfter: rateLimit.retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter.toString(),
          'X-RateLimit-Limit': RATE_LIMIT.MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT.MAX_REQUESTS - (rateLimitCache.get(clientIp)?.length || 0)).toString(),
        }
      }
    );
  }

  try {
    const { word, context } = await request.json();
    
    if (!word || !context) {
      return NextResponse.json(
        { error: 'Word and context are required' },
        { status: 400 }
      );
    }

    // Create cache key
    const cacheKey = `${word.toLowerCase()}:${context.toLowerCase()}`;
    
    // Check cache first
    const cachedTranslation = translationCache.get(cacheKey);
    if (cachedTranslation !== undefined) {
      console.log(`[${requestId}] Cache hit for word: "${word}"`);
      return NextResponse.json({ translation: cachedTranslation });
    }

    // Convert to lowercase and remove any punctuation for checking
    const normalizedWord = word.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿæœ']/gi, '');
    
    // Skip very short words (likely A1 level)
    if (normalizedWord.length <= 3) {
      translationCache.set(cacheKey, ''); // Cache the empty result
      return NextResponse.json({ translation: '' });
    }
    
    // Check against our A1 words list
    if (A1_LEVEL_WORDS.has(normalizedWord)) {
      translationCache.set(cacheKey, ''); // Cache the empty result
      return NextResponse.json({ translation: '' });
    }
    
    // Check if OpenAI client is properly initialized
    if (!openai) {
      console.error(`[${requestId}] OpenAI client not initialized`);
      return NextResponse.json(
        { error: 'Translation service is not available' },
        { status: 503 }
      );
    }
    
    console.log(`[${requestId}] Translating word: "${word}" with context: "${context}"`);
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that translates individual Dutch words to English. 
                   Only translate words that are A2 level or above (A2, B1, B2, C1, or C2). 
                   For A1 level words, return an empty string. 
                   Provide only the most common English translation of the word. 
                   If the word is part of a common phrase, provide the translation of the entire phrase. 
                   Return only the translation, or an empty string if the word is A1 level.`
        },
        {
          role: "user",
          content: `Context: ${context}\n\nTranslate the word "${word}" to English.`
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    });

    console.log(`[${requestId}] Translation response received`);
    
    const translation = completion.choices[0]?.message?.content?.trim() || '';
    console.log(`[${requestId}] Translation result:`, { word, translation });
    
    // Cache the result (including empty translations)
    translationCache.set(cacheKey, translation);
    
    return NextResponse.json({ translation });
    
  } catch (error: unknown) {
    console.error(`[${requestId}] Translation error:`, error);
    
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : {
      message: String(error)
    };
    
    console.error(`[${requestId}] Error details:`, errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Failed to translate word',
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails })
      },
      { status: 500 }
    );
  }
}
