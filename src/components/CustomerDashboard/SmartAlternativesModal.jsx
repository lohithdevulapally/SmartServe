import React from 'react';
import { X, AlertTriangle, Sparkles, ArrowRight, Check } from 'lucide-react';

export default function SmartAlternativesModal({ unavailableDish, alternatives, onSelectAlternative, onClose }) {
  if (!unavailableDish) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                <AlertTriangle size={20} color="#f87171" />
              </div>
              <div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff' }}>
                  Currently Unavailable
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Smart Alternative Recommendations
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Unavailable item alert */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px',
            fontSize: '0.85rem'
          }}>
            <strong style={{ color: '#f87171' }}>"{unavailableDish.name}"</strong> is currently out of stock due to required fresh ingredient shortage.
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Our kitchen automatically disables items when ingredients run low to maintain culinary perfection. We never silently substitute dishes!
            </div>
          </div>

          {/* Suggested in-stock alternatives */}
          <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
              Available Alternatives You Might Enjoy:
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {alternatives && alternatives.length > 0 ? (
              alternatives.map((alt) => (
                <div
                  key={alt.id}
                  style={{
                    background: 'rgba(201, 151, 91, 0.06)',
                    border: '1px solid rgba(201, 151, 91, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img
                    src={alt.image_url ? `${alt.image_url.split('?')[0]}?auto=format&fit=crop&w=150&q=75` : alt.image_url}
                    alt={alt.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=75';
                    }}
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>
                      {alt.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0' }}>
                      {alt.category_name} • ~{alt.prep_time_minutes}m prep
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                      ₹{alt.price.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectAlternative(alt)}
                    className="btn btn-primary"
                    style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                  >
                    <span>View & Order</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No direct alternatives found for this specific category. Please browse other menu sections!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
