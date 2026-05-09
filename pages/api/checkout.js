export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cart, form, total } = req.body;
  if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  try {
    const subtotal = cart.reduce((s, i) => s + i.p * i.qty, 0);
    const shipping = Math.round((total - subtotal) * 100) / 100;

    const lineItems = cart.map(item => ({
      name: `${item.t} - ${item.a} (${item.c})`,
      quantity: String(item.qty),
      base_price_money: {
        amount: Math.round(item.p * 100),
        currency: 'USD',
      },
    }));

    if (shipping > 0) {
      lineItems.push({
        name: 'Shipping',
        quantity: '1',
        base_price_money: {
          amount: Math.round(shipping * 100),
          currency: 'USD',
        },
      });
    }

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${accessToken}`,
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

    const paymentUrl = data.payment_link.url;
    return res.status(200).json({ success: true, paymentUrl });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed', message: err.message });
  }
}
