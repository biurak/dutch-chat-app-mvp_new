import { useConvexAuth, useQuery } from 'convex/react'
import { api, fullApi } from '../convex/_generated/api'

export function useCurrentUser() {
	const { isLoading, isAuthenticated } = useConvexAuth()

	// Only run the query if authenticated
	const user = useQuery(api.auth.loggedInUser)
	console.log('useCurrentUser', { isLoading, isAuthenticated, user })

	return {
		isLoading: isLoading || (isAuthenticated && user === null),
		isAuthenticated: isAuthenticated && user !== null,
		user: user || null,
	}
}
