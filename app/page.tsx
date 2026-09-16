import fs from 'fs'
import path from 'path'
import { HomeContent } from './home-content'

export default async function HomePage() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

  const bodyOpenEnd = html.indexOf('>', html.indexOf('<body')) + 1
  const bodyCloseStart = html.lastIndexOf('</body>')
  const bodyContent = html.slice(bodyOpenEnd, bodyCloseStart)
  const cleanContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '')

  // Preview navigation may be opened from unique Vercel deployment hostnames where
  // the Clerk session cookie is not shared with the stable branch alias. Keep the
  // Clinic entry visible throughout Preview; /clinic-preview remains access-controlled.
  const showClinic = process.env.VERCEL_ENV === 'preview'

  return <HomeContent html={cleanContent} showClinic={showClinic} />
}
