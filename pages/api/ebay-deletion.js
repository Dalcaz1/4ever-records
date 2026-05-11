export default async function handler(req, res) {
  if (req.method === 'GET') {
    const challenge = req.query.challenge_code;
    if (!challenge) {
      return res.status(400).json({ error: 'No challenge code' });
    }

    const crypto = require('crypto');
    const verificationToken = process.env.EBAY_DELETION_TOKEN;
    const endpoint = 'https://www.4evermemoriesrecordstore.com/api/ebay-deletion';

    const hash = crypto
      .createHash('sha256')
      .update(challenge + verificationToken + endpoint)
      .digest('hex');

    return res.status(200).json({ challengeResponse: hash });
  }

  if (req.method === 'POST') {
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
