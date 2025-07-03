/**
 * Word Management Hook
 * 
 * This custom hook manages vocabulary learning features for the Dutch chat application.
 * It extracts, stores, and organizes new Dutch words discovered during conversations.
 * 
 * Key Features:
 * - Maintains collections of new words and conversation words
 * - Extracts vocabulary from AI responses automatically
 * - Prevents duplicate word entries
 * - Integrates with performance monitoring for tracking
 * - Provides combined word list for review modal
 * 
 * @returns Object with word collections and processing functions
 */

import { useState, useCallback } from 'react'
import { fallbackWordProcessing, validateAIWords } from '@/lib/word-processing-backup'
import type { NewWord } from '@/lib/topics'

export function useWordManagement() {
	const [newWords, setNewWords] = useState<NewWord[]>([])
	const [conversationWords, setConversationWords] = useState<NewWord[]>([])

	const addWordsFromAI = useCallback((words: NewWord[]) => {
		if (!validateAIWords(words)) return

		setNewWords((prev) => {
			const existingWords = new Set(prev.map((word) => word.dutch))
			const uniqueNewWords = words.filter((word) => !existingWords.has(word.dutch))
			return [...prev, ...uniqueNewWords]
		})

		// Also update conversation words with AI-provided words
		setConversationWords((prev) => {
			const existingWords = new Set(prev.map((word) => word.dutch))
			const uniqueNewWords = words.filter((word) => !existingWords.has(word.dutch))
			return [...prev, ...uniqueNewWords]
		})
	}, [])

	const addWordsFromFallback = useCallback(async (
		userMessage: string, 
		aiReply: string, 
		translation: string
	) => {
		try {
			const words = await fallbackWordProcessing(userMessage, aiReply, translation)
			if (words.length > 0) {
				setConversationWords((prev) => {
					const existingWords = new Set(prev.map((word) => word.dutch))
					const uniqueNewWords = words.filter((word) => !existingWords.has(word.dutch))
					return [...prev, ...uniqueNewWords]
				})
			}
			return words
		} catch (error) {
			console.error('Fallback word processing failed:', error)
			return []
		}
	}, [])

	const getAllWords = useCallback(() => {
		return [...new Set([...newWords, ...conversationWords])]
	}, [newWords, conversationWords])

	const processWordsFromResponse = useCallback(async (
		data: any,
		userMessage: string,
		tracker?: any
	) => {
		if (data.new_words?.length && validateAIWords(data.new_words)) {
			// Track words from AI if tracker is provided
			tracker?.recordWordsFromAI(data.new_words.length)
			addWordsFromAI(data.new_words)
		} else {
			// Fallback: Use backup word processing if AI didn't provide words
			console.warn('AI did not provide valid new_words, using fallback processing')
			
			try {
				const words = await addWordsFromFallback(userMessage, data.ai_reply, data.translation)
				tracker?.recordFallbackUsed(words.length)
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				tracker?.recordError(`Fallback processing failed: ${errorMessage}`)
				console.error('Fallback word processing failed:', error)
			}
		}
	}, [addWordsFromAI, addWordsFromFallback])

	return {
		newWords,
		conversationWords,
		addWordsFromAI,
		addWordsFromFallback,
		getAllWords,
		processWordsFromResponse
	}
}
