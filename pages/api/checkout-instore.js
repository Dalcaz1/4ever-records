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

    // ── Guard against duplicate real charges. Card payments finish
    // asynchronously (customer pays on Square's hosted page, a webhook
    // confirms it later) — there's a real window where these same items
    // are still "active" in our DB while a payment for them may already
    // be in flight or even completed-but-not-yet-webhooked. Block a
    // second attempt at any of these ids while an earlier attempt hasn't
    // resolved yet, instead of silently allowing a second real charge.
    const { data: inFlight } = await supabase
      .from('pending_orders')
      .select('square_order_id, cart, status, error_message');
    if (inFlight) {
      for (const row of inFlight) {
        let rowIds = [];
        try { rowIds = JSON.parse(row.cart).map(i => i.id); } catch (e) { continue; }
        const overlap = rowIds.filter(id => ids.includes(id));
        if (overlap.length > 0) {
          if (row.status === 'failed') {
            return res.status(409).json({
              error: 'Square Order ' + row.square_order_id + ' already charged one or more of these items, but our inventory update failed at the time (' + (row.error_message || 'unknown error') + '). Do NOT charge again — resolve this in Manage Inventory first, referencing that order id.',
              inFlightOrderId: row.square_order_id,
            });
          }
          return res.status(409).json({
            error: 'A charge (Square Order ' + row.square_order_id + ') is already in progress for one or more of these items. Wait for it to confirm, or check Square Dashboard, before charging again.',
            inFlightOrderId: row.square_order_id,
          });
        }
      }
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
      // Per direct instruction: Cash sales use Square ONLY to compute the
      // correct tax (the same non-committal Calculate Order call the
      // 'preview' mode above uses) — nothing is ever created in Square.
      // No real Order, no real Payment, no Square receipt, and Cash
      // sales will not appear in Square's own sales reporting or
      // dashboard. This also means a failure marking our own inventory
      // sold has NO external side effect to worry about — since nothing
      // was ever sent to Square, retrying is always safe.
      const calcRes = await fetch('https://connect.squareup.com/v2/orders/calculate', {
        method: 'POST',
        headers: { 'Square-Version': '2024-01-18', Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const calcData = await calcRes.json();
      if (calcData.errors) {
        console.error('Square calculate error (cash):', JSON.stringify(calcData.errors));
        return res.status(500).json({ error: 'Could not calculate tax for this sale', details: calcData.errors });
      }
      const calcOrder = calcData.order;
      const totalCents = calcOrder.total_money?.amount || 0;
      const taxCents = calcOrder.total_tax_money?.amount || 0;
      const discountCents = calcOrder.total_discount_money?.amount || 0;

      // A local reference id for this sale — takes the place of a real
      // Square order id (there isn't one anymore) so receipts/reports
      // still have something to key off of.
      const localSaleId = 'CASH-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

      const soldAt = new Date().toISOString();
      const perItemTax = priced.length ? Math.round((taxCents / priced.length)) / 100 : 0;
      const perItemDiscount = priced.length ? Math.round((discountCents / priced.length)) / 100 : 0;
      const updateResults = await Promise.all(priced.map(item =>
        supabase.from('records').update({
          active: false, qty: 0,
          sold_price: item.price, sold_at: soldAt,
          sold_payment_method: 'cash', sold_tax_amount: perItemTax,
          sold_discount_amount: perItemDiscount,
          // No real Square order/payment exists for Cash anymore — these
          // stay null. sold_square_order_id historically meant "look this
          // up in Square"; a local id here would be misleading in that
          // column, so it's left null and localSaleId only appears in
          // this response for the receipt/email, not stored as if it
          // were a Square reference.
          sold_square_order_id: null,
          sold_square_payment_id: null,
        }).eq('id', item.id)
      ));
      const failed = updateResults.filter(r => r.error);
      if (failed.length > 0) {
        console.error('Cash sale — inventory update failed (nothing was sent to Square, safe to retry):', failed);
        return res.status(500).json({ error: 'Failed to mark items sold: ' + failed.map(f => f.error.message || String(f.error)).join('; ') + '. Nothing was charged or recorded in Square — safe to try again.' });
      }
      return res.status(200).json({
        success: true, paymentMethod: 'cash', localSaleId,
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

    return res.status(200).json({ success: true, paymentMethod: 'card', paymentUrl: data.payment_link.url, squareOrderId: orderId });
  } catch (err) {
    console.error('checkout-instore error:', err);
    return res.status(500).json({ error: err.message });
  }
}
