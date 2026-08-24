import { useState } from 'react';
import { currencySymbol } from '../currency.js';

export default function ExpenseForm({ members, currency, onSubmit }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0]?.id || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!description || !amount || !paidBy) return;
    onSubmit({ description, amount: Number(amount), paidBy: Number(paidBy) });
    setDescription('');
    setAmount('');
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Add expense</h3>
      <input
        placeholder="What was it for?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="field-row">
        <span className="amount-prefix" aria-hidden="true">{currencySymbol(currency)}</span>
        <input
          type="number"
          step="0.01"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            Paid by {m.name}
          </option>
        ))}
      </select>
      <p className="muted">Splits equally across all members by default.</p>
      <button type="submit">Add expense</button>
    </form>
  );
}
