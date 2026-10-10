import React, { useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { X, Droplets, Utensils, ScrollText, UserCheck, BellRing, CheckCircle2 } from 'lucide-react';

export default function ServiceRequestModal({ onClose }) {
  const { selectedTable, addToast } = useApp();
  const [sentType, setSentType] = useState(null);

  const requestOptions = [
    { type: 'water', label: 'Fresh Water Refill', icon: Droplets, color: '#60a5fa' },
    { type: 'cutlery', label: 'Extra Cutlery / Plates', icon: Utensils, color: '#f59e0b' },
    { type: 'napkins', label: 'Linen Napkins & Wipes', icon: ScrollText, color: '#a78bfa' },
    { type: 'waiter_call', label: 'Call Waiter to Table', icon: BellRing, color: '#ec4899' },
    { type: 'bill', label: 'Request Printed Bill', icon: UserCheck, color: '#10b981' }
  ];

  const handleSendRequest = async (type, label) => {
    try {
      const tableNum = parseInt(selectedTable.replace('T-', '')) || 2;
      await api.createServiceRequest({
        table_id: tableNum,
        table_number: selectedTable,
        request_type: type
      });
      setSentType(label);
      addToast(`Table ${selectedTable}: Requested ${label}. Service staff notified!`, 'order');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', color: '#fff' }}>
                Service Bell Assistance
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Directly alerts waitstaff assigned to <strong style={{ color: 'var(--accent-gold)' }}>Table {selectedTable}</strong>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {sentType ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <CheckCircle2 size={44} color="#34d399" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ color: '#fff', fontSize: '1.15rem', marginBottom: '4px' }}>Request Dispatched</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Our service team is on their way with your <strong>{sentType}</strong>.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {requestOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    onClick={() => handleSendRequest(opt.type, opt.label)}
                    style={{
                      background: 'rgba(20, 15, 10, 0.8)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-gold)';
                      e.currentTarget.style.background = 'rgba(201, 151, 91, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.background = 'rgba(20, 15, 10, 0.8)';
                    }}
                  >
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: `${opt.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: opt.color
                    }}>
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Instant notification on floor buzzer
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
