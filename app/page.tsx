import fs from 'fs'
import path from 'path'
import { HomeContent } from './home-content'
import { getUserEmail } from '@/lib/auth'
import { isP5FounderCanaryIdentity } from '@/lib/p5-founder-canary-policy'

export default async function HomePage() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

  const bodyOpenEnd = html.indexOf('>', html.indexOf('<body')) + 1
  const bodyCloseStart = html.lastIndexOf('</body>')
  const bodyContent = html.slice(bodyOpenEnd, bodyCloseStart)
  const cleanContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '')

  const email = await getUserEmail()
  const showClinic = Boolean(email) && isP5FounderCanaryIdentity({
    email: email as string,
    environment: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
      MYAQ_P5_FOUNDER_CANARY: process.env.MYAQ_P5_FOUNDER_CANARY,
    },
  })

  return <HomeContent html={cleanContent} showClinic={showClinic} />
}
