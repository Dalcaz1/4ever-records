// components/Layout.js — Site header and footer
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

const FB_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL ||
  'https://www.facebook.com/people/4-Ever-Memories-Record-Store/61561753862914/'

export default function Layout({ children, title, description }) {
  const router = useRouter()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('4emr-cart') || '[]')
    setCartCount(cart.length)

    const handler = () => {
      const c = JSON.parse(localStorage.getItem('4emr-cart') || '[]')
      setCartCount(c.length)
    }
    window.addEventListener('cart-updated', handler)
    return () => window.removeEventListener('cart-updated', handler)
  }, [])

  const isActive = (path) => router.pathname === path || router.pathname.startsWith(path + '/')
  const isDash = router.pathname.startsWith('/dashboard')

  return (
    <>
      <Head>
        <title>{title ? `${title} | 4 Ever Memories Records` : '4 Ever Memories Records — Vinyl Record Store'}</title>
        <meta name="description" content={description || 'Handpicked vinyl records — classics, rarities, and hidden gems. Buy online with fast USPS shipping.'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="4 Ever Memories Records" />
        <meta property="og:description" content="Handpicked vinyl records — find your next favorite album." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="site-logo">
            <span className="logo-name">4 Ever Memories Records</span>
            <span className="logo-tagline">Vinyl · Memories · Music</span>
          </Link>

          <nav className="header-nav">
            <Link href="/" className={`nav-link ${isActive('/') && !isDash ? 'active' : ''}`}>Store</Link>
            <Link href="/?genre=rock" className="nav-link">Rock</Link>
            <Link href="/?genre=jazz" className="nav-link">Jazz</Link>
            <Link href="/?genre=soul" className="nav-link">Soul</Link>
            <Link href="/?genre=classical" className="nav-link">Classical</Link>
            <Link href="/about" className="nav-link">About</Link>
          </nav>

          <div className="header-actions">
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="fb-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              Facebook
            </a>

            <Link href="/cart" className="cart-link" aria-label={`Cart (${cartCount} items)`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            {!isDash && (
              <Link href="/dashboard" className="btn btn-primary btn-sm" style={{textDecoration:'none'}}>
                Seller
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="logo-name" style={{color:'var(--gold)',fontFamily:"'Playfair Display',serif",fontSize:'22px',marginBottom:'10px'}}>
              4 Ever Memories Records
            </div>
            <p>Your source for handpicked vinyl records — classics, rarities, and the albums that shaped our lives. Every record carries a memory.</p>
            <a href={FB_URL} target="_blank" rel="noopener noreferrer" className="fb-btn" style={{display:'inline-flex',marginTop:'16px'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              Visit us on Facebook
            </a>
          </div>

          <div className="footer-col">
            <h4>Browse</h4>
            <Link href="/?genre=rock">Rock</Link>
            <Link href="/?genre=jazz">Jazz</Link>
            <Link href="/?genre=soul">Soul / R&B</Link>
            <Link href="/?genre=classical">Classical</Link>
            <Link href="/?genre=folk">Folk</Link>
            <Link href="/?genre=blues">Blues</Link>
          </div>

          <div className="footer-col">
            <h4>Info</h4>
            <Link href="/about">About Us</Link>
            <Link href="/shipping">Shipping Info</Link>
            <Link href="/grading">Record Grading</Link>
            <Link href="/returns">Returns</Link>
            <a href={`mailto:${process.env.NEXT_PUBLIC_STORE_EMAIL}`}>Contact Us</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} 4 Ever Memories Records. All rights reserved.</p>
          <p style={{color:'var(--gold)',fontSize:'12px',opacity:0.7}}>Powered by Square · USPS · Discogs</p>
        </div>
      </footer>

      <style jsx global>{`
        .site-footer { background: var(--navy-dark); }
        .footer-col a, .footer-brand p { color: #7a8ca0; }
        .footer-col a:hover { color: var(--gold-lt); }
        .footer-col h4 { color: var(--gold); font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 1rem; font-family: 'Crimson Pro', serif; font-weight: 500; }
      `}</style>
    </>
  )
}
