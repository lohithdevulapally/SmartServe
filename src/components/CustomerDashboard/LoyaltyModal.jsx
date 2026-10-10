import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { X, Award, Gift, ArrowRight, CheckCircle2, History, AlertCircle, Database } from 'lucide-react';

export default function LoyaltyModal({ onClose }) {
  const { currentUser, addToast, wsEvent } = useApp();
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    if (!currentUser) return;
    Promise.all([
      api.getLoyaltyLedger(currentUser.id),
      api.getLoyaltyRewards()
    ])
      .then(([ledgerRes, rewardsRes]) => {
        setBalance(ledgerRes.balance);
        setLedger(ledgerRes.history || []);
        setRewards(rewardsRes || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching loyalty data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [currentUser, wsEvent]);

  const handleRedeem = async (reward) => {
    if (balance < reward.points_cost) {
      addToast(`Insufficient points. You need ${reward.points_cost} points.`, 'warning');
      return;
    }

    try {
      const res = await api.redeemLoyaltyReward({
        user_id: currentUser.id,
        reward_id: reward.id
      });
      addToast(`Redeemed "${reward.title}"! Voucher applied.`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(201, 151, 91, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(201, 151, 91, 0.3)'
              }}>
                <Award size={22} color="var(--accent-gold)" />
              </div>
              <div>
                <h3 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
                  SmartServe Loyalty Club
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Earn points on dining & redeem exclusive artisanal rewards
                </div>
              </div>
            </div>

            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Balance Hero Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(201, 151, 91, 0.2) 0%, rgba(12, 9, 6, 0.9) 100%)',
            border: '1px solid rgba(201, 151, 91, 0.4)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Rewards Balance
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                {balance.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--accent-gold)' }}>points</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Earn 10 points for every ₹10 spent on dine-in and online orders.
              </div>
              <div style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(201, 151, 91, 0.3)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                color: 'var(--accent-gold-light)',
                fontFamily: 'monospace'
              }}>
                <Database size={12} color="var(--accent-gold)" />
                <span>Isolated DB: customer_{currentUser?.phone ? currentUser.phone.replace(/\D/g, '') : currentUser?.id}.db</span>
              </div>
            </div>
            <Gift size={48} color="var(--accent-gold)" style={{ opacity: 0.8 }} />
          </div>

          {/* Available Rewards */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
              Redeemable Reward Vouchers:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rewards.map(reward => {
                const canAfford = balance >= reward.points_cost;
                return (
                  <div
                    key={reward.id}
                    style={{
                      background: 'rgba(12, 9, 6, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        {reward.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {reward.description}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={!canAfford}
                      className={`btn ${canAfford ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      <span>{reward.points_cost} pts</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ledger History */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
              <History size={15} color="var(--accent-gold)" />
              <span>Points Transaction Ledger:</span>
            </div>
            <div style={{
              maxHeight: '160px',
              overflowY: 'auto',
              background: 'rgba(12, 9, 6, 0.7)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '10px 14px'
            }}>
              {ledger.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>
                  No loyalty transactions recorded yet.
                </div>
              ) : (
                ledger.map((tx, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      padding: '6px 0',
                      borderBottom: idx < ledger.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff' }}>{tx.reason}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.created_at}</div>
                    </div>
                    <span style={{
                      fontWeight: 700,
                      color: tx.points_change > 0 ? '#34d399' : '#f87171'
                    }}>
                      {tx.points_change > 0 ? `+${tx.points_change}` : tx.points_change} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
