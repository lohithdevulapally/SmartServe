import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  AlertTriangle, 
  Gift, 
  Star, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  X,
  MessageSquare
} from 'lucide-react';

export default function ComplaintsTab() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [issues, setIssues] = useState([]);
  const [compensations, setCompensations] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compensate Modal
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [compType, setCompType] = useState('loyalty_points');
  const [compValue, setCompValue] = useState(300);
  const [compDesc, setCompDesc] = useState('Apology bonus for operational delay');

  const loadData = () => {
    Promise.all([
      api.getOrders(),
      api.getCompensations(),
      api.getFeedbacks()
    ])
      .then(([orders, comps, fbs]) => {
        // Collect all issues across orders
        const allIssues = [];
        orders.forEach(o => {
          (o.issues || []).forEach(iss => {
            allIssues.push({ ...iss, order_number: o.order_number, customer_name: o.customer_name });
          });
        });
        setIssues(allIssues);
        setCompensations(comps);
        setFeedbacks(fbs);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading complaints data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [wsEvent]);

  const handleGrantCompensation = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;

    try {
      await api.issueCompensation({
        customer_name: selectedIssue.customer_name,
        order_id: selectedIssue.order_id,
        issue_id: selectedIssue.id,
        compensation_type: compType,
        value_amount: Number(compValue),
        description: compDesc,
        authorized_by: currentUser?.full_name || 'Admin Diana'
      });
      addToast(`Compensation granted to ${selectedIssue.customer_name}!`, 'success');
      setSelectedIssue(null);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* 1. Customer Complaints & Resolution Queue */}
      <div style={{ marginBottom: '32px' }}>
        <h4 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '14px' }}>
          Unresolved Order Complaints & Inconvenience Escalations
        </h4>
        <div className="glass-panel table-responsive" style={{ padding: '8px' }}>
          {issues.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No complaints or issues reported. Kitchen and floor service running smoothly!
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Order</th>
                  <th style={{ padding: '12px 16px' }}>Guest Name</th>
                  <th style={{ padding: '12px 16px' }}>Issue Nature</th>
                  <th style={{ padding: '12px 16px' }}>Description</th>
                  <th style={{ padding: '12px 16px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Authorization</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(iss => (
                  <tr key={iss.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      #{iss.order_number}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>
                      {iss.customer_name}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                      {iss.issue_type.replace('_', ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                      {iss.description}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${iss.severity === 'high' ? 'badge-danger' : 'badge-warning'}`}>
                        {iss.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {iss.status === 'resolved' ? (
                        <span className="badge badge-success">Resolved</span>
                      ) : (
                        <span className="badge badge-warning">Awaiting Action</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {iss.status === 'resolved' ? (
                        <span style={{ fontSize: '0.75rem', color: '#34d399' }}>Compensated</span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedIssue(iss);
                            setCompValue(300);
                          }}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Authorize Compensation
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 2. Customer Feedback & Review Feed */}
      <div>
        <h4 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '14px' }}>
          Customer Reviews & Satisfaction Feed
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {feedbacks.map(fb => (
            <div key={fb.id} className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{fb.customer_name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fb.created_at?.slice(0, 10)}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--accent-gold)' }}>Food: ★ {fb.food_rating}/5</span>
                <span style={{ color: '#60a5fa' }}>Service: ★ {fb.service_rating}/5</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{fb.comment || 'Great experience!'}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Compensation Grant Modal */}
      {selectedIssue && (
        <div className="modal-overlay" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <form onSubmit={handleGrantCompensation} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff' }}>
                  Authorize Inconvenience Compensation
                </h3>
                <button type="button" onClick={() => setSelectedIssue(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{
                background: 'rgba(12, 9, 6, 0.7)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                <div>Customer: <strong style={{ color: '#fff' }}>{selectedIssue.customer_name}</strong></div>
                <div>Issue: <span style={{ color: '#f87171' }}>{selectedIssue.description}</span></div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Compensation Mechanism *
                </label>
                <select
                  value={compType}
                  onChange={(e) => setCompType(e.target.value)}
                >
                  <option value="loyalty_points">Instant Loyalty Reward Points (Direct to account)</option>
                  <option value="coupon">Dining Voucher / Discount Coupon</option>
                  <option value="refund">Direct Partial Refund on Order</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Value ({compType === 'loyalty_points' ? 'Points Count' : 'INR Rupees (₹)'}) *
                </label>
                <input
                  type="number"
                  required
                  value={compValue}
                  onChange={(e) => setCompValue(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Resolution Notes
                </label>
                <input
                  type="text"
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSelectedIssue(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Issue Compensation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
