const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      }
      throw new Error(errorMessage);
    }

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth & Personas
  getUsers: () => request('/auth/users'),
  getUser: (id) => request(`/auth/me/${id}`),
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  customerLogin: (data) => request('/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  logout: (data) => request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify(data || {})
  }),

  // Menu
  getMenu: (params = {}) => {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.dietary) query.append('dietary', params.dietary);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);
    if (params.hurry) query.append('hurry', params.hurry ? '1' : '0');
    if (params.search) query.append('search', params.search);
    if (params.excludeIngredient) query.append('excludeIngredient', params.excludeIngredient);
    const qs = query.toString();
    return request(`/menu${qs ? `?${qs}` : ''}`);
  },
  getCategories: () => request('/menu/categories'),
  getDish: (id) => request(`/menu/${id}`),
  createDish: (data) => request('/menu', { method: 'POST', body: JSON.stringify(data) }),
  updateDish: (id, data) => request(`/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDish: (id) => request(`/menu/${id}`, { method: 'DELETE' }),

  // Inventory & Ingredients
  getIngredients: () => request('/ingredients'),
  adjustIngredient: (id, data) => request(`/ingredients/${id}/adjust`, { method: 'POST', body: JSON.stringify(data) }),
  updateIngredientExpiry: (id, data) => request(`/ingredients/${id}/expiry`, { method: 'PATCH', body: JSON.stringify(data) }),
  getInventoryMovements: () => request('/inventory/movements'),

  // Kitchen Workload
  getKitchenWorkload: () => request('/kitchen/workload'),

  // Orders
  getOrders: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.customer_id) query.append('customer_id', params.customer_id);
    if (params.table_id) query.append('table_id', params.table_id);
    const qs = query.toString();
    return request(`/orders${qs ? `?${qs}` : ''}`);
  },
  getOrder: (id) => request(`/orders/${id}`),
  placeOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id, data) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  reportOrderIssue: (id, data) => request(`/orders/${id}/issue`, { method: 'POST', body: JSON.stringify(data) }),

  // Split & Payment
  splitBill: (orderId, data) => request(`/orders/${orderId}/split`, { method: 'POST', body: JSON.stringify(data) }),
  payBill: (orderId, data) => request(`/orders/${orderId}/pay`, { method: 'POST', body: JSON.stringify(data) }),
  refundPayment: (paymentId, data) => request(`/payments/${paymentId}/refund`, { method: 'POST', body: JSON.stringify(data) }),

  // Tables
  getTables: () => request('/tables'),
  updateTableStatus: (id, status, user_name) => request(`/tables/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, user_name }) }),
  assignTableWaiter: (id, assigned_waiter_id, user_name) => request(`/tables/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_waiter_id, user_name }) }),

  // Service Requests
  getServiceRequests: () => request('/service-requests'),
  createServiceRequest: (data) => request('/service-requests', { method: 'POST', body: JSON.stringify(data) }),
  updateServiceRequest: (id, data) => request(`/service-requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Suppliers & POs
  getSuppliers: () => request('/suppliers'),
  getPurchaseOrders: () => request('/purchase-orders'),
  createPurchaseOrder: (data) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePOStatus: (id, status, user_name) => request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, user_name }) }),
  verifyReceiveDelivery: (id, data) => request(`/purchase-orders/${id}/verify-receive`, { method: 'POST', body: JSON.stringify(data) }),

  // Staff & Attendance
  getEmployees: () => request('/employees'),
  getAttendance: () => request('/attendance'),
  clockIn: (employee_id) => request('/attendance/clock-in', { method: 'POST', body: JSON.stringify({ employee_id }) }),
  breakStart: (employee_id) => request('/attendance/break-start', { method: 'POST', body: JSON.stringify({ employee_id }) }),
  breakEnd: (employee_id) => request('/attendance/break-end', { method: 'POST', body: JSON.stringify({ employee_id }) }),
  clockOut: (employee_id) => request('/attendance/clock-out', { method: 'POST', body: JSON.stringify({ employee_id }) }),
  correctAttendance: (id, data) => request(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Payroll
  getPayrollEstimates: () => request('/payroll/estimates'),
  approvePayroll: (data) => request('/payroll/approve', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics & COGS
  getAnalyticsOverview: () => request('/analytics/overview'),
  getProfitExpenses: () => request('/analytics/profit-expenses'),
  getStaffPerformance: () => request('/analytics/staff-performance'),

  // Coupons & Loyalty
  getCoupons: () => request('/coupons'),
  validateCoupon: (code, subtotal) => request('/coupons/validate', { method: 'POST', body: JSON.stringify({ code, subtotal }) }),
  getLoyaltyRewards: () => request('/loyalty/rewards'),
  getLoyaltyLedger: (userId) => request(`/loyalty/ledger/${userId}`),
  redeemLoyaltyReward: (data) => request('/loyalty/redeem', { method: 'POST', body: JSON.stringify(data) }),

  // Compensations & Feedback
  getCompensations: () => request('/compensations'),
  issueCompensation: (data) => request('/compensations', { method: 'POST', body: JSON.stringify(data) }),
  getFeedbacks: () => request('/feedbacks'),
  submitFeedback: (data) => request('/feedbacks', { method: 'POST', body: JSON.stringify(data) }),

  // Shift Notes
  getShiftNotes: () => request('/shift-notes'),
  createShiftNote: (data) => request('/shift-notes', { method: 'POST', body: JSON.stringify(data) }),

  // Reports Export URL
  getExportUrl: (type, format = 'csv') => `${BASE_URL}/reports/export?type=${type}&format=${format}`,

  // Customer Databases & CRM (Isolated per-customer SQLite databases)
  getCustomers: () => request('/customers'),
  getCustomerDbDetails: (idOrPhone) => request(`/customers/${idOrPhone}`),
  adjustCustomerLoyalty: (idOrPhone, data) => request(`/customers/${idOrPhone}/loyalty`, { method: 'POST', body: JSON.stringify(data) }),
  updateCustomerAllergies: (idOrPhone, data) => request(`/customers/${idOrPhone}/allergies`, { method: 'PATCH', body: JSON.stringify(data) }),
  getCustomerDbDownloadUrl: (idOrPhone) => `${BASE_URL}/customers/${idOrPhone}/download-db`,

  // Audit Logs
  getAuditLogs: () => request('/audit-logs')
};
