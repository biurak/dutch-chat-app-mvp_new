import { NewWord } from './topics';
import { extractPotentialWords, processConversationForNewWords } from './text-utils';

/**
 * Backup word processing functions for emergency fallback
 * These will only be used if the AI fails to provide new_words in the response
 */

/**
 * Fallback function to process words if AI doesn't provide them
 * This should only be called as a last resort
 */
export async function fallbackWordProcessing(
  userMessage: string,
  aiReply: string,
  aiTranslation: string
): Promise<NewWord[]> {
  console.warn('Using fallback word processing - AI failed to provide new_words');
  
  try {
    // Only process the AI reply for new words, not the entire conversation
    const words = await extractPotentialWords(aiReply, aiTranslation);
    return words;
  } catch (error) {
    console.error('Fallback word processing failed:', error);
    return [];
  }
}

/**
 * Emergency function to reprocess entire conversation
 * Only use this if conversation words are completely lost
 */
export async function emergencyReprocessConversation(
  messages: Array<{ role: string; dutch: string; english?: string }>
): Promise<NewWord[]> {
  console.warn('Emergency conversation reprocessing initiated');
  
  try {
    return await processConversationForNewWords(messages);
  } catch (error) {
    console.error('Emergency conversation reprocessing failed:', error);
    return [];
  }
}

/**
 * Validates that AI-provided words are in the expected format
 */
export function validateAIWords(words: any[]): boolean {
  if (!Array.isArray(words)) return false;
  
  return words.every(word => 
    word &&
    typeof word.dutch === 'string' &&
    typeof word.english === 'string' &&
    typeof word.dutch_sentence === 'string' &&
    typeof word.english_sentence === 'string'
  );
}
