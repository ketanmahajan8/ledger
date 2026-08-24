import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../api.js';
import ExpenseForm from './ExpenseForm.jsx';
import BalanceSummary from './BalanceSummary.jsx';
import { formatMoney } from '../currency.js';

const socket = io('http://localhost:4000');

export default function HouseholdView({ household, members, onAddMember }) {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [suggestedSettlements, setSuggestedSettlements] = useState([]);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    socket.emit('household:join', household.id);

    async function load() {
      const [exp, bal] = await Promise.all([
        api.listExpenses(household.id),
        api.getBalances(household.id),
      ]);
      setExpenses(exp);
      setBalances(bal.balances);
      setSuggestedSettlements(bal.suggestedSettlements);
    }
    load();

    function onBalancesUpdate(data) {
      setBalances(data.balances);
      setSuggestedSettlements(data.suggestedSettlements);
    }
    function onNewExpense(expense) {
      setExpenses((prev) => [expense, ...prev]);
    }

    socket.on('balances:update', onBalancesUpdate);
    socket.on('expense:new', onNewExpense);

    return () => {
      socket.emit('household:leave', household.id);
      socket.off('balances:update', onBalancesUpdate);
      socket.off('expense:new', onNewExpense);
    };
  }, [household.id]);

  async function handleAddExpense({ description, amount, paidBy }) {
    await api.createExpense({ householdId: household.id, paidBy, description, amount });
  }

  async function handleSettle(t) {
    await api.settleUp({
      householdId: household.id,
      fromUser: t.from,
      toUser: t.to,
      amount: t.amount,
    });
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!memberName || !memberEmail) return;
    await onAddMember(memberName, memberEmail);
    setMemberName('');
    setMemberEmail('');
  }

  return (
    <div className="household-view">
      <h2>{household.name}</h2>

      <div className="grid">
        <div>
          <form className="card" onSubmit={handleAddMember}>
            <h3>Members ({members.length})</h3>
            <ul>
              {members.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
            <input
              placeholder="Name"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
            />
            <input
              placeholder="Email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
            />
            <button type="submit">Add member</button>
          </form>

          {members.length > 0 && (
            <ExpenseForm members={members} currency={household.currency} onSubmit={handleAddExpense} />
          )}
        </div>

        <div>
          <BalanceSummary
            balances={balances}
            suggestedSettlements={suggestedSettlements}
            currency={household.currency}
            onSettle={handleSettle}
          />

          <div className="card">
            <h3>Recent expenses</h3>
            <ul className="expense-list">
              {expenses.map((e) => (
                <li key={e.id}>
                  <span>{e.description}</span>
                  <span>{formatMoney(e.amount, household.currency)} — {e.paid_by_name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
