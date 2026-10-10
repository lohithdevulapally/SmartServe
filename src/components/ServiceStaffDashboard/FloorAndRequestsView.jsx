import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  BellRing, 
  CheckCircle2, 
  Droplets, 
  Utensils, 
  ScrollText, 
  UserCheck, 
  Clock, 
  Sparkles 
} from 'lucide-react';

export default function FloorAndRequestsView() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [tables, setTables] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      api.getTables(),
      api.getServiceRequests()
    ])
      .then(([t, r]) => {
        setTables(t);
        setRequests(r);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading floor data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [wsEvent]);

  const handleTableStatus = async (tableId, status) => {
    try {
      await api.updateTableStatus(tableId, status, currentUser?.full_name || 'Waiter Marcus');
      addToast(`Table updated to ${status.toUpperCase()}`, 'info');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCompleteRequest = async (reqId) => {
    try {
      await api.updateServiceRequest(reqId, {
        status: 'completed',
        assigned_staff_id: currentUser?.employee_id || 1
      });
      addToast('Service request marked as fulfilled!', 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getRequestIcon = (type) => {
    switch (type) {
      case 'water': return <Droplets size={18} color="#60a5fa" />;
      case 'cutlery': return <Utensils size={18} color="#f59e0b" />;
      case 'napkins': return <ScrollText size={18} color="#a78bfa" />;
      case 'bill': return <UserCheck size={18} color="#10b981" />;
      default: return <BellRing size={18} color="#ec4899" />;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed').slice(0, 5);

  return (
    <div>
      {/* 1. Live Customer Service Requests Buzzer Feed */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BellRing size={20} color="var(--accent-gold)" />
            <h3 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff' }}>
              Live Customer Table Requests & Buzzer Feed
            </h3>
          </div>
          {pendingRequests.length > 0 && (
            <span className="badge badge-danger">
              {pendingRequests.length} Pending Assistance Calls
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No pending guest table requests. All tables are currently attended!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {pendingRequests.map(req => (
              <div
                key={req.id}
                className="glass-panel"
                style={{
                  padding: '16px',
                  borderLeft: '4px solid #ef4444',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  animation: 'slideUp 0.2s ease-out'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getRequestIcon(req.request_type)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                      Table {req.table_number}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold-light)', textTransform: 'capitalize' }}>
                      Needs: {req.request_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCompleteRequest(req.id)}
                  className="btn btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Done</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Live Floor & Table Management */}
      <div>
        <h3 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '14px' }}>
          Floor Map & Table Turnover
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
          {tables.map(table => {
            return (
              <div
                key={table.id}
                className={`table-node ${table.status}`}
                style={{ padding: '18px', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h4 className="font-serif" style={{ fontSize: '1.35rem', color: '#fff' }}>
                      {table.table_number}
                    </h4>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {table.section} • {table.capacity} Seats
                    </div>
                  </div>
                  <span className={`badge ${
                    table.status === 'available' ? 'badge-success' :
                    table.status === 'occupied' ? 'badge-danger' :
                    table.status === 'reserved' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {table.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Waiter: <strong>{table.assigned_waiter_name || 'Unassigned'}</strong>
                </div>

                {/* Quick Status Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {['available', 'occupied', 'cleaning', 'reserved'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleTableStatus(table.id, st)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        border: table.status === st ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                        background: table.status === st ? 'rgba(201, 151, 91, 0.25)' : 'rgba(12, 9, 6, 0.7)',
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
