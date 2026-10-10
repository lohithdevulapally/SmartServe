import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  ShieldCheck, 
  Clock, 
  History 
} from 'lucide-react';

export default function ReportsExportTab() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuditLogs()
      .then(logs => {
        setAuditLogs(logs);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching audit logs:', err);
        setLoading(false);
      });
  }, []);

  const reportsList = [
    { type: 'sales', title: 'Sales & Revenue Financial Ledger', desc: 'Order numbers, guest names, subtotal, sales tax, service charges, payment status.' },
    { type: 'inventory', title: 'Live Inventory & Ingredients Stock', desc: 'Ingredient names, stock levels, safety thresholds, target levels, unit costs.' },
    { type: 'attendance', title: 'Staff Attendance & Verified Timesheets', desc: 'Clock-in, clock-out, break duration, verified working hours, audit reasons.' },
    { type: 'payroll', title: 'Salary Estimates & Approved Payroll', desc: 'Regular hours, overtime hours, gross estimates, authorized timestamps.' },
    { type: 'expenses', title: 'Operational Expenses & COGS Outlays', desc: 'Vendor expenses, utility bills, COGS deliveries, recorded timestamps.' }
  ];

  return (
    <div>
      {/* 1. Reports Export Cards */}
      <div style={{ marginBottom: '32px' }}>
        <h4 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '16px' }}>
          Official Regulatory & Compliance Data Exports
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {reportsList.map(rep => (
            <div key={rep.type} className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', marginBottom: '4px' }}>
                {rep.title}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px', flex: 1 }}>
                {rep.desc}
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={api.getExportUrl(rep.type, 'csv')}
                  download
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: '0.78rem', textDecoration: 'none' }}
                >
                  <FileSpreadsheet size={15} />
                  <span>Export CSV</span>
                </a>

                <a
                  href={api.getExportUrl(rep.type, 'json')}
                  download
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '8px', fontSize: '0.78rem', textDecoration: 'none' }}
                >
                  <FileCode size={15} />
                  <span>Export JSON</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. System Audit Logs Viewer (Requirement 4.7) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <ShieldCheck size={18} color="var(--accent-gold)" />
          <h4 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff' }}>
            System Administrative Audit Logs
          </h4>
        </div>
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 14px' }}>Timestamp</th>
                <th style={{ padding: '10px 14px' }}>Responsible User</th>
                <th style={{ padding: '10px 14px' }}>Role</th>
                <th style={{ padding: '10px 14px' }}>Action</th>
                <th style={{ padding: '10px 14px' }}>Entity Type</th>
                <th style={{ padding: '10px 14px' }}>Details / Audit Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {log.created_at}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>
                    {log.user_name || 'System'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                      {log.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-gold-light)' }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                    {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
