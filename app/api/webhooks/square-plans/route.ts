import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { clerkClient } from '@clerk/nextjs/server'

// ── Variation name → plan tier ─────────────────────────────────────────────
// Set these to the exact Square catalog variation names for the AI Meal Tracker subscription.
const VARIATION_PLAN_MAP: Record<string, string> = {
  [process.env.SQUARE_SUBSCRIPTION_VARIATION_MID ?? 'Regular']: 'mid',
  [process.env.SQUARE_SUBSCRIPTION_VARIATION_TOP ?? 'Plus']:    'top',
}

const INACTIVE_STATUSES = new Set(['CANCELED', 'DEACTIVATED', 'PAUSED'])

// ── Square webhook signature verification ─────────────────────────────────
function verifySquareSignature(body: string, signature: string | null, webhookUrl: string): boolean {
  const key = process.env.SQUARE_PLAN_WEBHOOK_SIGNATURE_KEY
  if (!key || !signature) return false
  const expected = createHmac('sha256', key)
    .update(webhookUrl + body)
    .digest('base64')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const body       = await request.text()
  const webhookUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/webhooks/square-plans`
  const signature  = request.headers.get('x-square-hmacsha256-signature')

  if (!verifySquareSignature(body, signature, webhookUrl)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: {
    type: string
    data?: {
      object?: {
        subscription?: {
          status?: string
          plan_variation_id?: string
          customer_id?: string
        }
      }
    }
  }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (event.type !== 'subscription.created' && event.type !== 'subscription.updated') {
    return NextResponse.json({ ok: true })
  }

  const subscription = event.data?.object?.subscription
  if (!subscription?.customer_id) return NextResponse.json({ ok: true })

  const { status, plan_variation_id, customer_id } = subscription

  // Determine the new plan
  let plan: string
  if (status && INACTIVE_STATUSES.has(status)) {
    plan = 'free'
  } else {
    // Look up the variation name from Square to map to a plan tier
    const variationName = plan_variation_id
      ? await getVariationName(plan_variation_id)
      : null

    if (!variationName) {
      console.warn('[square-plans] Could not resolve variation name for', plan_variation_id)
      return NextResponse.json({ ok: true })
    }

    plan = VARIATION_PLAN_MAP[variationName] ?? null
    if (!plan) {
      console.warn('[square-plans] No plan mapped for variation:', variationName)
      return NextResponse.json({ ok: true })
    }
  }

  // Get the customer's email and update Clerk
  const email = await getCustomerEmail(customer_id)
  if (!email) {
    console.warn('[square-plans] Could not get email for customer', customer_id)
    return NextResponse.json({ ok: true })
  }

  await updateClerkUserPlan(email, plan)
  return NextResponse.json({ ok: true })
}

// ── Square API helpers ─────────────────────────────────────────────────────

async function squareFetch(path: string) {
  const base = process.env.SQUARE_ENVIRONMENT === 'sandbox'
    ? 'https://connect.squareupsandbox.com/v2'
    : 'https://connect.squareup.com/v2'

  const res = await fetch(`${base}${path}`, {
    headers: {
      Authorization:    `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      'Square-Version': '2024-10-17',
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function getVariationName(variationId: string): Promise<string | null> {
  const data = await squareFetch(`/catalog/object/${variationId}`)
  return (data?.object?.item_variation_data?.name as string | undefined) ?? null
}

async function getCustomerEmail(customerId: string): Promise<string | null> {
  const data = await squareFetch(`/customers/${customerId}`)
  return (data?.customer?.email_address as string | undefined) ?? null
}

// ── Clerk helper ───────────────────────────────────────────────────────────

async function updateClerkUserPlan(email: string, plan: string): Promise<void> {
  try {
    const clerk = await clerkClient()
    const users = await clerk.users.getUserList({ emailAddress: [email] })
    if (users.totalCount === 0) {
      console.warn(`[square-plans] No Clerk user found for email: ${email}`)
      return
    }
    await clerk.users.updateUserMetadata(users.data[0].id, {
      publicMetadata: { plan },
    })
    console.log(`[square-plans] ${email} → plan: ${plan}`)
  } catch (err) {
    console.error('[square-plans] Failed to update Clerk metadata:', err)
  }
}
