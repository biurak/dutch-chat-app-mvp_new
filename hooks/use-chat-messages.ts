/**
 * Chat Messages Hook
 * 
 * This custom hook manages all chat message state and operations for the Dutch chat application.
 * It provides methods to add, update, and toggle display states of messages between users and AI.
 * 
 * Key Features:
 * - Maintains array of chat messages with full state
 * - Handles message translations toggle (Dutch ↔ English)
 * - Manages grammar corrections visibility
 * - Provides methods for adding initial, user, and AI messages
 * - Supports streaming message updates for real-time AI responses
 * 
 * @returns Object with messages array and all message management functions
 */

import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Message, Correction, NewWord } from '@/lib/topics'

export function useChatMessages() {
	const [messages, setMessages] = useState<Message[]>([])

	const addMessage = useCallback((message: Omit<Message, 'id'>) => {
		const newMessage = { ...message, id: uuidv4() }
		setMessages(prev => [...prev, newMessage])
		return newMessage.id
	}, [])

	const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
		setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, ...updates } : msg))
	}, [])

	const toggleTranslation = useCallback((messageId: string) => {
		setMessages(prev => prev.map(msg => 
			msg.id === messageId ? { ...msg, showTranslation: !msg.showTranslation } : msg
		))
	}, [])

	const toggleCorrections = useCallback((messageId: string) => {
		setMessages(prev => prev.map(msg => 
			msg.id === messageId ? { ...msg, showCorrections: !msg.showCorrections } : msg
		))
	}, [])

	const addInitialMessage = useCallback((dutch: string, english: string) => {
		const welcomeMessage: Message = {
			id: uuidv4(),
			role: 'ai',
			dutch,
			english,
			showTranslation: false,
		}
		setMessages([welcomeMessage])
		return welcomeMessage.id
	}, [])

	const addUserMessage = useCallback((dutch: string) => {
		const userMessage: Message = {
			id: uuidv4(),
			role: 'user',
			dutch,
			english: '',
			showTranslation: false,
			corrections: undefined,
			correctedText: undefined,
			showCorrections: false,
		}
		setMessages(prev => [...prev, userMessage])
		return userMessage.id
	}, [])

	const addAiStreamingMessage = useCallback(() => {
		const aiMessage: Message = {
			id: uuidv4(),
			role: 'ai',
			dutch: '...',
			english: '',
			showTranslation: false,
			isStreaming: true,
		}
		setMessages(prev => [...prev, aiMessage])
		return aiMessage.id
	}, [])

	return {
		messages,
		setMessages,
		addMessage,
		updateMessage,
		toggleTranslation,
		toggleCorrections,
		addInitialMessage,
		addUserMessage,
		addAiStreamingMessage
	}
}
