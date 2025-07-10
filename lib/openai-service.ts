import OpenAI from 'openai';
import { LRUCache } from 'lru-cache';

// Track quota state
let quotaExceeded = false;
let quotaExceededUntil = 0;
const QUOTA_RESET_BUFFER = 5 * 60 * 1000; // 5 minutes buffer after quota reset

// Initialize OpenAI client with error handling
let openai: OpenAI | null = null;

try {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // 10 second timeout
      maxRetries: 1, // Only retry once on failure
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

/**
 * Check if the API quota has been exceeded
 */
export function isQuotaExceeded(): boolean {
  if (!quotaExceeded) return false;
  if (Date.now() > quotaExceededUntil) {
    quotaExceeded = false;
    return false;
  }
  return true;
}

/**
 * Set the quota as exceeded until the specified time
 * @param resetTime Optional timestamp when the quota will reset
 */
export function setQuotaExceeded(resetTime?: number) {
  quotaExceeded = true;
  // Use provided reset time or default to 1 hour from now
  quotaExceededUntil = resetTime || (Date.now() + 60 * 60 * 1000);
  console.error(`Quota exceeded. Will retry after: ${new Date(quotaExceededUntil).toISOString()}`);
}

type Message = {
	role: 'system' | 'user' | 'assistant'
	content: string
}

export interface TranslationResult {
  translation: string;
  cached?: boolean;
}

// Define the AI response type
type AIResponse = {
	ai_reply: string
	translation: string
	correction: {
		correctedDutch: string
		explanation: string
	}
	suggestions: Array<{
		dutch: string
		english: string
	}>
	new_words?: Array<{
		dutch: string
		english: string
		dutch_sentence: string
		english_sentence: string
		cefr_level?: string
	}>
}

// Type for the raw response from the AI
type RawAIResponse = {
	message?: string
	ai_reply?: string
	translation?: string
	correction?: {
		correctedDutch?: string
		explanation?: string
	}
	suggestions?: Array<
		| {
				dutch?: string
				english?: string
		  }
		| string
	>
	new_words?: Array<{
		dutch?: string
		english?: string
		dutch_sentence?: string
		english_sentence?: string
		cefr_level?: string
	}>
}

export async function* generateAIResponseStream(
	messages: Message[],
	promptConfig: any
): AsyncGenerator<string> {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] Starting generateAIResponseStream`, {
    hasApiKey: !!process.env.OPENAI_API_KEY,
    messageCount: messages.length,
    promptConfig: promptConfig ? 'present' : 'missing',
    quotaExceeded: isQuotaExceeded(),
  });
  
  // Check if OpenAI client is initialized
  if (!openai) {
    const error = new Error('OpenAI client is not properly initialized');
    console.error(`[${requestId}] ${error.message}`);
    throw error;
  }
  
  // Check quota before making any API calls
  if (isQuotaExceeded()) {
    const timeLeft = Math.ceil((quotaExceededUntil - Date.now()) / 1000 / 60);
    throw new Error(`API quota exceeded. Please try again in ${timeLeft} minutes.`);
  }

	try {
		if (!promptConfig?.template) {
			throw new Error('No prompt template found in config')
		}
		const systemPrompt = promptConfig.template

		// Add instruction to return JSON in the system message
		const systemMessage = {
			role: 'system' as const,
			content: systemPrompt + '\n\nPlease respond with a valid JSON object.',
		}

		let stream;
  try {
    stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        systemMessage,
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.role === 'system' ? msg.content : String(msg.content),
        })),
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000, // Limit response size
    });
    
    // Reset quota state on successful stream creation
    if (quotaExceeded) {
      console.log(`[${requestId}] Successfully created stream after quota was exceeded`);
      quotaExceeded = false;
    }
    
  } catch (error: any) {
    console.error(`[${requestId}] OpenAI stream error:`, error?.message || 'Unknown error');
    
    // Handle quota exceeded errors
    if (error?.status === 429) {
      // Try to extract reset time from headers or use default
      const retryAfter = error?.headers?.['retry-after'];
      const resetTime = retryAfter 
        ? Date.now() + (parseInt(retryAfter, 10) * 1000) + 60000 // Add 1 minute buffer
        : Date.now() + (60 * 60 * 1000); // Default to 1 hour
      
      setQuotaExceeded(resetTime);
      
      throw new Error(
        'API quota exceeded. Please try again later. ' +
        `Next available at: ${new Date(resetTime).toLocaleTimeString()}`
      );
    }
    
    // Rethrow other errors
    throw error;
  }

		for await (const chunk of stream) {
			const content = chunk.choices[0]?.delta?.content || ''
			if (content) {
				yield content
			}
		}
	} catch (error) {
		console.error('Error in generateAIResponseStream:', error)
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		yield JSON.stringify({
			ai_reply: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
			translation: `Sorry, er is een fout opgetreden: ${errorMessage}. Probeer het alstublieft opnieuw.`,
			correction: { correctedDutch: '', explanation: '' },
			suggestions: [
				{ dutch: 'Kunt u dat herhalen alstublieft?', english: 'Can you repeat that please?' },
				{ dutch: 'Ik begrijp het niet helemaal.', english: "I don't quite understand." },
				{
					dutch: 'Kunt u het op een andere manier uitleggen?',
					english: 'Can you explain it differently?',
				},
			],
		})
	}
}

export async function generateAIResponse(
	messages: Message[],
	promptConfig: any
): Promise<AIResponse> {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] Starting generateAIResponse`, {
    hasApiKey: !!process.env.OPENAI_API_KEY,
    messageCount: messages.length,
    promptConfig: promptConfig ? 'present' : 'missing',
    quotaExceeded: isQuotaExceeded(),
  });
  
  // Check if OpenAI client is initialized
  if (!openai) {
    const error = new Error('OpenAI client is not properly initialized');
    console.error(`[${requestId}] ${error.message}`);
    throw error;
  }
  
  // Check quota before making any API calls
  if (isQuotaExceeded()) {
    const timeLeft = Math.ceil((quotaExceededUntil - Date.now()) / 1000 / 60);
    throw new Error(`API quota exceeded. Please try again in ${timeLeft} minutes.`);
  }

	// Default suggestions if none provided
	const defaultSuggestions = [
		{ dutch: 'Kunt u dat herhalen alstublieft?', english: 'Can you repeat that please?' },
		{ dutch: 'Ik begrijp het niet helemaal.', english: "I don't quite understand." },
		{
			dutch: 'Kunt u het op een andere manier uitleggen?',
			english: 'Can you explain it differently?',
		},
	]

	try {
		// Use ONLY the template from the YAML file - no additional instructions
		if (!promptConfig?.template) {
			throw new Error('No prompt template found in config')
		}
		const systemPrompt = promptConfig.template

		console.log(
			'Sending request to OpenAI with messages:',
			messages.map(
				(m) => `${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
			)
		)

		// Create system message with strict instructions to follow YAML exactly
		const systemMessage = {
			role: 'system' as const,
			content: `
        ${systemPrompt}
        
        CRITICAL INSTRUCTIONS:

				CORRECTION RULES - BE CONSISTENT WITH GRAMMAR SERVICE:
				- DO NOT correct the user if they are using one of the suggested responses
				- DO NOT correct missing punctuation marks (?,.,!,;:) - NEVER correct these
				- DO NOT correct missing question marks (?) at end of questions - NEVER correct these
				- DO NOT correct missing capitalization at sentence start - IGNORE these
				- DO NOT correct capitalization of names/places unless clearly wrong proper nouns
				- DO NOT correct spacing or formatting issues - IGNORE these
				- DO NOT correct style preferences when meaning is clear
				- ONLY correct grammar or vocabulary mistakes that significantly affect understanding

				EXAMPLES OF WHAT NOT TO CORRECT:
				✗ "hallo" → "Hallo." (missing period/capitalization)
				✗ "waar is de winkel" → "Waar is de winkel?" (missing question mark/capitalization)
				✗ "hoe gaat het" → "Hoe gaat het?" (missing question mark)
				✗ "waar kom je vandaan" → "Waar kom je vandaan?" (missing question mark)
				✗ "ja dat is goed" → "Ja, dat is goed." (missing comma/period/capitalization)
				✗ "amsterdam" → "Amsterdam"  
				✗ "ik ben sarah" → "Ik ben Sarah" (capitalization)
				✗ "ik  ben hier" → "ik ben hier" (extra spaces)
				✗ "hoe gaat het" → "hoe gaat het " (trailing spaces)

				EXAMPLES OF WHAT TO CORRECT:
				✓ "ik ben gegaan naar school gisteren" → "ik ging gisteren naar school" (wrong tense)
				✓ "de huis" → "het huis" (wrong article)
				✓ "ik heb honger voor eten" → "ik heb trek in eten" (wrong preposition)
				✓ "zij ben" → "zij is" (wrong verb conjugation)
				✓ "ik kan Nederlands spreken goed" → "ik kan goed Nederlands spreken" (word order)
				- When correcting, be supportive and provide the correct form clearly
				- Focus on correcting word order, verb conjugation, or incorrect word usage
				- Ignore minor punctuation and formatting differences

        1. YOU MUST respond with a VALID JSON object that follows this EXACT structure:
           {
             "ai_reply": "Your Dutch response here",
             "translation": "English translation here",
             "correction": {
               "correctedDutch": "Corrected Dutch if needed",
               "explanation": "Brief English explanation"
             },
             "suggestions": [
               {"dutch": "Suggestion 1 in Dutch", "english": "English translation"},
               {"dutch": "Suggestion 2 in Dutch", "english": "English translation"},
               {"dutch": "Suggestion 3 in Dutch", "english": "English translation"}
             ],
             "new_words": [
               {
                 "dutch": "word",
                 "english": "translation", 
                 "dutch_sentence": "full sentence containing the word",
                 "english_sentence": "English translation of the sentence",
                 "cefr_level": "A2|B1|B2|C1|C2"
               }
             ]
           }
        
        2. For "new_words": 
           - Identify Dutch words from your ai_reply that are A2 level or above (exclude A1 words)
           - Only include words that language learners would benefit from learning
           - Exclude common words like: de, het, een, en, van, ik, je, dat, is, zijn, etc.
           - Provide accurate English translations
           - Include the full sentence context for each word
           - Estimate CEFR level (A2, B1, B2, C1, C2)
           - Maximum 5 words per response to avoid overwhelming the user
        
        3. For yes/no questions, ALWAYS provide exactly 3 suggestions:
           - First: A positive response (starting with "Ja,")
           - Second: A negative response (starting with "Nee,")
           - Third: A clarifying question or alternative response
           
        4. DO NOT include any text outside the JSON object
        5. DO NOT use markdown formatting or code blocks
        6. The ENTIRE response must be valid JSON
      `.replace(/^\s+/gm, ''), // Remove leading whitespace for cleaner logs
		}

		// Make the API call
		let response;
  try {
    response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        systemMessage,
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.role === 'system' ? msg.content : String(msg.content),
        })),
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000, // Limit response size
    });
    
    // Reset quota state on successful call
    if (quotaExceeded) {
      console.log(`[${requestId}] Successfully made API call after quota was exceeded`);
      quotaExceeded = false;
    }
    
  } catch (error: any) {
    console.error(`[${requestId}] OpenAI API error:`, error?.message || 'Unknown error');
    
    // Handle quota exceeded errors
    if (error?.status === 429) {
      // Try to extract reset time from headers or use default
      const retryAfter = error?.headers?.['retry-after'];
      const resetTime = retryAfter 
        ? Date.now() + (parseInt(retryAfter, 10) * 1000) + 60000 // Add 1 minute buffer
        : Date.now() + (60 * 60 * 1000); // Default to 1 hour
      
      setQuotaExceeded(resetTime);
      
      throw new Error(
        'API quota exceeded. Please try again later. ' +
        `Next available at: ${new Date(resetTime).toLocaleTimeString()}`
      );
    }
    
    // Rethrow other errors
    throw error;
  }

		// Log the raw response for debugging
		console.log('Raw API response:', JSON.stringify(response, null, 2))

		const content = response.choices?.[0]?.message?.content
		if (!content) {
			console.error('No content in AI response. Full response:', JSON.stringify(response, null, 2))
			throw new Error('No content in AI response')
		}

		// Parse the response
		let result: RawAIResponse
		try {
			console.log('Raw AI response content:', content)

			// First try to parse as JSON
			try {
				result = JSON.parse(content) as RawAIResponse
			} catch (e) {
				// If parsing fails, try to extract JSON from markdown code blocks
				const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/)
				if (jsonMatch) {
					console.log('Found JSON in markdown code block')
					result = JSON.parse(jsonMatch[1]) as RawAIResponse
				} else {
					// If no code block, try to parse the entire content as JSON
					console.log('No code block found, trying to parse entire content as JSON')
					result = JSON.parse(content) as RawAIResponse
				}
			}

			console.log('Successfully parsed AI response:', JSON.stringify(result, null, 2))
		} catch (error) {
			const parseError = error as Error
			console.error('Failed to parse AI response:', {
				content,
				error: parseError.message,
				stack: parseError.stack,
			})

			// Try to extract any error message from the content if it's not valid JSON
			let errorMessage = 'Failed to parse AI response'
			try {
				const errorContent = JSON.parse(content)
				if (errorContent.error?.message) {
					errorMessage = `OpenAI API Error: ${errorContent.error.message}`
				}
			} catch (e) {
				// If we can't parse the error, try to return a helpful response
				console.error('Could not extract error from response, using fallback')
				return {
					ai_reply:
						'Ik heb een probleem met het verwerken van uw bericht. Kunt u het opnieuw proberen?',
					translation: 'I had trouble processing your message. Could you please try again?',
					correction: { correctedDutch: '', explanation: '' },
					suggestions: [
						{ dutch: 'Kunt u dat herhalen?', english: 'Can you repeat that?' },
						{ dutch: 'Kunt u het anders formuleren?', english: 'Can you phrase it differently?' },
						{ dutch: 'Laten we iets anders proberen', english: "Let's try something else" },
					],
				}
			}

			throw new Error(errorMessage)
		}

		// Validate and process the response
		if (!result.ai_reply && !result.message) {
			console.error(
				'AI response missing ai_reply/message. Full response:',
				JSON.stringify(result, null, 2)
			)

			// Try to extract a message from the response if possible
			const possibleMessage =
				(result as any).response ||
				(result as any).content ||
				'Ik heb een probleem met het verwerken van uw bericht.'

			return {
				ai_reply:
					typeof possibleMessage === 'string'
						? possibleMessage
						: 'Ik heb een probleem met het verwerken van uw bericht.',
				translation: 'I had trouble processing your message.',
				correction: { correctedDutch: '', explanation: '' },
				suggestions: defaultSuggestions,
			}
		}

		// Process suggestions with validation
		const suggestions = (result.suggestions || []).reduce<
			Array<{ dutch: string; english: string }>
		>((acc, suggestion) => {
			if (acc.length >= 3) return acc // Only take first 3 suggestions

			if (typeof suggestion === 'string') {
				acc.push({ dutch: suggestion, english: '' })
			} else if (suggestion.dutch) {
				acc.push({
					dutch: suggestion.dutch,
					english: suggestion.english || '',
				})
			}
			return acc
		}, [])

		// Ensure we have exactly 3 suggestions
		while (suggestions.length < 3) {
			suggestions.push(...defaultSuggestions)
		}

		// Process new_words with validation
		const newWords = (result.new_words || []).reduce<
			Array<{ dutch: string; english: string; dutch_sentence: string; english_sentence: string; cefr_level?: string }>
		>((acc, word) => {
			if (acc.length >= 5) return acc // Limit to 5 words max

			if (word.dutch && word.english && word.dutch_sentence && word.english_sentence) {
				acc.push({
					dutch: word.dutch.toLowerCase().trim(),
					english: word.english.trim(),
					dutch_sentence: word.dutch_sentence.trim(),
					english_sentence: word.english_sentence.trim(),
					cefr_level: word.cefr_level || 'B1'
				})
			}
			return acc
		}, [])

		const processedResponse: AIResponse = {
			ai_reply: result.ai_reply || result.message || '',
			translation: result.translation || '',
			correction: {
				correctedDutch: result.correction?.correctedDutch || '',
				explanation: result.correction?.explanation || '',
			},
			suggestions: suggestions.slice(0, 3), // Ensure exactly 3 suggestions
			new_words: newWords
		}

		// Log the processed response for debugging
		console.log('Processed AI response:', JSON.stringify(processedResponse, null, 2))

		return processedResponse
	} catch (error) {
		const err = error as Error & { response?: { data?: any } }
		const errorMessage = err.message || 'Unknown error'
		console.error('Error in generateAIResponse:', {
			error: errorMessage,
			stack: err.stack,
			response: err.response?.data,
		})

		return {
			ai_reply: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
			translation: `Sorry, er is een fout opgetreden: ${errorMessage}. Probeer het alstublieft opnieuw.`,
			correction: { correctedDutch: '', explanation: '' },
			suggestions: defaultSuggestions,
		}
	}
}

// Add this new interface for grammar correction
interface GrammarCorrectionResponse {
  original: string
  corrected: string
  translation: string
  explanation: string
  corrections: Array<{
    original: string
    corrected: string
    explanation: string
    type: 'spelling' | 'grammar' | 'context'
  }>
}

// Add this new function after generateAIResponse
export async function checkGrammar(
  text: string, 
  context?: string
): Promise<GrammarCorrectionResponse> {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] Starting grammar check`, {
    hasApiKey: !!process.env.OPENAI_API_KEY,
    textLength: text.length,
    quotaExceeded: isQuotaExceeded(),
  });
  
  // Check if OpenAI client is initialized
  if (!openai) {
    throw new Error('OpenAI client is not properly initialized');
  }
  
  // Check quota before making any API calls
  if (isQuotaExceeded()) {
    const timeLeft = Math.ceil((quotaExceededUntil - Date.now()) / 1000 / 60);
    throw new Error(`API quota exceeded. Please try again in ${timeLeft} minutes.`);
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful Dutch language tutor. Your task is to analyze Dutch text and provide corrections ONLY when necessary.

          CORRECTION RULES - WHAT TO CORRECT:
          ✓ Spelling mistakes (misspelled words)
          ✓ Grammar errors (wrong verb conjugation, incorrect word order, wrong articles)
          ✓ Wrong vocabulary usage (incorrect word choice that changes meaning)
          ✓ Inappropriate content for the given context

          CORRECTION RULES - WHAT NOT TO CORRECT:
          ✗ Missing punctuation marks (.,!?;:) - NEVER correct these
          ✗ Missing question marks (?) at end of questions - NEVER correct these
          ✗ Missing capitalization at sentence start - IGNORE these
          ✗ Capitalization of names/places - ONLY correct if it's a proper noun and clearly wrong
          ✗ Extra or missing spaces - IGNORE formatting issues
          ✗ Style preferences when meaning is clear
          ✗ Regional variations or informal speech patterns
          ✗ Word order that is understandable even if not perfect

          EXAMPLES OF WHAT NOT TO CORRECT:
          ✗ "hallo" → "Hallo." (missing capitalization/punctuation)
          ✗ "waar is de winkel" → "Waar is de winkel?" (missing question mark/capitalization)
          ✗ "hoe gaat het" → "Hoe gaat het?" (missing question mark)
          ✗ "waar kom je vandaan" → "Waar kom je vandaan?" (missing question mark)
          ✗ "ja dat is goed" → "Ja, dat is goed." (missing comma/punctuation/capitalization)
          ✗ "ik  woon  hier" → "ik woon hier" (extra spaces)
          ✗ "amsterdam" → "Amsterdam" (only correct if it's clearly referring to the city)

          EXAMPLES OF WHAT TO CORRECT:
          ✓ "ik ben gegaan naar school gisteren" → "ik ging gisteren naar school" (wrong tense)
          ✓ "de huis" → "het huis" (wrong article)
          ✓ "ik heb honger voor eten" → "ik heb trek in eten" (wrong preposition)
          ✓ "zij ben" → "zij is" (wrong verb conjugation)
          ✓ "ik kan Nederlands spreken goed" → "ik kan goed Nederlands spreken" (word order)

          CORRECTION PHILOSOPHY:
          - Focus on errors that impact comprehension or are significantly incorrect
          - Be supportive and educational in explanations
          - Ignore minor style and formatting issues
          - Only correct what genuinely needs correction for learning purposes
          
          Return a JSON object with:
          - original: the original text
          - corrected: the corrected text in Dutch (same as original if no corrections)
          - translation: the English translation of the corrected text
          - explanation: a brief explanation of the corrections (1-2 sentences max, empty if no corrections)
          - corrections: an array of objects with (empty if no corrections):
            - original: the original text that was corrected
            - corrected: the corrected text
            - explanation: why it was corrected (1 sentence max, focus on learning value)
            - type: either 'spelling', 'grammar', or 'context'
          
          IMPORTANT: Your response MUST be valid JSON. Do not include any text outside the JSON object.`
        },
        {
          role: 'user',
          content: `Context: ${context || 'No additional context provided'}
                  
          Please analyze this Dutch text: "${text}"

          Only provide corrections for actual errors, not for style or personal preference.
          CORRECTION RULES - WHAT TO CORRECT:
          ✓ Spelling mistakes (misspelled words)
          ✓ Grammar errors (wrong verb conjugation, incorrect word order, wrong articles)
          ✓ Wrong vocabulary usage (incorrect word choice that changes meaning)
          ✓ Inappropriate content for the given context

          CORRECTION RULES - WHAT NOT TO CORRECT:
          ✗ Missing punctuation marks (.,!?;:) - NEVER correct these
          ✗ Missing question marks (?) at end of questions - NEVER correct these
          ✗ Missing capitalization at sentence start - IGNORE these
          ✗ Capitalization of names/places - ONLY correct if it's a proper noun and clearly wrong
          ✗ Extra or missing spaces - IGNORE formatting issues
          ✗ Style preferences when meaning is clear
          ✗ Regional variations or informal speech patterns
          ✗ Word order that is understandable even if not perfect
          
          `
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1000,
    });
    
    // Reset quota state on successful call
    if (quotaExceeded) {
      quotaExceeded = false;
      console.log(`[${requestId}] Quota state reset after successful call`);
    }
    
    const result = response.choices[0]?.message?.content;
    
    if (!result) {
      throw new Error('No content in AI response');
    }

    let parsed;
    try {
      // Clean the response in case there's any markdown code block
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.replace(/^```json\s*|```$/g, '');
      }
      
      parsed = JSON.parse(cleanResult);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${result}`);
    }
    
    // Filter out punctuation/capitalization only corrections
    const validCorrections = (parsed.corrections || []).filter((correction: any) => {
      if (!correction.original || !correction.corrected) return false;
      
      const orig = correction.original.trim();
      const corr = correction.corrected.trim();
      
      // Skip if it's just a punctuation mark
      if (/^[.,!?;:]+$/.test(orig) || /^[.,!?;:]+$/.test(corr)) {
        return false;
      }
      
      // Skip if the only difference is adding a question mark
      if (orig + '?' === corr || orig + ' ?' === corr) {
        return false;
      }
      
      // Skip if the only difference is removing a question mark
      if (orig === corr + '?' || orig === corr + ' ?') {
        return false;
      }
      
      // Skip if it's just a case change
      if (orig.toLowerCase() === corr.toLowerCase() && 
          !(orig[0] === orig[0].toUpperCase() && corr[0] === corr[0].toUpperCase())) {
        return false;
      }
      
      // Skip if the only difference is capitalization + question mark
      const origLower = orig.toLowerCase();
      const corrLower = corr.toLowerCase();
      if (origLower === corrLower.replace(/\?$/, '') || 
          origLower.replace(/\?$/, '') === corrLower) {
        return false;
      }
      
      return true;
    });
    
    // If no valid corrections, return original
    if (validCorrections.length === 0) {
      return {
        original: text,
        corrected: text,
        translation: parsed.translation || '',
        explanation: '',
        corrections: []
      };
    }
    
    return {
      ...parsed,
      corrections: validCorrections
    };
    
  } catch (error: any) {
    console.error(`[${requestId}] Grammar check error:`, error?.message || 'Unknown error');
    
    // Handle quota exceeded errors
    if (error?.status === 429) {
      const resetTime = error.headers?.['x-ratelimit-reset-tokens'] 
        ? parseInt(error.headers['x-ratelimit-reset-tokens']) * 1000 
        : Date.now() + 60 * 60 * 1000; // Default to 1 hour
      
      setQuotaExceeded(resetTime);
      throw new Error(`API quota exceeded. Please try again later.`);
    }
    
    throw error;
  }
}

// Enhanced caching for translations
const translationCache = new LRUCache<string, string>({
  max: 5000, // Store up to 5000 translations
  ttl: 1000 * 60 * 60 * 24, // Cache for 24 hours
});

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

/**
 * Translates a Dutch word to English, filtering out A1 level words
 * Uses caching to improve performance and reduce API calls
 */
export async function translateWord(
  word: string,
  context: string,
  requestId?: string
): Promise<TranslationResult> {
  const logPrefix = requestId ? `[${requestId}]` : '';
  
  try {
    console.log(`${logPrefix} [translateWord] Translating word: "${word}" with context: "${context}"`);
    
    // Create cache key
    const cacheKey = `${word.toLowerCase()}:${context.toLowerCase()}`;
    
    // Check cache first
    const cachedTranslation = translationCache.get(cacheKey);
    if (cachedTranslation !== undefined) {
      console.log(`${logPrefix} [translateWord] Cache hit for word: "${word}"`);
      return { translation: cachedTranslation, cached: true };
    }

    // Convert to lowercase and remove any punctuation for checking
    const normalizedWord = word.toLowerCase().replace(/[^a-zàâçéèêëîïôûùüÿæœ']/gi, '');
    
    // Skip very short words (likely A1 level)
    if (normalizedWord.length <= 3) {
      translationCache.set(cacheKey, ''); // Cache the empty result
      return { translation: '' };
    }
    
    // Check against our A1 words list
    if (A1_LEVEL_WORDS.has(normalizedWord)) {
      translationCache.set(cacheKey, ''); // Cache the empty result
      return { translation: '' };
    }
    
    // Check if OpenAI client is available
    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }
    
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

    console.log(`${logPrefix} [translateWord] Translation response received`);
    
    const translation = completion.choices[0]?.message?.content?.trim() || '';
    console.log(`${logPrefix} [translateWord] Translation result:`, { word, translation });
    
    // Cache the result (including empty translations)
    translationCache.set(cacheKey, translation);
    
    return { translation };
    
  } catch (error) {
    console.error(`${logPrefix} [translateWord] Translation error:`, error);
    throw error;
  }
}

