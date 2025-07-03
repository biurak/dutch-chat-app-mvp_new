/**
 * Chat Message Component
 * 
 * A reusable UI component that renders individual chat messages in the Dutch chat application.
 * Supports both user and AI messages with rich interactive features.
 * 
 * Key Features:
 * - Displays Dutch text with optional English translations
 * - Audio playback for both Dutch and English text (TTS)
 * - Grammar corrections display for user messages
 * - Translation toggle functionality
 * - Responsive design with different styling for user vs AI messages
 * - Visual indicators for audio playback state
 * 
 * @param message - The message object containing text, role, and metadata
 * @param audioPlaying - Currently playing audio message ID for state management
 * @param onPlayAudio - Callback to handle text-to-speech playback
 * @param onToggleTranslation - Callback to show/hide English translations
 * @param onToggleCorrections - Callback to show/hide grammar corrections
 */

import { Volume2, VolumeX } from 'lucide-react'
import type { NewWord, Message, Correction } from '@/lib/topics'

interface ChatMessageProps {
	message: Message
	audioPlaying: string | null
	onPlayAudio: (messageId: string, text: string, language: 'nl-NL' | 'en-US') => void
	onToggleTranslation: (messageId: string) => void
	onToggleCorrections: (messageId: string) => void
}

export function ChatMessage({ 
	message, 
	audioPlaying, 
	onPlayAudio, 
	onToggleTranslation, 
	onToggleCorrections 
}: ChatMessageProps) {
	return (
		<div
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
									onPlayAudio(`${message.id}-dutch`, message.dutch, 'nl-NL')
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
									onClick={() => onToggleTranslation(message.id)}
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
										onClick={() => onToggleCorrections(message.id)}
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
											onPlayAudio(`${message.id}-english`, message.english, 'en-US')
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
	)
}
