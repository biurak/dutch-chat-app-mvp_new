'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ChatClient from './chat-client'

import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function ChatPage() {
	const params = useParams()
	const [isClient, setIsClient] = useState(false)
	const topicSlug = params?.topic
		? Array.isArray(params.topic)
			? params.topic[0]
			: params.topic
		: ''

	// Ensure this only runs on the client
	useEffect(() => {
		setIsClient(true)
	}, [])

	if (!isClient) {
		return (
			<div className='flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4'>
				<div className='animate-pulse space-y-4 w-full max-w-md text-center'>
					<div className='h-6 bg-slate-200 rounded w-3/4 mx-auto'></div>
					<div className='h-4 bg-slate-200 rounded w-1/2 mx-auto'></div>
				</div>
			</div>
		)
	}

	return (
		<Suspense
			fallback={
				<div className='flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4'>
					<div className='animate-pulse space-y-4 w-full max-w-md text-center'>
						<div className='h-6 bg-slate-200 rounded w-3/4 mx-auto'></div>
						<div className='h-4 bg-slate-200 rounded w-1/2 mx-auto'></div>
					</div>
				</div>
			}
		>
			<ChatClient topicSlug={topicSlug} />
		</Suspense>
	)
}

