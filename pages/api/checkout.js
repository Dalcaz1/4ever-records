export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cart, form } = req.body;
  if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const ids = cart.map(i => i.id);
    const { data: dbRecords, error: fetchError } = await supabase
      .from('records')
      .select('id, title, qty, active')
      .in('id', ids);

    if (fetchError) {
      return res.status(500).json({ error: 'Could not verify stock. Please try again.' });
    }

    const unavailable = [];
    for (const cartItem of cart) {
      const dbRecord = dbRecords.find(r => r.id === cartItem.id);
      if (!dbRecord || !dbRecord.active || dbRecord.qty < 1) {
        unavailable.push(cartItem.title || cartItem.t);
      }
    }

    if (unavailable.length > 0) {
      return res.status(409).json({
        error: 'Some items are no longer available: ' + unavailable.join(', '),
        unavailable,
      });
    }

    const subtotal = cart.reduce((s, i) => s + (parseFloat(i.price) || i.p) * i.qty, 0);
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    const freeShipping = subtotal >= 100;
    const shipping = freeShipping ? 0 : 5 + (totalQty - 1);
    const total = subtotal + shipping;

    const lineItems = cart.map(item => ({
      name: (item.title || item.t) + ' - ' + (item.artist || item.a) + ' (' + (item.condition || item.c) + ')',
      quantity: String(item.qty),
      base_price_money: {
        amount: Math.round((parseFloat(item.price) || item.p) * 100),
        currency: 'USD',
      },
    }));

    lineItems.push({
      name: shipping > 0 ? 'Shipping (USPS Media Mail)' : 'Shipping — FREE on orders over $100',
      quantity: '1',
      base_price_money: {
        amount: Math.round(shipping * 100),
        currency: 'USD',
      },
    });

    const idempotencyKey = Date.now() + '-' + Math.random().toString(36).slice(2);

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        order: {
          location_id: locationId,
          line_items: lineItems,
        },
        checkout_options: {
          allow_tipping: false,
          redirect_url: 'https://www.4evermemoriesrecordstore.com/success',
          ask_for_shipping_address: false,
        },
        pre_populated_data: {
          buyer_email: form.email,
          buyer_address: {
            address_line_1: form.address,
            locality: form.city,
            administrative_district_level_1: form.state,
            postal_code: form.zip,
            country: 'US',
          },
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Square errors:', JSON.stringify(data.errors));
      return res.status(500).json({ error: 'Payment link failed', details: data.errors });
    }

    const orderId = data.payment_link.order_id;

    await supabase.from('pending_orders').insert({
      square_order_id: orderId,
      cart: JSON.stringify(cart),
      form: JSON.stringify(form),
      total,
      created_at: new Date().toISOString(),
    });

    const paymentUrl = data.payment_link.url;

    try {
      const itemsHtml = cart.map(item => `
        <div style="padding:12px;border-bottom:1px solid #2a2a2a;">
          <div style="color:#e8d5b0;font-size:16px;font-weight:700;">${item.title || item.t}</div>
          <div style="color:#888;margin-top:4px;">${item.artist || item.a || ''}</div>
          <div style="color:#c9a84c;margin-top:4px;">${item.category || item.cat || ''} • Condition: ${item.condition || item.c || 'N/A'}</div>
          <div style="color:#4ade80;margin-top:4px;">$${parseFloat(item.price || item.p).toFixed(2)} × ${item.qty}</div>
        </div>
      `).join('');

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'orders@4evermemoriesrecordstore.com',
          to: '4evermemoriesrecordstore@gmail.com',
          reply_to: form.email,
          subject: '🛒 NEW 4 EVER MEMORIES ORDER',
          html:
            '<!DOCTYPE html><html><body style="background:#0d0d0d;font-family:Georgia,serif;padding:40px 20px;">' +
            '<div style="max-width:700px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">' +
            '<div style="background:#0a0a0a;padding:24px;border-bottom:1px solid #2a2a2a;">' +
            '<div style="font-size:22px;color:#c9a84c;font-weight:700;">🛒 New Order Received</div>' +
            '</div><div style="padding:32px;">' +
            '<div style="background:#0a0a0a;border-radius:8px;padding:16px;margin-bottom:20px;">' +
            '<div style="font-size:11px;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Customer / Shipping</div>' +
            '<div style="color:#e8d5b0;font-weight:700;font-size:18px;">' + form.name + '</div>' +
            '<div style="color:#888;margin-top:6px;">' + form.email + '</div>' +
            '<div style="color:#888;margin-top:6px;">' + form.address + '</div>' +
            '<div style="color:#888;margin-top:6px;">' + form.city + ', ' + form.state + ' ' + form.zip + '</div>' +
            '</div>' +
            '<div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:8px;padding:16px;">' +
            '<div style="font-size:11px;color:#4ade80;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Items Ordered</div>' +
            itemsHtml +
            '<div style="margin-top:20px;padding-top:20px;border-top:1px solid #2a2a2a;color:#fff;font-size:20px;font-weight:700;">TOTAL: $' + total.toFixed(2) + '</div>' +
            '<div style="margin-top:10px;color:#888;font-size:12px;">Square Order ID: ' + orderId + '</div>' +
            '</div></div></div></body></html>',
        }),
      });

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'orders@4evermemoriesrecordstore.com',
          to: form.email,
          reply_to: '4evermemoriesrecordstore@gmail.com',
          subject: '🎵 Thank You For Your Purchase - 4 Ever Memories',
          html:
            '<!DOCTYPE html><html><body style="background:#0d0d0d;font-family:Georgia,serif;padding:40px 20px;">' +
            '<div style="max-width:700px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">' +
            '<div style="background:#0a0a0a;padding:24px;border-bottom:1px solid #2a2a2a;">' +
            '<div style="font-size:22px;color:#c9a84c;font-weight:700;">🎵 Thank You For Your Purchase!</div>' +
            '</div><div style="padding:32px;color:#e8d5b0;font-size:16px;line-height:1.7;">' +
            '<p>Hi ' + form.name + ',</p>' +
            '<p>Thank you for your purchase from 4 Ever Memories Record Store.</p>' +
            '<p>Here is a recap of what you purchased:</p>' +
            '<div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:8px;padding:16px;margin:18px 0;">' +
            itemsHtml +
            '<div style="margin-top:20px;color:#fff;font-size:18px;font-weight:700;">Total: $' + total.toFixed(2) + '</div>' +
            '</div>' +
            '<p>Your order is now being carefully prepared for shipment.</p>' +
            '<p>You will receive tracking information once your order ships.</p>' +
            '<p style="margin-top:30px;">We truly appreciate your support of our independent record store.</p>' +
            '<p style="margin-top:30px;color:#c9a84c;font-weight:700;">4 Ever Memories Record Store</p>' +
            '</div></div></body></html>',
        }),
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    return res.status(200).json({ success: true, paymentUrl, freeShipping, total });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed', message: err.message });
  }
}
