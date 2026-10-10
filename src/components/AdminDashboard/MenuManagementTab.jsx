import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Utensils, 
  Clock, 
  DollarSign, 
  Check, 
  X, 
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

export default function MenuManagementTab() {
  const { wsEvent, addToast } = useApp();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: 1,
    description: '',
    price: '',
    prep_time_minutes: 10,
    image_url: '',
    dietary_tags: [],
    allergens: [],
    cross_contamination_risk: '',
    calories: 350,
    is_hurry_mode: false,
    recipe_ingredients: [] // [{ ingredient_id, quantity_required }]
  });

  const loadData = () => {
    Promise.all([
      api.getMenu(),
      api.getCategories(),
      api.getIngredients()
    ])
      .then(([m, c, ing]) => {
        setMenuItems(m);
        setCategories(c);
        setIngredients(ing);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading menu management data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [wsEvent]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id || 1,
      description: '',
      price: '',
      prep_time_minutes: 10,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
      dietary_tags: [],
      allergens: [],
      cross_contamination_risk: '',
      calories: 350,
      is_hurry_mode: false,
      recipe_ingredients: [{ ingredient_id: ingredients[0]?.id || 1, quantity_required: 10 }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    const recipeRows = (item.ingredients || []).map(r => ({
      ingredient_id: r.id,
      quantity_required: r.quantity_required
    }));

    setFormData({
      name: item.name,
      category_id: item.category_id,
      description: item.description,
      price: item.price,
      prep_time_minutes: item.prep_time_minutes,
      image_url: item.image_url,
      dietary_tags: item.dietary_tags || [],
      allergens: item.allergens || [],
      cross_contamination_risk: item.cross_contamination_risk || '',
      calories: item.calories || 350,
      is_hurry_mode: item.is_hurry_mode === 1,
      recipe_ingredients: recipeRows.length > 0 ? recipeRows : [{ ingredient_id: ingredients[0]?.id || 1, quantity_required: 10 }]
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the menu?`)) return;
    try {
      await api.deleteDish(id);
      addToast(`Removed "${name}" from menu`, 'info');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      addToast('Please fill in dish name and price', 'warning');
      return;
    }

    try {
      if (editingItem) {
        await api.updateDish(editingItem.id, formData);
        addToast(`Updated dish "${formData.name}"`, 'success');
      } else {
        await api.createDish(formData);
        addToast(`Created new dish "${formData.name}"`, 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddRecipeIngredient = () => {
    setFormData(prev => ({
      ...prev,
      recipe_ingredients: [
        ...prev.recipe_ingredients,
        { ingredient_id: ingredients[0]?.id || 1, quantity_required: 10 }
      ]
    }));
  };

  const handleRemoveRecipeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      recipe_ingredients: prev.recipe_ingredients.filter((_, idx) => idx !== index)
    }));
  };

  const handleRecipeChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.recipe_ingredients];
      updated[index][field] = field === 'quantity_required' ? Number(value) : Number(value);
      return { ...prev, recipe_ingredients: updated };
    });
  };

  const toggleTag = (type, val) => {
    setFormData(prev => {
      const list = prev[type] || [];
      const updated = list.includes(val) ? list.filter(t => t !== val) : [...list, val];
      return { ...prev, [type]: updated };
    });
  };

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            placeholder="Search menu catalog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
          />
        </div>

        <button onClick={openCreateModal} className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem' }}>
          <Plus size={16} />
          <span>Add New Menu Item</span>
        </button>
      </div>

      {/* Menu items table */}
      <div className="glass-panel table-responsive" style={{ padding: '8px' }}>
        <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>Dish / Presentation</th>
              <th style={{ padding: '12px 16px' }}>Category</th>
              <th style={{ padding: '12px 16px' }}>Price</th>
              <th style={{ padding: '12px 16px' }}>Prep Time</th>
              <th style={{ padding: '12px 16px' }}>Availability</th>
              <th style={{ padding: '12px 16px' }}>Recipe Ingredients</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={item.image_url ? `${item.image_url.split('?')[0]}?auto=format&fit=crop&w=120&q=75` : item.image_url}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=75';
                      }}
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                  {item.category_name}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                  ₹{item.price.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                  ~{item.prep_time_minutes} min
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {item.is_available ? (
                    <span className="badge badge-success">Available</span>
                  ) : (
                    <span className="badge badge-danger">Not Available</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(item.ingredients || []).map(ing => `${ing.quantity_required}${ing.unit} ${ing.name}`).join(', ') || 'No recipe linked'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button
                      onClick={() => openEditModal(item)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', padding: '6px', cursor: 'pointer' }}
                      title="Edit dish and recipe"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      style={{ background: 'none', border: 'none', color: '#f87171', padding: '6px', cursor: 'pointer' }}
                      title="Delete dish"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
                  {editingItem ? `Edit Dish: ${editingItem.name}` : 'Create Artisanal Menu Item'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Form Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Preparation Time (Minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.prep_time_minutes}
                    onChange={(e) => setFormData({ ...formData, prep_time_minutes: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Image URL */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {/* Recipe Ingredients Mapping (Requirement 2.2 & 2.4) */}
              <div style={{
                background: 'rgba(12, 9, 6, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} color="var(--accent-gold)" />
                    <span>Recipe Ingredients (Automates Live Availability):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRecipeIngredient}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    <Plus size={12} />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formData.recipe_ingredients.map((rec, rIdx) => (
                    <div key={rIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={rec.ingredient_id}
                        onChange={(e) => handleRecipeChange(rIdx, 'ingredient_id', e.target.value)}
                        style={{ flex: 2, fontSize: '0.82rem' }}
                      >
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} (Stock: {ing.current_stock} {ing.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        placeholder="Qty required"
                        value={rec.quantity_required}
                        onChange={(e) => handleRecipeChange(rIdx, 'quantity_required', e.target.value)}
                        style={{ flex: 1, fontSize: '0.82rem' }}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveRecipeIngredient(rIdx)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dietary Tags */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Dietary Tags:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['vegetarian', 'vegan', 'gluten_free'].map(tag => {
                    const active = (formData.dietary_tags || []).includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag('dietary_tags', tag)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          border: active ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                          background: active ? 'rgba(201, 151, 91, 0.25)' : 'transparent',
                          color: active ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {tag.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allergens */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Allergens Flagged:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['dairy', 'nuts', 'gluten', 'fish', 'shellfish', 'egg', 'sesame'].map(allg => {
                    const active = (formData.allergens || []).includes(allg);
                    return (
                      <button
                        type="button"
                        key={allg}
                        onClick={() => toggleTag('allergens', allg)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          border: active ? '1px solid #f87171' : '1px solid var(--border-subtle)',
                          background: active ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                          color: active ? '#fff' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {allg}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  Save Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
