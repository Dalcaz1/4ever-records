// lib/discogs.js — Vinyl pricing from Discogs marketplace
import axios from 'axios'

const DISCOGS_BASE = 'https://api.discogs.com'
const TOKEN = process.env.DISCOGS_TOKEN

const discogsClient = axios.create({
  baseURL: DISCOGS_BASE,
  headers: {
    Authorization: `Discogs token=${TOKEN}`,
    'User-Agent': '4EverMemoriesRecords/1.0 +https://4evermemoriesrecords.com',
  },
})

// Search Discogs for a record by artist + title
export async function searchDiscogs(artist, title) {
  try {
    const { data } = await discogsClient.get('/database/search', {
      params: {
        artist,
        release_title: title,
        type: 'release',
        format: 'Vinyl',
        per_page: 5,
      },
    })
    return data.results || []
  } catch (err) {
    console.error('Discogs search error:', err.message)
    return []
  }
}

// Get marketplace pricing stats for a specific release
export async function getDiscogsPrice(releaseId) {
  try {
    const { data } = await discogsClient.get(`/marketplace/price_suggestions/${releaseId}`)
    // Returns suggested prices per condition
    return {
      mint:      data['Mint (M)']?.value,
      nearMint:  data['Near Mint (NM or M-)']?.value,
      vgPlus:    data['Very Good Plus (VG+)']?.value,
      vg:        data['Very Good (VG)']?.value,
      good:      data['Good (G)']?.value,
    }
  } catch (err) {
    console.error('Discogs price error:', err.message)
    return null
  }
}

// Get recent sales history for a release
export async function getDiscogsHistory(releaseId) {
  try {
    const { data } = await discogsClient.get(
      `/marketplace/stats/${releaseId}`
    )
    return {
      lowestPrice:   data.lowest_price?.value,
      numForSale:    data.num_for_sale,
      blocked:       data.blocked_from_sale,
    }
  } catch (err) {
    console.error('Discogs history error:', err.message)
    return null
  }
}

// Main function: search + get price for artist/title/condition
export async function getRecommendedPrice(artist, title, condition = 'VG+') {
  const results = await searchDiscogs(artist, title)
  if (!results.length) return null

  const release = results[0]
  const [prices, stats] = await Promise.all([
    getDiscogsPrice(release.id),
    getDiscogsHistory(release.id),
  ])

  const conditionMap = {
    'M':   prices?.mint,
    'NM':  prices?.nearMint,
    'VG+': prices?.vgPlus,
    'VG':  prices?.vg,
    'G':   prices?.good,
  }

  const suggested = conditionMap[condition]

  return {
    discogsId:    release.id,
    title:        release.title,
    year:         release.year,
    label:        release.label?.[0],
    country:      release.country,
    thumb:        release.thumb,
    suggestedPrice: suggested ? parseFloat(suggested.toFixed(2)) : null,
    lowestListed:   stats?.lowestPrice ? parseFloat(stats.lowestPrice.toFixed(2)) : null,
    numForSale:     stats?.numForSale,
    priceRange: suggested ? {
      low:  parseFloat((suggested * 0.85).toFixed(2)),
      high: parseFloat((suggested * 1.15).toFixed(2)),
    } : null,
    source: 'Discogs',
  }
}
