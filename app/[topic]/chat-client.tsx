'use client'

import { useEffect, useRef, useState, useCallback, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, Mic, Send, Volume2, VolumeX } from 'lucide-react'
import { getTopicBySlug, type Topic, type NewWord } from '@/lib/topics'
// Removed: import { processConversationForNewWords } from '@/lib/text-utils' - no longer needed
import { fallbackWordProcessing, validateAIWords } from '@/lib/word-processing-backup'
import { usePerformanceMonitoring } from '@/lib/performance-monitor'
import { useVoiceRecording } from '@/hooks/use-voice-recording-fixed'
import { useTextToSpeech } from '@/hooks/use-text-to-speech'
import { ReviewWordsModal } from '@/components/chat/review-words-modal'
import { Toaster } from '@/components/ui/toaster'
import { useIsMobile } from "@/hooks/use-mobile"


interface Suggestion {
	dutch: string
	english: string
}

interface Correction {
	original: string
	corrected: string
	explanation: string
}

interface Message {
	id: string
	role: 'user' | 'ai'
	dutch: string
	english: string
	showTranslation: boolean
	isStreaming?: boolean
	corrections?: Correction[]
	correctedText?: string
	showCorrections?: boolean
	newWords?: NewWord[]
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
	const [messages, setMessages] = useState<Message[]>([])
	const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>([])
	const [currentTopic, setCurrentTopic] = useState<ExtendedTopic | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [inputValue, setInputValue] = useState('')
	const [isReviewModalOpen, setReviewModalOpen] = useState(false)
	const [newWords, setNewWords] = useState<NewWord[]>([])
	// Initialize conversationWords as an empty array to store words from the conversation
	const [conversationWords, setConversationWords] = useState<NewWord[]>([])

	// Voice-related state
	const [audioPlaying, setAudioPlaying] = useState<string | null>(null)
	const [speechSettings, setSpeechSettings] = useState({
		rate: 1,
		pitch: 1,
		volume: 1,
		autoPlay: false,
	})

	// Voice hooks
	const voiceRecording = useVoiceRecording({ language: 'nl-NL' })
	const textToSpeech = useTextToSpeech({
		rate: speechSettings.rate,
		pitch: speechSettings.pitch,
		volume: speechSettings.volume,
	})

	// Performance monitoring
	const { startMessage, getSessionMetrics } = usePerformanceMonitoring()

	// Toggle translation for a message
	const toggleTranslation = useCallback((messageId: string) => {
		setMessages((prevMessages) =>
			prevMessages.map((msg) =>
				msg.id === messageId ? { ...msg, showTranslation: !msg.showTranslation } : msg
			)
		)
	}, [])

	// Toggle corrections for a message
	const toggleCorrections = useCallback((messageId: string) => {
		setMessages((prevMessages) =>
			prevMessages.map((msg) =>
				msg.id === messageId ? { ...msg, showCorrections: !msg.showCorrections } : msg
			)
		)
	}, [])

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

	// Check grammar and get corrections for user message
	const checkGrammar = useCallback(
		async (text: string) => {
			try {
				console.log('[checkGrammar] Sending request to /api/correct with text:', text)
				const response = await fetch('/api/correct', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						text,
						context: messages.map((m) => m.dutch).join('\n'), // Add conversation context
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
			} catch (error) {
				console.error('[checkGrammar] Error checking grammar:', error)
				throw error // Re-throw to be handled by the caller
			}
		},
		[messages]
	)

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

			const userMessageId = uuidv4()
			const aiMessageId = uuidv4()

			// Start performance monitoring
			const tracker = startMessage(userMessageId)

			// STEP 1: Immediately add user message and AI typing indicator to UI
			setMessages((prev) => [
				...prev,
				{
					id: userMessageId,
					role: 'user',
					dutch: message,
					english: '', // Will be filled later
					showTranslation: false,
					corrections: undefined, // Will be filled later
					correctedText: undefined, // Will be filled later
					showCorrections: false,
				},
				{
					id: aiMessageId,
					role: 'ai',
					dutch: '...',
					english: '',
					showTranslation: false,
					isStreaming: true,
				},
			])

			setIsLoadingAi(true)

			// STEP 2: Start grammar checking in background (non-blocking)
			checkGrammar(message)
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
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === userMessageId
								? {
										...msg,
										english: translation,
										corrections,
										correctedText,
										showCorrections: hasCorrections, // Show corrections by default if they exist
								  }
								: msg
						)
					)
				})
				.catch((error) => {
					console.error('[handleUserMessage] Error in grammar check:', error)
					// Update the message to indicate there was an error with grammar checking
					setMessages((prev) =>
						prev.map((msg) =>
							msg.id === userMessageId
								? {
										...msg,
										english: 'Could not check grammar',
										corrections: [],
										correctedText: undefined,
								  }
								: msg
						)
					)
				})

			// STEP 3: Get AI response (parallel to grammar checking)
			try {
				// Prepare the chat history for the API
				const chatHistory = [
					{
						role: 'system' as const,
						content: `You are a helpful assistant helping someone learn Dutch. The current topic is: ${currentTopic.title}.`,
					},
					...messages
						.filter((msg) => msg.role === 'user' || !msg.isStreaming)
						.map((msg) => ({
							role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
							content: msg.role === 'user' ? msg.dutch : msg.dutch,
						})),
					{
						role: 'user' as const,
						content: message,
					},
				]

				const apiUrl = `/api/chat/${encodeURIComponent(topicSlug)}`
				console.log('Making API request to:', apiUrl)

				// Track API call
				tracker.recordApiCall()

				const response = await fetch(apiUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						messages: chatHistory,
						topic: topicSlug,
						user_input: message,
					} as ChatApiRequest),
				})

				if (!response.ok) {
					const errorText = await response.text()
					console.error('API Error:', response.status, errorText)
					tracker.recordError(`API Error: ${response.status} ${errorText}`)
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				const data = await response.json()

				// Extract and store any new words from the response
				if (data.new_words?.length && validateAIWords(data.new_words)) {
					// Track words from AI
					tracker.recordWordsFromAI(data.new_words.length)

					setNewWords((prev) => {
						const existingWords = new Set(prev.map((word) => word.dutch))
						const uniqueNewWords = data.new_words.filter(
							(word: NewWord) => !existingWords.has(word.dutch)
						)
						return [...prev, ...uniqueNewWords]
					})

					// Also update conversation words with AI-provided words
					setConversationWords((prev) => {
						const existingWords = new Set(prev.map((word) => word.dutch))
						const uniqueNewWords = data.new_words.filter(
							(word: NewWord) => !existingWords.has(word.dutch)
						)
						return [...prev, ...uniqueNewWords]
					})
				} else {
					// Fallback: Use backup word processing if AI didn't provide words
					console.warn('AI did not provide valid new_words, using fallback processing')
					fallbackWordProcessing(message, data.ai_reply, data.translation)
						.then((words) => {
							tracker.recordFallbackUsed(words.length)
							if (words.length > 0) {
								setConversationWords((prev) => {
									const existingWords = new Set(prev.map((word) => word.dutch))
									const uniqueNewWords = words.filter((word) => !existingWords.has(word.dutch))
									return [...prev, ...uniqueNewWords]
								})
							}
						})
						.catch((error) => {
							tracker.recordError(`Fallback processing failed: ${error.message}`)
							console.error('Fallback word processing failed:', error)
						})
				}

				// STEP 4: Update the AI message with the response
				setMessages((prev) =>
					prev.map((msg) => {
						if (msg.id === aiMessageId) {
							const aiMessage = {
								...msg,
								dutch: data.ai_reply || data.dutch || 'Sorry, I could not generate a response.',
								english: data.translation || data.english || '',
								isStreaming: false,
								newWords: data.new_words || [],
							}
							console.log('Updating AI message:', aiMessage)
							return aiMessage
						}
						return msg
					})
				)

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
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === aiMessageId
							? {
									...msg,
									dutch: 'Sorry, er is een fout opgetreden bij het verwerken van je bericht.',
									english: 'Sorry, an error occurred while processing your message.',
									isStreaming: false,
							  }
							: msg
					)
				)

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
		[currentTopic, messages, topicSlug, checkGrammar, startMessage]
	)

	// Handle clicking on a suggestion - send directly without showing in input
	const handleSuggestionClick = useCallback(
		(suggestion: Suggestion) => {
			console.log('Suggestion clicked:', suggestion)
			if (!suggestion || !suggestion.dutch) {
				console.error('Invalid suggestion object:', suggestion)
				return
			}
			console.log('Sending suggestion as message:', suggestion.dutch)
			// Send the suggestion directly without updating the input field
			handleUserMessage(suggestion.dutch).catch((error) => {
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
				const welcomeMessage = {
					id: uuidv4(),
					role: 'ai' as const,
					dutch: extendedTopic.initialAiMessage.dutch,
					english: extendedTopic.initialAiMessage.english,
					showTranslation: false,
				}

				setMessages([welcomeMessage])

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
	}, [topicSlug])

	// Scroll to bottom of messages when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	if (isLoading) {
		return (
			<div className='flex items-center justify-center h-screen bg-slate-50'>
				<p className='text-slate-600'>Laden...</p>
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
			<div className='flex flex-col h-screen bg-slate-50'>
				{/* Header */}
				{/* <header className='sticky top-0 z-10 flex items-center h-16 p-4 bg-white shadow-sm'>
					<Button variant='ghost' size='icon' onClick={() => router.back()} className='mr-2'>
						<ArrowLeft className='w-5 h-5' />
					</Button>
					<h1 className='text-lg font-semibold'>{currentTopic?.title || 'Loading...'}</h1>
				</header> */}

				{/* Main content area */}
				<main className='container flex-1 pt-16 pb-32 mx-auto overflow-y-auto xl'>
					{/* Messages */}
					<div className='p-4 mb-40 space-y-4 sm:mb-24'>
						{messages.length === 0 ? (
							<div className='flex items-center justify-center h-full'>
								<p className='text-slate-500'>Start the conversation...</p>
							</div>
						) : (
							messages.map((message) => (
								<div
									key={message.id}
									className={`mb-4 ${
										message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
									}`}
								>
									<div className={`max-w-[95%] md:max-w-[60%] lg:max-w-[50%]`}>
										<div
											className={`flex items-center gap-2 mb-1 ${
												message.role === 'user' ? 'justify-end' : 'justify-start'
											}`}
										>
											<span className='text-xs font-medium text-slate-500'>
												{message.role === 'user' ? 'You' : 'Dutch Assistant'}
											</span>
										</div>
										<div
											className={`relative px-2 py-3 rounded-2xl shadow-sm ${
												message.role === 'user'
													? 'bg-blue-500 text-white rounded-br-md'
													: 'bg-white border border-slate-100 text-slate-800 rounded-bl-md'
											}`}
										>
											<div className='flex flex-col items-start justify-between gap-2 align-end '>
												<p className='flex-1 leading-relaxed'>{message.dutch}</p>
												<div className='flex items-center justify-end w-full gap-1 ml-2'>
													<button
														onClick={() =>
															handlePlayAudio(`${message.id}-dutch`, message.dutch, 'nl-NL')
														}
														className={`p-1.5 rounded-full hover:bg-opacity-20 transition-colors ${
															message.role === 'user'
																? 'hover:bg-white text-white opacity-90 hover:opacity-100'
																: 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
														} `}
														title='Play Dutch audio'
													>
														{audioPlaying === `${message.id}-dutch` ? (
															<VolumeX className='w-3.5 h-3.5' />
														) : (
															<Volume2 className='w-3.5 h-3.5' />
														)}
													</button>
													{message.english && (
														<button
															onClick={() => toggleTranslation(message.id)}
															className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
																message.role === 'user'
																	? 'hover:bg-white hover:bg-opacity-20 text-white opacity-90 hover:opacity-100'
																	: 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
															}`}
															title='Toggle translation'
														>
															EN
														</button>
													)}
													{message.role === 'user' &&
														message.corrections &&
														message.corrections.length > 0 && (
															<button
																onClick={() => toggleCorrections(message.id)}
																className='px-2 py-1 text-xs font-medium text-white transition-colors rounded-full hover:bg-white hover:bg-opacity-20 opacity-90 hover:opacity-100'
																title='Toggle corrections'
															>
																✓
															</button>
														)}
												</div>
											</div>
											{message.showTranslation && message.english && (
												<div
													className={`mt-3 pt-2 text-sm border-t ${
														message.role === 'user'
															? 'border-blue-400 border-opacity-30'
															: 'border-slate-100'
													}`}
												>
													<div className='flex items-start justify-between gap-2'>
														<p
															className={`flex-1 leading-relaxed ${
																message.role === 'user' ? 'text-blue-100' : 'text-slate-600'
															}`}
														>
															{message.english}
														</p>
														{message.english && (
															<button
																onClick={() =>
																	handlePlayAudio(`${message.id}-english`, message.english, 'en-US')
																}
																className={`p-1 rounded-full transition-colors flex-shrink-0 ${
																	message.role === 'user'
																		? 'hover:bg-white hover:bg-opacity-20 text-blue-100 hover:text-white'
																		: 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
																}`}
																title='Play English audio'
															>
																{audioPlaying === `${message.id}-english` ? (
																	<VolumeX className='w-3 h-3' />
																) : (
																	<Volume2 className='w-3 h-3' />
																)}
															</button>
														)}
													</div>
												</div>
											)}
											{message.role === 'user' &&
												message.showCorrections &&
												message.corrections &&
												message.corrections.length > 0 && (
													<div className='pt-2 mt-3 text-sm border-t border-blue-400 border-opacity-30'>
														<p className='mb-2 font-medium text-blue-100'>Corrections:</p>
														{message.correctedText && (
															<div className='p-2 mb-2 bg-blue-400 rounded-lg bg-opacity-20'>
																<span className='font-medium text-blue-100'>Corrected: </span>
																<span className='text-blue-50'>{message.correctedText}</span>
															</div>
														)}
														<div className='space-y-2'>
															{message.corrections.map((correction, index) => (
																<div
																	key={index}
																	className='p-2 text-xs bg-blue-400 rounded-lg bg-opacity-20'
																>
																	<div className='flex items-center gap-2 mb-1'>
																		<span className='text-blue-200 line-through opacity-75'>
																			{correction.original}
																		</span>
																		<span className='text-blue-100'>→</span>
																		<span className='font-medium text-blue-50'>
																			{correction.corrected}
																		</span>
																	</div>
																	{correction.explanation && (
																		<p className='mt-1 leading-relaxed text-blue-100'>
																			{correction.explanation}
																		</p>
																	)}
																</div>
															))}
														</div>
													</div>
												)}
										</div>
									</div>
								</div>
							))
						)}
						<div ref={messagesEndRef} />
					</div>
				</main>

				{/* Fixed bottom area */}
				<div className='fixed bottom-0 left-0 right-0 z-10 flex flex-col gap-4 py-4 bg-white border-t border-slate-200'>
					{/* Suggestions */}
					<div className='container flex flex-col items-center justify-between gap-2 xl sm:flex-row '>
						{currentSuggestions.length > 0 && (
							<div className='container px-0 py-3 mx-auto bg-white border-slate-200 xl '>
								<div className='w-full'>
									<div className='flex flex-wrap gap-2 px-0'>
										{currentSuggestions.map((suggestion, index) => (
											<button
												key={index}
												onClick={(e) => {
													e.preventDefault()
													handleSubmit(undefined, suggestion.dutch)
												}}
												className='px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors whitespace-nowrap flex-shrink-0'
											>
												{suggestion.dutch}
											</button>
										))}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Input area */}
					<div className='container flex flex-col gap-2 mx-auto xl'>
						<form onSubmit={handleSubmit} className='flex gap-2'>
							<div className='relative flex-1'>
								<input
									ref={inputRef}
									type='text'
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									placeholder={voiceRecording.isRecording && isMobile ? '' : 'Type your message in Dutch...'}
									className='w-full px-4 py-2 border rounded-lg outline-none border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
									disabled={isLoadingAi}
								/>
								{voiceRecording.isRecording && (
									<div className='absolute flex items-center gap-1 transform -translate-y-1/2 right-3 top-1/2'>
										<div className='w-2 h-2 bg-red-500 rounded-full animate-pulse'></div>
										<span className='text-xs font-medium text-red-500'>Recording...</span>
									</div>
								)}
							</div>
							<Button
								type='submit'
								disabled={!inputValue.trim() || isLoadingAi}
								className='text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
								size='icon'
							>
								<Send className='w-4 h-4' />
							</Button>
							<Button
								type='button'
								variant={voiceRecording.isRecording ? 'default' : 'outline'}
								size='icon'
								onClick={handleVoiceInput}
								disabled={isLoadingAi || !voiceRecording.isSupported}
								className={`${
									voiceRecording.isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''
								}`}
								title={voiceRecording.isRecording ? 'Stop recording' : 'Start voice recording'}
							>
								<Mic className={`w-4 h-4 ${voiceRecording.isRecording ? 'text-white' : ''}`} />
							</Button>
						</form>
						<button
							onClick={(e) => {
								e.preventDefault()
								setReviewModalOpen(true)
							}}
							className='flex items-center justify-center w-full gap-2 px-2 py-2 text-sm font-normal text-blue-500 transition-colors duration-200 bg-white border border-blue-300 rounded hover:bg-blue-50 '
						>
							<BookOpen className='w-6 h-4' />
							<span className='text-xs sm:text-base'>End the chat and review new words</span>
						</button>
					</div>

					{/* Review Words Button */}

					<ReviewWordsModal
						isOpen={isReviewModalOpen}
						onClose={() => setReviewModalOpen(false)}
						words={[...new Set([...newWords, ...conversationWords])]}
					/>
					<Toaster />
				</div>
			</div>
		</>
	)
}

