import React, { useState } from 'react';
import { IndianRupee, Tag, Info, Sparkles, Filter } from 'lucide-react';

export default function AffordableMealFinder({
  budget,
  onBudgetChange,
  sortByPrice,
  onSortChange,
  selectedDietary,
  onDietaryChange
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [partySize, setPartySize] = useState(1);

  // Combos data for demonstration (in INR)
  const combos = [
    { title: 'Artisanal Morning Pair', items: 'Velvet Flat White + Brioche Tartine', price: 450.00, savings: 'Save ₹60' },
    { title: 'Gourmet Bistro Lunch', items: 'Wagyu Burger + Truffle Fries + Cold Brew', price: 780.00, savings: 'Save ₹120' },
    { title: 'Plant-Powered Duo', items: 'Green Goddess Bowl + Caramel Macchiato', price: 520.00, savings: 'Save ₹70' }
  ];

  const estTax = (budget * 0.08).toFixed(2);
  const estService = (budget * 0.05).toFixed(2);
  const estTotalWithTaxes = (budget * 1.13).toFixed(2);

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(201, 151, 91, 0.15)',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(201, 151, 91, 0.3)'
          }}>
            <IndianRupee size={18} color="var(--accent-gold)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff' }}>
              Affordable Meal Finder & Budget Filter (₹ INR)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Set your target meal budget to discover eligible dishes, combos, and transparent cost breakdowns.
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          <Filter size={14} />
          <span>{isOpen ? 'Hide Budget Controls' : 'Configure Budget'}</span>
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Budget Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Budget per Person:
                </label>
                <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {budget > 0 ? `₹${budget}` : 'No limit'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1200"
                step="50"
                value={budget}
                onChange={(e) => onBudgetChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-gold)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>₹0 (All)</span>
                <span>₹350 Quick Bite</span>
                <span>₹650 Entrée</span>
                <span>₹1000+ Feast</span>
              </div>
            </div>

            {/* Price Sort & Party Size */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Sort by Price:
                </label>
                <select
                  value={sortByPrice}
                  onChange={(e) => onSortChange(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="none">Featured Default</option>
                  <option value="asc">Price: Low to High</option>
                  <option value="desc">Price: High to Low</option>
                </select>
              </div>

              <div style={{ width: '110px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Guests:
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={partySize}
                  onChange={(e) => setPartySize(Math.max(1, Number(e.target.value)))}
                  style={{ fontSize: '0.85rem', textAlign: 'center' }}
                />
              </div>
            </div>

            {/* Transparent Tax & Charge Breakdown */}
            <div style={{
              background: 'rgba(12, 9, 6, 0.7)',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} color="var(--accent-gold)" />
                <span>Transparent Estimated Total ({partySize} {partySize === 1 ? 'person' : 'people'})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Food Subtotal ({partySize}x):</span>
                <span>₹{(budget * partySize).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Sales Tax (8%):</span>
                <span>₹{(estTax * partySize).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Service Charge (5%):</span>
                <span>₹{(estService * partySize).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed var(--border-subtle)' }}>
                <span>Estimated All-In Cost:</span>
                <span>₹{(estTotalWithTaxes * partySize).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Value Combos Carousel */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-gold-light)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} />
              <span>Recommended Value Combos & Pairing Deals</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {combos.map((combo, idx) => (
                <div key={idx} style={{
                  background: 'rgba(201, 151, 91, 0.08)',
                  border: '1px solid rgba(201, 151, 91, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#fff' }}>
                    <span>{combo.title}</span>
                    <span style={{ color: 'var(--accent-gold)' }}>₹{combo.price.toFixed(2)}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', margin: '4px 0' }}>{combo.items}</div>
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{combo.savings}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
