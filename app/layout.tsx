import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import { ConvexClientProvider } from '@/components/convex-client-provider'
import { Navbar } from '@/components/navigation/navbar'

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
		<html lang='en' className='h-full'>
			<head>
				<meta charSet='UTF-8' />
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<meta name='theme-color' content='#ffffff' />
				<link rel='icon' href='/favicon.ico' />
				<link rel='apple-touch-icon' sizes='180x180' href='/apple-touch-icon.png'></link>
				<link rel='icon' type='image/png' sizes='32x32' href='/favicon-32x32.png'></link>
				<link rel='icon' type='image/png' sizes='16x16' href='/favicon-16x16.png'></link>
				<link rel='manifest' href='/site.webmanifest'></link>
			</head>
			<ConvexAuthNextjsServerProvider>
				<body className={`${inter.className}  bg-white`}>
					<ConvexClientProvider>
						<Navbar />
						{children}
					</ConvexClientProvider>
				</body>
			</ConvexAuthNextjsServerProvider>
		</html>
	)
}

