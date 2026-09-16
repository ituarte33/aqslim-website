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
const MYAQ_CLINIC_PREVIEW_BRANCH = 'myaq-ent-p5-1-extended-ai-live-canary'

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
  const isRecipePreview = process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === 'myaq-rec-001-preview-010'

  const isClinicPreview = process.env.VERCEL_ENV === 'preview'
    && process.env.VERCEL_GIT_COMMIT_REF === MYAQ_CLINIC_PREVIEW_BRANCH

  // This branch is now the working AQSLIM Clinic Preview. Opening a Vercel
  // deployment at its root should take the Founder directly into Clinic instead
  // of requiring a manual /clinic-preview path edit. Production is unchanged.
  if (isClinicPreview && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/clinic-preview', req.url))
  }

  if (isRecipePreview && isOperationalRoute(req.nextUrl.pathname)) {
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
