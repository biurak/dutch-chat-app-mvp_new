import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

export function useCurrentUser() {
	const { isLoading, isAuthenticated } = useConvexAuth()

	// Only run the query if authenticated
	const user = useQuery(api.auth.currentUser)

	return {
		isLoading: isLoading || (isAuthenticated && user === null),
		isAuthenticated: isAuthenticated && user !== null,
		user: user || null,
	}
}
