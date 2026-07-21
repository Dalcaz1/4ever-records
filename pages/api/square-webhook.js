// pages/api/square-webhook.js
// The REAL Square webhook receiver. This did not exist anywhere in this
// codebase before — comments elsewhere referred to an "already-configured
// webhook -> mark-sold.js flow," but nothing here actually parsed Square's
// real event shape or verified its signature, and nothing in Square's
// account was pointed at any URL in this app. That meant a completed Card
// payment had no automatic path back into inventory at all.
//
// Square's real webhook body looks like:
//   { "type": "payment.updated", "data": { "object": { "payment": {
//       "id": "...", "order_id": "...", "status": "COMPLETED", ... } } } }
// — not a plain { orderId } like mark-sold.js expects on its own. This
// file is the translation layer: verify it's really from Square, pull
// order_id out of the real shape, then call the same markOrderSold logic.
//
// SETUP REQUIRED (one-time, in Square's own dashboard — this code alone
// does nothing until this is done):
//   1. developer.squareup.com -> your application -> Webhooks
//   2. Add Endpoint: https://www.4evermemoriesrecordstore.com/api/square-webhook
//   3. Subscribe to event: payment.updated
//   4. Square shows a Signature Key for that endpoint — copy it
//   5. Add it to Vercel as SQUARE_WEBHOOK_SIGNATURE_KEY (Production + Preview)
//   6. Redeploy so the new env var takes effect

import crypto from 'crypto';
import { markOrderSold } from '../../lib/markOrderSold';

// Signature verification needs the exact raw request body — Next.js's
// default JSON body parser would already have re-serialized it by the
// time we saw it, which can silently break the signature match.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await readRawBody(req);
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const receivedSignature = req.headers['x-square-hmacsha256-signature'];
  // Must be the exact notification URL configured in Square's dashboard.
  const notificationUrl = 'https://www.4evermemoriesrecordstore.com/api/square-webhook';

  if (!signatureKey) {
    // Refuse to process anything until this is actually set up — silently
    // trusting an unverified POST claiming to be Square is exactly the
    // kind of gap that caused this whole investigation.
    console.error('square-webhook: SQUARE_WEBHOOK_SIGNATURE_KEY is not set — rejecting. See setup steps in this file\'s header comment.');
    return res.status(503).json({ error: 'Webhook not yet configured — SQUARE_WEBHOOK_SIGNATURE_KEY missing' });
  }

  const hmac = crypto.createHmac('sha256', signatureKey);
  hmac.update(notificationUrl + rawBody);
  const expectedSignature = hmac.digest('base64');

  if (!receivedSignature || expectedSignature !== receivedSignature) {
    console.error('square-webhook: signature mismatch — rejecting a request that is not verifiably from Square.');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).json({ error: 'Malformed JSON' });
  }

  // Only payment completion actually matters here. Square sends several
  // other event types to the same subscription; anything else is a no-op
  // 200 so Square doesn't keep retrying something we were never going to
  // act on.
  if (event.type !== 'payment.updated' && event.type !== 'payment.created') {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const payment = event.data?.object?.payment;
  if (!payment || payment.status !== 'COMPLETED' || !payment.order_id) {
    // e.g. a payment.updated for a still-pending or failed payment —
    // nothing to mark sold yet.
    return res.status(200).json({ received: true, ignored: 'not a completed payment' });
  }

  const result = await markOrderSold(payment.order_id);

  if (result.status === 'failed') {
    // Return 500 so Square's own retry schedule keeps trying — a
    // transient DB error might genuinely resolve itself on retry. The
    // pending_orders row is already flagged 'failed' by markOrderSold so
    // the admin UI can warn against re-charging in the meantime.
    console.error('square-webhook: markOrderSold failed for order', payment.order_id, result.error);
    return res.status(500).json({ error: result.error });
  }

  // 'confirmed' or 'not_found' both mean nothing further to do here.
  return res.status(200).json({ received: true, status: result.status });
}
