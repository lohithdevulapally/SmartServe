import React from 'react';
import { UtensilsCrossed, ArrowLeft, Phone, Mail, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function NotFoundPage({ onResetHome }) {
  const { currentUser, showToast } = useApp();

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '48px 32px',
        border: '1px solid rgba(201, 151, 91, 0.35)',
        background: 'linear-gradient(135deg, rgba(27, 21, 15, 0.95) 0%, rgba(12, 9, 6, 0.98) 100%)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 35px rgba(201, 151, 91, 0.15)'
      }}>
        {/* Culinary Plate / Cloche Emblem */}
        <div style={{
          width: '88px',
          height: '88px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(201, 151, 91, 0.2) 0%, rgba(138, 88, 36, 0.1) 100%)',
          border: '1px solid rgba(201, 151, 91, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 8px 24px rgba(201, 151, 91, 0.2)'
        }}>
          <UtensilsCrossed size={42} color="var(--accent-gold)" strokeWidth={1.8} />
        </div>

        {/* 404 Headline */}
        <div style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--accent-gold)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: '8px'
        }}>
          Error 404 • Table Not Found
        </div>

        <h1 className="font-serif" style={{
          fontSize: '2.5rem',
          color: '#fff',
          lineHeight: 1.15,
          marginBottom: '16px'
        }}>
          This Course is <span className="gold-gradient-text">Off the Menu</span>
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.98rem',
          lineHeight: 1.6,
          marginBottom: '32px'
        }}>
          The page or station you requested does not exist or has been relocated by culinary operations. Please return to your active station or connect with our concierge.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          <button
            onClick={() => {
              if (onResetHome) {
                onResetHome();
              } else {
                window.location.hash = '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
              showToast('Redirected back to active station', 'info');
            }}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.95rem' }}
          >
            <ArrowLeft size={18} />
            <span>Return to Station</span>
          </button>

          <a
            href="tel:+919876543210"
            className="btn btn-secondary"
            style={{ padding: '12px 20px', fontSize: '0.95rem', textDecoration: 'none' }}
            onClick={() => showToast('Calling SmartServe concierge...', 'info')}
          >
            <Phone size={16} />
            <span>Call Concierge</span>
          </a>
        </div>

        {/* Direct Contact links */}
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          flexWrap: 'wrap',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <a
            href="mailto:concierge@smartserve.com"
            style={{ color: 'var(--accent-gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mail size={14} /> concierge@smartserve.com
          </a>
          <span style={{ color: 'var(--border-subtle)' }}>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Compass size={14} /> Table Concierge Desk
          </span>
        </div>
      </div>
    </div>
  );
}
