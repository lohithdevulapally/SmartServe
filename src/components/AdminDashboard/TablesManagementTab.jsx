import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  UserCheck,
  RefreshCw,
  Utensils
} from 'lucide-react';

export default function TablesManagementTab() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [tables, setTables] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTables = () => {
    Promise.all([
      api.getTables(),
      api.getEmployees()
    ])
      .then(([t, e]) => {
        setTables(t);
        setEmployees(e);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching tables:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadTables();
  }, [wsEvent]);

  const handleStatusChange = async (tableId, status) => {
    try {
      await api.updateTableStatus(tableId, status, currentUser?.full_name || 'Admin');
      addToast(`Table updated to ${status.toUpperCase()}`, 'info');
      loadTables();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAssignWaiter = async (tableId, waiterId) => {
    try {
      await api.assignTableWaiter(tableId, waiterId ? Number(waiterId) : null, currentUser?.full_name || 'Admin');
      addToast(`Waiter assigned to table`, 'success');
      loadTables();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Overview Status Bar */}
      <div style={{
        display: 'flex',
        gap: '14px',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        {[
          { key: 'available', label: 'Available', color: '#10b981', count: tables.filter(t => t.status === 'available').length },
          { key: 'occupied', label: 'Occupied', color: '#ef4444', count: tables.filter(t => t.status === 'occupied').length },
          { key: 'reserved', label: 'Reserved', color: '#f59e0b', count: tables.filter(t => t.status === 'reserved').length },
          { key: 'cleaning', label: 'Cleaning', color: '#3b82f6', count: tables.filter(t => t.status === 'cleaning').length }
        ].map(st => (
          <div key={st.key} className="glass-panel" style={{ padding: '12px 18px', flex: '1 1 180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{st.label}</span>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: st.color }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
              {st.count} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>tables</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tables Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {tables.map(table => {
          let statusBadgeClass = 'badge-success';
          if (table.status === 'occupied') statusBadgeClass = 'badge-danger';
          else if (table.status === 'reserved') statusBadgeClass = 'badge-warning';
          else if (table.status === 'cleaning') statusBadgeClass = 'badge-info';

          return (
            <div
              key={table.id}
              className={`table-node ${table.status}`}
              style={{ padding: '20px', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h4 className="font-serif" style={{ fontSize: '1.4rem', color: '#fff' }}>
                    {table.table_number}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {table.section} • Capacity: {table.capacity} Guests
                  </div>
                </div>
                <span className={`badge ${statusBadgeClass}`}>
                  {table.status.toUpperCase()}
                </span>
              </div>

              {/* Current Active Order if Occupied */}
              {table.current_order_id && (
                <div style={{
                  background: 'rgba(12, 9, 6, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '12px',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-gold)', fontWeight: 600 }}>
                    <span>Active Order #{table.order_number}</span>
                    <span>₹{table.total_amount?.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Status: {table.order_status?.toUpperCase()}
                  </div>
                </div>
              )}

              {/* Waiter Assignment */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Assigned Service Waiter:
                </label>
                <select
                  value={table.assigned_waiter_id || ''}
                  onChange={(e) => handleAssignWaiter(table.id, e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.position})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Action Buttons */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Update Floor Status:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {['available', 'occupied', 'reserved', 'cleaning'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(table.id, st)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: table.status === st ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                        background: table.status === st ? 'rgba(201, 151, 91, 0.25)' : 'rgba(12, 9, 6, 0.6)',
                        color: table.status === st ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
