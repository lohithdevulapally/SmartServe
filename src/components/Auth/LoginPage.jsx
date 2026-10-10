import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  UtensilsCrossed, 
  ShieldCheck, 
  ChefHat, 
  UserCheck, 
  Sparkles, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Coffee,
  X,
  MapPin,
  Award
} from 'lucide-react';

export default function LoginPage({ onGuestContinue }) {
  const { login, customerLogin, register, users } = useApp();
  
  // Primary portal mode: 'customer' (Name + Phone) | 'staff' (Username/Email + Password)
  const [portalMode, setPortalMode] = useState('customer');
  
  // Customer Form State (Name & Phone)
  const [customerName, setCustomerName] = useState('Sophia Lee');
  const [customerPhone, setCustomerPhone] = useState('9876543210');
  const [customerTable, setCustomerTable] = useState('T-2');

  // Input Sanitizers & Helpers
  const handleCustomerNameChange = (val) => {
    // Only letters, spaces, apostrophes and hyphens (strips any digits or symbols)
    const sanitized = val.replace(/[^a-zA-Z\s'-]/g, '');
    setCustomerName(sanitized);
  };

  const handleCustomerPhoneChange = (val) => {
    // Only digits, strictly maximum 10 digits
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(digitsOnly);
  };

  const handleRegNameChange = (val) => {
    const sanitized = val.replace(/[^a-zA-Z\s'-]/g, '');
    setRegFullName(sanitized);
  };

  const handleRegPhoneChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    setRegPhone(digitsOnly);
  };

  // Staff Form State (Credentials)
  const [staffTab, setStaffTab] = useState('login'); // 'login' | 'register'
  const [staffUsername, setStaffUsername] = useState('diana.admin');
  const [staffPassword, setStaffPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Staff Registration State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('waiter'); // 'waiter' | 'kitchen' | 'admin'

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Staff demo credentials
  const staffDemoAccounts = [
    {
      role: 'admin',
      name: 'Diana Vance',
      title: 'General Manager / Admin',
      username: 'diana.admin',
      password: 'admin123',
      avatar: '👑',
      desc: 'Financials, Menu Editor, Inventory & Reports',
      color: '#eab308'
    },
    {
      role: 'kitchen',
      name: 'Chef Gordon Laurent',
      title: 'Executive Chef (Kitchen)',
      username: 'gordon.chef',
      password: 'chef123',
      avatar: '👨‍🍳',
      desc: 'Live Kitchen Bump Bar & Recipe Stock Control',
      color: '#f97316'
    },
    {
      role: 'waiter',
      name: 'Marcus Reed',
      title: 'Lead Service Waiter (Staff)',
      username: 'marcus.waiter',
      password: 'waiter123',
      avatar: '🤵',
      desc: 'Floor Table Status, Waiter Bells & Billing',
      color: '#38bdf8'
    }
  ];

  // Submit Customer Check-In (Name + Phone)
  const handleCustomerSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanName || !cleanPhone) {
      setErrorMessage('Please enter both your Full Name and Mobile Phone Number.');
      return;
    }

    // Validation 1: Name must contain only letters (no numbers)
    if (!/^[a-zA-Z\s'-]{2,}$/.test(cleanName)) {
      setErrorMessage('Name must contain only letters (no numbers or symbols allowed).');
      return;
    }

    // Validation 2: Phone must contain only numbers and be exactly 10 digits
    if (!/^\d{10}$/.test(cleanPhone)) {
      setErrorMessage('Phone number must contain only numbers and be exactly 10 digits (e.g. 9876543210).');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await customerLogin({
        full_name: cleanName,
        phone: cleanPhone,
        table_number: customerTable
      });
    } catch (err) {
      setErrorMessage(err.message || 'Customer sign-in failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Staff Login (Credentials)
  const handleStaffSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanUser = staffUsername.trim();
    const cleanPass = staffPassword.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Please enter both staff username/email and security password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await login(cleanUser, cleanPass);
    } catch (err) {
      setErrorMessage(err.message || 'Staff authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Staff Login
  const handleQuickStaffLogin = async (acc) => {
    setStaffUsername(acc.username);
    setStaffPassword(acc.password);
    setErrorMessage('');
    setIsLoading(true);
    try {
      await login(acc.username, acc.password);
    } catch (err) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Staff Registration
  const handleStaffRegister = async (e) => {
    if (e) e.preventDefault();
    const cleanName = regFullName.trim();
    const cleanUsername = regUsername.trim();
    const cleanEmail = regEmail.trim();
    const cleanPhone = regPhone.trim();
    const cleanPassword = regPassword.trim();

    if (!cleanName || !cleanUsername || !cleanPassword) {
      setErrorMessage('Please fill in your full name, username, and password.');
      return;
    }

    // Validation 1: Name must contain only letters (no numbers)
    if (!/^[a-zA-Z\s'-]{2,}$/.test(cleanName)) {
      setErrorMessage('Staff full name must contain only letters (no numbers allowed).');
      return;
    }

    // Validation 2: Email must contain '@'
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setErrorMessage("Email address must contain '@' and a valid domain (e.g. name@example.com).");
      return;
    }

    // Validation 3: Phone must be exactly 10 digits if provided
    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      setErrorMessage('Phone number must contain only numbers and be exactly 10 digits.');
      return;
    }

    if (cleanPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await register({
        full_name: cleanName,
        username: cleanUsername,
        email: cleanEmail || null,
        phone: cleanPhone || null,
        password: cleanPassword,
        role: regRole
      });
    } catch (err) {
      setErrorMessage(err.message || 'Staff registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
      background: 'radial-gradient(ellipse at 50% 20%, #1a130b 0%, #0c0906 70%, #050403 100%)',
      overflow: 'hidden'
    }}>
      {/* Ambient background glow orbs */}
      <div style={{
        position: 'absolute',
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201, 151, 91, 0.08) 0%, rgba(201, 151, 91, 0) 70%)',
        top: '-150px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(138, 88, 36, 0.07) 0%, transparent 70%)',
        bottom: '0',
        right: '5%',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        width: '100%',
        maxWidth: '980px',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #d4a56a 0%, #8a5824 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(201, 151, 91, 0.4)',
              border: '1px solid rgba(255, 235, 205, 0.3)'
            }}>
              <UtensilsCrossed size={24} color="#120d08" strokeWidth={2.5} />
            </div>
            <h1 className="font-serif" style={{ fontSize: '2.5rem', margin: 0, fontWeight: 700, letterSpacing: '0.02em' }}>
              Smart<span className="gold-gradient-text">Serve</span>
            </h1>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '540px', margin: '0 auto', lineHeight: 1.5 }}>
            Smart Restaurant Management Platform • Customer Dining, Service Staff & Administration
          </p>
        </div>

        {/* TOP TOGGLE: Customer (Name + Phone) vs Staff & Admin (Credentials) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          background: 'rgba(18, 14, 10, 0.85)',
          padding: '6px',
          borderRadius: '16px',
          border: '1px solid rgba(201, 151, 91, 0.25)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
        }}>
          <button
            type="button"
            onClick={() => { setPortalMode('customer'); setErrorMessage(''); }}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: portalMode === 'customer' 
                ? 'linear-gradient(135deg, #c9975b 0%, #9e723c 100%)' 
                : 'transparent',
              color: portalMode === 'customer' ? '#120d08' : 'var(--text-secondary)',
              boxShadow: portalMode === 'customer' ? '0 4px 15px rgba(201, 151, 91, 0.35)' : 'none'
            }}
          >
            <Sparkles size={18} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Dining Customer Check-In</div>
              <div style={{ fontSize: '0.72rem', opacity: portalMode === 'customer' ? 0.9 : 0.6 }}>
                Name & Phone Number (No password required)
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setPortalMode('staff'); setErrorMessage(''); }}
            style={{
              padding: '14px 20px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              background: portalMode === 'staff' 
                ? 'linear-gradient(135deg, #c9975b 0%, #9e723c 100%)' 
                : 'transparent',
              color: portalMode === 'staff' ? '#120d08' : 'var(--text-secondary)',
              boxShadow: portalMode === 'staff' ? '0 4px 15px rgba(201, 151, 91, 0.35)' : 'none'
            }}
          >
            <ShieldCheck size={18} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Staff & Admin Access</div>
              <div style={{ fontSize: '0.72rem', opacity: portalMode === 'staff' ? 0.9 : 0.6 }}>
                Enter Security Credentials (Username & Password)
              </div>
            </div>
          </button>
        </div>

        {/* PORTAL VIEW 1: CUSTOMER CHECK-IN (Name + Phone Number) */}
        {portalMode === 'customer' && (
          <div style={{
            background: 'rgba(18, 14, 10, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(201, 151, 91, 0.25)',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(201, 151, 91, 0.05)',
            overflow: 'hidden',
            padding: '28px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Welcome to SmartServe Dining ☕🍽️
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Enter your Name and Mobile Number to explore the live menu, customize dishes, and earn loyalty points.
                </p>
              </div>

              {/* Bonus Points Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(201, 151, 91, 0.12)',
                border: '1px solid rgba(201, 151, 91, 0.3)',
                padding: '6px 14px',
                borderRadius: '20px',
                color: 'var(--accent-gold)',
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Award size={16} />
                <span>+150 Loyalty Points Auto-Credited</span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#f87171',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Form */}
            <form onSubmit={handleCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {/* Full Name (Letters only, no numbers) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Your Full Name *
                    </label>
                    <span style={{
                      fontSize: '0.72rem',
                      color: /^[a-zA-Z\s'-]{2,}$/.test(customerName.trim()) ? '#34d399' : 'var(--accent-gold)'
                    }}>
                      {/^[a-zA-Z\s'-]{2,}$/.test(customerName.trim()) ? '✓ Letters only (Valid)' : 'Letters only (No numbers)'}
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }}>
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => handleCustomerNameChange(e.target.value)}
                      placeholder="e.g. Sophia Lee or John Smith"
                      required
                      style={{
                        paddingLeft: '44px',
                        fontSize: '0.92rem',
                        background: 'rgba(27, 21, 15, 0.85)',
                        borderColor: /^[a-zA-Z\s'-]{2,}$/.test(customerName.trim()) ? 'rgba(52, 211, 153, 0.4)' : 'rgba(201, 151, 91, 0.3)'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Only alphabetic letters allowed. Digits and special characters are automatically excluded.
                  </div>
                </div>

                {/* Mobile Phone Number (Numbers only, 10 digits) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Mobile Phone Number *
                    </label>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: customerPhone.length === 10 ? '#34d399' : 'var(--accent-gold)'
                    }}>
                      {customerPhone.length === 10 ? '✓ 10 Digits Complete' : `${customerPhone.length}/10 digits`}
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)'
                    }}>
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                      maxLength={10}
                      placeholder="e.g. 9876543210 (10 digits)"
                      required
                      style={{
                        paddingLeft: '44px',
                        fontSize: '0.92rem',
                        background: 'rgba(27, 21, 15, 0.85)',
                        borderColor: customerPhone.length === 10 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(201, 151, 91, 0.3)'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Numbers only. Must be exactly 10 digits.
                  </div>
                </div>
              </div>

              {/* Dining Table Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Select Dining Table / Seating Area
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}>
                    <MapPin size={18} />
                  </div>
                  <select
                    value={customerTable}
                    onChange={(e) => setCustomerTable(e.target.value)}
                    style={{
                      paddingLeft: '44px',
                      fontSize: '0.92rem',
                      background: 'rgba(27, 21, 15, 0.85)',
                      borderColor: 'rgba(201, 151, 91, 0.3)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="T-1">Table T-1 — Garden Patio (Outdoor)</option>
                    <option value="T-2">Table T-2 — Main Dining Hall (Recommended)</option>
                    <option value="T-3">Table T-3 — Espresso Bar & High Top</option>
                    <option value="T-4">Table T-4 — Fireplace Lounge Booth</option>
                    <option value="T-5">Table T-5 — Mezzanine Balcony</option>
                    <option value="T-6">Table T-6 — Private Wine Cellar</option>
                    <option value="Takeaway">Takeaway / Counter Pickup</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  padding: '14px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: '8px',
                  boxShadow: '0 6px 20px rgba(201, 151, 91, 0.35)'
                }}
              >
                {isLoading ? (
                  <span>Checking in to table...</span>
                ) : (
                  <>
                    <span>Enter Live Dining Menu & Order</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Customer Button */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(201, 151, 91, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setCustomerName('Sophia Lee');
                  setCustomerPhone('9876543210');
                  setCustomerTable('T-2');
                }}
                style={{
                  background: 'rgba(201, 151, 91, 0.12)',
                  border: '1px solid rgba(201, 151, 91, 0.3)',
                  color: 'var(--accent-gold)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} />
                <span>Fill Pre-Seeded VIP Diner: Sophia Lee (9876543210)</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={16} color="#34d399" />
                <span>No password required for dining guests</span>
              </div>
            </div>
          </div>
        )}

        {/* PORTAL VIEW 2: STAFF & ADMIN ACCESS (Credentials: Username + Password) */}
        {portalMode === 'staff' && (
          <div style={{
            background: 'rgba(18, 14, 10, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(201, 151, 91, 0.25)',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(201, 151, 91, 0.05)',
            overflow: 'hidden'
          }}>
            {/* Quick 1-Click Demo Evaluation Cards for Staff */}
            <div style={{
              background: 'rgba(12, 9, 6, 0.7)',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(201, 151, 91, 0.2)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={16} color="var(--accent-gold)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Staff Evaluation Roles (1-Click Login):
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click any card to auto-fill credentials and enter
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                {staffDemoAccounts.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickStaffLogin(acc)}
                    disabled={isLoading}
                    style={{
                      background: staffUsername === acc.username ? 'rgba(201, 151, 91, 0.18)' : 'rgba(27, 21, 15, 0.7)',
                      border: staffUsername === acc.username ? '1px solid var(--accent-gold)' : '1px solid rgba(201, 151, 91, 0.15)',
                      borderRadius: '12px',
                      padding: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(201, 151, 91, 0.45)'}
                    onMouseLeave={(e) => {
                      if (staffUsername !== acc.username) e.currentTarget.style.borderColor = 'rgba(201, 151, 91, 0.15)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{acc.avatar}</span>
                      <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: `${acc.color}20`,
                        color: acc.color,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        border: `1px solid ${acc.color}40`
                      }}>
                        {acc.role}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff', marginBottom: '2px' }}>
                      {acc.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {acc.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent-gold)' }}>
                      User: <code>{acc.username}</code> • Pass: <code>{acc.password}</code>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Sub-Tabs: Sign In vs Register New Staff */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(201, 151, 91, 0.2)',
              background: 'rgba(12, 9, 6, 0.5)'
            }}>
              <button
                type="button"
                onClick={() => { setStaffTab('login'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: staffTab === 'login' ? 'rgba(201, 151, 91, 0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: staffTab === 'login' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: staffTab === 'login' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Lock size={16} />
                <span>Sign In with Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => { setStaffTab('register'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: staffTab === 'register' ? 'rgba(201, 151, 91, 0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: staffTab === 'register' ? '2px solid var(--accent-gold)' : '2px solid transparent',
                  color: staffTab === 'register' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <UserCheck size={16} />
                <span>Register New Staff Account</span>
              </button>
            </div>

            <div style={{ padding: '28px' }}>
              {/* Error Banner */}
              {errorMessage && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STAFF SIGN IN FORM */}
              {staffTab === 'login' && (
                <form onSubmit={handleStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                      Staff Username or Email *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }}>
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        placeholder="e.g. diana.admin, gordon.chef, or marcus.waiter"
                        required
                        style={{
                          paddingLeft: '44px',
                          fontSize: '0.92rem',
                          background: 'rgba(27, 21, 15, 0.85)',
                          borderColor: 'rgba(201, 151, 91, 0.3)'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Security Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-gold)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline'
                        }}
                      >
                        Need password help?
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }}>
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                          paddingLeft: '44px',
                          paddingRight: '44px',
                          fontSize: '0.92rem',
                          background: 'rgba(27, 21, 15, 0.85)',
                          borderColor: 'rgba(201, 151, 91, 0.3)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)' }}
                      />
                      <span>Keep terminal logged in</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Role-based permissions enforcement
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{
                      padding: '14px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      marginTop: '8px'
                    }}
                  >
                    {isLoading ? (
                      <span>Verifying credentials...</span>
                    ) : (
                      <>
                        <span>Authenticate Staff & Enter Console</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STAFF REGISTER FORM */}
              {staffTab === 'register' && (
                <form onSubmit={handleStaffRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Staff Full Name *
                        </label>
                        <span style={{ fontSize: '0.7rem', color: /^[a-zA-Z\s'-]{2,}$/.test(regFullName.trim()) ? '#34d399' : 'var(--accent-gold)' }}>
                          {/^[a-zA-Z\s'-]{2,}$/.test(regFullName.trim()) ? '✓ Letters only' : 'Letters only (No numbers)'}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={regFullName}
                        onChange={(e) => handleRegNameChange(e.target.value)}
                        placeholder="e.g. Liam Sterling"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Staff Username *
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. liam.waiter"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Work Email
                        </label>
                        <span style={{ fontSize: '0.7rem', color: regEmail.includes('@') ? '#34d399' : 'var(--text-muted)' }}>
                          {regEmail ? (regEmail.includes('@') ? "✓ '@' present" : "Must contain '@'") : "Optional"}
                        </span>
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="liam@smartserve.io"
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          Phone Number
                        </label>
                        <span style={{ fontSize: '0.7rem', color: regPhone.length === 10 ? '#34d399' : 'var(--text-muted)' }}>
                          {regPhone ? `${regPhone.length}/10 digits` : '10 digits (optional)'}
                        </span>
                      </div>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => handleRegPhoneChange(e.target.value)}
                        maxLength={10}
                        placeholder="e.g. 9876543210 (10 digits)"
                      />
                    </div>
                  </div>

                  {/* Staff Role Picker */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Assign Staff Position & Wage
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {[
                        { role: 'waiter', label: 'Lead Floor Waiter', avatar: '🤵', rate: '₹250/hr' },
                        { role: 'kitchen', label: 'Station Chef', avatar: '👨‍🍳', rate: '₹450/hr' },
                        { role: 'admin', label: 'General Manager', avatar: '👑', rate: '₹650/hr' }
                      ].map(r => (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => setRegRole(r.role)}
                          style={{
                            background: regRole === r.role ? 'rgba(201, 151, 91, 0.2)' : 'rgba(27, 21, 15, 0.6)',
                            border: regRole === r.role ? '1px solid var(--accent-gold)' : '1px solid rgba(201, 151, 91, 0.2)',
                            borderRadius: '10px',
                            padding: '10px',
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{r.avatar}</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{r.label}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>{r.rate}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Create Security Password *
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{ padding: '14px', marginTop: '8px' }}
                  >
                    {isLoading ? 'Creating Staff Account...' : 'Complete Staff Registration'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Global Bottom Helper with Clickable Phone & Email */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 14px',
          background: 'rgba(27, 21, 15, 0.45)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={16} color="#34d399" />
            <span>Shared SQLite Persistent Database • Real-Time WebSockets Synchronization</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Need Assistance?</span>
            <a
              href="tel:+919876543210"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
              title="Tap to call restaurant concierge"
            >
              <Phone size={13} />
              <span>+91 98765 43210</span>
            </a>
            <a
              href="mailto:concierge@smartserve.com"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
              title="Tap to email concierge"
            >
              <Mail size={13} />
              <span>concierge@smartserve.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Guide Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={20} color="var(--accent-gold)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Staff Credentials Guide</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              Staff accounts require login credentials. Pre-seeded evaluation accounts:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(27, 21, 15, 0.8)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(201,151,91,0.2)' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Admin (General Manager):</strong><br />
                <code>diana.admin</code> / <code>admin123</code>
              </div>
              <div style={{ background: 'rgba(27, 21, 15, 0.8)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(201,151,91,0.2)' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Kitchen Chef:</strong><br />
                <code>gordon.chef</code> / <code>chef123</code>
              </div>
              <div style={{ background: 'rgba(27, 21, 15, 0.8)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(201,151,91,0.2)' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Service Waiter:</strong><br />
                <code>marcus.waiter</code> / <code>waiter123</code>
              </div>
            </div>

            <button
              onClick={() => setShowForgotModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              Got it, Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
