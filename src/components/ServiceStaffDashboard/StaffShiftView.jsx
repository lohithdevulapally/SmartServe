import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  Clock, 
  Coffee, 
  CheckCircle2, 
  LogOut, 
  LogIn, 
  History, 
  FileText, 
  Plus, 
  AlertTriangle 
} from 'lucide-react';

export default function StaffShiftView() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [attendance, setAttendance] = useState([]);
  const [shiftNotes, setShiftNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Note
  const [newNote, setNewNote] = useState('');
  const [shiftType, setShiftType] = useState('morning');
  const [isUrgent, setIsUrgent] = useState(false);

  const employeeId = currentUser?.employee_id || 3; // Marcus by default

  const loadData = () => {
    Promise.all([
      api.getAttendance(),
      api.getShiftNotes()
    ])
      .then(([att, notes]) => {
        setAttendance(att);
        setShiftNotes(notes);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching shift data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [wsEvent, currentUser]);

  // Current active shift for this user
  const activeShift = attendance.find(a => 
    a.employee_id === employeeId && ['clocked_in', 'on_break'].includes(a.status)
  );

  const handleClockIn = async () => {
    try {
      await api.clockIn(employeeId);
      addToast(`Clocked in! Shift session active.`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleBreakStart = async () => {
    try {
      await api.breakStart(employeeId);
      addToast(`Break started. Enjoy your rest!`, 'info');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleBreakEnd = async () => {
    try {
      await api.breakEnd(employeeId);
      addToast(`Break ended. Welcome back to service!`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleClockOut = async () => {
    try {
      const res = await api.clockOut(employeeId);
      addToast(`Clocked out! Total verified shift: ${res.verified_hours} hours.`, 'success');
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handlePostNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await api.createShiftNote({
        staff_name: currentUser?.full_name || 'Staff Member',
        shift_type: shiftType,
        notes: newNote,
        urgent: isUrgent
      });
      addToast('Handover note logged for oncoming shift!', 'success');
      setNewNote('');
      setIsUrgent(false);
      loadData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const myShifts = attendance.filter(a => a.employee_id === employeeId);

  return (
    <div>
      {/* 1. Shift Stopwatch & Clock In/Out Hero */}
      <div className="glass-panel" style={{
        padding: '24px',
        marginBottom: '28px',
        background: 'linear-gradient(135deg, rgba(27, 21, 15, 0.95) 0%, rgba(12, 9, 6, 0.95) 100%)',
        border: '1px solid rgba(201, 151, 91, 0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shift Timeclock • Authenticated Employee: {currentUser?.full_name}
            </div>
            <h3 className="font-serif" style={{ fontSize: '1.6rem', color: '#fff', margin: '4px 0' }}>
              Status: {activeShift ? (activeShift.status === 'on_break' ? '☕ On Rest Break' : '🟢 Actively Clocked In') : '⚪ Off Shift'}
            </h3>
            {activeShift && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Started at: {activeShift.clock_in} • Breaks logged: {activeShift.break_minutes} mins
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {!activeShift ? (
              <button onClick={handleClockIn} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
                <LogIn size={18} />
                <span>Clock In for Shift</span>
              </button>
            ) : (
              <>
                {activeShift.status === 'clocked_in' ? (
                  <button onClick={handleBreakStart} className="btn btn-secondary" style={{ padding: '12px 18px', fontSize: '0.88rem' }}>
                    <Coffee size={18} />
                    <span>Start Break</span>
                  </button>
                ) : (
                  <button onClick={handleBreakEnd} className="btn btn-secondary" style={{ padding: '12px 18px', fontSize: '0.88rem' }}>
                    <Clock size={18} />
                    <span>End Break & Resume</span>
                  </button>
                )}

                <button onClick={handleClockOut} className="btn btn-danger" style={{ padding: '12px 22px', fontSize: '0.88rem' }}>
                  <LogOut size={18} />
                  <span>Clock Out</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* 2. Personal Shift History */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <History size={18} color="var(--accent-gold)" />
            <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#fff' }}>
              Personal Shift History
            </h4>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 10px' }}>Date / Clock-In</th>
                  <th style={{ padding: '8px 10px' }}>Clock-Out</th>
                  <th style={{ padding: '8px 10px' }}>Breaks</th>
                  <th style={{ padding: '8px 10px' }}>Verified Hours</th>
                </tr>
              </thead>
              <tbody>
                {myShifts.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 10px', color: '#fff' }}>{s.clock_in}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{s.clock_out || 'In Progress'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{s.break_minutes}m</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--accent-gold)' }}>{s.verified_hours} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Shift Handover Notes (Requirement 3.11) */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <FileText size={18} color="var(--accent-gold)" />
            <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#fff' }}>
              Shift Handover Notes Log
            </h4>
          </div>

          {/* Form to post note */}
          <form onSubmit={handlePostNote} style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                style={{ fontSize: '0.8rem', width: 'auto' }}
              >
                <option value="morning">Morning Shift</option>
                <option value="afternoon">Afternoon Shift</option>
                <option value="evening">Evening / Closing</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  id="urg"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="urg" style={{ color: isUrgent ? '#f87171' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
                  High Priority
                </label>
              </div>
            </div>

            <textarea
              rows="2"
              placeholder="e.g. VIP party on Table 4 at 8pm; Espresso grinder setting calibrated..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ fontSize: '0.82rem', marginBottom: '8px' }}
            />

            <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}>
              <Plus size={14} />
              <span>Post Shift Handover Note</span>
            </button>
          </form>

          {/* Notes list */}
          <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shiftNotes.map(n => (
              <div
                key={n.id}
                style={{
                  background: 'rgba(12, 9, 6, 0.7)',
                  border: n.urgent ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ color: '#fff' }}>{n.staff_name} ({n.shift_type})</strong>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.created_at?.slice(0, 16)}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
