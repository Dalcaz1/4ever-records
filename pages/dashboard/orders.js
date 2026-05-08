// pages/dashboard/orders.js — Order management
import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import DashboardLayout from '../../components/DashboardLayout'
import { format } from 'date-fns'

const STATUS_COLORS = {
  pending:   'badge-pending',
  paid:      'badge-shipped',
  shipped:   'badge-shipped',
  delivered: 'badge-delivered',
  cancelled: 'badge-cancelled',
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const updateStatus = async (id, status) => {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const stats = {
    total:     orders.reduce((s, o) => s + parseFloat(o.total || 0), 0),
    count:     orders.length,
    pending:   orders.filter(o => o.status === 'pending' || o.status === 'paid').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
  }

  return (
    <Layout title="Orders">
      <DashboardLayout active="orders">
        <h2 style={{ color: 'var(--navy)', marginBottom: '1.5rem', fontFamily: "'Playfair Display',serif" }}>Orders</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">${stats.total.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats.count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Need Action</div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-note">pending / paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Shipped</div>
            <div className="stat-value">{stats.shipped}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-pills" style={{ marginBottom: '1rem' }}>
          {['all','pending','paid','shipped','delivered','cancelled'].map(s => (
            <button key={s} className={`filter-pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading orders...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No orders yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Shipping</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {order.order_number}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{order.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.customer_email}</div>
                    </td>
                    <td>
                      <div>{order.record_snapshot?.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.record_snapshot?.artist}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>{order.shipping_method}</div>
                      {order.usps_tracking && (
                        <div style={{ color: 'var(--text-muted)' }}>#{order.usps_tracking}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: '500' }}>${parseFloat(order.total).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[order.status] || 'badge-pending'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <select
                        value={order.status}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardLayout>
    </Layout>
  )
}
