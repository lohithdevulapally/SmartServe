import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  UtensilsCrossed, 
  ShieldCheck, 
  ChefHat, 
  ShoppingBag, 
  BellRing, 
  Sparkles,
  LogOut,
  LogIn,
  Menu,
  X,
  Phone,
  Mail,
  ChevronDown
} from 'lucide-react';

export default function Navbar({ onOpenCart, onOpenServiceModal }) {
  const { 
    currentUser, 
    logout,
    setIsAuthModalOpen,
    selectedTable, 
    setSelectedTable,
    cartItemCount,
    cartSubtotal,
    wsConnected,
    showToast
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Logo click: smoothly scrolls to top and gives reassurance feedback without switching roles
  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`SmartServe — ${currentUser ? currentUser.role.toUpperCase() + ' STATION' : 'GUEST DINING'} ACTIVE`, 'info');
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(12, 9, 6, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(201, 151, 91, 0.22)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
      width: '100%',
      maxWidth: '100vw'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'relative'
      }}>
        {/* Brand Logo (CLICKABLE: Scrolls to Top with Feedback) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            title="Click to scroll to top"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLogoClick(); }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              userSelect: 'none',
              outline: 'none'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #d4a56a 0%, #8a5824 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(201, 151, 91, 0.35)',
              border: '1px solid rgba(255, 235, 205, 0.3)',
              flexShrink: 0
            }}>
              <UtensilsCrossed size={20} color="#120d08" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.02em', color: '#fff' }}>
                  Smart<span className="gold-gradient-text">Serve</span>
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(201, 151, 91, 0.15)',
                  color: 'var(--accent-gold)',
                  border: '1px solid rgba(201, 151, 91, 0.3)',
                  textTransform: 'uppercase',
                  fontWeight: 700
                }}>
                  PLATFORM
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Restaurant Management Platform
              </div>
            </div>
          </div>

          {/* WebSocket Status Indicator (Desktop/Tablet) */}
          <div 
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              background: wsConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${wsConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
              padding: '4px 10px',
              borderRadius: '20px',
              color: wsConnected ? '#34d399' : '#f87171'
            }}
          >
            <span className={`status-dot ${wsConnected ? 'online' : 'offline'}`} />
            <span>{wsConnected ? 'Live Sync' : 'Connecting...'}</span>
          </div>
        </div>

        {/* Center Station Badge (Strict role display) */}
        {currentUser && (
          <div 
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: currentUser.role === 'admin' 
                ? 'rgba(234, 179, 8, 0.12)' 
                : (currentUser.role === 'customer' ? 'rgba(201, 151, 91, 0.12)' : 'rgba(56, 189, 248, 0.12)'),
              border: `1px solid ${
                currentUser.role === 'admin' 
                  ? 'rgba(234, 179, 8, 0.3)' 
                  : (currentUser.role === 'customer' ? 'rgba(201, 151, 91, 0.3)' : 'rgba(56, 189, 248, 0.3)')
              }`,
              padding: '5px 14px',
              borderRadius: '20px'
            }}
          >
            {currentUser.role === 'customer' && <Sparkles size={15} color="var(--accent-gold)" />}
            {currentUser.role === 'admin' && <ShieldCheck size={15} color="#eab308" />}
            {(currentUser.role === 'waiter' || currentUser.role === 'kitchen') && <ChefHat size={15} color="#38bdf8" />}
            
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
              {currentUser.role === 'customer' && 'Guest Dining Station'}
              {currentUser.role === 'admin' && 'Admin Console'}
              {currentUser.role === 'kitchen' && 'Kitchen KDS Bump Bar'}
              {currentUser.role === 'waiter' && 'Floor Service Station'}
            </span>
          </div>
        )}

        {/* Desktop Quick Actions */}
        <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Direct Hotline Pill (Clickable Phone) */}
          <a
            href="tel:+919876543210"
            className="hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              color: 'var(--accent-gold)',
              textDecoration: 'none',
              background: 'rgba(201, 151, 91, 0.1)',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(201, 151, 91, 0.25)',
              transition: 'background 0.2s'
            }}
            title="Call Concierge hotline"
          >
            <Phone size={13} />
            <span>+91 98765 43210</span>
          </a>

          {/* Table Selector (Customer view only) */}
          {currentUser && currentUser.role === 'customer' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={{
                  width: 'auto',
                  padding: '5px 8px',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  background: 'rgba(27, 21, 15, 0.9)',
                  border: '1px solid rgba(201, 151, 91, 0.3)',
                  color: 'var(--accent-gold)'
                }}
              >
                <option value="T-1">T-1 (Patio)</option>
                <option value="T-2">T-2 (Dining Hall)</option>
                <option value="T-3">T-3 (Espresso Bar)</option>
                <option value="T-4">T-4 (Fireplace)</option>
                <option value="T-5">T-5 (Mezzanine)</option>
                <option value="T-6">T-6 (Wine Cellar)</option>
              </select>
            </div>
          )}

          {/* Service Bell (Customer view only) */}
          {currentUser && currentUser.role === 'customer' && (
            <button
              className="btn btn-secondary"
              onClick={onOpenServiceModal}
              title="Request Water, Cutlery, Waiter or Bill"
              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
            >
              <BellRing size={15} />
              <span>Service Bell</span>
            </button>
          )}

          {/* Cart Button (Customer view only) */}
          {currentUser && currentUser.role === 'customer' && (
            <button
              onClick={onOpenCart}
              className="btn btn-primary"
              style={{
                padding: '7px 14px',
                fontSize: '0.82rem',
                position: 'relative'
              }}
            >
              <ShoppingBag size={16} />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  border: '2px solid #0c0906'
                }}>
                  {cartItemCount}
                </span>
              )}
              {cartSubtotal > 0 && (
                <span style={{ marginLeft: '4px', opacity: 0.9 }}>
                  (₹{cartSubtotal.toFixed(0)})
                </span>
              )}
            </button>
          )}

          {/* User Profile Info & Sign Out */}
          {currentUser ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(27, 21, 15, 0.9)',
              border: '1px solid rgba(201, 151, 91, 0.3)',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '1.15rem' }}>{currentUser.avatar || '✨'}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', lineHeight: 1.1 }}>
                  {currentUser.full_name}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 700 }}>
                  {currentUser.role}
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Sign Out of Session"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                  marginLeft: '4px'
                }}
              >
                <LogOut size={12} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="show-mobile-btn"
            style={{
              background: 'rgba(201, 151, 91, 0.15)',
              border: '1px solid rgba(201, 151, 91, 0.35)',
              color: 'var(--accent-gold)',
              borderRadius: '8px',
              padding: '7px 9px',
              cursor: 'pointer',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DRAWER (Mobile Responsive Navigation) */}
      {mobileMenuOpen && (
        <div style={{
          background: 'rgba(18, 13, 9, 0.98)',
          borderTop: '1px solid rgba(201, 151, 91, 0.25)',
          padding: '16px 20px 24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.85)',
          animation: 'slideUp 0.2s ease-out'
        }}>
          {/* User profile row in mobile drawer */}
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              marginBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>{currentUser.avatar || '✨'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{currentUser.full_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {currentUser.role} Station
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                borderRadius: '12px',
                background: wsConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: wsConnected ? '#34d399' : '#f87171',
                border: `1px solid ${wsConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {wsConnected ? '● Online' : '○ Offline'}
              </div>
            </div>
          )}

          {/* Quick Action Buttons for Customers on Mobile */}
          {currentUser && currentUser.role === 'customer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCart();
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                >
                  <ShoppingBag size={16} />
                  <span>View Cart ({cartItemCount})</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenServiceModal();
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                >
                  <BellRing size={16} />
                  <span>Call Waiter</span>
                </button>
              </div>

              {/* Table Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(27, 21, 15, 0.7)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Assigned Table:</span>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.82rem', borderRadius: '6px', color: 'var(--accent-gold)' }}
                >
                  <option value="T-1">Table 1 (Patio)</option>
                  <option value="T-2">Table 2 (Dining Hall)</option>
                  <option value="T-3">Table 3 (Espresso Bar)</option>
                  <option value="T-4">Table 4 (Fireplace)</option>
                  <option value="T-5">Table 5 (Mezzanine)</option>
                  <option value="T-6">Table 6 (Wine Cellar)</option>
                </select>
              </div>
            </div>
          )}

          {/* Direct Concierge Hotlines (Clickable Phone & Email) */}
          <div style={{
            background: 'rgba(27, 21, 15, 0.6)',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '14px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <a
              href="tel:+919876543210"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.84rem'
              }}
              onClick={() => showToast('Connecting to restaurant phone...', 'info')}
            >
              <Phone size={14} color="var(--accent-gold)" />
              <span>Call Concierge: <strong>+91 98765 43210</strong></span>
            </a>

            <a
              href="mailto:concierge@smartserve.com"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: '0.84rem'
              }}
              onClick={() => showToast('Opening mail composer...', 'info')}
            >
              <Mail size={14} color="var(--accent-gold)" />
              <span>Email: <strong>concierge@smartserve.com</strong></span>
            </a>
          </div>

          {/* Sign Out Button in Mobile Drawer */}
          {currentUser && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="btn btn-danger"
              style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}
            >
              <LogOut size={16} />
              <span>Sign Out of Station</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
}
