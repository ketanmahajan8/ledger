const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`;

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// credentials: 'include' is required on every call so the httpOnly auth
// cookie is sent to the API, which runs on a different port than Vite.
function request(path, options = {}) {
  return fetch(`${BASE}${path}`, { credentials: 'include', ...options }).then(handle);
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const api = {
  register: (name, email, password) => post('/auth/register', { name, email, password }),
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  createHousehold: (name, currency = 'USD') => post('/households', { name, currency }),
  listHouseholds: () => request('/households'),
  addMember: (householdId, name, email) => post(`/households/${householdId}/members`, { name, email }),
  getBalances: (householdId) => request(`/households/${householdId}/balances`),

  listExpenses: (householdId) => request(`/expenses/household/${householdId}`),
  createExpense: (payload) => post('/expenses', payload),
  settleUp: (payload) => post('/expenses/settlements', payload),
};
