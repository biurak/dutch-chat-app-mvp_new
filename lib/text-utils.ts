import { NewWord } from './topics';

// Cache for translations to avoid redundant API calls
const translationCache = new Map<string, string>();

/**
 * Translates a Dutch word to English using our API endpoint
 */
async function translateWord(word: string, context: string): Promise<string> {
  const cacheKey = `${word}:${context}`;
  
  // Return cached translation if available
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) || '';
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, context }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.translation || '';
    
    // Cache the translation
    if (translation) {
      translationCache.set(cacheKey, translation);
    }
    
    return translation;
  } catch (error) {
    console.error('Error translating word:', error);
    return '';
  }
}

// Common Dutch words that we should exclude from the word list
const COMMON_WORDS = new Set([
  'de', 'het', 'een', 'en', 'van', 'ik', 'je', 'dat', 'die', 'dit', 'in', 'is', 'zijn', 'te', 'met', 'op', 'aan', 'voor', 'naar', 'van', 'uit', 'over', 'door', 'bij', 'tot', 'met', 'zonder', 'onder', 'boven', 'tussen', 'naast', 'onder', 'boven', 'achter', 'voor', 'tussen', 'tijdens', 'sinds', 'tot', 'totdat', 'zodat', 'omdat', 'want', 'maar', 'of', 'als', 'dan', 'maar', 'toch', 'toen', 'nu', 'ooit', 'altijd', 'nooit', 'vaak', 'soms', 'misschien', 'wel', 'niet', 'geen', 'mijn', 'jouw', 'zijn', 'haar', 'ons', 'jullie', 'hun', 'deze', 'die', 'dit', 'dat', 'wie', 'wat', 'waar', 'waarom', 'hoe', 'welke', 'welk', 'welken', 'mij', 'mij', 'me', 'jou', 'je', 'hem', 'haar', 'het', 'ons', 'onze', 'jullie', 'hen', 'hun'
]);

/**
 * Extracts potential new words from a message with context.
 * Uses OpenAI to get accurate translations for each word.
 */
export async function extractPotentialWords(dutchText: string, contextSentence: string = ''): Promise<NewWord[]> {
  if (!dutchText) return [];
  
  // Split into sentences to maintain context
  const dutchSentences = dutchText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const contextSentences = contextSentence ? contextSentence.split(/(?<=[.!?]\s+)/).map(s => s.trim()).filter(Boolean) : [];
  
  const result: NewWord[] = [];
  const seenWords = new Set<string>();
  
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
      .filter(({ normalized }) => normalized.length > 2 && !COMMON_WORDS.has(normalized));
    
    // Add each word with its context
    for (const { original, normalized } of words) {
      if (seenWords.has(normalized)) continue;
      
      // Skip if we don't have context (need full sentence for accurate translation)
      if (!context) continue;
      
      // Get translation using OpenAI
      let translation = '';
      try {
        translation = await translateWord(original, context);
        
        // Only add the word if we got a non-empty translation (not an A1 word)
        if (translation) {
          result.push({
            dutch: normalized,
            english: translation,
            dutch_sentence: dutch,
            english_sentence: context
          });
          seenWords.add(normalized);
        }
      } catch (error) {
        console.error(`Error translating word ${original}:`, error);
      }
      
      seenWords.add(normalized);
    }
  }
  
  return result;
}

/**
 * Processes a conversation to extract potential new words.
 * Uses OpenAI to get accurate translations for each word.
 */
export async function processConversationForNewWords(
  messages: Array<{ role: string; dutch: string; english?: string }>
): Promise<NewWord[]> {
  const potentialWords: Record<string, NewWord> = {};
  
  for (const message of messages) {
    // Skip empty messages
    if (!message.dutch?.trim()) continue;
    
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
