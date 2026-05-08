/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'supabase.co',
      'supabase.in',
      'img.discogs.com',
    ],
  },
  env: {
    NEXT_PUBLIC_STORE_NAME: '4 Ever Memories Records',
  },
}

module.exports = nextConfig
