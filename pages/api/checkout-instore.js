// pages/api/checkout-instore.js
// Checkout Mode's payment step.
//
// FIX (direct instruction): removed all manual tax-rate handling. Square
// already requires sellers to configure sales tax as part of account
// setup — this app has no business duplicating that decision. Every
// order now sets pricing_options.auto_apply_taxes: true, so Square
// calculates tax entirely from whatever the seller configured in their
// own Square Dashboard (Settings -> Sales Tax). This ONLY works
// correctly if that dashboard setting is "All current and future
// taxable items at selected locations" (not item-specific) — our line
// items are ad-hoc (name + price), not references to a Square Catalog,
// so an item-scoped tax rule would not apply to them. That's a one-time
// setting in the seller's own Square account, not something this code
// controls.
//
// Three actions, one endpoint:
//   - mode: 'preview' — calls Square's Calculate Order endpoint (no
//     order is actually created) so Checkout Mode's cart screen can show
//     a live, Square-accurate subtotal/tax/total as items are scanned.
//   - paymentMethod: 'card' — same Square Payment Links approach as the
//     online checkout.js (same hosted page, same already-configured
//     webhook -> mark-sold.js flow), minus shipping.
//   - paymentMethod: 'cash' — Square's real Orders + Payments API
//     (CreatePayment, source_id: 'CASH'), so cash sales show up in the
//     same Square sales reporting as card sales. The actual amount
//     charged is read back from the CREATED order's own total_money —
//     never computed independently here, since this app doesn't know
//     the tax rate anymore.

function buildOrder(cart, locationId, discountAmount) {
  const lineItems = cart.map(item => ({
    name: (item.title || '') + (item.artist ? ' - ' + item.artist : '') + (item.condition ? ' (' + item.condition + ')' : ''),
    quantity: '1',
    base_price_money: { amount: Math.round(parseFloat(item.price) * 100), currency: 'USD' },
  }));
  const order = {
    location_id: locationId,
    line_items: lineItems,
    pricing_options: { auto_apply_taxes: true },
  };
  // Cashier-entered discount, per direct instruction. A real Square
  // order-level discount (not something computed here) — Square applies
  // it to the subtotal BEFORE auto-calculating tax, matching standard
  // retail expectations (tax is owed on what was actually paid, not the
  // pre-discount price).
  const discountCents = Math.round((parseFloat(discountAmount) || 0) * 100);
  if (discountCents > 0) {
    order.discounts = [{
      name: 'Discount',
      amount_money: { amount: discountCents, currency: 'USD' },
      scope: 'ORDER',
    }];
  }
  return order;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cart, paymentMethod, mode, discountAmount } = req.body || {};
  if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

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

    // Always use the DB's own current price, not whatever the client sent.
    const priced = cart.map(item => {
      const dbRecord = dbRecords.find(r => r.id === item.id);
      return { ...item, price: dbRecord.price, title: dbRecord.title };
    });
    const order = buildOrder(priced, locationId, discountAmount);

    // ── Preview — just ask Square what the total would be, commit nothing.
    if (mode === 'preview') {
      const calcRes = await fetch('https://connect.squareup.com/v2/orders/calculate', {
        method: 'POST',
        headers: { 'Square-Version': '2024-01-18', Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const calcData = await calcRes.json();
      if (calcData.errors) {
        console.error('Square calculate error:', JSON.stringify(calcData.errors));
        return res.status(500).json({ error: 'Could not calculate total', details: calcData.errors });
      }
      const o = calcData.order;
      return res.status(200).json({
        subtotal: (o.total_money?.amount - (o.total_tax_money?.amount || 0) + (o.total_discount_money?.amount || 0)) / 100,
        discountAmount: (o.total_discount_money?.amount || 0) / 100,
        taxAmount: (o.total_tax_money?.amount || 0) / 100,
        total: (o.total_money?.amount || 0) / 100,
      });
    }

    if (paymentMethod !== 'card' && paymentMethod !== 'cash') {
      return res.status(400).json({ error: 'paymentMethod must be "card" or "cash"' });
    }

    if (paymentMethod === 'cash') {
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
      const squareOrder = orderData.order;
      const squareOrderId = squareOrder.id;
      // The amount to charge comes FROM Square's own computed order total
      // (which already includes whatever tax Square auto-applied) — never
      // computed independently here.
      const totalCents = squareOrder.total_money?.amount || 0;
      const taxCents = squareOrder.total_tax_money?.amount || 0;
      const discountCents = squareOrder.total_discount_money?.amount || 0;

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
          cash_details: { buyer_supplied_money: { amount: totalCents, currency: 'USD' } },
        }),
      });
      const paymentData = await paymentRes.json();
      if (paymentData.errors) {
        console.error('Square cash payment error:', JSON.stringify(paymentData.errors));
        return res.status(500).json({ error: 'Failed to record cash payment in Square', details: paymentData.errors });
      }

      const soldAt = new Date().toISOString();
      const perItemTax = priced.length ? Math.round((taxCents / priced.length)) / 100 : 0;
      const perItemDiscount = priced.length ? Math.round((discountCents / priced.length)) / 100 : 0;
      const updateResults = await Promise.all(priced.map(item =>
        supabase.from('records').update({
          active: false, qty: 0,
          sold_price: item.price, sold_at: soldAt,
          sold_payment_method: 'cash', sold_tax_amount: perItemTax,
          sold_discount_amount: perItemDiscount,
          sold_square_order_id: squareOrderId,
          sold_square_payment_id: paymentData.payment?.id || null,
        }).eq('id', item.id)
      ));
      const failed = updateResults.filter(r => r.error);
      if (failed.length > 0) {
        console.error('Cash sale — Square succeeded but some items failed to mark sold:', failed);
        return res.status(500).json({ error: 'Cash payment recorded in Square but some items failed to update here — check Manage Inventory manually.', squareOrderId });
      }
      return res.status(200).json({
        success: true, paymentMethod: 'cash', squareOrderId,
        subtotal: (totalCents - taxCents) / 100, taxAmount: taxCents / 100, total: totalCents / 100,
      });
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
    // Best-effort: Payment Links' response typically includes the full
    // computed order (with auto-applied tax/discount totals) under
    // related_resources. If present, capture the real figures now so
    // mark-sold.js can stamp accurate sold_tax_amount/sold_discount_amount
    // later instead of defaulting to 0 for every Card sale.
    const relatedOrder = data.related_resources?.orders?.[0];
    const knownTaxAmount = relatedOrder?.total_tax_money ? relatedOrder.total_tax_money.amount / 100 : null;
    const knownDiscountAmount = relatedOrder?.total_discount_money ? relatedOrder.total_discount_money.amount / 100 : null;

    await supabase.from('pending_orders').insert({
      square_order_id: orderId,
      cart: JSON.stringify(priced),
      form: JSON.stringify({ inStore: true, paymentMethod: 'card', taxAmount: knownTaxAmount, discountAmount: knownDiscountAmount }),
      total: null, // unknown here — Square computed the real total with auto-applied tax; mark-sold.js doesn't need this field to function
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, paymentMethod: 'card', paymentUrl: data.payment_link.url });
  } catch (err) {
    console.error('checkout-instore error:', err);
    return res.status(500).json({ error: err.message });
  }
}
