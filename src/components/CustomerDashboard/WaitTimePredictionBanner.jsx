import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Clock, ChefHat, AlertCircle, Zap } from 'lucide-react';

export default function WaitTimePredictionBanner({ hurryModeActive, onToggleHurryMode }) {
  const { wsEvent } = useApp();
  const [workload, setWorkload] = useState({
    activeOrdersCount: 2,
    queuedOrdersCount: 1,
    queueDelayMinutes: 5,
    capacityPct: 35,
    isBottleneck: false
  });

  const loadWorkload = () => {
    api.getKitchenWorkload()
      .then(setWorkload)
      .catch(err => console.error('Error fetching workload:', err));
  };

  useEffect(() => {
    loadWorkload();
  }, [wsEvent]);

  // Base dish prep time average is ~10 min, + queue delay
  const basePrep = hurryModeActive ? 5 : 12;
  const estimatedMin = basePrep + workload.queueDelayMinutes;
  const estimatedMax = estimatedMin + 8;

  return (
    <div className="glass-panel" style={{
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      borderLeft: '4px solid var(--accent-gold)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'rgba(201, 151, 91, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(201, 151, 91, 0.3)'
        }}>
          <Clock size={20} color="var(--accent-gold)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
              Smart Wait-Time Prediction:
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.82rem' }}>
              ~{estimatedMin} - {estimatedMax} mins
            </span>
            {workload.isBottleneck && (
              <span className="badge badge-warning">
                High Kitchen Workload
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={13} color="var(--text-muted)" />
            <span>
              Dynamic prediction calculated from {workload.activeOrdersCount} active kitchen orders ({workload.capacityPct}% kitchen load). <em>Predictions are estimates, not guaranteed.</em>
            </span>
          </div>
        </div>
      </div>

      {/* Hurry Mode Button */}
      <button
        onClick={onToggleHurryMode}
        className={`btn ${hurryModeActive ? 'hurry-active-glow' : 'btn-secondary'}`}
        style={{
          background: hurryModeActive ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' : undefined,
          color: hurryModeActive ? '#120d08' : undefined,
          fontWeight: 700
        }}
      >
        <Zap size={18} fill={hurryModeActive ? '#120d08' : 'none'} />
        <span>{hurryModeActive ? '⚡ Hurry Mode Active' : '⚡ Activate Hurry Mode'}</span>
      </button>
    </div>
  );
}
