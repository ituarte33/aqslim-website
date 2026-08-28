import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { requireActor } from '@/lib/auth'
import { buildSyntheticPersonalizationPlans } from '@/lib/nutrition/preview'
import { JING_COMPLETION_COMPONENTS, JING_RECIPE_VARIANTS } from '@/lib/nutrition/fixtures'
import { PlanPreviewClient } from './plan-preview-client'

export default async function PlanPreviewPage() {
  const actor = await requireActor()
  if (actor.role !== 'admin') redirect('/dashboard')

  const user = await currentUser()
  return (
    <PlanPreviewClient
      user={user ? { firstName: user.firstName, lastName: user.lastName } : null}
      plans={buildSyntheticPersonalizationPlans()}
      recipeVariantCount={JING_RECIPE_VARIANTS.length}
      componentCount={JING_COMPLETION_COMPONENTS.length}
    />
  )
}
