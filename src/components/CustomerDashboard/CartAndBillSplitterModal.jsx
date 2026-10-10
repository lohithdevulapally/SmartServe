import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Tag, 
  Users, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Percent
} from 'lucide-react';

export default function CartAndBillSplitterModal({ onClose, onOrderPlaced }) {
  const { 
    cart, 
    updateCartQty, 
    removeFromCart, 
    clearCart, 
    cartSubtotal, 
    selectedTable, 
    currentUser, 
    addToast 
  } = useApp();

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Bill Splitting Mode: 'full' | 'equal' | 'item'
  const [splitMode, setSplitMode] = useState('full');
  const [equalCount, setEqualCount] = useState(2);
  const [itemAssignments, setItemAssignments] = useState({}); // { cartItemId: personIndex }
  const [personNames, setPersonNames] = useState(['You', 'Guest 2', 'Guest 3']);

  // Payment Simulation
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleteData, setOrderCompleteData] = useState(null);

  // Calculations
  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = Number((discountedSubtotal * 0.08).toFixed(2));
  const serviceCharge = Number((discountedSubtotal * 0.05).toFixed(2));
  const totalAmount = Number((discountedSubtotal + taxAmount + serviceCharge).toFixed(2));

  // Handle coupon validation
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCode.trim()) return;

    try {
      const res = await api.validateCoupon(couponCode.trim().toUpperCase(), cartSubtotal);
      if (res.valid) {
        setAppliedCoupon(res);
        addToast(`Coupon "${res.code}" applied! Saved ₹${res.discount_amount.toFixed(2)}`, 'success');
      }
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    }
  };

  // Calculate splits
  const calculateEqualSplits = () => {
    const shareSubtotal = cartSubtotal / equalCount;
    const shareDiscount = discountAmount / equalCount;
    const shareTax = taxAmount / equalCount;
    const shareService = serviceCharge / equalCount;
    const shareTotal = totalAmount / equalCount;

    return Array.from({ length: equalCount }).map((_, idx) => ({
      person_name: idx === 0 ? (currentUser?.full_name || 'You') : `Person ${idx + 1}`,
      subtotal_share: shareSubtotal,
      discount_share: shareDiscount,
      tax_share: shareTax,
      service_share: shareService,
      total_share: shareTotal
    }));
  };

  // Calculate item-by-item splits
  const calculateItemSplits = () => {
    const numPeople = 2; // Default 2 people for assignment
    const splits = [
      { person_name: currentUser?.full_name || 'You', items: [], subtotal: 0 },
      { person_name: 'Dining Guest', items: [], subtotal: 0 }
    ];

    cart.forEach(item => {
      const assignedTo = itemAssignments[item.cartItemId] !== undefined ? itemAssignments[item.cartItemId] : 0;
      const target = splits[assignedTo] || splits[0];
      target.items.push(item);
      target.subtotal += (item.dish.price * item.quantity);
    });

    return splits.map(s => {
      const ratio = cartSubtotal > 0 ? (s.subtotal / cartSubtotal) : 0.5;
      const sDiscount = discountAmount * ratio;
      const sTax = taxAmount * ratio;
      const sService = serviceCharge * ratio;
      const sTotal = (s.subtotal - sDiscount) + sTax + sService;

      return {
        person_name: s.person_name,
        items: s.items.map(i => ({ name: i.dish.name, quantity: i.quantity, price: i.dish.price })),
        subtotal_share: s.subtotal,
        discount_share: sDiscount,
        tax_share: sTax,
        service_share: sService,
        total_share: Math.max(0, Number(sTotal.toFixed(2)))
      };
    });
  };

  const handlePlaceAndPayOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      // 1. Prepare items payload
      const itemsPayload = cart.map(it => ({
        menu_item_id: it.dish.id,
        name: it.dish.name,
        quantity: it.quantity,
        unit_price: it.dish.price,
        prep_time_minutes: it.dish.prep_time_minutes,
        selected_options: it.options,
        special_instructions: it.instructions
      }));

      // 2. Determine table ID (from T-2 or selectedTable)
      const tableNum = parseInt(selectedTable.replace('T-', '')) || 2;

      // 3. Place order via atomic API
      const orderRes = await api.placeOrder({
        customer_id: currentUser?.id || 1,
        customer_name: currentUser?.full_name || 'Sophia Lee',
        order_type: 'dine_in',
        table_id: tableNum,
        items: itemsPayload,
        coupon_code: appliedCoupon?.code,
        special_instructions: ''
      });

      // 4. If split bill mode is enabled, register customized split breakdown
      if (splitMode === 'equal') {
        const splits = calculateEqualSplits();
        await api.splitBill(orderRes.order_id, { split_type: 'equal', splits });
      } else if (splitMode === 'item') {
        const splits = calculateItemSplits();
        await api.splitBill(orderRes.order_id, { split_type: 'by_item', splits });
      }

      // 5. Process Payment via Gateway (Sandbox Stripe)
      const payRes = await api.payBill(orderRes.order_id, {
        payment_method: selectedPaymentMethod,
        amount: orderRes.total_amount,
        simulate_failure: simulateFailure
      });

      // Celebration confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      setOrderCompleteData({
        order_number: orderRes.order_number,
        total_amount: orderRes.total_amount,
        earnedPoints: orderRes.earnedPoints,
        prep_time_estimate: orderRes.prep_time_estimate,
        transaction_reference: payRes.transaction_reference,
        gateway: payRes.gateway_provider
      });

      clearCart();
      if (onOrderPlaced) onOrderPlaced(orderRes.order_id);
    } catch (err) {
      addToast(err.message || 'Payment or order failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
                Your Order & Checkout
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Table: <strong style={{ color: 'var(--accent-gold)' }}>{selectedTable}</strong> • Dine-In Guest: <strong>{currentUser?.full_name || 'Guest'}</strong>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Success Screen if placed */}
          {orderCompleteData ? (
            <div style={{ textAlign: 'center', padding: '24px 10px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <h4 className="font-serif" style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '6px' }}>
                Order #{orderCompleteData.order_number} Confirmed!
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '18px' }}>
                The kitchen has received your order and started preparation.
              </p>

              <div style={{
                background: 'rgba(12, 9, 6, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                maxWidth: '380px',
                margin: '0 auto 24px',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Paid:</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>₹{orderCompleteData.total_amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Est. Wait Time:</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>~{orderCompleteData.prep_time_estimate} mins</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transaction Ref:</span>
                  <span style={{ fontFamily: 'monospace', color: '#34d399' }}>{orderCompleteData.transaction_reference}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Payment Provider:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{orderCompleteData.gateway}</span>
                </div>
                {orderCompleteData.earnedPoints > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px dashed var(--border-subtle)' }}>
                    <span style={{ color: 'var(--accent-gold-light)', fontWeight: 600 }}>Loyalty Earned:</span>
                    <span style={{ color: 'var(--accent-gold-light)', fontWeight: 700 }}>+{orderCompleteData.earnedPoints} pts</span>
                  </div>
                )}
              </div>

              <button onClick={onClose} className="btn btn-primary" style={{ padding: '12px 28px' }}>
                Track Order Progress
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
              Your cart is currently empty. Add dishes from our live menu to order!
            </div>
          ) : (
            <div>
              {/* Cart Items List */}
              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                marginBottom: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {cart.map((item) => (
                  <div
                    key={item.cartItemId}
                    style={{
                      background: 'rgba(12, 9, 6, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                        {item.dish.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ₹{item.dish.price.toFixed(2)} each
                        {item.options && Object.keys(item.options).length > 0 && (
                          <span> • {Object.values(item.options).map(o => o.label).join(', ')}</span>
                        )}
                        {item.instructions && (
                          <span style={{ color: 'var(--accent-gold-light)' }}> • "{item.instructions}"</span>
                        )}
                      </div>

                      {/* Item assignment if split mode is 'item' */}
                      {splitMode === 'item' && (
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Assign to:</span>
                          <select
                            value={itemAssignments[item.cartItemId] || 0}
                            onChange={(e) => setItemAssignments({ ...itemAssignments, [item.cartItemId]: Number(e.target.value) })}
                            style={{ width: 'auto', padding: '2px 8px', fontSize: '0.72rem', height: '24px' }}
                          >
                            <option value={0}>You</option>
                            <option value={1}>Guest</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Stepper & Trash */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(27, 21, 15, 0.9)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px'
                      }}>
                        <button
                          onClick={() => updateCartQty(item.cartItemId, item.quantity - 1)}
                          style={{ background: 'none', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 6px' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.cartItemId, item.quantity + 1)}
                          style={{ background: 'none', border: 'none', color: '#fff', padding: '4px 8px', cursor: 'pointer' }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-gold)', minWidth: '55px', textAlign: 'right' }}>
                        ₹{(item.dish.price * item.quantity).toFixed(2)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        style={{ background: 'none', border: 'none', color: '#f87171', padding: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Smart Bill Splitting Options */}
              <div style={{
                background: 'rgba(201, 151, 91, 0.06)',
                border: '1px solid rgba(201, 151, 91, 0.25)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                    <Users size={16} color="var(--accent-gold)" />
                    <span>Smart Bill Splitting</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setSplitMode('full')}
                      className={`btn ${splitMode === 'full' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Single Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('equal')}
                      className={`btn ${splitMode === 'equal' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Split Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode('item')}
                      className={`btn ${splitMode === 'item' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Split By Dish
                    </button>
                  </div>
                </div>

                {splitMode === 'equal' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>Number of People:</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setEqualCount(num)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: equalCount === num ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                            background: equalCount === num ? 'var(--accent-gold)' : 'transparent',
                            color: equalCount === num ? '#120d08' : '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--accent-gold-light)', fontWeight: 700 }}>
                      ₹{(totalAmount / equalCount).toFixed(2)} / person
                    </span>
                  </div>
                )}

                {splitMode === 'item' && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Each guest pays for their selected items above. Shared dishes, 8% tax, and 5% service charge are split proportionally.
                  </div>
                )}
              </div>

              {/* Coupon Code Input */}
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Tag size={16} color="var(--accent-gold)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    placeholder="Enter Coupon (e.g. WELCOME15, SAVETEN)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    style={{ paddingLeft: '38px', textTransform: 'uppercase', fontSize: '0.85rem' }}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  Apply
                </button>
              </form>
              {couponError && (
                <div style={{ color: '#f87171', fontSize: '0.78rem', marginBottom: '10px' }}>{couponError}</div>
              )}
              {appliedCoupon && (
                <div style={{ color: '#34d399', fontSize: '0.78rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} />
                  <span>Coupon {appliedCoupon.code} applied (-₹{appliedCoupon.discount_amount.toFixed(2)})</span>
                </div>
              )}

              {/* Price Breakdown */}
              <div style={{
                background: 'rgba(12, 9, 6, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '18px',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Subtotal:</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399', marginBottom: '4px' }}>
                    <span>Coupon Discount:</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>Sales Tax (8%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <span>Service Charge (5%):</span>
                  <span>₹{serviceCharge.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', color: '#fff', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span>Order Total:</span>
                  <span className="gold-gradient-text">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Gateway Provider Selector & Simulation Options */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Payment Method (Provider: Stripe Sandbox Mode):
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['card', 'apple_pay', 'upi', 'cash'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        border: selectedPaymentMethod === method ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                        background: selectedPaymentMethod === method ? 'rgba(201, 151, 91, 0.2)' : 'rgba(12, 9, 6, 0.7)',
                        color: selectedPaymentMethod === method ? '#fff' : 'var(--text-secondary)',
                        textTransform: 'capitalize'
                      }}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Simulation toggle for test payment failure */}
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="simFail"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="simFail" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Simulate Payment Failure Fallback (Tests Requirement 1.10 error flow)
                  </label>
                </div>
              </div>

              {/* Place Order & Pay Button */}
              <button
                onClick={handlePlaceAndPayOrder}
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              >
                <ShieldCheck size={18} />
                <span>
                  {isSubmitting ? 'Authorizing Payment...' : `Confirm & Pay ₹${totalAmount.toFixed(2)}`}
                </span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
