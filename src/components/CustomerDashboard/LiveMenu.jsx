import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck,
  Ban,
  XCircle,
  Plus, 
  Check, 
  Zap, 
  Filter,
  Flame,
  Info
} from 'lucide-react';

export default function LiveMenu({
  budget,
  sortByPrice,
  hurryMode,
  onOpenCustomize,
  onOpenAlternatives
}) {
  const { wsEvent, addToCart } = useApp();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [excludedIngredient, setExcludedIngredient] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load categories and menu items
  const loadMenu = () => {
    Promise.all([
      api.getCategories(),
      api.getMenu({
        category: activeCategory !== 'all' ? activeCategory : undefined,
        dietary: dietaryFilter !== 'all' ? dietaryFilter : undefined,
        maxPrice: budget > 0 ? budget : undefined,
        hurry: hurryMode,
        search: searchQuery || undefined,
        excludeIngredient: excludedIngredient.trim() || undefined
      })
    ])
      .then(([cats, items]) => {
        setCategories(cats);
        let sorted = [...items];
        if (sortByPrice === 'asc') {
          sorted.sort((a, b) => a.price - b.price);
        } else if (sortByPrice === 'desc') {
          sorted.sort((a, b) => b.price - a.price);
        } else if (hurryMode) {
          sorted.sort((a, b) => (a.prep_time_minutes || 10) - (b.prep_time_minutes || 10));
        }
        setMenuItems(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching menu:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMenu();
  }, [activeCategory, dietaryFilter, budget, sortByPrice, hurryMode, searchQuery, excludedIngredient, wsEvent]);

  const dietaryOptions = [
    { key: 'all', label: 'All Dishes' },
    { key: 'vegetarian', label: '🌱 Vegetarian' },
    { key: 'vegan', label: '🌿 100% Vegan' },
    { key: 'gluten_free', label: '🌾 Gluten-Free' }
  ];

  return (
    <div>
      {/* Allergy Safety Disclaimer Banner (Requirement 1.3) */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.82rem',
        color: '#fef3c7'
      }}>
        <Info size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
        <div>
          <strong>Dietary & Allergy Notice: </strong>
          Ingredient and allergen specifications are updated in real-time. We never claim a dish is 100% allergy-safe without verified supplier data. Guests with severe allergies are advised to confirm directly with our service staff.
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Search artisanal coffees, pastas, steaks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
          />
        </div>

        {/* Dietary Filters Pill Buttons */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {dietaryOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setDietaryFilter(opt.key)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: dietaryFilter === opt.key ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: dietaryFilter === opt.key ? 'rgba(201, 151, 91, 0.2)' : 'rgba(27, 21, 15, 0.7)',
                color: dietaryFilter === opt.key ? 'var(--accent-gold-light)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Allergy & Ingredient Exclusion Filter (Requirement) */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '22px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#ef4444" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fca5a5' }}>
              Allergy & Ingredient Exclusion Filter
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              (Enter an ingredient below — only dishes where that ingredient is NOT used will be shown)
            </span>
          </div>
          {excludedIngredient && (
            <button
              onClick={() => setExcludedIngredient('')}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <XCircle size={14} /> Clear Exclusion
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Ban size={16} color="#ef4444" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Enter ingredient to exclude (e.g. Dairy, Nuts, Gluten, Mushrooms, Eggs, Garlic, Seafood)..."
              value={excludedIngredient}
              onChange={(e) => setExcludedIngredient(e.target.value)}
              style={{
                paddingLeft: '38px',
                paddingRight: '12px',
                fontSize: '0.86rem',
                borderColor: excludedIngredient ? '#ef4444' : 'rgba(239, 68, 68, 0.3)',
                background: 'rgba(18, 13, 8, 0.85)',
                width: '100%'
              }}
            />
          </div>

          {/* Quick preset chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { label: '🥛 Dairy / Milk', term: 'dairy' },
              { label: '🥜 Nuts', term: 'nuts' },
              { label: '🌾 Gluten', term: 'gluten' },
              { label: '🍄 Mushrooms', term: 'mushroom' },
              { label: '🥚 Eggs', term: 'egg' },
              { label: '🐟 Seafood', term: 'seafood' }
            ].map(chip => {
              const isActive = excludedIngredient.toLowerCase() === chip.term;
              return (
                <button
                  key={chip.term}
                  onClick={() => setExcludedIngredient(isActive ? '' : chip.term)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    background: isActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.04)',
                    color: isActive ? '#fca5a5' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {excludedIngredient.trim() && (
          <div style={{
            marginTop: '10px',
            fontSize: '0.82rem',
            color: '#86efac',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(34, 197, 94, 0.1)',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid rgba(34, 197, 94, 0.25)'
          }}>
            <ShieldCheck size={16} color="#22c55e" style={{ flexShrink: 0 }} />
            <span>
              <strong>Safe Menu Filter Active:</strong> Showing <strong>{menuItems.length} dish{menuItems.length === 1 ? '' : 'es'}</strong> where <em>"{excludedIngredient}"</em> is <strong>NOT used</strong>. All dishes containing this ingredient are hidden.
            </span>
          </div>
        )}
      </div>

      {/* Category Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '10px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            border: 'none',
            background: activeCategory === 'all' ? 'var(--accent-gold)' : 'transparent',
            color: activeCategory === 'all' ? '#120d08' : 'var(--text-secondary)',
            transition: 'all 0.2s'
          }}
        >
          All Offerings
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.name)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
              background: activeCategory === cat.name ? 'var(--accent-gold)' : 'transparent',
              color: activeCategory === cat.name ? '#120d08' : 'var(--text-secondary)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Loading menu items...
        </div>
      ) : menuItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          {excludedIngredient.trim() ? (
            <div>
              <p style={{ color: '#fca5a5', fontWeight: 600, fontSize: '1rem', marginBottom: '6px' }}>
                No dishes found completely free from "{excludedIngredient}".
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Try clearing the exclusion or consult our service staff for custom chef modifications!
              </p>
            </div>
          ) : (
            'No dishes match your active filters or budget limit. Try broadening your criteria!'
          )}
        </div>
      ) : (
        <div className="grid-menu">
          {menuItems.map(dish => {
            const isAvailable = Boolean(dish.is_available);

            return (
              <div
                key={dish.id}
                className="glass-panel"
                style={{
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: isAvailable ? 1 : 0.88,
                  borderColor: isAvailable ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.35)',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Dish Image */}
                <div style={{ position: 'relative', height: '190px', width: '100%', overflow: 'hidden' }}>
                  <img
                    src={dish.image_url ? `${dish.image_url.split('?')[0]}?auto=format&fit=crop&w=600&q=75` : dish.image_url}
                    alt={dish.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=75';
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: isAvailable ? 'none' : 'grayscale(0.65)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(27, 21, 15, 0.95) 0%, transparent 55%)'
                  }} />

                  {/* Badges on top of image */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {isAvailable ? (
                      dish.is_hurry_mode === 1 && (
                        <span className="badge badge-warning">
                          <Zap size={11} fill="#fbbf24" /> Fast Prep
                        </span>
                      )
                    ) : (
                      <span className="badge badge-danger">
                        Currently Unavailable
                      </span>
                    )}

                    {dish.dietary_tags && dish.dietary_tags.map((tag, tIdx) => (
                      <span key={tIdx} className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                        {tag.replace('_', ' ')}
                      </span>
                    ))}

                    {excludedIngredient.trim() && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        <Check size={10} /> Safe: No {excludedIngredient}
                      </span>
                    )}
                  </div>

                  <div style={{ position: 'absolute', bottom: '10px', right: '14px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    ₹{dish.price.toFixed(2)}
                  </div>
                </div>

                {/* Dish Info Body */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#fff', lineHeight: 1.3 }}>
                      {dish.name}
                    </h4>
                  </div>

                  <p style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.45,
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {dish.description}
                  </p>

                  {/* Required Ingredients Preview & Allergens */}
                  <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="var(--accent-gold)" />
                        ~{dish.prep_time_minutes} mins prep
                      </span>
                      {dish.allergens && dish.allergens.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
                          <ShieldAlert size={13} />
                          {dish.allergens.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Actions: Add to Cart OR Explore Alternatives if unavailable */}
                    {isAvailable ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onOpenCustomize(dish)}
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '9px', fontSize: '0.82rem' }}
                        >
                          Customize
                        </button>
                        <button
                          onClick={() => addToCart(dish, 1)}
                          className="btn btn-primary"
                          style={{ padding: '9px 16px', fontSize: '0.82rem' }}
                        >
                          <Plus size={16} />
                          <span>Add</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{
                          fontSize: '0.72rem',
                          color: '#f87171',
                          background: 'rgba(239, 68, 68, 0.1)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          textAlign: 'center'
                        }}>
                          Out of stock • Order disabled until restocked
                        </div>
                        <button
                          onClick={() => onOpenAlternatives(dish)}
                          className="btn btn-outline"
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '0.8rem',
                            borderColor: 'var(--accent-gold)',
                            color: 'var(--accent-gold)'
                          }}
                        >
                          <Sparkles size={14} />
                          <span>Explore Smart Alternatives</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
