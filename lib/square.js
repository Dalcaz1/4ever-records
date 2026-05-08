// lib/square.js — Square payment processing
import { Client, Environment } from 'squareup'

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox,
})

export const { paymentsApi, ordersApi, catalogApi } = squareClient

// Process a payment for a record purchase
export async function processPayment({ sourceId, amount, currency = 'USD', note, buyerEmail }) {
  const amountMoney = {
    amount: BigInt(Math.round(amount * 100)), // Square uses cents
    currency,
  }

  try {
    const { result } = await paymentsApi.createPayment({
      sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney,
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      note: note || '4 Ever Memories Records purchase',
      buyerEmailAddress: buyerEmail,
      referenceId: `4EMR-${Date.now()}`,
    })

    return {
      success: true,
      paymentId: result.payment.id,
      status: result.payment.status,
      receiptUrl: result.payment.receiptUrl,
    }
  } catch (err) {
    console.error('Square payment error:', err)
    const errorMessage = err.errors?.[0]?.detail || 'Payment failed'
    return { success: false, error: errorMessage }
  }
}

// Refund a payment
export async function refundPayment(paymentId, amount, reason) {
  try {
    const { result } = await paymentsApi.createPaymentRefund({
      idempotencyKey: crypto.randomUUID(),
      paymentId,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency: 'USD',
      },
      reason,
    })
    return { success: true, refundId: result.refund.id }
  } catch (err) {
    return { success: false, error: err.errors?.[0]?.detail }
  }
}

// Get payment details
export async function getPayment(paymentId) {
  try {
    const { result } = await paymentsApi.getPayment(paymentId)
    return result.payment
  } catch {
    return null
  }
}
