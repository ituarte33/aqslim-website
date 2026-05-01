import fs from 'fs'
import path from 'path'
import { HomeContent } from './home-content'

export default function HomePage() {
  const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')

  const bodyOpenEnd = html.indexOf('>', html.indexOf('<body')) + 1
  const bodyCloseStart = html.lastIndexOf('</body>')
  const bodyContent = html.slice(bodyOpenEnd, bodyCloseStart)
  const cleanContent = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '')

  return <HomeContent html={cleanContent} />
}
