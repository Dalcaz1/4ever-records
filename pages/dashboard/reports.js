// pages/dashboard/reports.js — Sales reports and analytics
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import DashboardLayout from '../../components/DashboardLayout'

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/records?limit=200').then(r => r.json()),
    ]).then(([ordersData, recordsData]) => {
      const orders = ordersData.orders || []
      const records = recordsData.records || []

      const sold = orders.filter(o => o.status !== 'cancelled')
      const gross = sold.reduce((s, o) => s + parseFloat(o.subtotal || 0), 0)
      const shipping = sold.reduce((s, o) => s + parseFloat(o.shipping_cost || 0), 0)
      const squareFees = gross * 0.029 + sold.length * 0.30
      const net = gross + shipping - squareFees

      // Genre breakdown from sold records
      const genreMap = {}
      sold.forEach(o => {
        const g = o.record_snapshot?.genre || 'other'
        genreMap[g] = (genreMap[g] || 0) + parseFloat(o.subtotal || 0)
      })
      const genreArr = Object.entries(genreMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
      const maxGenre = genreArr[0]?.[1] || 1

      setData({
        orders: sold,
        records,
        gross, shipping, squareFees, net,
        genreArr, maxGenre,
        avgOrder: sold.length ? gross / sold.length : 0,
        totalInventoryValue: records.reduce((s, r) => s + parseFloat(r.price || 0), 0),
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout title="Reports">
      <DashboardLayout active="reports">
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading reports...</div>
      </DashboardLayout>
    </Layout>
  )

  const d = data

  return (
    <Layout title="Reports">
      <DashboardLayout active="reports">
        <h2 style={{ color: 'var(--navy)', marginBottom: '1.5rem', fontFamily: "'Playfair Display',serif" }}>Sales Reports</h2>

        {/* Summary stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Gross Revenue</div>
            <div className="stat-value">${d.gross.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Records Sold</div>
            <div className="stat-value">{d.orders.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg. Sale Price</div>
            <div className="stat-value">${d.avgOrder.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Inventory Value</div>
            <div className="stat-value">${d.totalInventoryValue.toFixed(2)}</div>
            <div className="stat-note">{d.records.length} records listed</div>
          </div>
        </div>

        <div className="two-col" style={{ marginBottom: '2rem' }}>
          {/* Genre breakdown */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <div className="section-title">Sales by genre</div>
            {d.genreArr.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No sales yet.</p>
            ) : d.genreArr.map(([genre, amount]) => (
              <div key={genre} className="bar-row">
                <span className="bar-label" style={{ textTransform: 'capitalize' }}>{genre}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(amount / d.maxGenre) * 100}%` }}></div>
                </div>
                <span className="bar-value">${amount.toFixed(0)}</span>
              </div>
            ))}
          </div>

          {/* Payout summary */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <div className="section-title">Payout summary</div>
            {[
              ['Gross sales', `$${d.gross.toFixed(2)}`, ''],
              ['Square fees (2.9% + 30¢)', `-$${d.squareFees.toFixed(2)}`, 'var(--red)'],
              ['Shipping collected', `+$${d.shipping.toFixed(2)}`, '#1e6b3a'],
              ['Net to your account', `$${d.net.toFixed(2)}`, 'var(--navy)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <strong style={{ color: color || 'var(--text)' }}>{val}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Export hint */}
        <div style={{ background: 'var(--cream-dk)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', fontSize: '14px', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--navy)' }}>💡 Tip:</strong> For detailed tax reporting, download your complete transaction history from your Square Dashboard at{' '}
          <a href="https://squareup.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--navy)' }}>squareup.com</a>.
          Square generates 1099-K forms automatically for annual tax filing.
        </div>
      </DashboardLayout>
    </Layout>
  )
}
