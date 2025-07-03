/**
 * Chat API Hook
 * 
 * This custom hook manages all API interactions for the Dutch chat application.
 * It handles communication with the backend chat and grammar checking services.
 * 
 * Key Features:
 * - Sends chat messages to AI backend and receives responses
 * - Performs grammar checking with corrections and translations
 * - Prepares chat history for API requests with proper formatting
 * - Handles error states and API response processing
 * - Returns structured data for suggestions, translations, and corrections
 * 
 * @returns Object with sendMessage, checkGrammar, and prepareChatHistory functions
 */

import { useCallback } from 'react'
import type { Message, Correction } from '@/lib/topics'

interface ChatApiRequest {
	messages: Array<{
		role: 'user' | 'assistant' | 'system'
		content: string
	}>
	topic: string
	user_input: string
}

interface ChatApiResponse {
	ai_reply: string
	translation: string
	suggestions: any[]
	new_words: any[]
	dutch?: string
	english?: string
}

interface GrammarCheckResponse {
	corrected: string
	translation: string
	corrections: Correction[]
}

export function useChatApi() {
	const sendMessage = useCallback(async (
		topicSlug: string, 
		chatHistory: ChatApiRequest['messages'],
		userInput: string
	): Promise<ChatApiResponse> => {
		const apiUrl = `/api/chat/${encodeURIComponent(topicSlug)}`
		console.log('Making API request to:', apiUrl)

		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				messages: chatHistory,
				topic: topicSlug,
				user_input: userInput,
			} as ChatApiRequest),
		})

		if (!response.ok) {
			const errorText = await response.text()
			console.error('API Error:', response.status, errorText)
			throw new Error(`HTTP error! status: ${response.status}`)
		}

		const data = await response.json()
		return data
	}, [])

	const checkGrammar = useCallback(async (text: string, context: string[]): Promise<GrammarCheckResponse> => {
		console.log('[checkGrammar] Sending request to /api/correct with text:', text)
		
		const response = await fetch('/api/correct', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				text,
				context: context.join('\n'),
			}),
		})

		const responseText = await response.text()
		console.log('[checkGrammar] Response status:', response.status)
		console.log('[checkGrammar] Response body:', responseText)

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`)
		}

		try {
			const data = JSON.parse(responseText)
			console.log('[checkGrammar] Parsed response:', data)
			return data
		} catch (parseError) {
			console.error('[checkGrammar] Failed to parse response:', parseError)
			throw new Error(`Invalid JSON response: ${responseText}`)
		}
	}, [])

	const prepareChatHistory = useCallback((
		messages: any[], 
		currentTopicTitle: string, 
		newMessage: string
	) => {
		return [
			{
				role: 'system' as const,
				content: `You are a helpful assistant helping someone learn Dutch. The current topic is: ${currentTopicTitle}.`,
			},
			...messages
				.filter((msg) => msg.role === 'user' || !msg.isStreaming)
				.map((msg) => ({
					role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
					content: msg.role === 'user' ? msg.dutch : msg.dutch,
				})),
			{
				role: 'user' as const,
				content: newMessage,
			},
		]
	}, [])

	return { 
		sendMessage, 
		checkGrammar, 
		prepareChatHistory 
	}
}
