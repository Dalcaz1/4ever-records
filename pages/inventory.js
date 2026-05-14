# Find Your Tunes — Full Product Roadmap
**Last Updated:** May 13, 2026

---

## CURRENT STATE (Live at findyourtunes.com)
- Photo scan with CameraModal (no OK prompt)
- Format + sleeve type selection
- Manual search by artist/title/album
- Market value range (no source names shown)
- In-stock check against 4ER inventory
- YouTube preview
- PWA installable on Android and iPhone
- Powered by 4 Ever Memories branding

---

## TIER 1 — FREE (Current + Near Term)

### 1. Barcode Scanning
**How it works:**
- User points camera at barcode on record sleeve or CD case
- App reads the UPC/EAN barcode
- Looks up barcode in Open Library, Discogs, or MusicBrainz API (all free)
- Auto-fills artist, title, label, year, format
- Falls back to photo scan if barcode not found

**Tech needed:**
- ZXing.js or QuaggaJS — free barcode reading library (works in browser, no app store needed)
- Discogs barcode lookup: `api.discogs.com/database/search?barcode=XXXX`
- Open Library ISBN lookup for CDs with ISBN codes

**Add to scan flow as a third option:**
- 📷 Scan Label (current)
- 📷 Scan Barcode (new)
- 🔍 Search by Name (current)

---

## TIER 2 — PREMIUM ($4.99/month or $39.99/year)

### 2. Personal Collection Manager
User builds their own catalog — what they own, what it's worth, what they want.

**Features:**
- Scan or search to add records to My Collection
- Track condition, purchase price, current market value
- Total collection value dashboard
- Want List — records they're looking for
- Collection sharing (public link to share with buyers)
- Export to CSV
- Virtual shelves by genre, format, era, artist

**Tech needed:**
- Supabase table: user_collections (user_id, record_data, condition, purchase_price, added_date)
- Auth: Supabase Auth (email/password or Google login)
- No additional API costs

### 3. Sell My Record — One-Click Listing
User scans or searches a record → clicks Sell This Record → pre-filled listing ready to post.

**Initial Setup (one time per user):**
User enters their seller accounts in Profile Settings:
- eBay username + OAuth token
- Discogs username + OAuth token
- Amazon seller ID
- Facebook Marketplace (manual — no API)

**Sell Flow:**
1. Scan or search record → confirm identification
2. Tap "Sell This Record →"
3. Choose platform(s) from their connected accounts
4. Review pre-filled listing:
   - Title (from scan)
   - Description (AI-generated from scan data)
   - Photos (from scan — already taken)
   - Condition (from scan)
   - Price (from market value range — user adjusts)
   - Shipping (pre-filled from their profile)
5. One tap to post to each selected platform

**APIs needed:**
- eBay Sell API (separate approval from Browse API — apply at developer.ebay.com)
- Discogs OAuth + Marketplace API
- Amazon SP-API (requires seller account approval)

**Revenue:** Higher subscription tier or per-listing fee ($0.25-0.50 per successful listing)

---

## TIER 3 — ADVANCED PRICING DATA

### 4. Expanded Pricing Sources
Current: Discogs median + eBay Browse API

**Add these sources:**
- **Popsike** — tracks completed vinyl auction results going back decades. No public API but scrapeable. Best source for rare pressing auction history.
- **130point.com** — tracks eBay completed sales by specific pressing. More accurate than live eBay listings.
- **eBay Sold Listings** — we currently show active listings, not completed sales. Sold prices are more accurate. Available via eBay Browse API with `filter=soldItemsOnly`.
- **Discogs Sales History** — actual sale prices (not just listed prices). Available via Discogs API.
- **MusicStack** — independent marketplace, good for UK/European pricing.

**Display:** Still show clean range to user — just more data points behind the scenes = more accurate range.

### 5. Pressing Rarity Score
Using Discogs want/have ratio + sales history + PSA-style population data:
- 🔥 Highly Sought — wants >> haves, sells fast
- 📊 Steady Market — balanced supply/demand
- 💤 Slow Mover — more supply than demand
- ⭐ Original Pressing Premium — worth X% more than reissue

---

## TIER 4 — PLAY STORE & MONETIZATION

### 6. Google Play Store Submission
**Path:** PWABuilder.com (no coding needed)
1. Go to pwabuilder.com
2. Enter findyourtunes.com
3. Click Android → Generate APK
4. Download the APK package
5. Go to play.google.com/console ($25 one-time fee)
6. Create new app → Upload APK → Fill in store listing
7. Submit for review (1-3 days)

**Store listing needs:**
- App title: Find Your Tunes
- Short description (80 chars): Scan any record. Know its value instantly.
- Long description (4000 chars): Full feature list
- Category: Music & Audio
- Content rating: Everyone
- Screenshots: 2 minimum (already need to take these)
- Feature graphic: 1024x500 ✅ (already generated)
- Icon 512x512 ✅ (already generated)

### 7. Apple App Store Submission
Requires:
- Apple Developer Account ($99/year)
- Mac computer or access to Xcode (can use cloud Mac service)
- Same PWA wrapped as iOS app using Capacitor or Cordova
- More restrictive review process than Google

**Recommendation:** Launch on Google Play first, prove revenue, then invest in Apple.

### 8. Subscription Paywall Implementation
**Tech stack:**
- Stripe for payments (already have Square for 4ER — Stripe is better for subscriptions)
- Supabase Auth for user accounts
- Middleware check on premium API routes

**Pricing tiers:**
- Free: Scan/search, value lookup, in-stock check, YouTube preview
- Premium $4.99/month: Collection manager, sell listings, expanded pricing, rarity score
- Annual $39.99/year: Same as premium, save $20

---

## TIER 5 — INTERNATIONAL EXPANSION

### 9. Multi-Language Support
**Priority languages based on vinyl markets:**
1. Spanish — huge market, especially Tejano/Latin vinyl (you already have label knowledge)
2. Portuguese — Brazil is a massive vinyl market
3. German — Germany is #1 vinyl market in Europe
4. Japanese — Japan pressing premiums are significant, huge collector base
5. French, Italian, Dutch — strong European collector markets

**Tech approach:**
- i18n library (next-i18next) — translates UI strings
- AI scan already reads Spanish labels ✅
- Add language detection from browser settings
- Manual translations for UI (can use DeepL API — very accurate)

**Revenue opportunity:** Spanish-language version alone could tap the entire Latin America market where NO competitor has a Spanish-first product.

---

## COMPETITIVE POSITIONING

| Feature | FYT | Record Scanner | VinylSnap | Vinyl Identifier |
|---|---|---|---|---|
| Photo scan | ✅ | ✅ | ✅ | ✅ |
| Barcode scan | 🔜 | ✅ | ❌ | ✅ |
| Original vs reissue ID | ✅ BEST | ❌ | ❌ | ❌ |
| Spanish labels | ✅ | ❌ | ❌ | ❌ |
| Live eBay pricing | ✅ | ❌ | ✅ | ❌ |
| Sell listing | 🔜 | ❌ | ❌ | ❌ |
| Buy from store | ✅ | ❌ | ❌ | ❌ |
| Collection manager | 🔜 | ✅ | ✅ | ✅ |
| Free tier | ✅ | Limited | Limited | Limited |
| Play Store | 🔜 | ✅ | ✅ | ✅ |

---

## BUILD ORDER (Recommended)

### Phase 1 — This Month
1. Fix FYT → 4ER direct record modal (critical bug)
2. Add barcode scanning
3. Submit to Google Play via PWABuilder

### Phase 2 — Next Month
4. Supabase Auth + user accounts
5. Collection manager (My Records)
6. Expanded pricing sources (eBay sold + Discogs sales history)

### Phase 3 — Month 3
7. Sell My Record — eBay listing first (largest market)
8. Stripe subscription paywall
9. Spanish language UI

### Phase 4 — Month 4+
10. Discogs + Amazon sell integration
11. Apple App Store
12. Rarity score
13. Additional languages

---

## REVENUE PROJECTIONS

| Milestone | Users | Revenue/Month |
|---|---|---|
| Launch on Play Store | 500 free | $0 |
| Add premium tier | 500 free + 50 premium | $250/mo |
| Sell feature launched | 1000 free + 200 premium | $1,000/mo |
| Spanish market expansion | 5000 free + 500 premium | $2,500/mo |
| Full platform | 10,000 free + 2,000 premium | $10,000/mo |
