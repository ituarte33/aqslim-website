import fs from 'fs'
import path from 'path'
import { HomeScripts } from './home-scripts'

export default function HomePage() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

  // Extract body content
  const bodyOpenEnd = html.indexOf('>', html.indexOf('<body')) + 1
  const bodyCloseStart = html.lastIndexOf('</body>')
  const bodyContent = html.slice(bodyOpenEnd, bodyCloseStart)

  // Remove script tags — all interactivity is handled by HomeScripts
  const cleanContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '')

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: cleanContent }} />
      <HomeScripts />
    </>
  )
}
