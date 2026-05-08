// components/DashboardLayout.js — Seller dashboard sidebar nav
import Link from 'next/link'

const NAV = [
  { href: '/dashboard',           label: 'Overview',   icon: '◈' },
  { href: '/dashboard/add',       label: 'Add Record', icon: '+' },
  { href: '/dashboard/inventory', label: 'Inventory',  icon: '≡' },
  { href: '/dashboard/orders',    label: 'Orders',     icon: '◻' },
  { href: '/dashboard/reports',   label: 'Reports',    icon: '▦' },
]

export default function DashboardLayout({ children, active }) {
  return (
    <div className="container" style={{ padding: '2rem 1.5rem' }}>
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside>
          <div className="dash-sidebar">
            <div style={{ color: 'var(--gold)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.25rem', fontFamily: "'Crimson Pro',serif" }}>
              Seller Dashboard
            </div>
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`dash-nav-link ${active === n.href.split('/').pop() ? 'active' : ''}`}
              >
                <span style={{ width: '20px', textAlign: 'center', fontSize: '16px' }}>{n.icon}</span>
                {n.label}
              </Link>
            ))}
            <div style={{ borderTop: '1px solid #2a3a5a', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <Link href="/" className="dash-nav-link" style={{ fontSize: '13px' }}>
                <span>←</span> Back to Store
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
