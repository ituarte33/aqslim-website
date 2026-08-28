import { buildGuidedPlan } from './assembler'
import {
  JING_COMPLETION_COMPONENTS,
  JING_RECIPE_VARIANTS,
  SYNTHETIC_GUIDED_PROFILE,
  SYNTHETIC_PERSONALIZATION_PROFILES,
} from './fixtures'

export function buildSyntheticGuidedPlan() {
  return buildSyntheticPersonalizationPlan(SYNTHETIC_GUIDED_PROFILE.id)
}

export function buildSyntheticPersonalizationPlan(profileId?: string) {
  const profile = SYNTHETIC_PERSONALIZATION_PROFILES.find(item => item.id === profileId)
    ?? SYNTHETIC_GUIDED_PROFILE
  return buildGuidedPlan({
    profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  })
}

export function buildSyntheticPersonalizationPlans() {
  return SYNTHETIC_PERSONALIZATION_PROFILES.map(profile => buildGuidedPlan({
    profile,
    recipes: JING_RECIPE_VARIANTS,
    components: JING_COMPLETION_COMPONENTS,
  }))
}
