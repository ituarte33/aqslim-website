'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import type { Cliente, Suplemento } from '@/lib/airtable'
import { calculateSupplementSale, type SupplementSaleItem } from '@/lib/supplement-sales'
import { DashboardShell } from '../dashboard-shell'
import { saveSupplementSale } from './actions'

const gold = '#C9A84C'
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 14px', color: '#FAFAF8', background: '#121212', border: '1px solid rgba(201,168,76,.35)', fontSize: 16 }
const label: React.CSSProperties = { display: 'block', marginBottom: 7, color: '#9A9590', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase' }

export function SupplementSalesClient({ user, clients, products }: {
  user: { firstName: string | null; lastName: string | null } | null
  clients: Cliente[]
  products: Suplemento[]
}) {
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<SupplementSaleItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const totals = calculateSupplementSale(cart, discount, tax)
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return normalizedQuery
      ? products.filter(p => (p.fields.Nombre ?? '').toLowerCase().includes(normalizedQuery))
      : []
  }, [products, query])
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

  function add(product: Suplemento) {
    setCart(current => {
      const found = current.find(item => item.id === product.id)
      if (found) return current.map(item => item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      return [...current, { id: product.id, nombre: product.fields.Nombre ?? 'Suplemento', precio: product.fields['Precio de Venta ($)'] ?? 0, cantidad: 1 }]
    })
  }

  function quantity(id: string, next: number) {
    setCart(current => next < 1 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, cantidad: next } : item))
  }

  return (
    <DashboardShell user={user} lang={lang} setLang={setLang}>
      <Link href="/dashboard" style={{ color: '#9A9590', textDecoration: 'none' }}>← Volver al panel</Link>
      <h1 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 400, fontSize: 40, margin: '22px 0 8px' }}>Registrar venta de suplementos</h1>
      <p style={{ color: '#9A9590', marginBottom: 30 }}>El cliente es opcional. Si no seleccionas uno, se guardará como venta de mostrador.</p>

      <form action={formData => startTransition(async () => {
        setMessage(null)
        formData.set('items', JSON.stringify(cart.map(({ id, cantidad }) => ({ id, cantidad }))))
        try {
          const result = await saveSupplementSale(formData)
          setMessage({ ok: true, text: `Venta guardada · Recibo ${result.id} · Total $${result.total.toFixed(2)}` })
          setCart([]); setDiscount(0); setTax(0)
        } catch (error) {
          setMessage({ ok: false, text: error instanceof Error ? error.message : 'No se pudo guardar la venta.' })
        }
      })}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 24 }}>
          <section style={{ border: '1px solid rgba(201,168,76,.25)', padding: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 400, marginTop: 0 }}>1. Datos de la venta</h2>
            <label style={label}>Cliente (opcional)</label>
            <select name="clienteRecordId" defaultValue="" style={input}>
              <option value="">Venta de mostrador / sin cliente asociado</option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.fields['Nombre Completo'] ?? client.fields.Email ?? client.id}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
              <div><label style={label}>Fecha</label><input name="fecha" type="date" defaultValue={today} required style={input} /></div>
              <div><label style={label}>Forma de pago</label><select name="metodoPago" required defaultValue="" style={input}><option value="" disabled>Seleccionar</option>{['Efectivo','Tarjeta','Zelle','Venmo','Otro'].map(v => <option key={v}>{v}</option>)}</select></div>
            </div>
            <label style={{ ...label, marginTop: 18 }}>Nota (opcional)</label>
            <textarea name="nota" rows={3} maxLength={1000} style={input} placeholder="Detalle útil de la venta" />
          </section>

          <section style={{ border: '1px solid rgba(201,168,76,.25)', padding: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 400, marginTop: 0 }}>2. Agregar suplementos</h2>
            <input value={query} onChange={e => setQuery(e.target.value)} style={input} placeholder="Buscar suplemento…" />
            <div style={{ maxHeight: query.trim() ? 280 : 60, overflowY: 'auto', marginTop: 12 }}>
              {!query.trim() && <p style={{ color: '#777' }}>Escribe el nombre para ver resultados.</p>}
              {filtered.map(product => <button key={product.id} type="button" onClick={() => add(product)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '11px 8px', background: 'none', color: '#FAFAF8', border: 0, borderBottom: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', textAlign: 'left' }}><span>+ {product.fields.Nombre}</span><span style={{ color: gold }}>${(product.fields['Precio de Venta ($)'] ?? 0).toFixed(2)}</span></button>)}
              {query.trim() && filtered.length === 0 && <p style={{ color: '#777' }}>No se encontraron suplementos activos.</p>}
            </div>
          </section>
        </div>

        <section style={{ border: '1px solid rgba(201,168,76,.25)', padding: 22, marginTop: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 400, marginTop: 0 }}>3. Resumen y total</h2>
          {cart.length === 0 ? <p style={{ color: '#777' }}>Aún no has agregado productos.</p> : cart.map(item => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' }}><span>{item.nombre}<small style={{ color: '#777', display: 'block' }}>${item.precio.toFixed(2)} c/u</small></span><div><button type="button" onClick={() => quantity(item.id, item.cantidad - 1)}>−</button><span style={{ padding: '0 12px' }}>{item.cantidad}</span><button type="button" onClick={() => quantity(item.id, item.cantidad + 1)}>+</button></div><strong>${(item.precio * item.cantidad).toFixed(2)}</strong></div>)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginTop: 20 }}>
            <div><label style={label}>Descuento ($)</label><input name="discount" type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))} style={input} /></div>
            <div><label style={label}>Impuesto ($)</label><input name="tax" type="number" min="0" step="0.01" value={tax} onChange={e => setTax(Number(e.target.value))} style={input} /></div>
            <div style={{ padding: 10 }}><span style={label}>Subtotal</span><strong>${totals.subtotal.toFixed(2)}</strong></div>
            <div style={{ padding: 10 }}><span style={label}>Total</span><strong style={{ color: gold, fontSize: 24 }}>${totals.total.toFixed(2)}</strong></div>
          </div>
          {message && <p role="status" style={{ color: message.ok ? '#7fcf7f' : '#ff7777', padding: '12px 0' }}>{message.text}</p>}
          <button type="submit" disabled={pending || cart.length === 0} style={{ marginTop: 18, padding: '14px 28px', background: pending || cart.length === 0 ? '#5d512f' : gold, color: '#090909', border: 0, letterSpacing: '.12em', textTransform: 'uppercase', cursor: pending ? 'wait' : 'pointer', fontWeight: 600 }}>{pending ? 'Guardando…' : 'Guardar venta y generar recibo'}</button>
        </section>
      </form>
    </DashboardShell>
  )
}
