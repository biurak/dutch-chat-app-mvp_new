'use client'

import { useState, useEffect } from 'react'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
	type CarouselApi,
} from '@/components/ui/carousel'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
	MessageSquareText,
	Mic,
	BookOpen,
	Sparkles,
	BrainCircuit,
	Keyboard,
	LifeBuoy,
	XCircle,
	ClipboardCopy,
	Rocket,
	TrendingUp,
	ExternalLink,
	Lightbulb,
	SpellCheck,
	HelpCircle,
	Volume2,
	Ear,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DialogTitle } from '@radix-ui/react-dialog'

interface OnboardingModalProps {
	isOpen: boolean
	onClose: () => void
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
	const [api, setApi] = useState<CarouselApi>()
	const [current, setCurrent] = useState(0)
	const [count, setCount] = useState(0)

	useEffect(() => {
		console.log('api', api)

		if (!api) {
			return
		}
		setCount(api?.scrollSnapList()?.length)
		setCurrent(api?.selectedScrollSnap())

		api.on('select', () => {
			setCurrent(api?.selectedScrollSnap())
		})
	}, [api])

	const slides = [
		{
			icon: MessageSquareText,
			title: 'Welcome to Dutch Chat!',
			points: [
				{
					icon: Sparkles,
					text: 'Your personal AI partner for mastering real-world Dutch conversations.',
				},
			],
		},
		{
			icon: Mic,
			title: 'Practice Your Way',
			points: [
				{ icon: Mic, text: 'Speak your mind by recording your voice.' },
				{ icon: LifeBuoy, text: 'Use our suggestions if you ever feel stuck.' },
				{
					icon: Keyboard,
					text: "Type your own custom replies freely if you don't feel like recording yourself at the moment!",
				},
			],
		},
		{
			icon: Lightbulb,
			title: 'Get Instant Feedback',
			points: [
				{ icon: SpellCheck, text: 'Receive gentle corrections on grammar and spelling.' },
				{ icon: HelpCircle, text: 'Understand *why* with simple tips and explanations.' },
				{ icon: TrendingUp, text: 'Build confidence with every message you send.' },
			],
		},
		{
			icon: Volume2,
			title: 'Hear It Aloud',
			points: [
				{ icon: Volume2, text: 'Tap the speaker icon on any AI message to hear it.' },
				{ icon: Ear, text: 'Listen to the correct pronunciation and intonation.' },
				{ icon: MessageSquareText, text: 'Improve your listening skills alongside your speaking.' },
			],
		},
		{
			icon: BookOpen,
			title: 'Review and Memorise New Words',
			points: [
				{ icon: BookOpen, text: 'After each chat, review potential new words.' },
				{ icon: XCircle, text: 'Easily remove words you already know.' },
				{ icon: ClipboardCopy, text: 'Get a clean list, ready to be copied.' },
			],
		},
		{
			icon: BrainCircuit,
			title: 'Create Flashcards Instantly',
			points: [
				{ icon: BrainCircuit, text: 'Each word comes with a real example sentence.' },
				{ icon: ExternalLink, text: 'Export your list to Quizlet with zero effort.' },
				{ icon: TrendingUp, text: 'This technique boosts memory and makes learning stick!' },
			],
		},
		{
			icon: Rocket,
			title: "You're All Set!",
			points: [
				{
					icon: Sparkles,
					text: 'Ready to start your first conversation and build your Dutch confidence?',
				},
			],
		},
	]
	const onClickNext = () => {
		if (current < slides.length - 1) {
			api?.scrollNext()
		} else {
			onClose()
		}
	}
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
      {/* This is hidden but needed for error in the console */}
      <DialogTitle className='hidden'> - </DialogTitle> 
			<DialogContent className='sm:max-w-md w-full p-0 border-0 flex flex-col h-full sm:h-auto'>
				<div className='p-6 flex flex-col items-center text-center flex-grow justify-center'>
					<Carousel setApi={setApi} className='w-full'>
						<CarouselContent>
							{slides.map((slide, index) => {
								const MainIcon = slide.icon as LucideIcon
								return (
									<CarouselItem key={index}>
										<div className='flex flex-col items-center justify-center p-4 min-h-[300px]'>
											<MainIcon className='w-12 h-12 text-primary mb-4' />
											<h3 className='text-2xl font-bold mb-6 text-slate-800'>{slide.title}</h3>
											<div className='space-y-4 text-left w-full max-w-xs'>
												{slide.points.map((point, pIndex) => {
													const PointIcon = point.icon as LucideIcon
													return (
														<div key={pIndex} className='flex items-start gap-4'>
															<div className='flex-shrink-0 w-6 h-6 mt-1'>
																<PointIcon className='w-6 h-6 text-primary/80' />
															</div>
															<p className='text-muted-foreground'>{point.text}</p>
														</div>
													)
												})}
											</div>
										</div>
									</CarouselItem>
								)
							})}
						</CarouselContent>
						<CarouselPrevious className='hidden sm:flex' />
						<CarouselNext className='hidden sm:flex' />
					</Carousel>
				</div>
				<div className='p-6 border-t bg-slate-50'>
					<div className='py-2 flex justify-center gap-2 mb-4'>
						{Array.from({ length: count }).map((_, index) => (
							<div
								key={index}
								className={`h-2 w-2 rounded-full transition-colors ${
									index === current ? 'bg-primary' : 'bg-primary/20'
								}`}
							/>
						))}
					</div>

					<Button onClick={onClickNext} size='lg' className='w-full'>
						{current === slides.length - 1 ? "Let's Start!" : 'Next'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

