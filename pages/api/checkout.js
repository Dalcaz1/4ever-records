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

    // Calculate server-side — free shipping over $100
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

    if (shipping > 0) {
      lineItems.push({
        name: 'Shipping (USPS Media Mail)',
        quantity: '1',
        base_price_money: {
          amount: Math.round(shipping * 100),
          currency: 'USD',
        },
      });
    } else {
      lineItems.push({
        name: 'Shipping — FREE on orders over $100',
        quantity: '1',
        base_price_money: {
          amount: 0,
          currency: 'USD',
        },
      });
    }

    const idempotencyKey = Date.now() + '-' + Math.random().toString(36).slice(2);

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': 'Bearer ' + accessToken,
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
    return res.status(200).json({ success: true, paymentUrl, freeShipping, total });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed', message: err.message });
  }
}
