// Passwords (scrypt) and sessions (random token in an HttpOnly cookie; only
// its SHA-256 is stored, so a leaked database can't be used to sign in).
import crypto from 'node:crypto';

const SESSION_DAYS = 30;
export const COOKIE = 'sw_session';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [kind, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

// A hash to compare against when the username doesn't exist, so a wrong
// username takes as long as a wrong password.
export const DUMMY_HASH = hashPassword(crypto.randomBytes(12).toString('hex'));

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha(token), userId, now, now + SESSION_DAYS * 864e5);
  return token;
}

export function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
}

export function destroyUserSessions(db, userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function userFromToken(db, token) {
  if (!token) return null;
  const row = db.prepare(`SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
                          WHERE s.token_hash = ?`).get(sha(token));
  if (!row) return null;
  if (row.expires_at < Date.now()) { destroySession(db, token); return null; }
  // Touch at most once an hour.
  if (!row.last_seen || Date.now() - row.last_seen > 36e5) {
    db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), row.id);
  }
  return row;
}

export function sessionCookie(token, secure) {
  const parts = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_DAYS * 86400}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie(secure) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function validUsername(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_.-]{3,32}$/.test(name);
}

export function validPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8 && pw.length <= 200;
}

// Small fixed-window rate limiter, kept in memory.
export function limiter(max, windowMs) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (key) => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    h.n++;
    return h.n <= max;
  };
}
