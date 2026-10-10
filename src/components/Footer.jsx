import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  ChevronUp,
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Footer({ onTrigger404 }) {
  const { showToast } = useApp();
  const [activeModal, setActiveModal] = useState(null); // 'terms' | 'privacy' | 'safety' | 'reservation'

  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Navigated to top of page', 'info');
  };

  return (
    <>
      <footer style={{
        background: '#090705',
        borderTop: '1px solid rgba(201, 151, 91, 0.22)',
        padding: '48px 24px 28px',
        marginTop: 'auto',
        color: 'var(--text-secondary)',
        fontSize: '0.88rem'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          {/* Main 4-Column Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '36px',
            marginBottom: '40px'
          }}>
            {/* Column 1: Brand & Identity */}
            <div>
              <div 
                onClick={scrollToTop}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
                title="Click to scroll to top"
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
                  border: '1px solid rgba(255, 235, 205, 0.3)'
                }}>
                  <UtensilsCrossed size={20} color="#120d08" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="font-serif" style={{ fontSize: '1.45rem', fontWeight: 700, color: '#fff' }}>
                    Smart<span className="gold-gradient-text">Serve</span>
                  </span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    FINE DINING & MANAGEMENT PLATFORM
                  </div>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Connecting diners, culinary chefs, and management in real-time. Experience artisanal cuisine with live table ordering, transparent allergy filtering, and automated kitchen workflows.
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#34d399'
              }}>
                <span className="status-dot online" />
                <span>Live System Status: Fully Operational</span>
              </div>
            </div>

            {/* Column 2: Direct Contact & Location (Clickable Phone & Email) */}
            <div>
              <h4 className="font-serif" style={{ color: 'var(--accent-gold-light)', fontSize: '1.1rem', marginBottom: '18px' }}>
                Concierge & Contact
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Clickable Phone Number */}
                <li>
                  <a
                    href="tel:+919876543210"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    title="Tap to call restaurant hotline"
                  >
                    <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(201, 151, 91, 0.12)', color: 'var(--accent-gold)' }}>
                      <Phone size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reservations & Service Hotline</div>
                      <strong style={{ fontSize: '0.92rem' }}>+91 98765 43210</strong>
                    </div>
                  </a>
                </li>

                {/* Clickable Email */}
                <li>
                  <a
                    href="mailto:concierge@smartserve.com"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                    title="Tap to email concierge desk"
                  >
                    <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(201, 151, 91, 0.12)', color: 'var(--accent-gold)' }}>
                      <Mail size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Customer Support & Inquiries</div>
                      <strong style={{ fontSize: '0.88rem' }}>concierge@smartserve.com</strong>
                    </div>
                  </a>
                </li>

                {/* Clickable Address / Map */}
                <li>
                  <a
                    href="https://maps.google.com/?q=SmartServe+Fine+Dining+Boutique+Connaught+Place+New+Delhi"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(201, 151, 91, 0.12)', color: 'var(--accent-gold)' }}>
                      <MapPin size={16} />
                    </div>
                    <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
                      42 Grand Heritage Promenade, Connaught Place, New Delhi — 110001
                    </div>
                  </a>
                </li>

                {/* Operational Hours */}
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(201, 151, 91, 0.12)', color: 'var(--accent-gold)' }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Daily Service: <strong>08:00 AM – 11:30 PM IST</strong>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 3: Dining & Navigation Links */}
            <div>
              <h4 className="font-serif" style={{ color: 'var(--accent-gold-light)', fontSize: '1.1rem', marginBottom: '18px' }}>
                Dining & Operations
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <button
                    onClick={scrollToTop}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.86rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    • Artisanal Live Menu & Specials
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('safety')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.86rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    • Allergen Safety & Cross-Contamination Protocol
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('reservation')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.86rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    • Chef's Table Reservations
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (onTrigger404) {
                        onTrigger404();
                      } else {
                        window.location.hash = '404';
                      }
                      showToast('Navigating to Custom 404 Page', 'info');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.86rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    • Custom 404 Error Page (Preview)
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Standards, Legal & Certifications */}
            <div>
              <h4 className="font-serif" style={{ color: 'var(--accent-gold-light)', fontSize: '1.1rem', marginBottom: '18px' }}>
                Standards & Compliance
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <li>
                  <button
                    onClick={() => setActiveModal('terms')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.86rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    • Terms of Dining Service
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveModal('privacy')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '0.86rem' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    • Privacy & Guest Data Protection
                  </button>
                </li>
                <li>
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(201, 151, 91, 0.08)',
                    border: '1px solid rgba(201, 151, 91, 0.25)',
                    fontSize: '0.78rem',
                    color: 'var(--accent-gold-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                      <ShieldCheck size={14} color="var(--accent-gold)" />
                      <span>FSSAI Certified: 10019011006542</span>
                    </div>
                    <div>100% Organic dairy, verified ethical suppliers, and HACCP cold-chain compliance.</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright Year & Back to Top */}
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              © {currentYear} <strong style={{ color: 'var(--accent-gold)' }}>SmartServe™ Hospitality Technologies</strong>. All rights reserved.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span>Currency: <strong>INR (₹)</strong></span>
              <span>•</span>
              <span>ACID SQLite Persistent Database</span>
              <span>•</span>
              <button
                onClick={scrollToTop}
                style={{
                  background: 'rgba(201, 151, 91, 0.15)',
                  border: '1px solid rgba(201, 151, 91, 0.35)',
                  color: 'var(--accent-gold)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>Back to Top</span>
                <ChevronUp size={14} />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Info Modals for Footer Links */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.3rem', color: '#fff', margin: 0 }}>
                {activeModal === 'terms' && 'Terms of Dining Service'}
                {activeModal === 'privacy' && 'Privacy & Guest Data Protection'}
                {activeModal === 'safety' && 'Allergen & Kitchen Safety Protocol'}
                {activeModal === 'reservation' && "Chef's Table Reservation Policy"}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxHeight: '60vh', overflowY: 'auto', paddingRight: '8px' }}>
              {activeModal === 'terms' && (
                <>
                  <p>Welcome to SmartServe. By placing orders through our digital dining console, you agree to our standard service terms:</p>
                  <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>All orders are sent directly to the kitchen display bump bar and billed in Indian National Rupees (₹ INR).</li>
                    <li>Dish preparation times are dynamic and depend on kitchen load, rush hours, and item complexity.</li>
                    <li>Discounts and loyalty points are applied transparently at checkout and cannot be refunded as cash.</li>
                    <li>Service bells immediately notify floor attendants. We request respectful dining etiquette.</li>
                  </ul>
                </>
              )}

              {activeModal === 'privacy' && (
                <>
                  <p>SmartServe respects your personal dining privacy:</p>
                  <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Guest contact information (Name, 10-digit Phone, Email) is used solely for table management, loyalty tracking, and digital receipt delivery.</li>
                    <li>We never sell or distribute diner information to third-party advertising brokers.</li>
                    <li>All financial transactions and staff payroll records are encrypted and stored within our persistent ACID relational database.</li>
                  </ul>
                </>
              )}

              {activeModal === 'safety' && (
                <>
                  <p>Your health and culinary peace of mind are our highest priorities:</p>
                  <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>Our interactive allergen filter filters recipes across 19 monitored ingredients including dairy, tree nuts, gluten, and shellfish.</li>
                    <li>Dishes marked "Not Available" are locked from the order queue to prevent delays and cross-contamination.</li>
                    <li>Special customization notes are highlighted in high-contrast red directly on kitchen KDS bump screens.</li>
                  </ul>
                </>
              )}

              {activeModal === 'reservation' && (
                <>
                  <p>Planning an intimate dinner or corporate gathering?</p>
                  <div style={{ marginTop: '12px', padding: '14px', borderRadius: '10px', background: 'rgba(201, 151, 91, 0.1)', border: '1px solid rgba(201, 151, 91, 0.3)' }}>
                    <p style={{ margin: 0, marginBottom: '8px' }}>
                      For private mezzanine dining, wine cellar bookings, or parties larger than 8 guests, please reach our head sommelier directly:
                    </p>
                    <a href="tel:+919876543210" style={{ color: 'var(--accent-gold)', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={15} /> +91 98765 43210
                    </a>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setActiveModal(null)} className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
