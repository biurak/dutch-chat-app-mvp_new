'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { MessageSquareText, User, LogOut, Settings } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser } from '@/hooks/use-current-user'

export function Navbar() {
	const { signOut } = useAuthActions()
	// const { isAuthenticated, isLoading } = useConvexAuth()
	const { isLoading, isAuthenticated, user } = useCurrentUser()
	const handleSignOut = async () => {
		await signOut()
	}

	// Don't render anything while loading
	if (isLoading) {
		return (
			<nav className='sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md'>
				<div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
					<Link
						href='/'
						className='flex items-center space-x-3 text-slate-800 hover:text-primary transition-colors duration-200'
					>
						<MessageSquareText className='h-8 w-8 text-primary' />
						<span className='text-xl font-bold tracking-tight'>Dutch Chat</span>
					</Link>
					<div className='w-10 h-10' /> {/* Placeholder for loading */}
				</div>
			</nav>
		)
	}

	return (
		<nav className='sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md'>
			<div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
				{/* Logo Section */}
				<Link
					href='/'
					className='flex items-center space-x-3 text-slate-800 hover:text-primary transition-colors duration-200'
				>
					<MessageSquareText className='h-8 w-8 text-primary' />
					<span className='text-xl font-bold tracking-tight'>Dutch Chat</span>
				</Link>

				{/* Right Section - User Menu or Sign In */}
				<div className='flex items-center'>
					{isAuthenticated ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant='ghost'
									className='relative h-10 w-10 rounded-full hover:bg-slate-100/80 transition-colors duration-200'
								>
									<Avatar className='h-9 w-9'>
										<AvatarFallback className='bg-primary/10 text-primary font-medium text-sm'>
											{user?.name?.charAt(0).toUpperCase() || 'U'}
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end' className='w-56'>
								<DropdownMenuLabel className='font-normal'>
									<div className='flex flex-col space-y-1'>
										<p className='text-sm font-medium leading-none'>{user?.name || 'User Name'}</p>
										<p className='text-xs leading-none text-muted-foreground'>
											{user?.email || ''}
										</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />

								<DropdownMenuSeparator />
								<DropdownMenuItem
									className='cursor-pointer text-red-600 focus:text-red-600'
									onClick={handleSignOut}
								>
									<LogOut className='mr-2 h-4 w-4' />
									<span>Sign out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							asChild
							variant='ghost'
							className='text-slate-700 hover:text-primary hover:bg-slate-100/80 transition-colors duration-200'
						>
							<Link href='/sign-in'>Sign In</Link>
						</Button>
					)}
				</div>
			</div>
		</nav>
	)
}
