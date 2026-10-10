import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  AlertTriangle, 
  Package, 
  History, 
  Truck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  FileText,
  Calendar
} from 'lucide-react';

export default function InventoryManagementTab() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [subTab, setSubTab] = useState('inventory'); // 'inventory' | 'reorders' | 'movements' | 'suppliers'
  const [ingredients, setIngredients] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal
  const [adjustModalItem, setAdjustModalItem] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('wastage');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustExpiryDate, setAdjustExpiryDate] = useState('');

  const loadData = () => {
    Promise.all([
      api.getIngredients(),
      api.getPurchaseOrders(),
      api.getInventoryMovements(),
      api.getSuppliers()
    ])
      .then(([ing, po, mov, sup]) => {
        setIngredients(ing);
        setPurchaseOrders(po);
        setMovements(mov);
        setSuppliers(sup);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading inventory data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [wsEvent]);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModalItem || !adjustAmount) return;

    try {
      await api.adjustIngredient(adjustModalItem.id, {
        change_amount: Number(adjustAmount),
        reason: adjustReason,
        notes: adjustNotes,
        expiry_date: adjustExpiryDate || undefined,
        user_name: currentUser?.full_name || 'Admin Diana'
      });
      addToast(`Inventory adjusted for ${adjustModalItem.name}`, 'success');
      setAdjustModalItem(null);
      setAdjustAmount('');
      setAdjustNotes('');
      setAdjustExpiryDate('');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleApprovePO = async (poId) => {
    try {
      await api.updatePOStatus(poId, 'ordered', currentUser?.full_name || 'Admin Diana');
      addToast(`Purchase Order approved and dispatched to supplier!`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const lowStockItems = ingredients.filter(i => i.current_stock <= i.min_threshold);

  return (
    <div>
      {/* Subtab navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        {[
          { key: 'inventory', label: 'Stock & Ingredients', count: ingredients.length },
          { key: 'reorders', label: 'Auto-Reorder & POs', count: purchaseOrders.filter(p => p.status === 'suggested').length },
          { key: 'movements', label: 'Movement Audit Log', count: movements.length },
          { key: 'suppliers', label: 'Supplier Catalogs', count: suppliers.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`btn ${subTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                background: subTab === tab.key ? '#120d08' : 'rgba(201, 151, 91, 0.25)',
                color: subTab === tab.key ? '#fff' : 'var(--accent-gold-light)',
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 1. STOCK & INGREDIENTS TAB */}
      {subTab === 'inventory' && (
        <div>
          {/* Low stock alert banner */}
          {lowStockItems.length > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#fbbf24" />
                <div>
                  <strong style={{ color: '#fbbf24' }}>{lowStockItems.length} ingredients require replenishment: </strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {lowStockItems.map(i => `${i.name} (${i.current_stock} ${i.unit})`).join(', ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSubTab('reorders')}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                Review Suggested POs
              </button>
            </div>
          )}

          <div className="glass-panel table-responsive" style={{ padding: '8px' }}>
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Ingredient Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Current Stock</th>
                  <th style={{ padding: '12px 16px' }}>Safety Threshold</th>
                  <th style={{ padding: '12px 16px' }}>Target Level</th>
                  <th style={{ padding: '12px 16px' }}>Unit Cost</th>
                  <th style={{ padding: '12px 16px' }}>Expiry Date</th>
                  <th style={{ padding: '12px 16px' }}>Supplier</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ing => {
                  const isDepleted = ing.current_stock <= 0;
                  const isLow = ing.current_stock <= ing.min_threshold;

                  return (
                    <tr key={ing.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{ing.name}</div>
                        {ing.affected_dishes && ing.affected_dishes.length > 0 && (
                          <div style={{ fontSize: '0.7rem', color: isLow ? '#f87171' : 'var(--text-muted)' }}>
                            Affects: {ing.affected_dishes.map(d => d.name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {ing.category}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: isDepleted ? '#f87171' : isLow ? '#fbbf24' : '#34d399'
                        }}>
                          {ing.current_stock.toLocaleString()} {ing.unit}
                        </span>
                        {isDepleted && <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Exhausted</span>}
                        {isLow && !isDepleted && <span className="badge badge-warning" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>Low</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {ing.min_threshold.toLocaleString()} {ing.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {ing.target_stock.toLocaleString()} {ing.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--accent-gold)' }}>
                        ₹{ing.unit_cost.toFixed(2)}/{ing.unit}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {ing.expiry_date ? (
                          (() => {
                            const today = new Date();
                            const exp = new Date(ing.expiry_date);
                            const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                            const isExpired = diffDays <= 0;
                            const isCritical = diffDays <= 3 && !isExpired;
                            const isWarning = diffDays <= 7 && diffDays > 3;

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{
                                  fontWeight: 600,
                                  color: isExpired || isCritical ? '#f87171' : isWarning ? '#fbbf24' : '#34d399',
                                  fontSize: '0.85rem'
                                }}>
                                  {ing.expiry_date}
                                </span>
                                {isExpired && (
                                  <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Expired</span>
                                )}
                                {isCritical && (
                                  <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Expiring in {diffDays}d</span>
                                )}
                                {isWarning && (
                                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Expiring in {diffDays}d</span>
                                )}
                                {!isExpired && !isCritical && !isWarning && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{diffDays} days left</span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Expiry Set</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {ing.supplier_name || 'Direct Market'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setAdjustModalItem(ing);
                            setAdjustAmount('');
                            setAdjustExpiryDate(ing.expiry_date || '');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Manual Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. REORDERS & PURCHASE ORDERS TAB */}
      {subTab === 'reorders' && (
        <div>
          <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>PO Reference</th>
                  <th style={{ padding: '12px 16px' }}>Supplier</th>
                  <th style={{ padding: '12px 16px' }}>Items & Quantities</th>
                  <th style={{ padding: '12px 16px' }}>Total Cost</th>
                  <th style={{ padding: '12px 16px' }}>Expected Delivery</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map(po => (
                  <tr key={po.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {po.po_number}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{po.supplier_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{po.supplier_phone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {(po.items || []).map(it => `${it.quantity} ${it.unit} ${it.name}`).join(', ')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>
                      ₹{po.total_cost.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {po.expected_delivery || '1-2 Days'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {po.status === 'verified' ? (
                        <span className="badge badge-success">Received & Verified</span>
                      ) : po.status === 'ordered' ? (
                        <span className="badge badge-info">In Transit</span>
                      ) : (
                        <span className="badge badge-warning">Suggested (Pending)</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {po.status === 'suggested' && (
                        <button
                          onClick={() => handleApprovePO(po.id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                        >
                          Approve & Dispatch
                        </button>
                      )}
                      {po.status === 'ordered' && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Awaiting Delivery
                        </span>
                      )}
                      {po.status === 'verified' && (
                        <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
                          Stock Replenished
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. INVENTORY MOVEMENTS LOG */}
      {subTab === 'movements' && (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Ingredient</th>
                <th style={{ padding: '12px 16px' }}>Change Qty</th>
                <th style={{ padding: '12px 16px' }}>Previous → New</th>
                <th style={{ padding: '12px 16px' }}>Reason</th>
                <th style={{ padding: '12px 16px' }}>Reference / Order</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {m.created_at}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                    {m.ingredient_name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontWeight: 700,
                      color: m.change_amount > 0 ? '#34d399' : '#f87171'
                    }}>
                      {m.change_amount > 0 ? `+${m.change_amount}` : m.change_amount} {m.unit}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {m.previous_stock} → {m.new_stock} {m.unit}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                      {m.reason.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {m.reference_id || m.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. SUPPLIERS CATALOG */}
      {subTab === 'suppliers' && (
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Supplier Company</th>
                <th style={{ padding: '12px 16px' }}>Contact Person</th>
                <th style={{ padding: '12px 16px' }}>Contact Phone / Email</th>
                <th style={{ padding: '12px 16px' }}>Lead Time</th>
                <th style={{ padding: '12px 16px' }}>Min Order (₹)</th>
                <th style={{ padding: '12px 16px' }}>Reliability Rating</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {s.contact_name}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div>{s.phone}</div>
                    <div>{s.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    ~{s.lead_time_days} Days
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--accent-gold)' }}>
                    ₹{s.min_order_value?.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 700 }}>
                    ★ {s.rating} / 5.0
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {adjustModalItem && (
        <div className="modal-overlay" onClick={() => setAdjustModalItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <form onSubmit={handleAdjustSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff' }}>
                  Manual Inventory Adjustment
                </h3>
                <button type="button" onClick={() => setAdjustModalItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{
                background: 'rgba(12, 9, 6, 0.7)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                <div>Ingredient: <strong style={{ color: '#fff' }}>{adjustModalItem.name}</strong></div>
                <div>Current Stock: <strong style={{ color: 'var(--accent-gold)' }}>{adjustModalItem.current_stock} {adjustModalItem.unit}</strong></div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Stock Change Amount (Use positive to add, negative for deduction) *
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={`e.g. -500 or +1000 in ${adjustModalItem.unit}`}
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Batch Expiry Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={adjustExpiryDate}
                  onChange={(e) => setAdjustExpiryDate(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Reason for Adjustment *
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                >
                  <option value="wastage">Culinary Wastage / Trimmings</option>
                  <option value="spillage">Spill / Container Damage</option>
                  <option value="audit_correction">Physical Cycle Count Correction</option>
                  <option value="complimentary_tasting">Chef Complimentary Tasting</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Audit Notes
                </label>
                <textarea
                  rows="2"
                  placeholder="Record specific rationale for audit compliance..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setAdjustModalItem(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
