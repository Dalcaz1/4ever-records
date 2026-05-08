// pages/api/checkout.js — Process order and Square payment
import { processPayment } from '../../lib/square'
import { supabaseAdmin, getNextOrderNumber } from '../../lib/supabase'
import { calculateShipping } from '../../lib/usps'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    sourceId,          // Square payment token from frontend
    recordId,
    customerName,
    customerEmail,
    customerPhone,
    shipToName,
    shipToAddress,
    shipToCity,
    shipToState,
    shipToZip,
    shippingMethod,
  } = req.body

  if (!sourceId || !recordId || !customerEmail || !shipToZip) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const db = supabaseAdmin()

  try {
    // Step 1: Fetch and lock the record (make sure it's available)
    const { data: record, error: fetchErr } = await db
      .from('records')
      .select('*')
      .eq('id', recordId)
      .eq('sold', false)
      .single()

    if (fetchErr || !record) {
      return res.status(409).json({ error: 'This record is no longer available.' })
    }

    // Step 2: Calculate shipping
    const shipping = await calculateShipping(shipToZip, shippingMethod, record.weight_oz)
    const subtotal = parseFloat(record.price)
    const shippingCost = shipping.rate
    const total = parseFloat((subtotal + shippingCost).toFixed(2))

    // Step 3: Process Square payment
    const payment = await processPayment({
      sourceId,
      amount: total,
      buyerEmail: customerEmail,
      note: `4 Ever Memories Records — ${record.artist} - ${record.title}`,
    })

    if (!payment.success) {
      return res.status(402).json({ error: payment.error || 'Payment failed' })
    }

    // Step 4: Create the order record
    const orderNumber = await getNextOrderNumber()
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        order_number:     orderNumber,
        customer_name:    customerName,
        customer_email:   customerEmail,
        customer_phone:   customerPhone,
        ship_to_name:     shipToName || customerName,
        ship_to_address:  shipToAddress,
        ship_to_city:     shipToCity,
        ship_to_state:    shipToState,
        ship_to_zip:      shipToZip,
        record_id:        recordId,
        record_snapshot:  record,
        subtotal,
        shipping_cost:    shippingCost,
        total,
        square_payment_id: payment.paymentId,
        shipping_method:  shipping.service,
        status:           'paid',
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // Step 5: Mark record as sold
    await db.from('records').update({ sold: true, updated_at: new Date().toISOString() }).eq('id', recordId)

    return res.status(200).json({
      success: true,
      orderNumber,
      orderId: order.id,
      receiptUrl: payment.receiptUrl,
      total,
      shippingMethod: shipping.service,
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return res.status(500).json({ error: 'Order processing failed: ' + err.message })
  }
}
