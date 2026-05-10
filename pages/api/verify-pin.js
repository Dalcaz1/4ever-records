export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { pin } = req.body;
  const correctPin = process.env.ADMIN_PIN;
  
  if (!correctPin) return res.status(500).json({ error: 'PIN not configured' });
  if (pin === correctPin) return res.status(200).json({ success: true });
  
  // Small delay to prevent brute force
  await new Promise(r => setTimeout(r, 1000));
  return res.status(401).json({ success: false, error: 'Incorrect PIN' });
}
