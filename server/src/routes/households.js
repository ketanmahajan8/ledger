import { Router } from 'express';
import { query } from '../db.js';
import { computeBalances, simplifyDebts } from '../balances.js';
import { assertMember } from '../auth.js';

export const householdsRouter = Router();

const SUPPORTED_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

// Create a household — the creator becomes owner and its first member
householdsRouter.post('/', async (req, res) => {
  const { name, currency = 'USD' } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: `currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}` });
  }
  const { rows } = await query(
    'INSERT INTO households (name, currency, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [name, currency, req.user.id]
  );
  const household = rows[0];

  await query(
    `INSERT INTO household_members (household_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [household.id, req.user.id]
  );

  res.status(201).json(household);
});

// List households the signed-in user owns or belongs to (not everyone's households)
householdsRouter.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT h.* FROM households h
     LEFT JOIN household_members hm ON hm.household_id = h.id
     WHERE h.owner_id = $1 OR hm.user_id = $1
     ORDER BY h.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Add a member (creates a guest user if the email isn't registered yet).
// Only existing members can invite others.
householdsRouter.post('/:id/members', async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  if (!(await assertMember(req.user.id, id))) {
    return res.status(403).json({ error: 'You are not a member of this household' });
  }

  let { rows: existing } = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);
  let user = existing[0];
  if (!user) {
    const { rows } = await query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',
      [name, email]
    );
    user = rows[0];
  }

  await query(
    `INSERT INTO household_members (household_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [id, user.id]
  );

  res.status(201).json(user);
});

// Get balances + suggested settle-up transactions
householdsRouter.get('/:id/balances', async (req, res) => {
  const { id } = req.params;
  if (!(await assertMember(req.user.id, id))) {
    return res.status(403).json({ error: 'You are not a member of this household' });
  }
  const balances = await computeBalances(id);
  const transactions = simplifyDebts(balances);
  res.json({ balances, suggestedSettlements: transactions });
});
