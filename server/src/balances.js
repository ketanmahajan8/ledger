import { query } from './db.js';

/**
 * Computes net balance per user in a household.
 * Positive balance = household owes them money.
 * Negative balance = they owe the household money.
 */
export async function computeBalances(householdId) {
  const { rows: members } = await query(
    `SELECT u.id, u.name FROM household_members hm
     JOIN users u ON u.id = hm.user_id
     WHERE hm.household_id = $1`,
    [householdId]
  );

  const balances = Object.fromEntries(members.map((m) => [m.id, 0]));

  // Credit whoever paid
  const { rows: expenses } = await query(
    `SELECT id, paid_by, amount FROM expenses WHERE household_id = $1`,
    [householdId]
  );
  for (const e of expenses) {
    balances[e.paid_by] = (balances[e.paid_by] || 0) + Number(e.amount);
  }

  // Debit each person's share
  const { rows: splits } = await query(
    `SELECT es.user_id, es.share_amount
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.household_id = $1`,
    [householdId]
  );
  for (const s of splits) {
    balances[s.user_id] = (balances[s.user_id] || 0) - Number(s.share_amount);
  }

  // Apply recorded settlements: from_user paid to_user, so from_user's debt shrinks (+),
  // to_user's credit shrinks (-)
  const { rows: settlements } = await query(
    `SELECT from_user, to_user, amount FROM settlements WHERE household_id = $1`,
    [householdId]
  );
  for (const s of settlements) {
    balances[s.from_user] = (balances[s.from_user] || 0) + Number(s.amount);
    balances[s.to_user] = (balances[s.to_user] || 0) - Number(s.amount);
  }

  return members.map((m) => ({
    userId: m.id,
    name: m.name,
    balance: Math.round(balances[m.id] * 100) / 100,
  }));
}

/**
 * Greedy debt simplification: given net balances, produce the minimum-ish
 * set of payments (creditor gets paid by debtor) that settles everyone up.
 * Not guaranteed globally optimal (that's NP-hard in general) but greedy
 * largest-first is the standard practical approach and is optimal in most
 * real-world cases.
 */
export function simplifyDebts(balances) {
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const transactions = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.balance, creditor.balance);

    transactions.push({
      from: debtor.userId,
      fromName: debtor.name,
      to: creditor.userId,
      toName: creditor.name,
      amount: Math.round(amount * 100) / 100,
    });

    debtor.balance -= amount;
    creditor.balance -= amount;
    if (debtor.balance < 0.01) i++;
    if (creditor.balance < 0.01) j++;
  }

  return transactions;
}
