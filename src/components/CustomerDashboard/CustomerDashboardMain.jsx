import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import WaitTimePredictionBanner from './WaitTimePredictionBanner';
import AffordableMealFinder from './AffordableMealFinder';
import LiveMenu from './LiveMenu';
import DishCustomizationModal from './DishCustomizationModal';
import SmartAlternativesModal from './SmartAlternativesModal';
import CartAndBillSplitterModal from './CartAndBillSplitterModal';
import LiveOrderTrackerModal from './LiveOrderTrackerModal';
import LoyaltyModal from './LoyaltyModal';
import RatingsModal from './RatingsModal';
import ServiceRequestModal from './ServiceRequestModal';
import { Award, ShoppingBag, Clock, Sparkles } from 'lucide-react';

export default function CustomerDashboardMain({
  isCartOpen,
  onCloseCart,
  isServiceOpen,
  onCloseService
}) {
  const { currentUser, selectedTable } = useApp();

  // Filter States
  const [budget, setBudget] = useState(0);
  const [sortByPrice, setSortByPrice] = useState('none');
  const [hurryMode, setHurryMode] = useState(false);

  // Modals
  const [customizeDish, setCustomizeDish] = useState(null);
  const [alternativesData, setAlternativesData] = useState(null); // { dish, alternatives }
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState(null);

  const handleOpenAlternatives = async (dish) => {
    try {
      const res = await fetch(`/api/menu/${dish.id}`).then(r => r.json());
      setAlternativesData({
        dish,
        alternatives: res.alternatives || []
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectAlternative = (altDish) => {
    setAlternativesData(null);
    setCustomizeDish(altDish);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Hero Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(27, 21, 15, 0.95) 0%, rgba(12, 9, 6, 0.98) 100%)',
        border: '1px solid rgba(201, 151, 91, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              Table {selectedTable} • Dining Experience
            </span>
          </div>
          <h2 className="font-serif" style={{ fontSize: '2rem', color: '#fff', marginBottom: '8px' }}>
            Welcome back, <span className="gold-gradient-text">{currentUser?.full_name || 'Guest'}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '600px' }}>
            Explore our artisanal menu, discover affordable pairings, customize dishes to your dietary preferences, and track real-time kitchen preparation.
          </p>
        </div>

        {/* Quick Actions (Loyalty & Order Tracker) */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsLoyaltyOpen(true)}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', fontSize: '0.88rem' }}
          >
            <Award size={18} color="var(--accent-gold)" />
            <span>Loyalty Rewards ({currentUser?.loyalty_points || 0} pts)</span>
          </button>

          <button
            onClick={() => setIsTrackerOpen(true)}
            className="btn btn-outline"
            style={{ padding: '10px 18px', fontSize: '0.88rem', borderColor: 'var(--accent-gold)' }}
          >
            <Clock size={18} color="var(--accent-gold)" />
            <span>Track Live Orders</span>
          </button>
        </div>
      </div>

      {/* 1.4 Smart Wait-Time Prediction & 1.5 Hurry Mode Banner */}
      <WaitTimePredictionBanner
        hurryModeActive={hurryMode}
        onToggleHurryMode={() => setHurryMode(!hurryMode)}
      />

      {/* 1.2 Affordable Meal Finder (Budget slider & Combos) */}
      <AffordableMealFinder
        budget={budget}
        onBudgetChange={setBudget}
        sortByPrice={sortByPrice}
        onSortChange={setSortByPrice}
      />

      {/* 1.1 Live Menu with 1.3 Allergens, 1.7 Out-of-stock Alternatives */}
      <LiveMenu
        budget={budget}
        sortByPrice={sortByPrice}
        hurryMode={hurryMode}
        onOpenCustomize={(dish) => setCustomizeDish(dish)}
        onOpenAlternatives={handleOpenAlternatives}
      />

      {/* Modals */}
      {customizeDish && (
        <DishCustomizationModal
          dish={customizeDish}
          onClose={() => setCustomizeDish(null)}
        />
      )}

      {alternativesData && (
        <SmartAlternativesModal
          unavailableDish={alternativesData.dish}
          alternatives={alternativesData.alternatives}
          onSelectAlternative={handleSelectAlternative}
          onClose={() => setAlternativesData(null)}
        />
      )}

      {isCartOpen && (
        <CartAndBillSplitterModal
          onClose={onCloseCart}
          onOrderPlaced={(orderId) => {
            setActiveTrackingOrderId(orderId);
            setIsTrackerOpen(true);
          }}
        />
      )}

      {isTrackerOpen && (
        <LiveOrderTrackerModal
          initialOrderId={activeTrackingOrderId}
          onClose={() => setIsTrackerOpen(false)}
          onOpenFeedback={(order) => {
            setFeedbackOrder(order);
          }}
        />
      )}

      {isLoyaltyOpen && (
        <LoyaltyModal
          onClose={() => setIsLoyaltyOpen(false)}
        />
      )}

      {feedbackOrder && (
        <RatingsModal
          order={feedbackOrder}
          onClose={() => setFeedbackOrder(null)}
        />
      )}

      {isServiceOpen && (
        <ServiceRequestModal
          onClose={onCloseService}
        />
      )}
    </div>
  );
}
