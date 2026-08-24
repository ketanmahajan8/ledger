import { formatMoney } from '../currency.js';

export default function BalanceSummary({ balances, suggestedSettlements, currency, onSettle }) {
  return (
    <div className="card">
      <h3>Balances</h3>
      <ul className="balance-list">
        {balances.map((b) => (
          <li key={b.userId} className={b.balance >= 0 ? 'positive' : 'negative'}>
            <span>{b.name}</span>
            <span>
              {b.balance >= 0 ? 'is owed ' : 'owes '}
              {formatMoney(Math.abs(b.balance), currency)}
            </span>
          </li>
        ))}
      </ul>

      <h3 style={{ marginTop: 18 }}>Suggested settle-ups</h3>
      {suggestedSettlements.length === 0 && <p className="muted">Everyone's square. 🎉</p>}
      <ul className="settle-list">
        {suggestedSettlements.map((t, i) => (
          <li key={i}>
            <span>
              {t.fromName} → {t.toName}: {formatMoney(t.amount, currency)}
            </span>
            <button onClick={() => onSettle(t)}>Mark paid</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
