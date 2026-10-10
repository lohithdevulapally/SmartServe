import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Plus, Minus, Clock, Flame, ShieldAlert, Check } from 'lucide-react';

export default function DishCustomizationModal({ dish, onClose }) {
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState(() => {
    const defaults = {};
    if (Array.isArray(dish.customizable_options)) {
      dish.customizable_options.forEach(optGroup => {
        if (optGroup.options && optGroup.options.length > 0) {
          defaults[optGroup.name] = optGroup.options[0];
        }
      });
    }
    return defaults;
  });
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!dish) return null;

  // Calculate total item price including option modifiers
  let extraCost = 0;
  Object.values(selectedOptions).forEach(opt => {
    if (opt && typeof opt.price === 'number') extraCost += opt.price;
  });
  const unitPrice = dish.price + extraCost;
  const totalPrice = unitPrice * quantity;

  const handleOptionChange = (groupName, optionObj) => {
    setSelectedOptions(prev => ({ ...prev, [groupName]: optionObj }));
  };

  const handleAddToCart = () => {
    const success = addToCart(dish, quantity, selectedOptions, specialInstructions);
    if (success) onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        {/* Header Image */}
        <div style={{ position: 'relative', height: '220px', width: '100%', overflow: 'hidden' }}>
          <img
            src={dish.image_url ? `${dish.image_url.split('?')[0]}?auto=format&fit=crop&w=600&q=75` : dish.image_url}
            alt={dish.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=75';
            }}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #18120c 0%, transparent 60%)'
          }} />
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0, 0, 0, 0.65)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '6px' }}>
                {dish.name}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {dish.description}
              </p>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                ₹{dish.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Prep time & Calories */}
          <div style={{ display: 'flex', gap: '16px', margin: '14px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={14} color="var(--accent-gold)" />
              {dish.prep_time_minutes} mins prep
            </span>
            {dish.calories > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Flame size={14} color="#f97316" />
                {dish.calories} kcal
              </span>
            )}
          </div>

          {/* Allergens warning */}
          {dish.allergens && dish.allergens.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <ShieldAlert size={16} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#f87171' }}>Known Allergens: </strong>
                <span style={{ color: '#fff' }}>{dish.allergens.join(', ')}</span>
                {dish.cross_contamination_risk && (
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Note: {dish.cross_contamination_risk}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customizable Options */}
          {Array.isArray(dish.customizable_options) && dish.customizable_options.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', display: 'block', marginBottom: '8px' }}>
                {group.name}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {group.options.map((opt, optIdx) => {
                  const isSelected = selectedOptions[group.name]?.label === opt.label;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleOptionChange(group.name, opt)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(201, 151, 91, 0.2)' : 'rgba(18, 14, 10, 0.8)',
                        color: isSelected ? '#fff' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 600 : 400
                      }}
                    >
                      {opt.label} {opt.price > 0 ? `(+₹${opt.price.toFixed(2)})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Special Preparation Instructions:
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Extra hot, dressing on the side, allergic to peanuts..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              style={{ fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          {/* Quantity and Final Add Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            {/* Quantity Stepper */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              background: 'rgba(12, 9, 6, 0.8)'
            }}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                <Minus size={16} />
              </button>
              <span style={{ padding: '0 12px', fontWeight: 700, fontSize: '0.95rem', minWidth: '30px', textAlign: 'center' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 12px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Submit Add */}
            <button
              onClick={handleAddToCart}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px 20px', fontSize: '0.95rem' }}
            >
              <span>Add to Cart</span>
              <span style={{ fontWeight: 700, opacity: 0.9 }}>• ₹{totalPrice.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
