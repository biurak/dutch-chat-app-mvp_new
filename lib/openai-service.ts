import OpenAI from 'openai'

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
})

type Message = {
	role: 'system' | 'user' | 'assistant'
	content: string
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
	console.log('Starting generateAIResponseStream with config:', {
		hasApiKey: !!process.env.OPENAI_API_KEY,
		messageCount: messages.length,
		promptConfig: promptConfig ? 'present' : 'missing',
	})

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

		const stream = await openai.chat.completions.create({
			model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
			messages: [
				systemMessage,
				...messages.map((msg) => ({
					role: msg.role,
					content: msg.role === 'system' ? msg.content : String(msg.content),
				})),
			],
			stream: true,
			temperature: 0.7,
		})

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
	console.log('Starting generateAIResponse with config:', {
		hasApiKey: !!process.env.OPENAI_API_KEY,
		messageCount: messages.length,
		promptConfig: promptConfig ? 'present' : 'missing',
	})

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
		const response = await openai.chat.completions.create({
			model: process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06',
			messages: [
				systemMessage,
				...messages.map((msg) => ({
					role: msg.role,
					content: msg.role === 'system' ? msg.content : String(msg.content),
				})),
			],
			response_format: { type: 'json_object' },
			temperature: 0.7,
		})

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

