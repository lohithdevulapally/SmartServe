import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCcw, 
  CreditCard 
} from 'lucide-react';

export default function FinancialsTab() {
  const { wsEvent, addToast, currentUser } = useApp();
  const [data, setData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    estimatedGrossProfit: 0,
    estimatedNetProfit: 0,
    expenses: []
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFinancials = () => {
    Promise.all([
      api.getProfitExpenses(),
      api.getOrders()
    ])
      .then(([fin, ord]) => {
        setData(fin);
        setOrders(ord);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching financials:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFinancials();
  }, [wsEvent]);

  const handleRefund = async (order) => {
    if (!window.confirm(`Issue refund for Order #${order.order_number} (₹${order.total_amount})?`)) return;

    try {
      // Find successful payment for order
      const fullOrder = await api.getOrder(order.id);
      const successfulPayment = (fullOrder.payments || []).find(p => p.status === 'successful');

      if (!successfulPayment) {
        addToast('No settled payment found to refund for this order', 'warning');
        return;
      }

      const res = await api.refundPayment(successfulPayment.id, {
        reason: 'Customer satisfaction guarantee',
        authorized_by: currentUser?.full_name || 'Admin Diana'
      });

      addToast(`Refund authorized! Ref: ${res.refund_reference}`, 'success');
      loadFinancials();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      {/* Financial Overview Cards */}
      <div className="grid-admin-stats" style={{ marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Revenue</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '6px 0' }}>
            ₹{data.totalRevenue.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>From confirmed dining orders</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operating & COGS Expenses</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', margin: '6px 0' }}>
            ₹{data.totalExpenses.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ingredients, utilities, and packaging</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Gross Profit (~65% Margin)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-gold)', margin: '6px 0' }}>
            ₹{data.estimatedGrossProfit.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Revenue minus recipe COGS estimate</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Est. Net Profit</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: data.estimatedNetProfit >= 0 ? '#34d399' : '#f87171', margin: '6px 0' }}>
            ₹{data.estimatedNetProfit.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Net after recorded expenses</div>
        </div>
      </div>

      {/* Revenue & Profit Allocation Visual Graph */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#fff', margin: 0 }}>
              Total Revenue & Profit Allocation Graph
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Visual proportion of earned revenue allocated to gross profit, food cost, and operating overhead
            </div>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
            ₹{data.totalRevenue.toFixed(2)} Total
          </span>
        </div>

        {/* Visual Multi-segment Progress Bar */}
        <div style={{
          height: '24px',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          marginBottom: '16px',
          border: '1px solid var(--border-subtle)'
        }}>
          {(() => {
            const rev = Math.max(data.totalRevenue, 1);
            const netPct = Math.max(0, Math.min(100, (data.estimatedNetProfit / rev) * 100));
            const cogsPct = Math.max(0, Math.min(100, 35));
            const expPct = Math.max(0, Math.min(100, (data.totalExpenses / rev) * 100));

            return (
              <>
                <div style={{ width: `${netPct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width 0.4s ease' }} title={`Net Profit: ₹${data.estimatedNetProfit.toFixed(2)}`} />
                <div style={{ width: `${cogsPct}%`, background: 'linear-gradient(90deg, #c9975b, #fbbf24)', transition: 'width 0.4s ease' }} title={`Recipe COGS: ~35%`} />
                <div style={{ width: `${expPct}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 0.4s ease' }} title={`Expenses: ₹${data.totalExpenses.toFixed(2)}`} />
              </>
            );
          })()}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#34d399', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Net Profit:</span>
            <strong style={{ color: '#fff' }}>₹{data.estimatedNetProfit.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#fbbf24', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Est. Gross Profit:</span>
            <strong style={{ color: '#fff' }}>₹{data.estimatedGrossProfit.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f87171', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Operating Expenses:</span>
            <strong style={{ color: '#fff' }}>₹{data.totalExpenses.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      {/* Disclaimers & Transactions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'start' }}>
        {/* Transactions & Orders Table */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '14px' }}>
            Payment Transactions & Refunds Ledger
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>Order Ref</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Amount</th>
                  <th style={{ padding: '10px 12px' }}>Payment Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Refund Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map(ord => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      #{ord.order_number}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fff' }}>
                      {ord.customer_name}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#fff' }}>
                      ₹{ord.total_amount?.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {ord.payment_status === 'paid' ? (
                        <span className="badge badge-success">Settled</span>
                      ) : ord.payment_status === 'refunded' ? (
                        <span className="badge badge-danger">Refunded</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      {ord.payment_status === 'paid' && (
                        <button
                          onClick={() => handleRefund(ord)}
                          className="btn btn-outline"
                          style={{ padding: '4px 10px', fontSize: '0.72rem', borderColor: '#f87171', color: '#f87171' }}
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Operating Expenses Recorded */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '14px' }}>
            Operational Expense Ledger
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.expenses.map((exp, idx) => (
              <div key={idx} style={{
                background: 'rgba(12, 9, 6, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{exp.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {exp.category} • {exp.expense_date}
                  </div>
                </div>
                <span style={{ fontWeight: 700, color: '#f87171' }}>
                  -₹{exp.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
