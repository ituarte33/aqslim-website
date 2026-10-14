import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireActor } from '@/lib/auth'
import { buildSyntheticPersonalizationPlans } from '@/lib/nutrition/preview'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '@/lib/nutrition/fixtures'
import { canReviewSyntheticPreview } from '@/lib/nutrition/synthetic-preview-policy'
import { PlanPreviewClient } from './plan-preview-client'

export default async function PlanPreviewPage() {
  const actor = await requireActor()
  const canReview = canReviewSyntheticPreview({
    role: actor.role,
    email: actor.email,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      MYAQ_PREVIEW_REVIEWER_EMAILS: process.env.MYAQ_PREVIEW_REVIEWER_EMAILS,
    },
  })
  if (!canReview) redirect('/dashboard')

  const user = await currentUser()
  return (
    <PlanPreviewClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      plans={buildSyntheticPersonalizationPlans()}
      recipes={JING_RECIPE_VARIANTS}
      components={JING_COMPLETION_COMPONENTS}
      recipeVariantCount={JING_RECIPE_VARIANTS.length}
      componentCount={JING_COMPLETION_COMPONENTS.length}
    />
  )
}
