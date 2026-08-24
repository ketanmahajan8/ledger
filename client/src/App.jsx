import { useEffect, useState } from 'react';
import { api } from './api.js';
import HouseholdView from './components/HouseholdView.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import { useTheme } from './useTheme.js';
import { useAuth } from './useAuth.js';
import { CURRENCIES } from './currency.js';

export default function App() {
  const [households, setHouseholds] = useState([]);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [newHouseholdCurrency, setNewHouseholdCurrency] = useState('USD');
  const { theme, toggleTheme } = useTheme();
  const { user, checking, login, register, logout } = useAuth();

  useEffect(() => {
    if (!user) return;
    api.listHouseholds().then(setHouseholds);
  }, [user]);

  async function handleCreateHousehold(e) {
    e.preventDefault();
    if (!newHouseholdName) return;
    const h = await api.createHousehold(newHouseholdName, newHouseholdCurrency);
    setHouseholds((prev) => [h, ...prev]);
    setNewHouseholdName('');
    setSelected(h);
    setMembers([]);
  }

  async function handleSelect(h) {
    setSelected(h);
    const bal = await api.getBalances(h.id);
    setMembers(bal.balances.map((b) => ({ id: b.userId, name: b.name })));
  }

  async function handleAddMember(name, email) {
    const user = await api.addMember(selected.id, name, email);
    setMembers((prev) => [...prev.filter((m) => m.id !== user.id), user]);
  }

  async function handleLogout() {
    await logout();
    setSelected(null);
    setHouseholds([]);
    setMembers([]);
  }

  const header = (
    <header>
      <div>
        <h1>Ledger</h1>
        <p className="muted">Split expenses without the group-chat spreadsheet fights.</p>
      </div>
      <div className="header-actions">
        {user && (
          <>
            <span className="muted signed-in-as">{user.name}</span>
            <button type="button" className="ghost-button" onClick={handleLogout}>
              Sign out
            </button>
          </>
        )}
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
    </header>
  );

  if (checking) {
    return (
      <div className="app">
        {header}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        {header}
        <AuthScreen onLogin={login} onRegister={register} />
      </div>
    );
  }

  return (
    <div className="app">
      {header}

      <div className="layout">
        <aside>
          <form onSubmit={handleCreateHousehold} className="card">
            <h3>New household</h3>
            <input
              placeholder="e.g. Maple St Apartment"
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.target.value)}
            />
            <select
              value={newHouseholdCurrency}
              onChange={(e) => setNewHouseholdCurrency(e.target.value)}
              aria-label="Household currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.label}
                </option>
              ))}
            </select>
            <button type="submit">Create</button>
          </form>

          <ul className="household-list">
            {households.map((h) => (
              <li
                key={h.id}
                className={selected?.id === h.id ? 'active' : ''}
                onClick={() => handleSelect(h)}
              >
                <span>{h.name}</span>
                <span className="hh-currency">{h.currency}</span>
              </li>
            ))}
          </ul>
        </aside>

        <main>
          {selected ? (
            <HouseholdView
              household={selected}
              members={members}
              onAddMember={handleAddMember}
            />
          ) : (
            <p className="muted">Create or select a household to get started.</p>
          )}
        </main>
      </div>
    </div>
  );
}
