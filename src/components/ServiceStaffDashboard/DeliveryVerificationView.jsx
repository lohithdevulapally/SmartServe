import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Truck, 
  CheckCircle2, 
  Package, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Boxes
} from 'lucide-react';

export default function DeliveryVerificationView() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingPO, setVerifyingPO] = useState(null);

  const loadPOs = () => {
    api.getPurchaseOrders()
      .then(pos => {
        setPurchaseOrders(pos);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching POs:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPOs();
  }, [wsEvent]);

  const handleVerifyDelivery = async (po) => {
    if (!window.confirm(`Verify and accept delivery for PO #${po.po_number}? This will replenish ingredient stock immediately.`)) return;

    try {
      const res = await api.verifyReceiveDelivery(po.id, {
        verified_by_name: currentUser?.full_name || 'Waiter Marcus'
      });
      addToast(`Delivery verified! Inventory replenished and out-of-stock dishes restored.`, 'success');
      loadPOs();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const incomingPOs = purchaseOrders.filter(p => p.status === 'ordered');
  const verifiedPOs = purchaseOrders.filter(p => p.status === 'verified').slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
          Supplier Delivery Intake & Verification
        </h3>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          When supplier drivers arrive at the service door, verify package contents and accept delivery to replenish persistent pantry stock.
        </div>
      </div>

      {/* Dispatched / Incoming Deliveries awaiting staff check-in */}
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={18} color="var(--accent-gold)" />
          <span>Deliveries Awaiting Physical Intake & Verification ({incomingPOs.length})</span>
        </h4>

        {incomingPOs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No supplier deliveries currently in transit. Any orders approved by management will appear here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {incomingPOs.map(po => (
              <div key={po.id} className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid var(--accent-gold)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: '1.05rem' }}>
                      {po.po_number}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>
                      Supplier: {po.supplier_name}
                    </div>
                  </div>
                  <span className="badge badge-info">In Transit</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Expected Delivery: {po.expected_delivery || 'Today'}
                </div>

                {/* Items to verify */}
                <div style={{
                  background: 'rgba(12, 9, 6, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '14px',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: '6px' }}>Manifest Package Items:</div>
                  {(po.items || []).map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      <span>• {it.name}</span>
                      <strong style={{ color: '#34d399' }}>+{it.quantity} {it.unit}</strong>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleVerifyDelivery(po)}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Verify Contents & Replenish Stock</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified Deliveries History */}
      <div>
        <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px' }}>
          Recently Verified Deliveries (Audit History)
        </h4>
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>PO Reference</th>
                <th style={{ padding: '10px 14px' }}>Supplier</th>
                <th style={{ padding: '10px 14px' }}>Replenished Items</th>
                <th style={{ padding: '10px 14px' }}>Value (₹)</th>
                <th style={{ padding: '10px 14px' }}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {verifiedPOs.map(po => (
                <tr key={po.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-gold)' }}>
                    {po.po_number}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#fff' }}>
                    {po.supplier_name}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {(po.items || []).map(it => `${it.quantity} ${it.unit} ${it.name}`).join(', ')}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#fff' }}>
                    ₹{po.total_cost.toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="badge badge-success">Verified & Restocked</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
