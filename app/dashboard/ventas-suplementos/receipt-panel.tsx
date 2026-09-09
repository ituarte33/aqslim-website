'use client'

import { useEffect, useRef, useState } from 'react'
import { supplementReceiptLines, type SupplementSaleReceipt } from '../../../lib/supplement-sales'
import { receiptEmailAvailability, sendReceiptEmail } from './receipt-actions'
import { receiptHtml, receiptPdf } from './receipt-document'

export function ReceiptPanel({ receipt }: { receipt: SupplementSaleReceipt }) {
  const [email, setEmail] = useState({ available: false, reason: 'Verificando email del cliente…' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const busy = useRef(false)
  const [feedback, setFeedback] = useState('')
  useEffect(() => {
    let active = true
    receiptEmailAvailability(receipt.id).then(result => { if (active) setEmail(result) }).catch(() => {
      if (active) setEmail({ available: false, reason: 'No se pudo verificar el email del cliente.' })
    })
    return () => { active = false }
  }, [receipt.id])

  function print() {
    const frame = document.createElement('iframe')
    frame.title = 'Imprimir recibo AQSLIM'
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;'
    frame.onload = () => {
      const target = frame.contentWindow
      if (!target) { frame.remove(); setFeedback('No se pudo abrir la impresión.'); return }
      target.addEventListener('afterprint', () => frame.remove(), { once: true })
      target.focus()
      target.print()
    }
    frame.srcdoc = receiptHtml(receipt)
    document.body.appendChild(frame)
  }
  async function download() {
    try {
      const blob = new Blob([receiptPdf(receipt) as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `AQSLIM-Recibo-${receipt.id.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setFeedback('No se pudo descargar el PDF. Intenta nuevamente.') }
  }
  async function emailReceipt() {
    if (busy.current || sent || !email.available) return
    busy.current = true
    setSending(true)
    try {
      const result = await sendReceiptEmail(receipt.id)
      setFeedback(result.message)
      if (result.ok) setSent(true)
    } catch { setFeedback('No se pudo enviar el recibo. La venta sigue guardada. Puedes volver a intentar.') }
    finally { busy.current = false; setSending(false) }
  }
  return <section aria-label="Recibo de venta" className="supplement-receipt">
    <h2>AQSLIM</h2><p>Recibo {receipt.id}</p><p>{receipt.fecha} · {receipt.metodoPago}</p>
    {receipt.items.map(item => <div key={item.id} className="receipt-product"><strong>{item.nombre}</strong><p>Cantidad: {item.cantidad} · Precio unitario: ${item.precio.toFixed(2)} · Importe: ${(item.precio * item.cantidad).toFixed(2)}</p></div>)}
    <dl>{supplementReceiptLines(receipt.totals).map(line => <div key={line.label} className="receipt-total"><dt>{line.label}</dt><dd>${line.amount.toFixed(2)}</dd></div>)}</dl>
    <div className="receipt-actions">
      <button type="button" onClick={print}>Imprimir recibo</button>
      <button type="button" onClick={emailReceipt} disabled={!email.available || sending || sent} aria-describedby="receipt-email-reason">{sending ? 'Enviando…' : sent ? 'Email enviado' : 'Enviar por email'}</button>
      <button type="button" onClick={download}>Descargar PDF</button>
    </div>
    <p id="receipt-email-reason">{email.reason}</p>
    <p role="status" aria-live="polite">{feedback}</p>
    <style jsx>{`
      .supplement-receipt{border:1px solid rgba(201,168,76,.25);padding:22px;margin-top:24px;overflow-wrap:anywhere}
      h2{color:#C9A84C;font-weight:400;letter-spacing:.15em}
      .receipt-product{border-bottom:1px solid #333;padding:10px 0}
      .receipt-product p{font-size:14px;line-height:1.6}
      .receipt-total{display:flex;justify-content:space-between;gap:16px;padding:6px 0}dd{margin:0}
      .receipt-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:20px}
      button{background:#C9A84C;color:#090909;border:0;padding:12px 16px;font-size:15px;cursor:pointer}
      button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:2px solid white;outline-offset:3px}
      @media(max-width:480px){.receipt-actions button{width:100%}}
    `}</style>
  </section>
}
