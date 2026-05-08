// pages/api/identify.js — AI photo identification of vinyl records
// Takes a base64 photo, returns artist/title/label/year + pricing
import Anthropic from '@anthropic-ai/sdk'
import { getRecommendedPrice } from '../../lib/discogs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, mediaType = 'image/jpeg' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' })

  try {
    // Step 1: Use Claude Vision to identify the record
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `You are an expert vinyl record identifier. Look at this photo of a vinyl record or album cover and extract the following information. Return ONLY a JSON object with no other text:

{
  "artist": "exact artist name as printed",
  "title": "exact album title as printed",
  "label": "record label name",
  "year": 1975,
  "genre": "rock|jazz|soul|classical|folk|blues|pop|country|reggae|electronic|other",
  "catalogNumber": "catalog number if visible",
  "country": "country of manufacture if visible",
  "notes": "any pressing details, edition info, or notable features",
  "confidence": "high|medium|low"
}

If you cannot read a field clearly, use null. Genre should be one of the listed options.`,
          },
        ],
      }],
    })

    let recordInfo
    try {
      const text = message.content[0].text.trim()
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
      recordInfo = JSON.parse(cleaned)
    } catch {
      return res.status(422).json({ error: 'Could not parse record from image' })
    }

    // Step 2: Fetch pricing from Discogs if we have artist + title
    let pricing = null
    if (recordInfo.artist && recordInfo.title) {
      pricing = await getRecommendedPrice(recordInfo.artist, recordInfo.title)
    }

    return res.status(200).json({
      record: recordInfo,
      pricing,
    })
  } catch (err) {
    console.error('Identify error:', err)
    return res.status(500).json({ error: 'Identification failed: ' + err.message })
  }
}
