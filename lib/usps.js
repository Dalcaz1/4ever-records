// lib/usps.js — USPS shipping rates and label generation
import axios from 'axios'
import xml2js from 'xml2js'

const USPS_BASE = 'https://secure.shippingapis.com/ShippingAPI.dll'
const USER_ID   = process.env.USPS_USER_ID
const SHIP_FROM_ZIP = process.env.NEXT_PUBLIC_SHIP_FROM_ZIP || '78701'

// Parse USPS XML response
async function parseXml(xml) {
  return xml2js.parseStringPromise(xml, { explicitArray: false })
}

// Get USPS shipping rates for a package
export async function getShippingRates(toZip, weightOz = 7) {
  const pounds = Math.floor(weightOz / 16)
  const ounces = weightOz % 16

  // Standard vinyl mailer dimensions (12.5" x 12.5" x 1")
  const xml = `
    <RateV4Request USERID="${USER_ID}">
      <Revision>2</Revision>
      <Package ID="1">
        <Service>ALL</Service>
        <FirstClassMailType>PARCEL</FirstClassMailType>
        <ZipOrigination>${SHIP_FROM_ZIP}</ZipOrigination>
        <ZipDestination>${toZip}</ZipDestination>
        <Pounds>${pounds}</Pounds>
        <Ounces>${ounces}</Ounces>
        <Container>VARIABLE</Container>
        <Width>13</Width>
        <Length>13</Length>
        <Height>1</Height>
        <Girth>0</Girth>
        <Machinable>true</Machinable>
      </Package>
    </RateV4Request>
  `

  try {
    const { data } = await axios.get(USPS_BASE, {
      params: { API: 'RateV4', XML: xml },
    })

    const parsed = await parseXml(data)
    const postage = parsed?.RateV4Response?.Package?.Postage

    if (!postage) return getFallbackRates()

    const rates = []
    const postageArr = Array.isArray(postage) ? postage : [postage]

    for (const p of postageArr) {
      const name = p.MailService || ''
      const rate = parseFloat(p.Rate || 0)

      // Only show relevant services for vinyl records
      if (name.includes('Priority Mail') && !name.includes('Express')) {
        rates.push({ service: 'USPS Priority Mail', rate, days: '1-3', name })
      } else if (name.includes('Media Mail')) {
        rates.push({ service: 'USPS Media Mail', rate, days: '2-8', name })
      } else if (name.includes('Ground Advantage')) {
        rates.push({ service: 'USPS Ground Advantage', rate, days: '2-5', name })
      }
    }

    // Always include Media Mail as it's the cheapest for records
    if (!rates.find(r => r.service.includes('Media'))) {
      rates.push({ service: 'USPS Media Mail', rate: 3.65, days: '2-8', name: 'Media Mail' })
    }

    return rates.sort((a, b) => a.rate - b.rate)
  } catch (err) {
    console.error('USPS rates error:', err.message)
    return getFallbackRates()
  }
}

// Fallback rates if USPS API is unavailable
function getFallbackRates() {
  return [
    { service: 'USPS Media Mail',       rate: 3.65, days: '2-8' },
    { service: 'USPS Ground Advantage', rate: 5.40, days: '2-5' },
    { service: 'USPS Priority Mail',    rate: 8.95, days: '1-3' },
  ]
}

// Validate a ZIP code format
export function isValidZip(zip) {
  return /^\d{5}(-\d{4})?$/.test(zip)
}

// Calculate shipping for checkout (returns selected rate)
export async function calculateShipping(toZip, shippingMethod, weightOz = 7) {
  const rates = await getShippingRates(toZip, weightOz)
  const selected = rates.find(r => r.service === shippingMethod) || rates[0]
  return selected
}

// Note on label printing:
// For production label generation, integrate with:
// - Pirateship (pirateship.com) — best rates, simple API
// - EasyPost (easypost.com) — robust multi-carrier API
// - Shippo (goshippo.com) — popular with small sellers
// All three connect to your Square/bank account for billing
// and generate USPS-compliant labels with tracking numbers
export async function generateLabel(order) {
  // TODO: Integrate with Pirateship or EasyPost
  // This requires a separate account from USPS Web Tools
  // Pirateship is recommended — free account, deep discounts
  console.log('Label generation: integrate with Pirateship at pirateship.com')
  return {
    trackingNumber: null,
    labelUrl: null,
    message: 'Integrate with Pirateship for label printing',
  }
}
