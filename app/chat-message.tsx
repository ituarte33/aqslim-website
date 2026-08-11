import type { ReactNode } from 'react'

type ChatMessageProps = {
  content: string
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    return <span key={key}>{part}</span>
  })
}

function isBlockStart(line: string) {
  return /^(#{1,3})\s+/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)
}

export function ChatMessage({ content }: ChatMessageProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()

    if (!line) {
      index += 1
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      blocks.push(<h3 key={`heading-${index}`}>{renderInline(heading[2], `heading-${index}`)}</h3>)
      index += 1
      continue
    }

    const unordered = /^[-*]\s+/.test(line)
    const ordered = /^\d+\.\s+/.test(line)
    if (unordered || ordered) {
      const items: ReactNode[] = []
      const pattern = unordered ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/

      while (index < lines.length) {
        const match = lines[index].trim().match(pattern)
        if (!match) break
        items.push(<li key={`item-${index}`}>{renderInline(match[1], `item-${index}`)}</li>)
        index += 1
      }

      blocks.push(unordered
        ? <ul key={`list-${index}`}>{items}</ul>
        : <ol key={`list-${index}`}>{items}</ol>)
      continue
    }

    const paragraph: string[] = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index].trim())) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInline(paragraph.join(' '), `paragraph-${index}`)}</p>)
  }

  return <div className="aqb-rich-text">{blocks}</div>
}
