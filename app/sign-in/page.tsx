'use client'
import { useAuthActions } from '@convex-dev/auth/react'
import { GoogleLogo } from '@/components/GoogleLogo'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { MessageSquareText } from 'lucide-react'
import { useState } from 'react'

export default function SignInPage() {
	const { signIn } = useAuthActions()
	const [isLoading, setIsLoading] = useState(false)

	const handleSignIn = async () => {
		setIsLoading(true)
		try {
			await signIn('google', { redirectTo: '/' })
		} catch (error) {
			console.error('Sign in error:', error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-sky-100 p-4">
			{/* Sign In Card */}
			<Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
				<CardHeader className="text-center space-y-4 pb-6">
					<CardTitle className="text-2xl font-semibold text-slate-800">
						Welcome Back
					</CardTitle>
					<CardDescription className="text-base text-slate-600">
						Sign in to continue practicing your Dutch conversations
					</CardDescription>
				</CardHeader>
				
				<CardContent className="space-y-6">
					<Button
						className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-slate-700 border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
						variant="outline"
						type="button"
						onClick={handleSignIn}
						disabled={isLoading}
					>
						{isLoading ? (
							<div className="flex items-center">
								<div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mr-3" />
								Signing in...
							</div>
						) : (
							<>
								<GoogleLogo className="mr-3 h-5 w-5" />
								Continue with Google
							</>
						)}
					</Button>
					
					<div className="text-center">
						<p className="text-sm text-slate-500">
							By signing in, you agree to practice Dutch and have fun! 🇳🇱
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Footer */}
			<div className="mt-12 text-center">
				<p className="text-sm text-slate-500">
					Ready to improve your Dutch conversation skills?
				</p>
			</div>
		</div>
	)
}
