import React, { useState } from 'react';
import LiveKitchenKDS from './LiveKitchenKDS';
import FloorAndRequestsView from './FloorAndRequestsView';
import DeliveryVerificationView from './DeliveryVerificationView';
import StaffShiftView from './StaffShiftView';
import { ChefHat, Grid3X3, Truck, Clock } from 'lucide-react';

export default function ServiceStaffDashboardMain() {
  const [activeTab, setActiveTab] = useState('kds');

  const tabs = [
    { key: 'kds', label: 'Kitchen KDS Bump Bar', icon: ChefHat },
    { key: 'floor', label: 'Floor Plan & Service Bell', icon: Grid3X3 },
    { key: 'delivery', label: 'Supplier Delivery Intake', icon: Truck },
    { key: 'shifts', label: 'Timeclock & Shift Handovers', icon: Clock }
  ];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Header and Subtabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 className="font-serif" style={{ fontSize: '1.85rem', color: '#fff' }}>
            Service Staff & <span className="gold-gradient-text">Kitchen Station</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Live order bump bar, customer table assistance buzzers, supplier intake verification, and personal timeclock.
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--accent-gold)' : '1px solid transparent',
                  background: isActive ? 'rgba(201, 151, 91, 0.2)' : 'rgba(20, 15, 10, 0.6)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--accent-gold)' : 'var(--text-muted)'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panels */}
      {activeTab === 'kds' && <LiveKitchenKDS />}
      {activeTab === 'floor' && <FloorAndRequestsView />}
      {activeTab === 'delivery' && <DeliveryVerificationView />}
      {activeTab === 'shifts' && <StaffShiftView />}
    </div>
  );
}
