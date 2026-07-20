// pages/api/checkout-instore.js
// Checkout Mode's payment step — deliberately reuses checkout.js's proven
// Square Payment Links approach for the Card path (same hosted checkout
// page, same webhook -> mark-sold.js completion flow, zero new payment
// integration needed), with two differences: no shipping line, and a
// Square-native order-level tax line using the store's confirmed rate.
// Cash bypasses Square entirely and marks items sold directly.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cart, paymentMethod } = req.body || {};
  if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  if (paymentMethod !== 'card' && paymentMethod !== 'cash') {
    return res.status(400).json({ error: 'paymentMethod must be "card" or "cash"' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const ids = cart.map(i => i.id);
    const { data: dbRecords, error: fetchError } = await supabase
      .from('records')
      .select('id, title, price, qty, active')
      .in('id', ids);
    if (fetchError) return res.status(500).json({ error: 'Could not verify stock. Please try again.' });

    const unavailable = [];
    for (const cartItem of cart) {
      const dbRecord = dbRecords.find(r => r.id === cartItem.id);
      if (!dbRecord || !dbRecord.active || dbRecord.qty < 1) unavailable.push(cartItem.title || dbRecord?.title || cartItem.id);
    }
    if (unavailable.length > 0) {
      return res.status(409).json({ error: 'Some items are no longer available: ' + unavailable.join(', '), unavailable });
    }

    // Always use the DB's own current price, not whatever the client sent
    // — same trust boundary as the online checkout (never trust a
    // caller-supplied price for what gets charged).
    const priced = cart.map(item => {
      const dbRecord = dbRecords.find(r => r.id === item.id);
      return { ...item, price: dbRecord.price, title: dbRecord.title };
    });
    const subtotal = priced.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);

    const { data: settings } = await supabase
      .from('store_settings')
      .select('tax_rate')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const taxRate = settings?.tax_rate ? parseFloat(settings.tax_rate) : 0;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    if (paymentMethod === 'cash') {
      // No Square involvement at all — mark sold directly, same real
      // sold_price/sold_at discipline as mark-sold.js/update-record.js.
      const soldAt = new Date().toISOString();
      // Split the total tax proportionally across items for record-keeping
      // (each item's own price is already the real sold price; tax is
      // stored at order level divided evenly since Square-style per-line
      // tax allocation isn't relevant here — this is just for the store's
      // own bookkeeping, not a legal tax filing document).
      const perItemTax = priced.length ? Math.round((taxAmount / priced.length) * 100) / 100 : 0;
      const updateResults = await Promise.all(priced.map(item =>
        supabase.from('records').update({
          active: false, qty: 0,
          sold_price: item.price, sold_at: soldAt,
          sold_payment_method: 'cash', sold_tax_amount: perItemTax,
        }).eq('id', item.id)
      ));
      const failed = updateResults.filter(r => r.error);
      if (failed.length > 0) {
        console.error('Cash sale — some items failed to mark sold:', failed);
        return res.status(500).json({ error: 'Payment recorded but some items failed to update — check Manage Inventory manually.' });
      }
      return res.status(200).json({ success: true, paymentMethod: 'cash', subtotal, taxAmount, total });
    }

    // ── Card path — same Square Payment Links approach as checkout.js
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    const lineItems = priced.map(item => ({
      name: (item.title || '') + (item.artist ? ' - ' + item.artist : '') + (item.condition ? ' (' + item.condition + ')' : ''),
      quantity: '1',
      base_price_money: { amount: Math.round(parseFloat(item.price) * 100), currency: 'USD' },
    }));

    const order = { location_id: locationId, line_items: lineItems };
    if (taxRate > 0) {
      order.taxes = [{ name: 'Sales Tax', percentage: String(taxRate), type: 'ADDITIVE', scope: 'ORDER' }];
    }

    const idempotencyKey = Date.now() + '-' + Math.random().toString(36).slice(2);
    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: { 'Square-Version': '2024-01-18', Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        order,
        checkout_options: {
          allow_tipping: false,
          redirect_url: 'https://www.4evermemoriesrecordstore.com/admin?instore_sale=1',
          ask_for_shipping_address: false,
        },
      }),
    });

    const data = await response.json();
    if (data.errors) {
      console.error('Square errors (in-store):', JSON.stringify(data.errors));
      return res.status(500).json({ error: 'Payment link failed', details: data.errors });
    }

    const orderId = data.payment_link.order_id;

    // Same pending_orders row shape as checkout.js — the ALREADY-CONFIGURED
    // Square webhook that calls mark-sold.js on completion doesn't need to
    // know or care whether this was an online or in-store sale, since it's
    // the same Payment Links mechanism either way. form is minimal since
    // there's no shipping address to collect in person.
    await supabase.from('pending_orders').insert({
      square_order_id: orderId,
      cart: JSON.stringify(priced),
      form: JSON.stringify({ inStore: true, paymentMethod: 'card', taxAmount }),
      total,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, paymentMethod: 'card', paymentUrl: data.payment_link.url, subtotal, taxAmount, total });
  } catch (err) {
    console.error('checkout-instore error:', err);
    return res.status(500).json({ error: err.message });
  }
}
