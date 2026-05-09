import { Client } from 'square';
import { randomUUID } from 'crypto';

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: 'production',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cart, form, total } = req.body;

  if (!cart || cart.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  try {
    // Build line items for Square
    const lineItems = cart.map(item => ({
      name: `${item.t} - ${item.a} (${item.c})`,
      quantity: String(item.qty),
      basePriceMoney: {
        amount: BigInt(Math.round(item.p * 100)),
        currency: 'USD',
      },
    }));

    // Add shipping as a line item
    const shipping = total - cart.reduce((s, i) => s + i.p * i.qty, 0);
    if (shipping > 0) {
      lineItems.push({
        name: 'Shipping',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(Math.round(shipping * 100)),
          currency: 'USD',
        },
      });
    }

    // Create the order
    const orderResponse = await client.ordersApi.createOrder({
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems,
        state: 'OPEN',
      },
      idempotencyKey: randomUUID(),
    });

    if (orderResponse.result.errors) {
      return res.status(500).json({ error: 'Order creation failed', details: orderResponse.result.errors });
    }

    const orderId = orderResponse.result.order.id;
    const amountDue = orderResponse.result.order.totalMoney.amount;

    // Create a payment link for this order
    const paymentLinkResponse = await client.checkoutApi.createPaymentLink({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems,
      },
      checkoutOptions: {
        allowTipping: false,
        redirectUrl: `https://www.4evermemoriesrecordstore.com/success`,
        merchantSupportEmail: form.email,
        askForShippingAddress: false,
      },
      prePopulatedData: {
        buyerEmail: form.email,
        buyerPhoneNumber: '',
        buyerAddress: {
          addressLine1: form.address,
          locality: form.city,
          administrativeDistrictLevel1: form.state,
          postalCode: form.zip,
          country: 'US',
        },
      },
    });

    if (paymentLinkResponse.result.errors) {
      return res.status(500).json({ error: 'Payment link creation failed' });
    }

    const paymentUrl = paymentLinkResponse.result.paymentLink.url;

    return res.status(200).json({ success: true, paymentUrl, orderId });

  } catch (err) {
    console.error('Square checkout error:', err);
    return res.status(500).json({ error: 'Checkout failed', message: err.message });
  }
}
