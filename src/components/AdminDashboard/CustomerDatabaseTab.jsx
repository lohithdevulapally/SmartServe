import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  Search, 
  Download, 
  User, 
  Phone, 
  Mail, 
  Award, 
  Calendar, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  ShoppingBag, 
  ChevronRight, 
  X, 
  Sparkles, 
  Edit3, 
  RefreshCw,
  HardDrive,
  FileCode,
  DollarSign
} from 'lucide-react';

export default function CustomerDatabaseTab() {
  const { wsEvent, showToast, currentUser } = useApp();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [allergyFilter, setAllergyFilter] = useState('all');

  // Inspector modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dbDetails, setDbDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('orders'); // 'orders' | 'loyalty' | 'allergies' | 'schema'

  // Loyalty adjust state
  const [adjustPointsModal, setAdjustPointsModal] = useState(null);
  const [pointsChange, setPointsChange] = useState('');
  const [pointsReason, setPointsReason] = useState('VIP Courtesy Bonus');

  // Edit allergies state
  const [editAllergiesText, setEditAllergiesText] = useState('');

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers();
      setCustomers(data || []);
    } catch (err) {
      console.error('Error loading customer databases:', err);
      showToast('Failed to load customer databases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [wsEvent]);

  const handleOpenInspector = async (cust) => {
    setSelectedCustomer(cust);
    setActiveModalTab('orders');
    try {
      setDetailsLoading(true);
      const details = await api.getCustomerDbDetails(cust.phone || cust.id);
      setDbDetails(details);
      setEditAllergiesText(details.profile?.allergy_exclusions || cust.allergy_exclusions || '');
    } catch (err) {
      console.error('Error fetching customer DB details:', err);
      showToast('Failed to read dedicated customer database', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSaveAllergies = async () => {
    if (!selectedCustomer) return;
    try {
      await api.updateCustomerAllergies(selectedCustomer.phone || selectedCustomer.id, {
        allergy_exclusions: editAllergiesText,
        admin_name: currentUser?.full_name || 'Admin'
      });
      showToast(`Updated allergy profile in customer's dedicated SQLite database`, 'success');
      // Refresh details
      const details = await api.getCustomerDbDetails(selectedCustomer.phone || selectedCustomer.id);
      setDbDetails(details);
      loadCustomers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdjustPointsSubmit = async (e) => {
    e.preventDefault();
    if (!adjustPointsModal || !pointsChange) return;

    try {
      await api.adjustCustomerLoyalty(adjustPointsModal.phone || adjustPointsModal.id, {
        change_amount: Number(pointsChange),
        reason: pointsReason,
        admin_name: currentUser?.full_name || 'Admin'
      });
      showToast(`Successfully updated loyalty balance in ${adjustPointsModal.db_filename}`, 'success');
      setAdjustPointsModal(null);
      setPointsChange('');
      loadCustomers();
      if (selectedCustomer) {
        const details = await api.getCustomerDbDetails(selectedCustomer.phone || selectedCustomer.id);
        setDbDetails(details);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery) ||
      (c.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.db_filename || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier = tierFilter === 'all' || c.vip_tier === tierFilter;

    const hasAllergies = Boolean(c.allergy_exclusions && c.allergy_exclusions.trim());
    const matchesAllergy = 
      allergyFilter === 'all' || 
      (allergyFilter === 'has_allergies' && hasAllergies) ||
      (allergyFilter === 'no_allergies' && !hasAllergies);

    return matchesSearch && matchesTier && matchesAllergy;
  });

  // Calculate statistics
  const totalDbFiles = customers.length;
  const totalSpend = customers.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
  const vipCount = customers.filter(c => c.vip_tier && c.vip_tier.includes('VIP')).length;
  const withAllergiesCount = customers.filter(c => c.allergy_exclusions && c.allergy_exclusions.trim()).length;

  return (
    <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
      {/* KPI Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Dedicated SQLite Databases
            </span>
            <Database size={18} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {totalDbFiles} <span style={{ fontSize: '0.85rem', color: '#34d399' }}>Isolated .db files</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Individual ACID SQLite engine per guest
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Lifetime Diner Spend
            </span>
            <DollarSign size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-gold-light)', marginTop: '6px' }}>
            ₹{totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Aggregated across customer order ledgers
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              VIP Program Diners
            </span>
            <Award size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {vipCount} <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>Gold / Silver</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ≥ 400 loyalty reward points
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Tracked Allergen Profiles
            </span>
            <ShieldAlert size={18} color="#f87171" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginTop: '6px' }}>
            {withAllergiesCount} <span style={{ fontSize: '0.85rem', color: '#f87171' }}>Guests</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Kitchen cross-contamination safeguards active
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: '1 1 300px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search by name, phone (10 digits), or .db file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            />
          </div>

          <button
            onClick={loadCustomers}
            className="btn btn-outline"
            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            title="Refresh Customer Databases"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tier & Allergy Dropdowns */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>VIP Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="all">All Tiers</option>
              <option value="VIP Gold">VIP Gold</option>
              <option value="VIP Silver">VIP Silver</option>
              <option value="Standard">Standard</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Allergens:</span>
            <select
              value={allergyFilter}
              onChange={(e) => setAllergyFilter(e.target.value)}
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
            >
              <option value="all">All Guests</option>
              <option value="has_allergies">Has Documented Allergies</option>
              <option value="no_allergies">No Allergy Restrictions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Databases Table */}
      <div className="glass-panel table-responsive" style={{ padding: '8px' }}>
        <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Diner Profile</th>
              <th style={{ padding: '12px 16px' }}>Phone & Contact</th>
              <th style={{ padding: '12px 16px' }}>Dedicated SQLite Database</th>
              <th style={{ padding: '12px 16px' }}>Visits & Orders</th>
              <th style={{ padding: '12px 16px' }}>Lifetime Spend</th>
              <th style={{ padding: '12px 16px' }}>Loyalty Points</th>
              <th style={{ padding: '12px 16px' }}>Allergy Safeguards</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading dedicated customer databases...
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No customer databases matched your search filters.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(cust => (
                <tr key={cust.phone || cust.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {/* Diner Profile */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{cust.avatar || '✨'}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{cust.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {cust.email || 'No email registered'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phone & Contact */}
                  <td style={{ padding: '12px 16px' }}>
                    <a
                      href={`tel:${cust.phone}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--accent-gold)',
                        textDecoration: 'none',
                        fontWeight: 600
                      }}
                      title="Tap to call customer"
                    >
                      <Phone size={13} />
                      <span>{cust.phone}</span>
                    </a>
                  </td>

                  {/* Dedicated SQLite Database File Badge */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(201, 151, 91, 0.12)',
                        border: '1px solid rgba(201, 151, 91, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        color: 'var(--accent-gold-light)',
                        width: 'fit-content'
                      }}>
                        <Database size={13} color="var(--accent-gold)" />
                        <span>{cust.db_filename}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                        <span>Size: <strong>{cust.db_size_formatted}</strong></span>
                        <span>•</span>
                        <span style={{ color: '#34d399' }}>ACID Isolated</span>
                      </div>
                    </div>
                  </td>

                  {/* Visits & Orders */}
                  <td style={{ padding: '12px 16px', color: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShoppingBag size={14} color="var(--accent-gold)" />
                      <strong>{cust.total_orders}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>orders</span>
                    </div>
                  </td>

                  {/* Lifetime Spend */}
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-gold-light)' }}>
                    ₹{Number(cust.total_spent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Loyalty Points & VIP Tier */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${cust.vip_tier === 'VIP Gold' ? 'badge-gold' : (cust.vip_tier === 'VIP Silver' ? 'badge-info' : 'badge-warning')}`}>
                        {cust.loyalty_points} pts
                      </span>
                      {cust.vip_tier && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          ({cust.vip_tier})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Allergy Safeguards */}
                  <td style={{ padding: '12px 16px' }}>
                    {cust.allergy_exclusions && cust.allergy_exclusions.trim() ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {cust.allergy_exclusions.split(',').map((alg, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            ✕ {alg.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldCheck size={13} /> None reported
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenInspector(cust)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        title="Open Database Inspector"
                      >
                        <Database size={13} />
                        <span>Inspect DB</span>
                      </button>

                      <a
                        href={api.getCustomerDbDownloadUrl(cust.phone || cust.id)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.78rem', textDecoration: 'none' }}
                        title="Download Raw SQLite .db File"
                      >
                        <Download size={13} />
                      </a>

                      <button
                        onClick={() => {
                          setAdjustPointsModal(cust);
                          setPointsChange('100');
                        }}
                        className="btn btn-outline"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        title="Adjust Loyalty Points"
                      >
                        <Award size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================
          CUSTOMER DATABASE INSPECTOR MODAL
          ============================================================ */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '840px', padding: '24px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '2.4rem' }}>{selectedCustomer.avatar || '✨'}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="font-serif" style={{ fontSize: '1.45rem', color: '#fff', margin: 0 }}>
                      {selectedCustomer.full_name}
                    </h3>
                    <span className="badge badge-gold">{selectedCustomer.vip_tier || 'Standard'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {selectedCustomer.phone}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={12} /> {selectedCustomer.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={api.getCustomerDbDownloadUrl(selectedCustomer.phone || selectedCustomer.id)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                >
                  <Download size={13} />
                  <span>Download .db</span>
                </a>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Dedicated Database File Metadata Banner */}
            <div style={{
              background: 'rgba(201, 151, 91, 0.08)',
              border: '1px solid rgba(201, 151, 91, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HardDrive size={18} color="var(--accent-gold)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                    File: <code style={{ color: 'var(--accent-gold-light)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                      {dbDetails?.database?.filename || selectedCustomer.db_filename}
                    </code>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Physical Path: {dbDetails?.database?.filePath}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                <div>Size: <strong>{dbDetails?.database?.sizeFormatted}</strong></div>
                <div>Engine: <strong style={{ color: '#34d399' }}>SQLite 3 (WAL)</strong></div>
                <div>Tables: <strong>4 Schemas</strong></div>
              </div>
            </div>

            {/* Subtab Navigation inside Inspector */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px', paddingBottom: '8px' }}>
              {[
                { key: 'orders', label: `Orders History (${dbDetails?.orders?.length || 0})`, icon: ShoppingBag },
                { key: 'loyalty', label: `Loyalty Ledger (${dbDetails?.loyaltyHistory?.length || 0})`, icon: Award },
                { key: 'allergies', label: 'Allergies & Safeguards', icon: ShieldAlert },
                { key: 'schema', label: 'SQLite DDL & Architecture', icon: FileCode }
              ].map(tb => {
                const Icon = tb.icon;
                const isActive = activeModalTab === tb.key;
                return (
                  <button
                    key={tb.key}
                    onClick={() => setActiveModalTab(tb.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isActive ? '1px solid var(--accent-gold)' : '1px solid transparent',
                      background: isActive ? 'rgba(201, 151, 91, 0.2)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    <Icon size={14} color={isActive ? 'var(--accent-gold)' : 'var(--text-muted)'} />
                    <span>{tb.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Inspector Tab Content */}
            {detailsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Reading records from dedicated SQLite database...
              </div>
            ) : (
              <div style={{ maxHeight: '48vh', overflowY: 'auto', paddingRight: '6px' }}>
                {/* 1. ORDERS HISTORY */}
                {activeModalTab === 'orders' && (
                  <div>
                    {(!dbDetails?.orders || dbDetails.orders.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No orders recorded yet in this customer's dedicated database.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {dbDetails.orders.map((ord, idx) => (
                          <div key={idx} style={{
                            background: 'rgba(27, 21, 15, 0.7)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '10px',
                            padding: '14px 18px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Order #{ord.order_id}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Table: {ord.table_number}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={`badge ${ord.status === 'completed' || ord.status === 'served' ? 'badge-success' : 'badge-warning'}`}>
                                  {ord.status}
                                </span>
                                <strong style={{ color: 'var(--accent-gold-light)', fontSize: '0.95rem' }}>
                                  ₹{Number(ord.final_amount || ord.total_amount).toFixed(2)}
                                </strong>
                              </div>
                            </div>

                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                              Date: {ord.created_at}
                            </div>

                            {/* Items list */}
                            {Array.isArray(ord.items) && ord.items.length > 0 && (
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {ord.items.map((it, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <span>{it.qty || it.quantity || 1}x {it.name || it.item_name}</span>
                                    <span>₹{Number(it.price || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. LOYALTY LEDGER */}
                {activeModalTab === 'loyalty' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.9rem' }}>
                        Current Balance: <strong style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }}>{selectedCustomer.loyalty_points} Points</strong>
                      </div>
                      <button
                        onClick={() => {
                          setAdjustPointsModal(selectedCustomer);
                          setPointsChange('100');
                        }}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        Adjust Points
                      </button>
                    </div>

                    {(!dbDetails?.loyaltyHistory || dbDetails.loyaltyHistory.length === 0) ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No loyalty ledger entries yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dbDetails.loyaltyHistory.map((lg, i) => (
                          <div key={i} style={{
                            background: 'rgba(27, 21, 15, 0.6)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{lg.description}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {lg.created_at} • Action: {lg.action_type}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: lg.change_amount >= 0 ? '#34d399' : '#f87171' }}>
                                {lg.change_amount >= 0 ? `+${lg.change_amount}` : lg.change_amount} pts
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Balance: {lg.balance_after}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ALLERGIES & SAFEGUARDS */}
                {activeModalTab === 'allergies' && (
                  <div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Allergen exclusions configured here are persisted directly inside this diner's personal SQLite database. When this customer logs in or places orders, any dish containing these ingredients will be flagged or filtered.
                    </p>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Documented Allergens (Comma separated, e.g. Dairy, Nuts, Gluten, Shellfish, Mushrooms):
                      </label>
                      <input
                        type="text"
                        value={editAllergiesText}
                        onChange={(e) => setEditAllergiesText(e.target.value)}
                        placeholder="e.g. Dairy, Nuts, Shellfish"
                        style={{ padding: '10px', fontSize: '0.88rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      {['Dairy', 'Nuts', 'Gluten', 'Seafood', 'Eggs', 'Mushrooms', 'Garlic'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const cur = editAllergiesText.split(',').map(s => s.trim()).filter(Boolean);
                            if (cur.includes(preset)) {
                              setEditAllergiesText(cur.filter(c => c !== preset).join(', '));
                            } else {
                              setEditAllergiesText([...cur, preset].join(', '));
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            border: editAllergiesText.includes(preset) ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                            background: editAllergiesText.includes(preset) ? 'rgba(239,68,68,0.2)' : 'rgba(27,21,15,0.7)',
                            color: editAllergiesText.includes(preset) ? '#f87171' : 'var(--text-secondary)'
                          }}
                        >
                          {editAllergiesText.includes(preset) ? `✓ ${preset}` : `+ ${preset}`}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleSaveAllergies}
                      className="btn btn-primary"
                      style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                    >
                      Save to Customer SQLite Database
                    </button>
                  </div>
                )}

                {/* 4. DEDICATED SQLITE SCHEMA VIEW */}
                {activeModalTab === 'schema' && (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      Each customer has a dedicated SQLite database file located on the server at <code>server/customer_dbs/{selectedCustomer.db_filename}</code>. The isolated database contains the following schemas:
                    </p>

                    <pre style={{
                      background: '#0d0906',
                      border: '1px solid var(--border-subtle)',
                      padding: '14px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--accent-gold-light)',
                      overflowX: 'auto',
                      lineHeight: 1.45
                    }}>
{`-- Table 1: Customer Profile
CREATE TABLE customer_profile (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  avatar TEXT DEFAULT '✨',
  vip_tier TEXT DEFAULT 'Standard',
  loyalty_points INTEGER DEFAULT 100,
  allergy_exclusions TEXT DEFAULT '',
  dietary_preference TEXT DEFAULT 'All',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Customer Orders
CREATE TABLE customer_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL,
  table_number TEXT NOT NULL,
  status TEXT NOT NULL,
  total_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  final_amount REAL NOT NULL,
  items_json TEXT NOT NULL,
  special_instructions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Loyalty Points Ledger
CREATE TABLE loyalty_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  change_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Personal Dining Notes
CREATE TABLE dining_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {adjustPointsModal && (
        <div className="modal-overlay" onClick={() => setAdjustPointsModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--accent-gold)" />
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>Adjust Loyalty Points</h4>
              </div>
              <button onClick={() => setAdjustPointsModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Target Database: <code>{adjustPointsModal.db_filename}</code> ({adjustPointsModal.full_name})
            </p>

            <form onSubmit={handleAdjustPointsSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Points Change (Use negative numbers to deduct, e.g. +200 or -50):
                </label>
                <input
                  type="number"
                  value={pointsChange}
                  onChange={(e) => setPointsChange(e.target.value)}
                  placeholder="e.g. 150 or -50"
                  required
                  style={{ padding: '8px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Reason for Adjustment:
                </label>
                <input
                  type="text"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  placeholder="e.g. VIP Courtesy Bonus or Anniversary gift"
                  required
                  style={{ padding: '8px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setAdjustPointsModal(null)} className="btn btn-outline" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
