export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, request } = req.body;
  if (!name || !request) return res.status(400).json({ error: 'Name and request are required' });

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'orders@4evermemoriesrecordstore.com',
        to: '4evermemoriesrecordstore@gmail.com',
        reply_to: email || '4evermemoriesrecordstore@gmail.com',
        subject: '🎵 Record Request from ' + name,
        html: '<!DOCTYPE html><html><body style="background:#0d0d0d;font-family:Georgia,serif;padding:40px 20px;">' +
          '<div style="max-width:600px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">' +
          '<div style="background:#0a0a0a;padding:24px;border-bottom:1px solid #2a2a2a;">' +
          '<div style="font-size:20px;color:#c9a84c;font-weight:700;">🎵 New Record Request!</div>' +
          '</div>' +
          '<div style="padding:32px;">' +
          '<div style="background:#0a0a0a;border-radius:8px;padding:16px;margin-bottom:20px;">' +
          '<div style="font-size:11px;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Customer</div>' +
          '<div style="color:#e8d5b0;font-weight:700;font-size:16px;">' + name + '</div>' +
          (email ? '<div style="color:#888;margin-top:4px;">' + email + '</div>' : '') +
          (phone ? '<div style="color:#888;margin-top:4px;">' + phone + '</div>' : '') +
          '</div>' +
          '<div style="background:#0a1a0a;border:1px solid #1a3a1a;border-radius:8px;padding:16px;">' +
          '<div style="font-size:11px;color:#4ade80;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">They are looking for</div>' +
          '<div style="color:#e8d5b0;font-size:15px;line-height:1.6;">' + request + '</div>' +
          '</div>' +
          '</div></div></body></html>',
      }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Record request error:', err);
    return res.status(500).json({ error: err.message });
  }
}
