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

function isOperationalRoute(pathname: string) {
  if (pathname === '/dashboard/plan-preview' || pathname.startsWith('/dashboard/plan-preview/')) {
    return false
  }

  return pathname === '/dashboard'
    || pathname.startsWith('/dashboard/')
    || pathname === '/food-scanner'
    || pathname.startsWith('/food-scanner/')
}

export default clerkMiddleware(async (auth, req) => {
  if (process.env.VERCEL_ENV === 'preview' && isOperationalRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard/plan-preview', req.url))
  }

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
