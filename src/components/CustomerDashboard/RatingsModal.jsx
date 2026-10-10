import React, { useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { X, Star, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function RatingsModal({ order, onClose }) {
  const { currentUser, addToast } = useApp();
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.submitFeedback({
        order_id: order?.id || null,
        customer_name: currentUser?.full_name || 'Sophia Lee',
        food_rating: foodRating,
        service_rating: serviceRating,
        comment
      });
      setSubmitted(true);
      addToast('Thank you! Your feedback has been shared with the chef and management.', 'success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.3rem', color: '#fff' }}>
              Rate Your Dining Experience
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '6px' }}>Feedback Submitted</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>We truly appreciate your reviews.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {order && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Reviewing Order <strong style={{ color: 'var(--accent-gold)' }}>#{order.order_number}</strong>
                </div>
              )}

              {/* Food Rating */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '6px' }}>
                  Culinary & Food Quality:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFoodRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Star
                        size={28}
                        color={star <= foodRating ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)'}
                        fill={star <= foodRating ? 'var(--accent-gold)' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Rating */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '6px' }}>
                  Hospitality & Waitstaff Service:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setServiceRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Star
                        size={28}
                        color={star <= serviceRating ? 'var(--accent-gold)' : 'rgba(255,255,255,0.2)'}
                        fill={star <= serviceRating ? 'var(--accent-gold)' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Comments & Suggestions:
                </label>
                <textarea
                  rows="3"
                  placeholder="Share details about flavor balance, presentation, or staff service..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                Submit Feedback
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
