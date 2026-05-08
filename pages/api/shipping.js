// pages/api/shipping.js — Get USPS shipping rates
import { getShippingRates, isValidZip } from '../../lib/usps'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { toZip, weightOz = 7 } = req.query

  if (!toZip) return res.status(400).json({ error: 'toZip is required' })
  if (!isValidZip(toZip)) return res.status(400).json({ error: 'Invalid ZIP code' })

  try {
    const rates = await getShippingRates(toZip, parseFloat(weightOz))
    return res.status(200).json({ rates })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
