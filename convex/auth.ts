import Google from '@auth/core/providers/google'
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server'
import { query, type QueryCtx } from './_generated/server'
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
})





export const loggedInUser = query({
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx)
		if (!userId) {
			return null
		}
		const user = await ctx.db.query('users').first()
		if (!user) {
			return null
		}
		return user
	},
})
