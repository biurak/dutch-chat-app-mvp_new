import { NewWord } from './topics';

// Cache for translations to avoid redundant API calls
const translationCache = new Map<string, string>();

// Debounce mechanism to prevent rapid API calls
const pendingTranslations = new Map<string, Promise<string>>();

// Global rate limiter to prevent API abuse
let globalApiCallCount = 0;
let globalApiCallWindow = Date.now();
const GLOBAL_API_LIMIT = 10; // Max 10 API calls per minute
const GLOBAL_WINDOW_MS = 60 * 1000; // 1 minute window
let isTranslationDisabled = false;

// Reset global counters if window has passed
function resetGlobalCountersIfNeeded() {
  const now = Date.now();
  if (now - globalApiCallWindow > GLOBAL_WINDOW_MS) {
    globalApiCallCount = 0;
    globalApiCallWindow = now;
    isTranslationDisabled = false;
  }
}

// Check if we can make more API calls
function canMakeApiCall(): boolean {
  resetGlobalCountersIfNeeded();
  return globalApiCallCount < GLOBAL_API_LIMIT && !isTranslationDisabled;
}

// Record an API call
function recordApiCall() {
  globalApiCallCount++;
  if (globalApiCallCount >= GLOBAL_API_LIMIT) {
    isTranslationDisabled = true;
    console.warn(`[text-utils] Translation API limit reached (${GLOBAL_API_LIMIT} calls). Disabling translations for this session.`);
  }
}

/**
 * Translates a Dutch word to English using our API endpoint
 * Includes debouncing and global rate limiting to prevent API abuse
 */
async function translateWord(word: string, context: string): Promise<string> {
  const cacheKey = `${word}:${context}`;
  
  // Return cached translation if available
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) || '';
  }

  // Check global rate limit first
  if (!canMakeApiCall()) {
    console.warn(`[translateWord] Global API limit reached. Skipping translation for "${word}"`);
    return '';
  }

  // Check if the same translation is already in progress
  if (pendingTranslations.has(cacheKey)) {
    console.log(`[translateWord] Waiting for pending translation: "${word}"`);
    return pendingTranslations.get(cacheKey) || '';
  }

  console.log(`[translateWord] Translating word: "${word}" with context: "${context}"`);
  
  // Record this API call attempt
  recordApiCall();
  
  // Create the translation promise
  const translationPromise = (async () => {
    try {
      const apiUrl = '/api/translate';
      const requestBody = { word, context };
      
      console.log(`[translateWord] Making request to ${apiUrl}`, { word, context });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`[translateWord] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[translateWord] API Error (${response.status}):`, errorText);
        throw new Error(`Translation API error (${response.status}): ${errorText || 'Unknown error'}`);
      }

      const data = await response.json();
      const translation = data.translation || '';
      
      console.log(`[translateWord] Translation for "${word}": "${translation}"`);
      
      // Cache the translation
      if (translation) {
        translationCache.set(cacheKey, translation);
      } else {
        console.log(`[translateWord] Empty translation for "${word}"`);
        translationCache.set(cacheKey, ''); // Cache empty results too
      }
      
      return translation;
    } catch (error) {
      console.error('[translateWord] Error in translateWord:', error);
      console.error('[translateWord] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'UnknownError'
      });
      // Cache empty result for failed translations to prevent retries
      translationCache.set(cacheKey, '');
      return '';
    } finally {
      // Remove from pending translations
      pendingTranslations.delete(cacheKey);
    }
  })();

  // Store the promise to prevent duplicate requests
  pendingTranslations.set(cacheKey, translationPromise);
  
  return translationPromise;
}

// Common Dutch words that we should exclude from the word list (expanded list)
const COMMON_WORDS = new Set([
  'de', 'het', 'een', 'en', 'van', 'ik', 'je', 'dat', 'die', 'dit', 'in', 'is', 'zijn', 'te', 'met', 'op', 'aan', 'voor', 'naar', 'uit', 'over', 'door', 'bij', 'tot', 'zonder', 'onder', 'boven', 'tussen', 'naast', 'achter', 'tijdens', 'sinds', 'totdat', 'zodat', 'omdat', 'want', 'maar', 'of', 'als', 'dan', 'toch', 'toen', 'nu', 'ooit', 'altijd', 'nooit', 'vaak', 'soms', 'misschien', 'wel', 'niet', 'geen', 'mijn', 'jouw', 'zijn', 'haar', 'ons', 'jullie', 'hun', 'deze', 'die', 'dit', 'dat', 'wie', 'wat', 'waar', 'waarom', 'hoe', 'welke', 'welk', 'welken', 'mij', 'me', 'jou', 'hem', 'hen',
  // Common verbs (present tense)
  'ben', 'bent', 'heb', 'hebt', 'heeft', 'hebben', 'ga', 'gaat', 'gaan', 'doe', 'doet', 'doen', 'kan', 'kunt', 'kunnen', 'mag', 'moet', 'moeten', 'wil', 'wilt', 'willen', 'zie', 'ziet', 'zien', 'kom', 'komt', 'komen', 'eet', 'eten', 'drink', 'drinkt', 'drinken', 'leef', 'leeft', 'leven', 'leer', 'leert', 'leren', 'maak', 'maakt', 'maken', 'neem', 'neemt', 'nemen', 'geef', 'geeft', 'geven', 'zeg', 'zegt', 'zeggen', 'weet', 'weten', 'vind', 'vindt', 'vinden', 'sta', 'staat', 'staan', 'loop', 'loopt', 'lopen',
  // Greetings and common expressions
  'hallo', 'hoi', 'goedemorgen', 'goedemiddag', 'goedenavond', 'goedenacht', 'dankjewel', 'dank', 'bedankt', 'alsjeblieft', 'alstublieft', 'sorry', 'pardon', 'ja', 'nee', 'oké', 'prima', 'goed', 'slecht', 'dag', 'doei', 'hey',
  // Time and common nouns
  'dag', 'nacht', 'ochtend', 'middag', 'avond', 'week', 'maand', 'jaar', 'uur', 'minuut', 'vandaag', 'morgen', 'gisteren', 'man', 'vrouw', 'kind', 'huis', 'water', 'eten', 'drinken'
]);

/**
 * Extracts potential new words from a message with context.
 * Uses OpenAI to get accurate translations for each word.
 * Now with aggressive rate limiting to prevent API abuse.
 */
export async function extractPotentialWords(dutchText: string, contextSentence: string = ''): Promise<NewWord[]> {
  if (!dutchText) return [];
  
  // Check if translations are globally disabled
  if (isTranslationDisabled) {
    console.warn('[extractPotentialWords] Translation is temporarily disabled due to rate limits');
    return [];
  }
  
  // Split into sentences to maintain context
  const dutchSentences = dutchText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const contextSentences = contextSentence ? contextSentence.split(/(?<=[.!?]\s+)/).map(s => s.trim()).filter(Boolean) : [];
  
  const result: NewWord[] = [];
  const seenWords = new Set<string>();
  let apiCallsInThisSession = 0;
  const MAX_API_CALLS_PER_EXTRACTION = 3; // Limit to 3 translations per extraction
  
  // Process each sentence
  for (let i = 0; i < dutchSentences.length; i++) {
    const dutch = dutchSentences[i];
    const context = i < contextSentences.length ? contextSentences[i] : '';
    
    // Extract words from Dutch sentence (preserve original case for display)
    const words = dutch
      .split(/(\s+)/)
      .filter(w => w.trim().length > 0)
      .map(w => ({
        original: w,
        normalized: w.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿæœ']/gi, '')
      }))
      .filter(({ normalized }) => {
        // More aggressive filtering before API calls
        return normalized.length > 2 && 
               !COMMON_WORDS.has(normalized) &&
               normalized.length <= 15 && // Skip very long words (likely compounds or errors)
               !/^\d+$/.test(normalized) // Skip pure numbers
      });
    
    // Batch process words to reduce API calls
    const wordsToProcess = words.filter(({ normalized }) => {
      return !seenWords.has(normalized) && context; // Only process words with context
    });
    
    // Limit the number of words processed per sentence to prevent API spam
    const MAX_WORDS_PER_SENTENCE = 2; // Reduced from 5 to 2
    const limitedWords = wordsToProcess.slice(0, MAX_WORDS_PER_SENTENCE);
    
    // Add each word with its context
    for (const { original, normalized } of limitedWords) {
      if (seenWords.has(normalized)) continue;
      
      // Check session limit
      if (apiCallsInThisSession >= MAX_API_CALLS_PER_EXTRACTION) {
        console.warn(`[extractPotentialWords] Reached max API calls per extraction (${MAX_API_CALLS_PER_EXTRACTION}). Stopping.`);
        break;
      }
      
      // Check global limit
      if (!canMakeApiCall()) {
        console.warn('[extractPotentialWords] Global API limit reached. Stopping word extraction.');
        break;
      }
      
      // Get translation using OpenAI
      let translation = '';
      try {
        translation = await translateWord(original, context);
        apiCallsInThisSession++;
        
        // Only add the word if we got a non-empty translation (not an A1 word)
        if (translation) {
          result.push({
            dutch: normalized,
            english: translation,
            dutch_sentence: dutch,
            english_sentence: context
          });
        }
      } catch (error) {
        console.error(`Error translating word ${original}:`, error);
        // Still count failed attempts to prevent retry loops
        apiCallsInThisSession++;
      }
      
      seenWords.add(normalized);
    }
    
    // Break out of sentence loop if we've hit limits
    if (apiCallsInThisSession >= MAX_API_CALLS_PER_EXTRACTION || !canMakeApiCall()) {
      break;
    }
  }
  
  console.log(`[extractPotentialWords] Completed with ${apiCallsInThisSession} API calls, ${result.length} words extracted`);
  return result;
}

/**
 * Processes a conversation to extract potential new words.
 * Uses OpenAI to get accurate translations for each word.
 * Optimized to avoid redundant API calls with aggressive rate limiting.
 */
export async function processConversationForNewWords(
  messages: Array<{ role: string; dutch: string; english?: string }>
): Promise<NewWord[]> {
  // Check if translations are globally disabled
  if (isTranslationDisabled) {
    console.warn('[processConversationForNewWords] Translation is temporarily disabled due to rate limits');
    return [];
  }

  const potentialWords: Record<string, NewWord> = {};
  
  // Process messages in smaller batches to avoid overwhelming the API
  const BATCH_SIZE = 1; // Reduced from 2 to 1 to be more conservative
  const limitedMessages = messages.slice(-BATCH_SIZE); // Only process the most recent message
  
  console.log(`[processConversationForNewWords] Processing ${limitedMessages.length} messages for new words`);
  
  for (const message of limitedMessages) {
    // Skip empty messages
    if (!message.dutch?.trim()) continue;
    
    // Additional check before processing each message
    if (!canMakeApiCall()) {
      console.warn('[processConversationForNewWords] API limit reached, skipping remaining messages');
      break;
    }
    
    try {
      // Extract words with their translations using OpenAI
      const words = await extractPotentialWords(
        message.dutch,
        message.english || ''  // Pass the English sentence as context
      );
      
      // Add to our collection, using the word as the key to avoid duplicates
      // Prefer words with translations over those without
      for (const word of words) {
        if (!potentialWords[word.dutch] || 
            (word.english && !word.english.startsWith('['))) {
          potentialWords[word.dutch] = word;
        }
      }
    } catch (error) {
      console.error('Error processing message for new words:', error);
      // Continue with the next message even if one fails
    }
  }
  
  const resultCount = Object.values(potentialWords).length;
  console.log(`[processConversationForNewWords] Extracted ${resultCount} unique words`);
  return Object.values(potentialWords);
}

// Filter words by CEFR level (placeholder - in a real app, this would use a dictionary API)
export async function filterWordsByLevel(
  words: NewWord[], 
  minLevel: string = 'B1'
): Promise<NewWord[]> {
  // In a real implementation, this would check against a dictionary API
  // For now, we'll just return all words and let the user filter them
  return words;
}

// Format words for display or export
export function formatWordsForExport(words: NewWord[]): string {
  return words
    .map(word => `${word.dutch}\t${word.english}`)
    .join('\n');
}

// Helper function to process words with proper error handling
export async function processWordsForExport(words: NewWord[]): Promise<string> {
  try {
    const filteredWords = await filterWordsByLevel(words);
    return formatWordsForExport(filteredWords);
  } catch (error) {
    console.error('Error processing words for export:', error);
    return ''; // Return empty string or handle error as needed
  }
}

// Emergency controls to disable translation features
export function disableTranslations() {
  isTranslationDisabled = true;
  console.warn('[text-utils] Translations manually disabled');
}

export function enableTranslations() {
  isTranslationDisabled = false;
  globalApiCallCount = 0;
  globalApiCallWindow = Date.now();
  console.log('[text-utils] Translations manually enabled');
}

export function getTranslationStatus() {
  return {
    isDisabled: isTranslationDisabled,
    apiCallCount: globalApiCallCount,
    limit: GLOBAL_API_LIMIT,
    windowStart: new Date(globalApiCallWindow).toISOString()
  };
}
