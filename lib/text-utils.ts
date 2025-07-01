import { NewWord } from './topics';

// Common Dutch words that we should exclude from the word list
const COMMON_WORDS = new Set([
  'de', 'het', 'een', 'en', 'van', 'ik', 'je', 'dat', 'die', 'dit', 'in', 'is', 'zijn', 'te', 'met', 'op', 'aan', 'voor', 'naar', 'van', 'uit', 'over', 'door', 'bij', 'tot', 'met', 'zonder', 'onder', 'boven', 'tussen', 'naast', 'onder', 'boven', 'achter', 'voor', 'tussen', 'tijdens', 'sinds', 'tot', 'totdat', 'zodat', 'omdat', 'want', 'maar', 'of', 'als', 'dan', 'maar', 'toch', 'toen', 'nu', 'ooit', 'altijd', 'nooit', 'vaak', 'soms', 'misschien', 'wel', 'niet', 'geen', 'mijn', 'jouw', 'zijn', 'haar', 'ons', 'jullie', 'hun', 'deze', 'die', 'dit', 'dat', 'wie', 'wat', 'waar', 'waarom', 'hoe', 'welke', 'welk', 'welken', 'mij', 'mij', 'me', 'jou', 'je', 'hem', 'haar', 'het', 'ons', 'onze', 'jullie', 'hen', 'hun'
]);

/**
 * Extracts potential new words from a message with context.
 * Uses the provided English translation when available.
 */
export function extractPotentialWords(dutchText: string, englishText: string = ''): NewWord[] {
  if (!dutchText) return [];
  
  // Split into sentences to maintain context
  const dutchSentences = dutchText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const englishSentences = englishText ? englishText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean) : [];
  
  const result: NewWord[] = [];
  const seenWords = new Set<string>();
  
  // Process each sentence
  for (let i = 0; i < dutchSentences.length; i++) {
    const dutch = dutchSentences[i];
    const english = i < englishSentences.length ? englishSentences[i] : '';
    
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
      
      // Find this word in the English translation if available
      let translation = '';
      if (english) {
        // Simple word matching - could be enhanced with better NLP
        const wordIndex = dutch.toLowerCase().indexOf(normalized);
        if (wordIndex !== -1) {
          // Try to find corresponding word in English at similar position
          const englishWords = english.split(/\s+/);
          const dutchWords = dutch.split(/\s+/);
          const dutchWordIndex = dutchWords.findIndex(w => 
            w.toLowerCase().includes(normalized));
            
          if (dutchWordIndex !== -1 && dutchWordIndex < englishWords.length) {
            translation = englishWords[dutchWordIndex];
          }
        }
      }
      
      result.push({
        dutch: normalized,
        english: translation || `[${normalized}]`,
        dutch_sentence: dutch,
        english_sentence: english || ''
      });
      
      seenWords.add(normalized);
    }
  }
  
  return result;
}

/**
 * Processes a conversation to extract potential new words.
 * Uses available English translations when present in the messages.
 */
export function processConversationForNewWords(messages: Array<{ role: string; dutch: string; english?: string }>): NewWord[] {
  const potentialWords: Record<string, NewWord> = {};
  
  for (const message of messages) {
    // Skip empty messages
    if (!message.dutch?.trim()) continue;
    
    // Extract words with their translations
    const words = extractPotentialWords(
      message.dutch, 
      message.english || ''  // Pass the English translation if available
    );
    
    // Add to our collection, using the word as the key to avoid duplicates
    // Prefer words with translations over those without
    for (const word of words) {
      if (!potentialWords[word.dutch] || 
          (word.english && !word.english.startsWith('['))) {
        potentialWords[word.dutch] = word;
      }
    }
  }
  
  return Object.values(potentialWords);
}

// Filter words by CEFR level (placeholder - in a real app, this would use a dictionary API)
export function filterWordsByLevel(words: NewWord[], minLevel: string = 'B1'): NewWord[] {
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
