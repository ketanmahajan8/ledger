import { Router } from 'express';
import { query } from '../db.js';
import { computeBalances, simplifyDebts } from '../balances.js';
import { assertMember } from '../auth.js';

// Factory so we can inject the socket.io instance for real-time broadcasts
export function createExpensesRouter(io) {
  const router = Router();

  // List expenses for a household
  router.get('/household/:householdId', async (req, res) => {
    const { householdId } = req.params;
    if (!(await assertMember(req.user.id, householdId))) {
      return res.status(403).json({ error: 'You are not a member of this household' });
    }
    const { rows } = await query(
      `SELECT e.*, u.name AS paid_by_name
       FROM expenses e JOIN users u ON u.id = e.paid_by
       WHERE e.household_id = $1
       ORDER BY e.created_at DESC`,
      [householdId]
    );
    res.json(rows);
  });

  // Create an expense. Body: { householdId, paidBy, description, amount, splits: [{userId, shareAmount}] }
  // If splits omitted, splits equally across all household members.
  router.post('/', async (req, res) => {
    const { householdId, paidBy, description, amount } = req.body;
    let { splits } = req.body;

    if (!householdId || !paidBy || !description || !amount) {
      return res.status(400).json({ error: 'householdId, paidBy, description, amount are required' });
    }
    if (!(await assertMember(req.user.id, householdId))) {
      return res.status(403).json({ error: 'You are not a member of this household' });
    }

    if (!splits) {
      const { rows: members } = await query(
        'SELECT user_id FROM household_members WHERE household_id = $1',
        [householdId]
      );
      const share = Math.round((amount / members.length) * 100) / 100;
      splits = members.map((m) => ({ userId: m.user_id, shareAmount: share }));
    }

    const { rows } = await query(
      `INSERT INTO expenses (household_id, paid_by, description, amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [householdId, paidBy, description, amount]
    );
    const expense = rows[0];

    for (const s of splits) {
      await query(
        `INSERT INTO expense_splits (expense_id, user_id, share_amount)
         VALUES ($1, $2, $3)`,
        [expense.id, s.userId, s.shareAmount]
      );
    }

    // Broadcast updated balances to everyone viewing this household in real time
    const balances = await computeBalances(householdId);
    const suggestedSettlements = simplifyDebts(balances);
    io.to(`household:${householdId}`).emit('balances:update', { balances, suggestedSettlements });
    io.to(`household:${householdId}`).emit('expense:new', expense);

    res.status(201).json(expense);
  });

  // Record a settlement payment
  router.post('/settlements', async (req, res) => {
    const { householdId, fromUser, toUser, amount } = req.body;
    if (!householdId || !fromUser || !toUser || !amount) {
      return res.status(400).json({ error: 'householdId, fromUser, toUser, amount are required' });
    }
    if (!(await assertMember(req.user.id, householdId))) {
      return res.status(403).json({ error: 'You are not a member of this household' });
    }
    const { rows } = await query(
      `INSERT INTO settlements (household_id, from_user, to_user, amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [householdId, fromUser, toUser, amount]
    );

    const balances = await computeBalances(householdId);
    const suggestedSettlements = simplifyDebts(balances);
    io.to(`household:${householdId}`).emit('balances:update', { balances, suggestedSettlements });

    res.status(201).json(rows[0]);
  });

  return router;
}
