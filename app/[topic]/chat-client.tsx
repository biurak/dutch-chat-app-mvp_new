/**
 * Dutch Chat Client Component
 *
 * Main chat interface for practicing Dutch conversation with AI assistance.
 * This component has been refactored using a modular architecture with custom hooks and UI components.
 *
 * REFACTORED ARCHITECTURE:
 * - useChatMessages: Manages all message state and operations
 * - useChatApi: Handles backend API communication
 * - useWordManagement: Extracts and organizes vocabulary learning
 * - ChatMessage: Renders individual chat messages with interactions
 * - ChatSuggestions: Displays conversation suggestion buttons
 * - ChatInputForm: Handles user input, voice recording, and actions
 *
 * Key Features:
 * - Real-time chat with Dutch AI assistant
 * - Grammar checking and corrections
 * - Text-to-speech for pronunciation practice
 * - Voice input recognition
 * - Vocabulary extraction and review
 * - Translation toggles (Dutch ↔ English)
 * - Topic-based conversation contexts
 * - Performance monitoring and analytics
 *
 * @param topicSlug - URL slug identifying the conversation topic
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
	getTopicBySlug,
	type Topic,
	type NewWord,
	type Message,
	type Correction,
} from '@/lib/topics'
import { usePerformanceMonitoring } from '@/lib/performance-monitor'
import { useVoiceRecording } from '@/hooks/use-voice-recording-fixed'
import { useTextToSpeech } from '@/hooks/use-text-to-speech'
import { useChatMessages } from '@/hooks/use-chat-messages'
import { useChatApi } from '@/hooks/use-chat-api'
import { useWordManagement } from '@/hooks/use-word-management'
import { ChatMessage } from '@/components/chat/chat-message'
import { ChatSuggestions } from '@/components/chat/chat-suggestions'
import { ChatInputForm } from '@/components/chat/chat-input-form'
import { ReviewWordsModal } from '@/components/chat/review-words-modal'
import { Toaster } from '@/components/ui/toaster'
import { useIsMobile } from '@/hooks/use-mobile'

interface Suggestion {
	dutch: string
	english: string
}

interface ChatApiRequest {
	messages: Array<{
		role: 'user' | 'assistant' | 'system'
		content: string
	}>
	topic: string
	user_input: string
}

interface ExtendedTopic extends Topic {
	initialAiMessage: {
		dutch: string
		english: string
	}
	initialSuggestions: Suggestion[]
}

interface ChatClientProps {
	topicSlug: string
}

export default function ChatClient({ topicSlug }: ChatClientProps) {
	const router = useRouter()
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	const isMobile = useIsMobile()

	const [isLoading, setIsLoading] = useState(true)
	const [isLoadingAi, setIsLoadingAi] = useState(false)
	const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>([])
	const [currentTopic, setCurrentTopic] = useState<ExtendedTopic | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [inputValue, setInputValue] = useState('')
	const [isReviewModalOpen, setReviewModalOpen] = useState(false)

	// Voice-related state
	const [audioPlaying, setAudioPlaying] = useState<string | null>(null)
	const [speechSettings, setSpeechSettings] = useState({
		rate: 1,
		pitch: 1,
		volume: 1,
		autoPlay: false,
	})

	// Message management hook - handles all chat message state and operations
	const {
		messages,
		toggleTranslation,
		toggleCorrections,
		addInitialMessage,
		addUserMessage,
		addAiStreamingMessage,
		updateMessage,
	} = useChatMessages()

	// Chat API hook - manages backend communication for chat and grammar checking
	const { sendMessage, checkGrammar, prepareChatHistory } = useChatApi()

	// Word management hook - extracts and organizes vocabulary for learning
	const { processWordsFromResponse, getAllWords } = useWordManagement()

	// Voice hooks
	const voiceRecording = useVoiceRecording({ language: 'nl-NL' })
	const textToSpeech = useTextToSpeech({
		rate: speechSettings.rate,
		pitch: speechSettings.pitch,
		volume: speechSettings.volume,
	})

	// Performance monitoring
	const { startMessage } = usePerformanceMonitoring()

	// Voice input handlers
	const handleVoiceInput = useCallback(() => {
		if (!voiceRecording.isSupported) {
			alert(
				'Voice input is not supported in this browser. Please try using Chrome, Safari, or Edge.'
			)
			return
		}

		if (voiceRecording.isRecording) {
			voiceRecording.stopRecording()
		} else {
			try {
				voiceRecording.startRecording()
			} catch (error) {
				console.error('Error starting voice recording:', error)
				alert('Could not start voice recording. Please check your microphone permissions.')
			}
		}
	}, [voiceRecording])

	// Voice output handlers
	const handlePlayAudio = useCallback(
		(messageId: string, text: string, language: 'nl-NL' | 'en-US' = 'nl-NL') => {
			if (audioPlaying === messageId) {
				textToSpeech.stop()
				setAudioPlaying(null)
			} else {
				setAudioPlaying(messageId)
				textToSpeech.speak(text, language)
			}
		},
		[audioPlaying, textToSpeech]
	)

	// Handle voice transcript
	useEffect(() => {
		if (voiceRecording.transcript && !voiceRecording.isRecording) {
			setInputValue(voiceRecording.transcript)
			voiceRecording.clearTranscript()
		}
	}, [voiceRecording.transcript, voiceRecording.isRecording, voiceRecording])

	// Handle TTS events
	useEffect(() => {
		const handleTTSEnd = () => {
			if (audioPlaying) {
				setAudioPlaying(null)
			}
		}

		if (!textToSpeech.isPlaying && audioPlaying) {
			setAudioPlaying(null)
		}

		// Clean up audio when component unmounts
		return () => {
			if (textToSpeech.isPlaying) {
				textToSpeech.stop()
				setAudioPlaying(null)
			}
		}
	}, [textToSpeech.isPlaying, audioPlaying, textToSpeech])

	// Handle sending a user message and processing the response
	const handleUserMessage = useCallback(
		async (message: string) => {
			console.log('handleUserMessage called with message:', message)
			if (!message.trim()) {
				console.error('Empty message received')
				return
			}
			if (!currentTopic) {
				console.error('No current topic set')
				return
			}

			// Start performance monitoring
			const userMessageId = addUserMessage(message)
			const tracker = startMessage(userMessageId)

			// STEP 1: Add AI typing indicator using hook methods
			const aiMessageId = addAiStreamingMessage()

			setIsLoadingAi(true)

			// STEP 2: Start grammar checking in background (non-blocking)
			checkGrammar(
				message,
				messages.map((m) => m.dutch)
			)
				.then((grammarCheck) => {
					console.log('[handleUserMessage] Grammar check result:', grammarCheck)

					// Handle case where grammar check returns null or undefined
					if (!grammarCheck) {
						console.warn('No grammar check result received')
						return
					}

					const hasCorrections = (grammarCheck?.corrections?.length ?? 0) > 0
					const correctedText = hasCorrections ? grammarCheck?.corrected : undefined
					const corrections = grammarCheck?.corrections || []
					const translation = grammarCheck?.translation || ''

					// Update user message with grammar corrections and translation
					updateMessage(userMessageId, {
						english: translation,
						corrections,
						correctedText,
						showCorrections: hasCorrections, // Show corrections by default if they exist
					})
				})
				.catch((error) => {
					console.error('[handleUserMessage] Error in grammar check:', error)
					// Update the message to indicate there was an error with grammar checking
					updateMessage(userMessageId, {
						english: 'Could not check grammar',
						corrections: [],
						correctedText: undefined,
					})
				})

			// STEP 3: Get AI response (parallel to grammar checking)
			try {
				// Prepare the chat history for the API
				const chatHistory = prepareChatHistory(messages, currentTopic.title, message)

				// Track API call
				tracker.recordApiCall()

				const data = await sendMessage(topicSlug, chatHistory, message)

				// Extract and store any new words from the response
				await processWordsFromResponse(data, message, tracker)

				// STEP 4: Update the AI message with the response
				updateMessage(aiMessageId, {
					dutch: data.ai_reply || data.dutch || 'Sorry, I could not generate a response.',
					english: data.translation || data.english || '',
					isStreaming: false,
					newWords: data.new_words || [],
				})

				// STEP 5: Process and update suggestions from the AI response
				const processSuggestions = (suggestions: any) => {
					if (!suggestions || !Array.isArray(suggestions)) {
						console.warn('No valid suggestions array in response')
						return []
					}

					// Ensure each suggestion has the correct format
					return suggestions
						.map((s: any, i: number) => {
							// Handle both string and object formats
							if (typeof s === 'string') {
								return { dutch: s, english: '' }
							} else if (s && typeof s === 'object') {
								return {
									dutch: s.dutch || s.text || `Suggestion ${i + 1}`,
									english: s.english || '',
								}
							}
							return { dutch: `Invalid suggestion ${i + 1}`, english: '' }
						})
						.filter(Boolean)
				}

				const newSuggestions = processSuggestions(data.suggestions)

				if (newSuggestions.length > 0) {
					console.log('Setting new suggestions:', newSuggestions)
					setCurrentSuggestions(newSuggestions)
				} else {
					// Fallback to default suggestions if none provided
					const defaults = [
						{ dutch: 'Wat bedoel je?', english: 'What do you mean?' },
						{ dutch: 'Kun je dat herhalen?', english: 'Can you repeat that?' },
						{ dutch: 'Kun je dat uitleggen?', english: 'Can you explain that?' },
					]
					console.log('Using default suggestions')
					setCurrentSuggestions(defaults)
				}
			} catch (error) {
				console.error('Error sending message:', error)
				tracker.recordError(
					`Message sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
				)

				// Show error message to the user
				updateMessage(aiMessageId, {
					dutch: 'Sorry, er is een fout opgetreden bij het verwerken van je bericht.',
					english: 'Sorry, an error occurred while processing your message.',
					isStreaming: false,
				})

				// Set default error suggestions
				setCurrentSuggestions([
					{ dutch: 'Probeer het opnieuw', english: 'Try again' },
					{ dutch: 'Wat bedoel je?', english: 'What do you mean?' },
					{ dutch: 'Kun je dat uitleggen?', english: 'Can you explain that?' },
				])
			} finally {
				setIsLoadingAi(false)
				// Finish performance tracking
				tracker.finish()
			}
		},
		[
			currentTopic,
			messages,
			topicSlug,
			checkGrammar,
			prepareChatHistory,
			sendMessage,
			processWordsFromResponse,
			startMessage,
			addUserMessage,
			addAiStreamingMessage,
			updateMessage,
		]
	)

	// Handle clicking on a suggestion - callback for ChatSuggestions component
	const handleSuggestionClick = useCallback(
		(e: React.FormEvent, suggestionText: string) => {
			e.preventDefault()
			console.log('Suggestion clicked:', suggestionText)
			if (!suggestionText || !suggestionText.trim()) {
				console.error('Invalid suggestion text:', suggestionText)
				return
			}
			console.log('Sending suggestion as message:', suggestionText)
			// Send the suggestion directly without updating the input field
			handleUserMessage(suggestionText).catch((error: Error) => {
				console.error('Error handling suggestion click:', error)
			})
		},
		[handleUserMessage]
	)

	// Handle form submission
	const handleSubmit = useCallback(
		async (e?: React.FormEvent, messageText?: string) => {
			e?.preventDefault()

			const message = messageText || inputValue.trim()
			if (!message || isLoadingAi) return

			setInputValue('')

			try {
				await handleUserMessage(message)
			} catch (error) {
				console.error('Error handling user message:', error)
			}
		},
		[inputValue, isLoadingAi, handleUserMessage]
	)

	// Load topic data
	useEffect(() => {
		const loadTopic = async () => {
			try {
				setIsLoading(true)
				const topic = await getTopicBySlug(topicSlug)

				if (!topic) {
					setError('Topic not found')
					return
				}

				// Create the extended topic with defaults
				const extendedTopic = {
					...topic,
					initialAiMessage: topic.initialAiMessage || {
						dutch: 'Hallo! Hoe kan ik je vandaag helpen?',
						english: 'Hello! How can I help you today?',
					},
					initialSuggestions: topic.initialSuggestions || [],
				}

				setCurrentTopic(extendedTopic)

				// Set initial welcome message
				addInitialMessage(
					extendedTopic.initialAiMessage.dutch,
					extendedTopic.initialAiMessage.english
				)

				// Set initial suggestions
				if (extendedTopic.initialSuggestions?.length) {
					setCurrentSuggestions(extendedTopic.initialSuggestions)
				} else {
					setCurrentSuggestions([
						{ dutch: 'Hoe gaat het?', english: 'How are you?' },
						{ dutch: 'Wat is je naam?', english: 'What is your name?' },
						{ dutch: 'Waar kom je vandaan?', english: 'Where are you from?' },
					])
				}
			} catch (err) {
				console.error('Error loading topic:', err)
				setError('Failed to load chat. Please try again.')
			} finally {
				setIsLoading(false)
			}
		}

		loadTopic()
	}, [topicSlug, addInitialMessage])

	// Scroll to bottom of messages when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	if (isLoading) {
		return (
			<div className='flex items-center justify-center h-screen bg-slate-50'>
				<p className='text-slate-600'>loading...</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className='flex flex-col items-center justify-center h-screen p-4 bg-slate-50'>
				<p className='mb-4 text-red-600'>{error}</p>
				<Button onClick={() => router.back()}>
					<ArrowLeft className='w-4 h-4 mr-2' /> Terug naar overzicht
				</Button>
			</div>
		)
	}

	return (
		<>
			<div className='flex flex-col bg-slate-50 h-[calc(100vh-250px)]'>
				{/* Main content area */}
				<main className='container flex-1 mx-auto overflow-y-auto xl'>
					{/* Messages */}
					<div className='p-4 mb-64 space-y-4 sm:mb-56'>
						{messages.length === 0 ? (
							<div className='flex items-center justify-center h-full'>
								<p className='text-slate-500'>Start the conversation...</p>
							</div>
						) : (
							// Render messages using modular ChatMessage component
							messages.map((message) => (
								<ChatMessage
									key={message.id}
									message={message}
									audioPlaying={audioPlaying}
									onPlayAudio={handlePlayAudio}
									onToggleTranslation={toggleTranslation}
									onToggleCorrections={toggleCorrections}
								/>
							))
						)}
						<div ref={messagesEndRef} />
					</div>
				</main>

				{/* Fixed bottom area */}
				<div className='fixed bottom-0 left-0 right-0 z-10 flex flex-col gap-4 py-4 bg-white border-t border-slate-200'>
					{/* Suggestions - using modular ChatSuggestions component */}
					<ChatSuggestions
						suggestions={currentSuggestions}
						onSuggestionClick={handleSuggestionClick}
					/>

					{/* Input area - using modular ChatInputForm component */}
					<ChatInputForm
						inputValue={inputValue}
						setInputValue={setInputValue}
						onSubmit={handleSubmit}
						isLoadingAi={isLoadingAi}
						voiceRecording={voiceRecording}
						onVoiceInput={handleVoiceInput}
						isMobile={isMobile}
						inputRef={inputRef}
						onReviewModalOpen={() => setReviewModalOpen(true)}
					/>

					{/* Review Words Button */}

					<ReviewWordsModal
						isOpen={isReviewModalOpen}
						onClose={() => setReviewModalOpen(false)}
						words={getAllWords()}
					/>
					<Toaster />
				</div>
			</div>
		</>
	)
}

