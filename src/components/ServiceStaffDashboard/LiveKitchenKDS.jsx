import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Utensils, 
  UserCheck, 
  Sparkles,
  Flame,
  X
} from 'lucide-react';

export default function LiveKitchenKDS() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issue flag modal
  const [delayModalOrder, setDelayModalOrder] = useState(null);
  const [delayReason, setDelayReason] = useState('Kitchen ticket backlog');

  const loadOrders = () => {
    api.getOrders()
      .then(data => {
        // Keep active orders: placed, confirmed, preparing, ready
        setOrders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching staff orders:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
  }, [wsEvent]);

  const handleUpdateStatus = async (orderId, nextStatus) => {
    try {
      await api.updateOrderStatus(orderId, {
        status: nextStatus,
        user_name: currentUser?.full_name || 'Kitchen Staff',
        role: currentUser?.role || 'kitchen'
      });
      addToast(`Order #${orderId} moved to ${nextStatus.toUpperCase()}`, 'success');
      loadOrders();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleFlagDelay = async (e) => {
    e.preventDefault();
    if (!delayModalOrder) return;

    try {
      await api.reportOrderIssue(delayModalOrder.id, {
        reported_by: currentUser?.full_name || 'Kitchen Chef',
        issue_type: 'delay',
        description: delayReason,
        severity: 'medium'
      });
      addToast(`Order #${delayModalOrder.order_number} delay flagged to customer & management`, 'warning');
      setDelayModalOrder(null);
      loadOrders();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const activeOrders = orders.filter(o => ['placed', 'confirmed', 'preparing', 'ready'].includes(o.status));
  const completedOrders = orders.filter(o => ['served', 'completed'].includes(o.status)).slice(0, 5);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
            Kitchen Display System (KDS) & Order Bump Bar
          </h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time kitchen ticket queue • Click status buttons to advance tickets through preparation
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>
            {activeOrders.length} Active Tickets
          </span>
        </div>
      </div>

      {/* KDS Bump Bar Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading active kitchen queue...
        </div>
      ) : activeOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          All orders are served! Kitchen queue is clear.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {activeOrders.map(order => {
            const isPreparing = order.status === 'preparing';
            const isReady = order.status === 'ready';
            const isPlaced = order.status === 'placed';

            let headerBg = 'rgba(201, 151, 91, 0.2)';
            let borderColor = 'var(--border-subtle)';
            if (isPreparing) {
              headerBg = 'rgba(245, 158, 11, 0.25)';
              borderColor = 'rgba(245, 158, 11, 0.45)';
            } else if (isReady) {
              headerBg = 'rgba(16, 185, 129, 0.25)';
              borderColor = 'rgba(16, 185, 129, 0.45)';
            }

            return (
              <div
                key={order.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderColor,
                  overflow: 'hidden'
                }}
              >
                {/* Ticket Header */}
                <div style={{
                  padding: '14px 18px',
                  background: headerBg,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${borderColor}`
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
                      #{order.order_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Table: <strong style={{ color: 'var(--accent-gold)' }}>{order.table_number || 'Takeaway'}</strong> • {order.customer_name}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${isReady ? 'badge-success' : isPreparing ? 'badge-warning' : 'badge-gold'}`}>
                      {order.status.toUpperCase()}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ~{order.prep_time_estimate}m prep
                    </div>
                  </div>
                </div>

                {/* Ticket Items */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {order.items?.map((it, idx) => (
                    <div key={idx} style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(12, 9, 6, 0.7)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        <span>
                          <strong style={{ color: 'var(--accent-gold)', marginRight: '6px' }}>{it.quantity}x</strong>
                          {it.name}
                        </span>
                      </div>
                      {it.selected_options && Object.keys(it.selected_options).length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold-light)', marginTop: '2px' }}>
                          Options: {Object.values(it.selected_options).map(o => o.label).join(', ')}
                        </div>
                      )}
                      {it.special_instructions && (
                        <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '2px', fontWeight: 600 }}>
                          Note: "{it.special_instructions}"
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Special order note if any */}
                  {order.special_instructions && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#fbbf24',
                      background: 'rgba(245, 158, 11, 0.1)',
                      padding: '8px',
                      borderRadius: '6px'
                    }}>
                      Guest Request: {order.special_instructions}
                    </div>
                  )}

                  {/* Flag Delay button */}
                  <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <button
                      onClick={() => setDelayModalOrder(order)}
                      className="btn btn-outline"
                      style={{ width: '100%', padding: '6px', fontSize: '0.72rem', borderColor: '#f87171', color: '#f87171' }}
                    >
                      <AlertTriangle size={13} />
                      <span>Flag Potential Kitchen Delay</span>
                    </button>
                  </div>
                </div>

                {/* Bump Bar Action Buttons */}
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(12, 9, 6, 0.9)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  gap: '8px'
                }}>
                  {isPlaced && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                    >
                      Confirm Order
                    </button>
                  )}

                  {['placed', 'confirmed'].includes(order.status) && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'preparing')}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                    >
                      <ChefHat size={15} />
                      <span>Start Cooking</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'ready')}
                      className="btn btn-success"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Mark Ready for Waiter</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'served')}
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                    >
                      <Utensils size={15} />
                      <span>Serve to Table</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delay Modal */}
      {delayModalOrder && (
        <div className="modal-overlay" onClick={() => setDelayModalOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <form onSubmit={handleFlagDelay} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 className="font-serif" style={{ fontSize: '1.2rem', color: '#fff' }}>
                  Report Kitchen Ticket Delay
                </h4>
                <button type="button" onClick={() => setDelayModalOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Order #{delayModalOrder.order_number} for Table {delayModalOrder.table_number || 'T-2'}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Reason for Delay *
                </label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                >
                  <option value="Kitchen ticket backlog">Heavy kitchen ticket backlog / rush hour</option>
                  <option value="Culinary refire needed">Refiring dish for temperature / quality perfection</option>
                  <option value="Missing specialty ingredient">Waiting on pantry restock</option>
                  <option value="Complex customization">Detailed guest dietary preparation in progress</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setDelayModalOrder(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Broadcast Delay Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
