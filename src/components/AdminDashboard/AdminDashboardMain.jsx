import React, { useState } from 'react';
import AdminOverviewTab from './AdminOverviewTab';
import MenuManagementTab from './MenuManagementTab';
import InventoryManagementTab from './InventoryManagementTab';
import TablesManagementTab from './TablesManagementTab';
import StaffAndPayrollTab from './StaffAndPayrollTab';
import FinancialsTab from './FinancialsTab';
import ComplaintsTab from './ComplaintsTab';
import ReportsExportTab from './ReportsExportTab';
import { 
  LayoutDashboard, 
  Utensils, 
  Boxes, 
  Grid3X3, 
  Users, 
  DollarSign, 
  AlertCircle, 
  Download 
} from 'lucide-react';

export default function AdminDashboardMain() {
  const [activeTab, setActiveTab] = useState('overview');

  const navItems = [
    { key: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { key: 'menu', label: 'Menu & Recipes', icon: Utensils },
    { key: 'inventory', label: 'Inventory & POs', icon: Boxes },
    { key: 'tables', label: 'Tables & Floor', icon: Grid3X3 },
    { key: 'staff', label: 'Staff & Payroll', icon: Users },
    { key: 'financials', label: 'Finances & Profit', icon: DollarSign },
    { key: 'complaints', label: 'Complaints & Reviews', icon: AlertCircle },
    { key: 'reports', label: 'Reports & Audit', icon: Download }
  ];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* Title & Tab Navigation Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 className="font-serif" style={{ fontSize: '1.85rem', color: '#fff' }}>
            Admin <span className="gold-gradient-text">Command Center</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Consolidated operational control, inventory automation, workforce timesheets, and financial metrics.
          </div>
        </div>

        {/* Scrollable Tab bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
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
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && <AdminOverviewTab onNavigateTab={(tab) => setActiveTab(tab)} />}
      {activeTab === 'menu' && <MenuManagementTab />}
      {activeTab === 'inventory' && <InventoryManagementTab />}
      {activeTab === 'tables' && <TablesManagementTab />}
      {activeTab === 'staff' && <StaffAndPayrollTab />}
      {activeTab === 'financials' && <FinancialsTab />}
      {activeTab === 'complaints' && <ComplaintsTab />}
      {activeTab === 'reports' && <ReportsExportTab />}
    </div>
  );
}
