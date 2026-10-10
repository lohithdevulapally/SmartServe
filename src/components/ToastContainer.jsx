import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, Bell, X } from 'lucide-react';

export default function ToastContainer() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 9999,
      maxWidth: 'calc(100vw - 32px)',
      width: '380px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => {
        let icon = <Info size={18} color="#60a5fa" />;
        let borderColor = 'rgba(59, 130, 246, 0.4)';
        let bg = 'rgba(26, 20, 14, 0.94)';

        if (toast.type === 'success' || toast.type === 'order') {
          icon = <CheckCircle2 size={18} color="#34d399" />;
          borderColor = 'rgba(16, 185, 129, 0.4)';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle size={18} color="#fbbf24" />;
          borderColor = 'rgba(245, 158, 11, 0.4)';
        } else if (toast.type === 'error') {
          icon = <AlertTriangle size={18} color="#f87171" />;
          borderColor = 'rgba(239, 68, 68, 0.4)';
        }

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: bg,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#fdfbf7',
              fontSize: '0.9rem',
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            {icon}
            <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
