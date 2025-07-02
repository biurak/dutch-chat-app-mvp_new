import Google from '@auth/core/providers/google'
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server'
import { query, type QueryCtx } from './_generated/server'
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [Google],
})

export const currentUser = query({
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx)
		if (!userId) {
			return null
		}
		const user = await ctx.db.get(userId)
		if (!user || !user.name || !user._id) {
			return null
		}
		return { name: user.name || 'User', email: user.email || '', id: user._id }
	},
})
