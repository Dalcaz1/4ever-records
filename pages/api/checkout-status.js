// pages/api/checkout-status.js
// Lets the admin Checkout Mode UI ask "did this specific Card charge
// actually go through yet?" instead of assuming success the moment a
// payment link is opened. Polled by the front end after "Charge Card".
//
//   status: 'confirmed' — items are marked sold, square_webhook.js already
//            ran successfully for this order.
//   status: 'pending'   — still waiting (customer hasn't finished paying
//            on Square's page yet, or the webhook hasn't arrived).
//   status: 'failed'    — Square DID charge this order, but marking our
//            own inventory sold failed. Do not let the UI treat this as
//            safe to retry.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: pending } = await supabase
      .from('pending_orders')
      .select('status, error_message')
      .eq('square_order_id', orderId)
      .maybeSingle();

    if (pending) {
      if (pending.status === 'failed') {
        return res.status(200).json({ status: 'failed', error: pending.error_message });
      }
      return res.status(200).json({ status: 'pending' });
    }

    // No pending_orders row left — either confirmed (deleted after
    // markOrderSold succeeded) or this orderId never existed here.
    const { data: sold } = await supabase
      .from('records')
      .select('id')
      .eq('sold_square_order_id', orderId)
      .limit(1);

    if (sold && sold.length > 0) {
      return res.status(200).json({ status: 'confirmed' });
    }
    return res.status(200).json({ status: 'pending' });
  } catch (err) {
    console.error('checkout-status error:', err);
    return res.status(500).json({ error: err.message });
  }
}
