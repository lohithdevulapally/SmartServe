import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  X, 
  ShieldCheck, 
  FileText
} from 'lucide-react';

export default function StaffAndPayrollTab() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [subTab, setSubTab] = useState('payroll'); // 'payroll' | 'attendance' | 'employees'
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payrollEstimates, setPayrollEstimates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Correction Modal
  const [correctingRecord, setCorrectingRecord] = useState(null);
  const [newVerifiedHours, setNewVerifiedHours] = useState('');
  const [auditReason, setAuditReason] = useState('');

  const loadData = () => {
    Promise.all([
      api.getEmployees(),
      api.getAttendance(),
      api.getPayrollEstimates()
    ])
      .then(([emp, att, pay]) => {
        setEmployees(emp);
        setAttendance(att);
        setPayrollEstimates(pay);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching staff data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [wsEvent]);

  const handleApprovePayroll = async (estimate) => {
    try {
      await api.approvePayroll({
        employee_id: estimate.employee_id,
        period_start: '2026-10-01',
        period_end: '2026-10-15',
        regular_hours: estimate.regular_hours,
        overtime_hours: estimate.overtime_hours,
        gross_estimate: estimate.gross_estimate,
        approved_by_name: currentUser?.full_name || 'Admin Diana'
      });
      addToast(`Payroll for ${estimate.full_name} approved!`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCorrectAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!correctingRecord || !auditReason.trim()) {
      addToast('Mandatory audit reason is required for attendance correction', 'warning');
      return;
    }

    try {
      await api.correctAttendance(correctingRecord.id, {
        clock_in: correctingRecord.clock_in,
        clock_out: correctingRecord.clock_out,
        break_minutes: correctingRecord.break_minutes,
        verified_hours: Number(newVerifiedHours),
        audit_reason: auditReason,
        corrected_by: currentUser?.id || 1
      });
      addToast('Attendance hours updated with audit record', 'success');
      setCorrectingRecord(null);
      setAuditReason('');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Subtab navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        {[
          { key: 'payroll', label: 'Automated Salary & Payroll Approvals' },
          { key: 'attendance', label: 'Shift Attendance & Audit Corrections' },
          { key: 'employees', label: 'Employee Profiles & Wage Rates' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`btn ${subTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. PAYROLL ESTIMATES & APPROVAL TAB */}
      {subTab === 'payroll' && (
        <div>
          {/* Disclaimer banner */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: '0.82rem',
            color: '#93c5fd',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FileText size={18} color="#60a5fa" />
            <div>
              <strong>Payroll Compliance Notice: </strong>
              Salary figures are automated estimations computed from verified attendance timesheets (Standard 40h regular + 1.5x overtime). Actual disbursement is recorded when batch ACH/banking processing is finalized.
            </div>
          </div>

          <div className="glass-panel table-responsive" style={{ padding: '8px' }}>
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>Employee</th>
                  <th style={{ padding: '12px 16px' }}>Position</th>
                  <th style={{ padding: '12px 16px' }}>Hourly Rate</th>
                  <th style={{ padding: '12px 16px' }}>Regular Hours</th>
                  <th style={{ padding: '12px 16px' }}>Overtime Hours</th>
                  <th style={{ padding: '12px 16px' }}>Estimated Wages</th>
                  <th style={{ padding: '12px 16px' }}>Payroll Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Review & Approval</th>
                </tr>
              </thead>
              <tbody>
                {payrollEstimates.map(est => {
                  const isApproved = est.payroll_record?.status === 'approved';

                  return (
                    <tr key={est.employee_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                        {est.full_name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {est.position}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--accent-gold)' }}>
                        ₹{est.wage_rate.toFixed(2)}/hr
                      </td>
                      <td style={{ padding: '12px 16px', color: '#fff' }}>
                        {est.regular_hours} hrs
                      </td>
                      <td style={{ padding: '12px 16px', color: est.overtime_hours > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                        {est.overtime_hours} hrs
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--accent-gold-light)', fontSize: '0.95rem' }}>
                        ₹{est.gross_estimate.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isApproved ? (
                          <span className="badge badge-success">Approved for Direct Deposit</span>
                        ) : (
                          <span className="badge badge-warning">Draft (Review Pending)</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {isApproved ? (
                          <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>
                            ✓ Authorized by Admin
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApprovePayroll(est)}
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                          >
                            Approve Salary Estimate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE & AUDIT CORRECTIONS TAB */}
      {subTab === 'attendance' && (
        <div className="glass-panel table-responsive" style={{ padding: '8px' }}>
          <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Staff Member</th>
                <th style={{ padding: '12px 16px' }}>Clock-In Time</th>
                <th style={{ padding: '12px 16px' }}>Clock-Out Time</th>
                <th style={{ padding: '12px 16px' }}>Break Minutes</th>
                <th style={{ padding: '12px 16px' }}>Verified Hours</th>
                <th style={{ padding: '12px 16px' }}>Current Shift Status</th>
                <th style={{ padding: '12px 16px' }}>Audit Reason / Notes</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map(att => (
                <tr key={att.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>
                    {att.employee_name}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {att.clock_in}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {att.clock_out || '— (In Progress)'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                    {att.break_minutes} mins
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                    {att.verified_hours} hrs
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {att.status === 'clocked_in' ? (
                      <span className="badge badge-success">Clocked In</span>
                    ) : att.status === 'on_break' ? (
                      <span className="badge badge-warning">On Break</span>
                    ) : (
                      <span className="badge badge-gold">Clocked Out</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {att.audit_reason || 'Standard Shift'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setCorrectingRecord(att);
                        setNewVerifiedHours(att.verified_hours);
                        setAuditReason(att.audit_reason || '');
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                    >
                      Audit Correction
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. EMPLOYEE PROFILES */}
      {subTab === 'employees' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {employees.map(emp => (
            <div key={emp.id} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ fontSize: '2rem' }}>{emp.avatar || '👤'}</span>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem' }}>{emp.full_name}</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold)' }}>{emp.position}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Wage:</span>
                  <strong style={{ color: '#fff' }}>₹{emp.wage_rate.toFixed(2)}/hr</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Overtime Rate:</span>
                  <strong style={{ color: '#fff' }}>₹{(emp.overtime_rate || emp.wage_rate * 1.5).toFixed(2)}/hr</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Status:</span>
                  <span className="badge badge-success">{emp.employment_status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Contact:</span>
                  <span>{emp.phone || emp.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance Audit Correction Modal */}
      {correctingRecord && (
        <div className="modal-overlay" onClick={() => setCorrectingRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <form onSubmit={handleCorrectAttendanceSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', color: '#fff' }}>
                  Attendance Timesheet Correction
                </h3>
                <button type="button" onClick={() => setCorrectingRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Correcting record for: <strong style={{ color: '#fff' }}>{correctingRecord.employee_name}</strong>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Corrected Verified Working Hours *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newVerifiedHours}
                  onChange={(e) => setNewVerifiedHours(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.8rem', color: '#f87171', display: 'block', marginBottom: '4px' }}>
                  Mandatory Audit Reason (Required by Law & Policy) *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Employee forgot to clock out before staff meeting; verified by shift manager..."
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setCorrectingRecord(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Audited Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
