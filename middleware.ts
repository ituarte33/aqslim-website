import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/contact',
  '/api/webhooks/(.*)',
  '/onboarding',
  '/signed-out',
  '/fast(.*)',
  '/my-aqslim/login(.*)',
])

const isPatientPortalRoute = createRouteMatcher(['/my-aqslim(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPatientPortalRoute(req) && !isPublicRoute(req)) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.redirect(new URL('/my-aqslim/login', req.url))
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
