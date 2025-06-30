import {
	convexAuthNextjsMiddleware,
	createRouteMatcher,
	nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'

const isSignInPage = createRouteMatcher(['/sign-in'])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {

  console.log("isAuthenticated", (await convexAuth.isAuthenticated()));
  
	if (await convexAuth.isAuthenticated()) {
		return nextjsMiddlewareRedirect(request, '/')
	}

	if (!isSignInPage(request) && !(await convexAuth.isAuthenticated())) {
		return nextjsMiddlewareRedirect(request, '/sign-in')
	}
})

export const config = {
	// The following matcher runs middleware on all routes
	// except static assets.
	matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
