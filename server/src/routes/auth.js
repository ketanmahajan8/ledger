import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword, comparePassword, signToken, setAuthCookie, clearAuthCookie, requireAuth } from '../auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing[0]) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
    [name, email, passwordHash]
  );
  const user = rows[0];

  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json(user);
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  // Also rejects members who were only ever added by name/email (no password set) —
  // they need to register properly to get an account of their own.
  if (!user || !user.password_hash || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, name: user.name, email: user.email });
});

authRouter.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});
