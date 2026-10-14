export type DemoProfileOption = {
  id: string
  firstName: string
  calorieTarget: number
}

export function firstProfileParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function demoProfilePath(path: string, demo: boolean, profileId?: string) {
  if (!demo || !profileId) return path
  return `${path}?profile=${encodeURIComponent(profileId)}`
}
