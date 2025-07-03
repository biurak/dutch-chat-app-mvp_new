/**
 * Chat Input Form Component
 * 
 * A reusable UI component that handles user input for the Dutch chat application.
 * Combines text input, voice recording, and additional action buttons in one unified interface.
 * 
 * Key Features:
 * - Text input field with Dutch placeholder text
 * - Voice recording button with visual feedback (recording indicator)
 * - Send button with loading state management
 * - "Review Words" button to end chat and view learned vocabulary
 * - Responsive design for mobile and desktop
 * - Integration with voice recognition and form submission
 * 
 * @param inputValue - Current text input value
 * @param setInputValue - Function to update input value
 * @param onSubmit - Form submission handler
 * @param isLoadingAi - Loading state to disable inputs during AI processing
 * @param voiceRecording - Voice recording hook object with state and controls
 * @param onVoiceInput - Callback to start/stop voice recording
 * @param isMobile - Mobile detection for conditional UI behavior
 * @param inputRef - React ref for the input element
 * @param onReviewModalOpen - Callback to open the word review modal
 */

import { Button } from '@/components/ui/button'
import { BookOpen, Mic, Send } from 'lucide-react'

interface VoiceRecording {
	isSupported: boolean
	isRecording: boolean
	transcript: string
	// other voice recording methods...
}

interface ChatInputFormProps {
	inputValue: string
	setInputValue: (value: string) => void
	onSubmit: (e?: React.FormEvent, messageText?: string) => void
	isLoadingAi: boolean
	voiceRecording: VoiceRecording
	onVoiceInput: () => void
	isMobile: boolean
	inputRef: React.RefObject<HTMLInputElement | null>
	onReviewModalOpen: () => void
}

export function ChatInputForm({ 
	inputValue, 
	setInputValue, 
	onSubmit, 
	isLoadingAi, 
	voiceRecording, 
	onVoiceInput, 
	isMobile,
	inputRef,
	onReviewModalOpen
}: ChatInputFormProps) {
	return (
		<div className='container flex flex-col gap-2 mx-auto xl'>
			<form onSubmit={onSubmit} className='flex gap-2'>
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
					onClick={onVoiceInput}
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
					onReviewModalOpen()
				}}
				className='flex items-center justify-center w-full gap-2 px-2 py-2 text-sm font-normal text-blue-500 transition-colors duration-200 bg-white border border-blue-300 rounded hover:bg-blue-50 '
			>
				<BookOpen className='w-6 h-4' />
				<span className='text-xs sm:text-base'>End the chat and review new words</span>
			</button>
		</div>
	)
}
