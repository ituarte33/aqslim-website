import { supplementReceiptLines, type SupplementSaleReceipt } from '../../../lib/supplement-sales'

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
export function receiptRows(receipt: SupplementSaleReceipt): string[] {
  return ['AQSLIM', `Recibo ${receipt.id}`, `Fecha: ${receipt.fecha}`, `Método de pago: ${receipt.metodoPago}`, '',
    ...receipt.items.flatMap(item => [item.nombre, `Cantidad: ${item.cantidad} | Precio unitario: $${item.precio.toFixed(2)} | Importe: $${(item.precio * item.cantidad).toFixed(2)}`]), '',
    ...supplementReceiptLines(receipt.totals).map(line => `${line.label}: $${line.amount.toFixed(2)}`)]
}

// Explicitly select customer-facing fields. Never render the persisted notes or SKU IDs.
export function receiptHtml(receipt: SupplementSaleReceipt): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>AQSLIM — Recibo</title><style>
body{font:15px Arial,sans-serif;color:#171717;background:white;margin:0;padding:32px}main{max-width:700px;margin:auto}h1{letter-spacing:.15em;color:#80671d}p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;margin:8px 0} @media print{@page{margin:18mm}body{padding:0}p{break-inside:avoid}h1{color:black}}
</style></head><body><main>${receiptRows(receipt).map((row, index) => index === 0 ? `<h1>${escapeHtml(row)}</h1>` : `<p>${escapeHtml(row) || '&nbsp;'}</p>`).join('')}</main></body></html>`
}

// Small, dependency-free PDF with standard Courier/WinAnsi and paginated text.
// Latin Spanish characters are preserved; characters outside WinAnsi use a visible fallback.
export function receiptPdf(receipt: SupplementSaleReceipt): Uint8Array {
  const lines = receiptRows(receipt).flatMap(row => row.match(/.{1,78}(?:\s|$)|.{1,78}/gu) ?? [''])
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += 44) pages.push(lines.slice(index, index + 44))
  const literal = (value: string) => value.replace(/[\r\n\t]/g, ' ').replace(/[^\x20-\x7e\xa0-\xff]/gu, '?').replace(/[\\()]/g, '\\$&')
  const objects = ['', '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>']
  const kids: string[] = []
  for (const page of pages) {
    const pageId = objects.length
    const content = `BT /F1 10 Tf 50 790 Td 16 TL ${page.map((line, index) => `${index ? 'T* ' : ''}(${literal(line)}) Tj`).join('\n')} ET`
    kids.push(`${pageId} 0 R`)
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  }
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (let index = 1; index < objects.length; index++) { offsets.push(pdf.length); pdf += `${index} 0 obj\n${objects[index]}\nendobj\n` }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Uint8Array.from(pdf, char => char.charCodeAt(0))
}
