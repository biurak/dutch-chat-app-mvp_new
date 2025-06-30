import { NewWord } from './topics';

// Common Dutch words that we should exclude from the word list
const COMMON_WORDS = new Set([
  'de', 'het', 'een', 'en', 'van', 'ik', 'je', 'dat', 'die', 'dit', 'in', 'is', 'zijn', 'te', 'met', 'op', 'aan', 'voor', 'naar', 'van', 'uit', 'over', 'door', 'bij', 'tot', 'met', 'zonder', 'onder', 'boven', 'tussen', 'naast', 'onder', 'boven', 'achter', 'voor', 'tussen', 'tijdens', 'sinds', 'tot', 'totdat', 'zodat', 'omdat', 'want', 'maar', 'of', 'als', 'dan', 'maar', 'toch', 'toen', 'nu', 'ooit', 'altijd', 'nooit', 'vaak', 'soms', 'misschien', 'wel', 'niet', 'geen', 'mijn', 'jouw', 'zijn', 'haar', 'ons', 'jullie', 'hun', 'deze', 'die', 'dit', 'dat', 'wie', 'wat', 'waar', 'waarom', 'hoe', 'welke', 'welk', 'welken', 'mij', 'mij', 'me', 'jou', 'je', 'hem', 'haar', 'het', 'ons', 'onze', 'jullie', 'hen', 'hun'
]);

// Extract potential new words from a message
export function extractPotentialWords(message: string, context: string = ''): NewWord[] {
  if (!message) return [];
  
  // Split into words and clean them up
  const words = message
    .toLowerCase()
    // Split on word boundaries
    .split(/\b/)
    // Filter out non-word characters and common words
    .filter(word => 
      word.length > 2 && // Only words longer than 2 characters
      /^[a-zàâçéèêëîïôûùüÿæœ\-']+$/i.test(word) && // Only letters and basic punctuation
      !COMMON_WORDS.has(word.toLowerCase()) // Not in common words list
    );

  // Create a set to avoid duplicates
  const uniqueWords = [...new Set(words)];

  // Convert to NewWord format
  return uniqueWords.map(word => ({
    dutch: word,
    english: `[${word}]`, // Placeholder that will be filled by the AI
    dutch_sentence: context || `Ik gebruik het woord "${word}" in een zin.`,
    english_sentence: context || `I use the word "${word}" in a sentence.`
  }));
}

// Process a conversation to extract potential new words
export function processConversationForNewWords(messages: Array<{ role: string; dutch: string; english?: string }>): NewWord[] {
  const potentialWords: Record<string, NewWord> = {};
  
  for (const message of messages) {
    // Skip empty messages
    if (!message.dutch?.trim()) continue;
    
    // Extract words from both user and AI messages
    const words = extractPotentialWords(message.dutch, message.dutch);
    
    // Add to our collection, using the word as the key to avoid duplicates
    for (const word of words) {
      if (!potentialWords[word.dutch]) {
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
