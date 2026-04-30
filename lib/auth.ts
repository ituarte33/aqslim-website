import { currentUser } from '@clerk/nextjs/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

export async function getRole(): Promise<'admin' | 'patient'> {
  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase() ?? ''
  return ADMIN_EMAILS.includes(email) ? 'admin' : 'patient'
}

export async function getUserEmail(): Promise<string | null> {
  const user = await currentUser()
  return user?.emailAddresses[0]?.emailAddress ?? null
}
