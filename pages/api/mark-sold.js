export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Find the pending order
    const { data: order, error: orderError } = await supabase
      .from('pending_orders')
      .select('*')
      .eq('square_order_id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Parse the cart and form
    const cart = JSON.parse(order.cart);
    const form = JSON.parse(order.form);
    const ids = cart.map(i => i.id);

    // Fetch full record details including SKU from Supabase
    const { data: dbRecords } = await supabase
      .from('records')
      .select('id, sku, title, artist, condition')
      .in('id', ids);

    // Mark all purchased records as inactive (sold)
    const { error: updateError } = await supabase
      .from('records')
      .update({ active: false, qty: 0 })
      .in('id', ids);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({ error: 'Failed to mark records as sold' });
    }

    // Delete the pending order so it cannot be processed twice
    await supabase
      .from('pending_orders')
      .delete()
      .eq('square_order_id', orderId);

    // Build order items HTML for CUSTOMER email (no SKU needed)
    const customerItemsHtml = cart.map(item => {
      const price = parseFloat(item.price || item.p);
      const title = item.title || item.t;
      const artist = item.artist || item.a;
      const condition = item.condition || item.c;
      return '<tr>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #e8d5b0;">' + title + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #888; font-style: italic;">' + artist + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #aaa; text-align: center;">' + condition + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #c9a84c; text-align: right; font-weight: bold;">$' + (price * item.qty).toFixed(2) + '</td>' +
        '</tr>';
    }).join('');

    // Build order items HTML for OWNER email (includes SKU)
    const ownerItemsHtml = cart.map(item => {
      const price = parseFloat(item.price || item.p);
      const title = item.title || item.t;
      const artist = item.artist || item.a;
      const condition = item.condition || item.c;
      const dbRecord = dbRecords ? dbRecords.find(r => r.id === item.id) : null;
      const sku = dbRecord ? dbRecord.sku : 'N/A';
      return '<tr>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #c9a84c; font-family: monospace; font-weight: 700; font-size: 13px;">' + sku + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #e8d5b0;">' + title + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #888; font-style: italic;">' + artist + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #aaa; text-align: center;">' + condition + '</td>' +
        '<td style="padding: 10px; border-bottom: 1px solid #2a2a2a; color: #c9a84c; text-align: right; font-weight: bold;">$' + (price * item.qty).toFixed(2) + '</td>' +
        '</tr>';
    }).join('');

    const totalQty = cart.reduce((s, i) => s + i.qty, 0);
    const shipping = 5 + (totalQty - 1);
    const subtotal = cart.reduce((s, i) => s + parseFloat(i.price || i.p) * i.qty, 0);
    const total = subtotal + shipping;

    // SEND CUSTOMER CONFIRMATION EMAIL
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'orders@4evermemoriesrecordstore.com',
        to: form.email,
        reply_to: '4evermemoriesrecordstore@gmail.com',
        subject: 'Order Confirmed — 4 Ever Memories Records',
        html: '<!DOCTYPE html><html><body style="background:#0d0d0d; font-family: Georgia, serif; padding: 40px 20px;">' +
          '<div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #2a2a2a; border-radius: 16px; overflow: hidden;">' +
          '<div style="background: #0a0a0a; padding: 24px; text-align: center; border-bottom: 1px solid #2a2a2a;">' +
          '<div style="font-size: 24px; color: #e8d5b0; font-weight: 700;">4 Ever Memories Records</div>' +
          '<div style="font-size: 11px; color: #c9a84c; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px;">Vinyl · Memories · Music</div>' +
          '</div>' +
          '<div style="padding: 32px;">' +
          '<div style="font-size: 32px; text-align: center; margin-bottom: 16px;">🎉</div>' +
          '<h1 style="color: #c9a84c; font-size: 22px; text-align: center; margin-bottom: 8px;">Order Confirmed!</h1>' +
          '<p style="color: #888; text-align: center; font-style: italic; margin-bottom: 24px;">Thank you ' + form.name + '! Your records are on their way.</p>' +
          '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">' +
          '<thead><tr style="background: #0a0a0a;">' +
          '<th style="padding: 10px; text-align: left; color: #555; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Title</th>' +
          '<th style="padding: 10px; text-align: left; color: #555; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Artist</th>' +
          '<th style="padding: 10px; text-align: center; color: #555; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Cond.</th>' +
          '<th style="padding: 10px; text-align: right; color: #555; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Price</th>' +
          '</tr></thead>' +
          '<tbody>' + customerItemsHtml + '</tbody>' +
          '</table>' +
          '<div style="background: #0a0a0a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">' +
          '<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #666;">Subtotal</span><span style="color: #e8d5b0;">$' + subtotal.toFixed(2) + '</span></div>' +
          '<div style="display: flex; justify-content: space-between; margin-bottom: 12px;"><span style="color: #666;">Shipping</span><span style="color: #e8d5b0;">$' + shipping.toFixed(2) + '</span></div>' +
          '<div style="border-top: 1px solid #2a2a2a; padding-top: 12px; display: flex; justify-content: space-between;"><span style="color: #e8d5b0; font-weight: 700; font-size: 16px;">Total</span><span style="color: #c9a84c; font-weight: 700; font-size: 18px;">$' + total.toFixed(2) + '</span></div>' +
          '</div>' +
          '<div style="background: #0a0a0a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">' +
          '<div style="font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">Shipping To</div>' +
          '<div style="color: #e8d5b0;">' + form.name + '</div>' +
          '<div style="color: #888;">' + form.address + '</div>' +
          '<div style="color: #888;">' + form.city + ', ' + form.state + ' ' + form.zip + '</div>' +
          '</div>' +
          '<p style="color: #555; font-size: 12px; text-align: center; font-style: italic;">Questions? Reply to this email or find us on Facebook.</p>' +
          '</div></div></body></html>',
      }),
    });

    // SEND STORE OWNER NOTIFICATION EMAIL (with SKU)
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'orders@4evermemoriesrecordstore.com',
        to: '4evermemoriesrecordstore@gmail.com',
        subject: '🛒 New Order — $' + total.toFixed(2) + ' from ' + form.name,
        html: '<!DOCTYPE html><html><body style="background:#0d0d0d; font-family: Georgia, serif; padding: 40px 20px;">' +
          '<div style="max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #2a2a2a; border-radius: 16px; overflow: hidden;">' +
          '<div style="background: #0a0a0a; padding: 24px; border-bottom: 1px solid #2a2a2a;">' +
          '<div style="font-size: 20px; color: #c9a84c; font-weight: 700;">🛒 New Order Received!</div>' +
          '<div style="font-size: 13px; color: #555; margin-top: 4px;">Square Order ID: ' + orderId + '</div>' +
          '</div>' +
          '<div style="padding: 32px;">' +
          '<div style="background: #0a0a0a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">' +
          '<div style="font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">Customer</div>' +
          '<div style="color: #e8d5b0; font-weight: 700;">' + form.name + '</div>' +
          '<div style="color: #888;">' + form.email + '</div>' +
          '<div style="color: #888; margin-top: 8px;">' + form.address + '</div>' +
          '<div style="color: #888;">' + form.city + ', ' + form.state + ' ' + form.zip + '</div>' +
          '</div>' +
          '<div style="font-size: 11px; color: #555; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">📦 Pull These Records</div>' +
          '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">' +
          '<thead><tr style="background: #0a0a0a;">' +
          '<th style="padding: 10px; text-align: left; color: #c9a84c; font-size: 11px; text-transform: uppercase;">SKU</th>' +
          '<th style="padding: 10px; text-align: left; color: #555; font-size: 11px; text-transform: uppercase;">Title</th>' +
          '<th style="padding: 10px; text-align: left; color: #555; font-size: 11px; text-transform: uppercase;">Artist</th>' +
          '<th style="padding: 10px; text-align: center; color: #555; font-size: 11px; text-transform: uppercase;">Cond.</th>' +
          '<th style="padding: 10px; text-align: right; color: #555; font-size: 11px; text-transform: uppercase;">Price</th>' +
          '</tr></thead>' +
          '<tbody>' + ownerItemsHtml + '</tbody>' +
          '</table>' +
          '<div style="background: #1a1a0a; border: 2px solid #c9a84c; border-radius: 8px; padding: 16px; text-align: center;">' +
          '<div style="font-size: 13px; color: #888; margin-bottom: 4px;">Order Total</div>' +
          '<div style="font-size: 28px; color: #c9a84c; font-weight: 700;">$' + total.toFixed(2) + '</div>' +
          '</div>' +
          '</div></div></body></html>',
      }),
    });

    return res.status(200).json({ success: true, sold: ids.length });

  } catch (err) {
    console.error('Mark sold error:', err);
    return res.status(500).json({ error: err.message });
  }
}
