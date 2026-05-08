# 4 Ever Memories Records — Website

A full-featured vinyl record store with AI pricing, Square payments, USPS shipping, and inventory management.

---

## Quick Start (Get Live in Under 30 Minutes)

### Step 1 — Accounts to Create (all free)
1. **Vercel** — https://vercel.com (free hosting, 1-click deploy)
2. **Supabase** — https://supabase.com (free database)
3. **Square** — https://squareup.com (payments + bank deposits)
4. **USPS Web Tools** — https://www.usps.com/business/web-tools-apis (free shipping API)
5. **Discogs API** — https://www.discogs.com/settings/developers (free pricing data)

### Step 2 — Install & Run Locally
```bash
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```
Visit http://localhost:3000

### Step 3 — Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Your site is live! Vercel gives you a free URL like `4ever-memories.vercel.app`.
To use your own domain (e.g. `4evermemoriesrecords.com`), add it in the Vercel dashboard.

---

## Environment Variables (.env.local)

```
# Supabase (database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Square (payments)
NEXT_PUBLIC_SQUARE_APP_ID=your_square_app_id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your_square_location_id
SQUARE_ACCESS_TOKEN=your_square_access_token

# Discogs (vinyl pricing)
DISCOGS_TOKEN=your_discogs_token

# USPS (shipping)
USPS_USER_ID=your_usps_user_id

# Anthropic (AI photo identification)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Site
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/people/4-Ever-Memories-Record-Store/61561753862914/
```

---

## Features
- 📸 AI photo identification (points camera at record → auto-fills all details)
- 💰 Live pricing from Discogs & eBay
- 🛒 Full customer storefront with search by artist, title, label
- 📦 USPS shipping rate calculator + label generation
- 💳 Square payments → direct bank deposit
- 📊 Seller dashboard with reports, inventory, orders
- 🔢 Auto-assigned inventory numbers (4EMR-0001, 4EMR-0002…)
- 📱 Mobile-friendly — works on your phone to photograph records
- 🔗 Facebook integration link in header

---

## File Structure
```
4ever-memories-records/
├── pages/
│   ├── index.js          ← Customer storefront
│   ├── record/[id].js    ← Individual record page
│   ├── cart.js           ← Shopping cart & checkout
│   ├── dashboard/
│   │   ├── index.js      ← Seller dashboard home
│   │   ├── add.js        ← Add new record (with AI scan)
│   │   ├── inventory.js  ← Inventory management
│   │   ├── orders.js     ← Order management
│   │   └── reports.js    ← Sales reports
│   └── api/
│       ├── identify.js   ← AI record identification
│       ├── pricing.js    ← Discogs + eBay pricing
│       ├── shipping.js   ← USPS rates
│       ├── checkout.js   ← Square payment processing
│       └── orders.js     ← Order management
├── components/
│   ├── Layout.js         ← Site header/footer
│   ├── RecordCard.js     ← Record display card
│   ├── SearchBar.js      ← Search component
│   └── Cart.js           ← Cart sidebar
├── lib/
│   ├── supabase.js       ← Database client
│   ├── square.js         ← Payment client
│   ├── discogs.js        ← Pricing API
│   └── usps.js           ← Shipping API
└── styles/
    └── globals.css       ← Site-wide styles
```
