// pages/api/mark-sold.js
// Manual/direct entry point for the same order-completion logic used by
// the real webhook receiver (pages/api/square-webhook.js). Kept as a
// separate, simple HTTP endpoint — useful for an admin "force mark sold"
// action later, or for manually re-processing a specific order id.
//
// The actual logic lives in lib/markOrderSold.js so both this file and
// the webhook receiver call the exact same code path.

import { markOrderSold } from '../../lib/markOrderSold';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const result = await markOrderSold(orderId);

    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (result.status === 'failed') {
      return res.status(500).json({ error: result.error || 'Failed to mark records as sold' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Mark sold error:', err);
    return res.status(500).json({ error: err.message });
  }
}
