import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConvexClientProvider } from '@/components/convex-client-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'Dutch Chat App',
	description: 'Practice Dutch conversations with an AI partner',
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<ConvexClientProvider>
			<html lang='en' className='h-full'>
				<body className={`${inter.className} min-h-screen bg-white`}>{children}</body>
			</html>
		</ConvexClientProvider>
	)
}

