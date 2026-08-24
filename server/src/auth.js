import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with a guessable
  // default — a missing secret is a real security bug, not a warning.
  throw new Error('JWT_SECRET is not set. Add it to server/.env before starting the server.');
}

const TOKEN_COOKIE = 'ledger_token';
const TOKEN_TTL = '7d';

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE);
}

// Attaches req.user = { id, name, email } if a valid session cookie is present,
// otherwise responds 401. Use on every route that touches household data.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[TOKEN_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await query('SELECT id, name, email FROM users WHERE id = $1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'Not signed in' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

// Confirms req.user belongs to the given household (owner or invited member).
// Call after requireAuth, inside any route keyed by :id / :householdId.
export async function assertMember(userId, householdId) {
  const { rows } = await query(
    `SELECT 1 FROM household_members WHERE household_id = $1 AND user_id = $2
     UNION
     SELECT 1 FROM households WHERE id = $1 AND owner_id = $2`,
    [householdId, userId]
  );
  return rows.length > 0;
}
