import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Utensils, 
  AlertTriangle, 
  Star, 
  RefreshCw,
  Gift
} from 'lucide-react';

export default function LiveOrderTrackerModal({ initialOrderId, onClose, onOpenFeedback, onOpenCompensation }) {
  const { wsEvent, currentUser, addToast } = useApp();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Issue reporting state
  const [showIssueBox, setShowIssueBox] = useState(false);
  const [issueType, setIssueType] = useState('delay');
  const [issueDesc, setIssueDesc] = useState('');

  const loadCustomerOrders = () => {
    api.getOrders({ customer_id: currentUser?.id })
      .then(data => {
        setOrders(data);
        if (data.length > 0) {
          const match = initialOrderId ? data.find(o => o.id === initialOrderId) : data[0];
          setSelectedOrder(match || data[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCustomerOrders();
  }, [wsEvent, currentUser]);

  const steps = [
    { key: 'placed', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'In Kitchen', icon: ChefHat },
    { key: 'ready', label: 'Ready for Service', icon: Utensils },
    { key: 'served', label: 'Served & Enjoy', icon: CheckCircle2 }
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'placed': return 0;
      case 'confirmed': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'served':
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = selectedOrder ? getStepIndex(selectedOrder.status) : 0;

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !issueDesc.trim()) return;

    try {
      await api.reportOrderIssue(selectedOrder.id, {
        reported_by: currentUser?.full_name || 'Customer',
        issue_type: issueType,
        description: issueDesc,
        severity: 'high'
      });
      addToast('Issue escalated to manager! Inconvenience compensation may be eligible.', 'warning');
      setShowIssueBox(false);
      setIssueDesc('');
      loadCustomerOrders();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
                Live Order Tracking
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Real-time updates directly from kitchen bump bars and waitstaff
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Selector if multiple orders */}
          {orders.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
              {orders.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    border: selectedOrder?.id === o.id ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    background: selectedOrder?.id === o.id ? 'rgba(201, 151, 91, 0.2)' : 'rgba(12, 9, 6, 0.7)',
                    color: selectedOrder?.id === o.id ? '#fff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  #{o.order_number} ({o.status.toUpperCase()})
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Loading your orders...
            </div>
          ) : !selectedOrder ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No active or past orders found. Place an order to see live tracking!
            </div>
          ) : (
            <div>
              {/* Order Info Bar */}
              <div style={{
                background: 'rgba(12, 9, 6, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Order ID</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    #{selectedOrder.order_number}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Table Assigned</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                    {selectedOrder.table_number || 'T-2'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Estimated Wait</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#34d399' }}>
                    ~{selectedOrder.prep_time_estimate} mins
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current Status</div>
                  <span className={`badge ${selectedOrder.status === 'ready' || selectedOrder.status === 'served' ? 'badge-success' : 'badge-gold'}`}>
                    {selectedOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Visual Progress Stepper */}
              <div style={{ margin: '24px 0 32px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}>
                  {/* Progress Line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    height: '3px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    zIndex: 1
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #c9975b, #10b981)',
                      width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  {steps.map((step, idx) => {
                    const isDone = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const Icon = step.icon;

                    return (
                      <div
                        key={step.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          zIndex: 2,
                          textAlign: 'center',
                          width: '80px'
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: isCurrent ? 'var(--accent-gold)' : isDone ? '#10b981' : '#1f1811',
                          color: isCurrent || isDone ? '#120d08' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isCurrent ? '3px solid #fff' : isDone ? '2px solid #34d399' : '2px solid rgba(255,255,255,0.15)',
                          transition: 'all 0.3s ease',
                          boxShadow: isCurrent ? '0 0 16px rgba(201, 151, 91, 0.8)' : undefined
                        }}>
                          <Icon size={18} strokeWidth={2.5} />
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? 'var(--accent-gold-light)' : isDone ? '#fff' : 'var(--text-muted)',
                          marginTop: '8px'
                        }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Items Breakdown */}
              <div style={{
                background: 'rgba(12, 9, 6, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                  Ordered Items ({selectedOrder.items?.length || 0}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {it.quantity}x {it.name}
                      </span>
                      <span style={{ color: 'var(--accent-gold)' }}>
                        ₹{(it.unit_price * it.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontWeight: 700, fontSize: '0.9rem' }}>
                  <span>Total Amount Paid:</span>
                  <span style={{ color: 'var(--accent-gold)' }}>₹{selectedOrder.total_amount?.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons: Feedback & Inconvenience Reporting */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onOpenFeedback(selectedOrder)}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                >
                  <Star size={16} color="var(--accent-gold)" />
                  <span>Rate Food & Service</span>
                </button>

                <button
                  onClick={() => setShowIssueBox(!showIssueBox)}
                  className="btn btn-danger"
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                >
                  <AlertTriangle size={16} />
                  <span>Report Delay or Mistake</span>
                </button>
              </div>

              {/* Issue Reporting Form */}
              {showIssueBox && (
                <form onSubmit={handleReportIssue} style={{
                  marginTop: '16px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  padding: '14px'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f87171', marginBottom: '8px' }}>
                    Escalate Operational Delay or Quality Concern:
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 1 }}
                    >
                      <option value="delay">Order taking significantly longer than predicted</option>
                      <option value="incorrect_item">Incorrect dish or missing customization</option>
                      <option value="quality">Quality or temperature issue</option>
                      <option value="allergy_concern">Allergy warning verification needed</option>
                    </select>
                  </div>

                  <textarea
                    rows="2"
                    placeholder="Describe what occurred (management will review immediately)..."
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    style={{ fontSize: '0.82rem', marginBottom: '10px' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowIssueBox(false)}
                      className="btn btn-outline"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      Submit for Resolution & Compensation
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
