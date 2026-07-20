// pages/api/checkout-instore.js
// Checkout Mode's payment step. Card reuses checkout.js's proven Square
// Payment Links approach (same hosted checkout page, same already-
// configured webhook -> mark-sold.js completion flow) minus shipping,
// plus a Square-native order-level tax line. Cash uses Square's real
// Orders + Payments API (CreatePayment with source_id: 'CASH') so both
// payment methods show up in the same Square sales reporting — per
// direct instruction to use exactly what's already in place rather than
// track cash sales outside Square.

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

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const totalCents = Math.round(total * 100);

    const lineItems = priced.map(item => ({
      name: (item.title || '') + (item.artist ? ' - ' + item.artist : '') + (item.condition ? ' (' + item.condition + ')' : ''),
      quantity: '1',
      base_price_money: { amount: Math.round(parseFloat(item.price) * 100), currency: 'USD' },
    }));
    const order = { location_id: locationId, line_items: lineItems };
    if (taxRate > 0) {
      order.taxes = [{ name: 'Sales Tax', percentage: String(taxRate), type: 'ADDITIVE', scope: 'ORDER' }];
    }

    if (paymentMethod === 'cash') {
      // Real Square integration — same sales reporting as Card, per direct
      // instruction ("Square gives the option upfront for ANY sale to
      // identify Cash or Card"). Two calls: create the actual Square
      // Order, then CreatePayment with source_id: 'CASH' against it.
      const orderIdemKey = Date.now() + '-' + Math.random().toString(36).slice(2);
      const orderRes = await fetch('https://connect.squareup.com/v2/orders', {
        method: 'POST',
        headers: { 'Square-Version': '2024-01-18', Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotency_key: orderIdemKey, order }),
      });
      const orderData = await orderRes.json();
      if (orderData.errors) {
        console.error('Square order create error (cash):', JSON.stringify(orderData.errors));
        return res.status(500).json({ error: 'Failed to create Square order', details: orderData.errors });
      }
      const squareOrderId = orderData.order.id;

      const paymentIdemKey = Date.now() + '-' + Math.random().toString(36).slice(2);
      const paymentRes = await fetch('https://connect.squareup.com/v2/payments', {
        method: 'POST',
        headers: { 'Square-Version': '2024-01-18', Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: paymentIdemKey,
          source_id: 'CASH',
          order_id: squareOrderId,
          location_id: locationId,
          amount_money: { amount: totalCents, currency: 'USD' },
          cash_details: {
            buyer_supplied_money: { amount: totalCents, currency: 'USD' },
          },
        }),
      });
      const paymentData = await paymentRes.json();
      if (paymentData.errors) {
        console.error('Square cash payment error:', JSON.stringify(paymentData.errors));
        return res.status(500).json({ error: 'Failed to record cash payment in Square', details: paymentData.errors });
      }

      // Square confirmed the cash payment — now mark items sold in our own
      // DB, since Square has no knowledge of this app's inventory schema.
      // Not relying on the webhook here (that path is proven for Payment
      // Links completions specifically; unclear whether the same
      // subscription covers a direct CreatePayment call the same way) —
      // marking sold inline guarantees correctness regardless.
      const soldAt = new Date().toISOString();
      const perItemTax = priced.length ? Math.round((taxAmount / priced.length) * 100) / 100 : 0;
      const updateResults = await Promise.all(priced.map(item =>
        supabase.from('records').update({
          active: false, qty: 0,
          sold_price: item.price, sold_at: soldAt,
          sold_payment_method: 'cash', sold_tax_amount: perItemTax,
          sold_square_order_id: squareOrderId,
          sold_square_payment_id: paymentData.payment?.id || null,
        }).eq('id', item.id)
      ));
      const failed = updateResults.filter(r => r.error);
      if (failed.length > 0) {
        console.error('Cash sale — Square succeeded but some items failed to mark sold:', failed);
        return res.status(500).json({ error: 'Cash payment recorded in Square but some items failed to update here — check Manage Inventory manually.', squareOrderId });
      }
      return res.status(200).json({ success: true, paymentMethod: 'cash', subtotal, taxAmount, total, squareOrderId });
    }

    // ── Card path — same Square Payment Links approach as checkout.js
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
