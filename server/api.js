// The JSON API. Every handler gets a context {db, user, params, query, body,
// ip} and returns a JSON-able value, or throws HttpError.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { tx, DEFAULT_SETTINGS } from './db.js';
import * as auth from './auth.js';
import { slugify, extractLinks, rank, PROTECTION } from '../public/js/shared.js';
import { TEMPLATE_GROUPS } from './default-templates.js';

export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}
const fail = (status, message, extra) => { throw new HttpError(status, message, extra); };

export const THEMES = {
  gta: 'Los Santos (GTA)',
  rdr: 'Frontier (RDR)',
  classic: 'Classic',
};

const LIMITS = { title: 120, body: 200_000, field: 2000, fields: 60, comment: 300, reason: 1000, bio: 2000 };
const loginLimit = auth.limiter(10, 60_000);
const registerLimit = auth.limiter(20, 3_600_000);
const editLimit = auth.limiter(60, 60_000);
const reportLimit = auth.limiter(10, 3_600_000);
const uploadLimit = auth.limiter(30, 3_600_000);

// ------------------------------------------------------------ helpers

const stmts = new WeakMap();
function q(db, sql) {
  let m = stmts.get(db);
  if (!m) stmts.set(db, (m = new Map()));
  let s = m.get(sql);
  if (!s) m.set(sql, (s = db.prepare(sql)));
  return s;
}

export function getSettings(db) {
  const out = { ...DEFAULT_SETTINGS };
  for (const r of q(db, 'SELECT key, value FROM settings').all()) {
    try { out[r.key] = JSON.parse(r.value); } catch { /* keep default */ }
  }
  return out;
}

const isMod = (u) => !!u && u.status === 'active' && rank(u.role) >= rank('mod');
const isAdmin = (u) => !!u && u.status === 'active' && u.role === 'admin';
const isActive = (u) => !!u && u.status === 'active';

function requireUser(ctx) {
  if (!ctx.user) fail(401, 'Please sign in first.');
  if (ctx.user.status === 'banned') fail(403, `Your account is banned${ctx.user.ban_reason ? `: ${ctx.user.ban_reason}` : '.'}`);
  if (ctx.user.status === 'pending') fail(403, 'Your account is waiting for a moderator to approve it.');
  return ctx.user;
}
function requireMod(ctx) { requireUser(ctx); if (!isMod(ctx.user)) fail(403, 'Only moderators can do that.'); return ctx.user; }
function requireAdmin(ctx) { requireUser(ctx); if (!isAdmin(ctx.user)) fail(403, 'Only admins can do that.'); return ctx.user; }

function canRead(db, user) {
  return getSettings(db).readAccess === 'public' || isActive(user);
}
function requireRead(ctx) {
  if (!canRead(ctx.db, ctx.user)) fail(401, 'This wiki is for members only. Please sign in.');
}

function audit(db, user, action, target = '', detail = '') {
  q(db, 'INSERT INTO audit (user_id, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user?.id ?? null, action, target, typeof detail === 'string' ? detail : JSON.stringify(detail), Date.now());
}

function nsRow(db, user, slug) {
  const ns = q(db, 'SELECT * FROM namespaces WHERE slug = ?').get(String(slug || ''));
  if (!ns || (ns.hidden && !isMod(user))) fail(404, 'There is no such namespace.');
  return ns;
}
const nsOut = (n) => ({ slug: n.slug, name: n.name, tagline: n.tagline, theme: n.theme, sort: n.sort, archived: !!n.archived, hidden: !!n.hidden });

function visibleNamespaces(db, user) {
  return q(db, 'SELECT * FROM namespaces ORDER BY sort, name').all().filter((n) => !n.hidden || isMod(user)).map(nsOut);
}
const nsSlugs = (db) => q(db, 'SELECT slug FROM namespaces').all().map((r) => r.slug);

function templates(db) {
  return q(db, 'SELECT data FROM templates ORDER BY sort, key').all().map((r) => JSON.parse(r.data));
}

const userName = (db, id) => (id ? q(db, 'SELECT username FROM users WHERE id = ?').get(id)?.username ?? null : null);

function publicUser(u) {
  return u && { id: u.id, username: u.username, role: u.role, status: u.status, banReason: u.status === 'banned' ? u.ban_reason : null };
}

function canEdit(user, ns, article) {
  if (!isActive(user)) return false;
  if (ns.archived && !isMod(user)) return false;
  const level = article?.protection || 'none';
  if (level === 'mods') return isMod(user);
  if (level === 'admins') return isAdmin(user);
  return true;
}

function articleOut(db, a, ns) {
  return {
    id: a.id, ns: ns.slug, slug: a.slug, title: a.title, template: a.template,
    fields: JSON.parse(a.fields), body: a.body, image: a.image,
    protection: a.protection, deleted: !!a.deleted, revId: a.rev_id,
    createdAt: a.created_at, createdBy: userName(db, a.created_by),
    updatedAt: a.updated_at, updatedBy: userName(db, a.updated_by),
  };
}

function findArticle(db, ns, slug) {
  return q(db, 'SELECT * FROM articles WHERE ns_id = ? AND slug = ?').get(ns.id, String(slug));
}

function str(v, max, name) {
  if (v == null) return '';
  if (typeof v !== 'string') fail(400, `${name} must be text.`);
  if (v.length > max) fail(400, `${name} is too long (at most ${max} characters).`);
  return v;
}

function cleanImage(v) {
  const s = str(v, 500, 'Image').trim();
  if (!s) return '';
  if (/^\/uploads\/[a-f0-9]{24}\.(png|jpg|gif|webp)$/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  fail(400, 'The image must be an uploaded picture or an https:// link.');
}

function cleanFields(v) {
  if (v == null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) fail(400, 'Fields must be an object.');
  const out = {};
  const entries = Object.entries(v);
  if (entries.length > LIMITS.fields) fail(400, 'Too many infobox fields.');
  for (const [k, val] of entries) {
    const key = str(k, 80, 'A field name').trim();
    const value = str(val, LIMITS.field, `The field “${key}”`).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

// Keep the links table and search index in step with an article.
function indexArticle(db, a, ns) {
  q(db, 'DELETE FROM links WHERE from_id = ?').run(a.id);
  const fields = JSON.parse(a.fields);
  const text = `${a.body}\n${Object.values(fields).join('\n')}`;
  const ins = q(db, 'INSERT OR IGNORE INTO links (from_id, to_ns, to_slug, to_title) VALUES (?, ?, ?, ?)');
  for (const l of extractLinks(text, ns.slug, nsSlugs(db))) ins.run(a.id, l.ns, l.slug, l.title);
  q(db, 'DELETE FROM search WHERE rowid = ?').run(a.id);
  if (!a.deleted) {
    q(db, 'INSERT INTO search (rowid, title, body) VALUES (?, ?, ?)')
      .run(a.id, a.title, `${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n${a.body}`);
  }
}

// Which of these {ns, slug} targets exist (and aren't deleted)?
function existing(db, targets) {
  const found = new Set();
  const look = q(db, `SELECT 1 FROM articles a JOIN namespaces n ON n.id = a.ns_id
                      WHERE n.slug = ? AND a.slug = ? AND a.deleted = 0
                      UNION SELECT 1 FROM redirects r JOIN namespaces n ON n.id = r.ns_id
                      WHERE n.slug = ? AND r.slug = ?`);
  for (const t of targets) {
    const k = `${t.ns}/${t.slug}`;
    if (!found.has(k) && look.get(t.ns, t.slug, t.ns, t.slug)) found.add(k);
  }
  return [...found];
}

function writeRevision(db, user, a, comment) {
  const r = q(db, `INSERT INTO revisions (article_id, user_id, title, template, fields, body, image, comment, size, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(a.id, user.id, a.title, a.template, a.fields, a.body, a.image, comment, Buffer.byteLength(a.body), Date.now());
  return Number(r.lastInsertRowid);
}

// ------------------------------------------------------------ handlers

export const routes = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler });
};

// ---- session & accounts

route('GET', '/api/session', (ctx) => {
  const s = getSettings(ctx.db);
  const readable = canRead(ctx.db, ctx.user);
  return {
    user: publicUser(ctx.user),
    settings: s,
    canRead: readable,
    namespaces: readable ? visibleNamespaces(ctx.db, ctx.user) : [],
    templates: templates(ctx.db),
    groups: TEMPLATE_GROUPS,
    themes: THEMES,
    protection: PROTECTION,
  };
});

route('POST', '/api/register', (ctx) => {
  const { db, body } = ctx;
  const s = getSettings(db);
  const first = !q(db, 'SELECT COUNT(*) AS n FROM users').get().n;
  if (s.registration === 'closed' && !first) fail(403, 'Sign-ups are closed. Ask an admin for an account.');
  if (!registerLimit(ctx.ip)) fail(429, 'Too many new accounts from your connection. Try again later.');
  const { username, password } = body;
  if (!auth.validUsername(username)) fail(400, 'Usernames are 3–32 letters, numbers, dots, dashes or underscores.');
  if (!auth.validPassword(password)) fail(400, 'Passwords need at least 8 characters.');
  if (q(db, 'SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'That username is taken.');
  // The very first account becomes the admin.
  const role = first ? 'admin' : 'user';
  const status = first || s.registration === 'open' ? 'active' : 'pending';
  const r = q(db, 'INSERT INTO users (username, pass_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, auth.hashPassword(password), role, status, Date.now());
  const id = Number(r.lastInsertRowid);
  audit(db, { id }, 'register', username, status);
  ctx.setSession(auth.createSession(db, id));
  return { user: publicUser(q(db, 'SELECT * FROM users WHERE id = ?').get(id)) };
});

route('POST', '/api/login', (ctx) => {
  const { db, body } = ctx;
  if (!loginLimit(ctx.ip)) fail(429, 'Too many sign-in attempts. Wait a minute and try again.');
  const u = typeof body.username === 'string' ? q(db, 'SELECT * FROM users WHERE username = ?').get(body.username) : null;
  const ok = auth.verifyPassword(String(body.password || ''), u ? u.pass_hash : auth.DUMMY_HASH);
  if (!u || !ok) fail(401, 'Wrong username or password.');
  ctx.setSession(auth.createSession(db, u.id));
  return { user: publicUser(u) };
});

route('POST', '/api/logout', (ctx) => {
  auth.destroySession(ctx.db, ctx.token);
  ctx.setSession(null);
  return { ok: true };
});

route('PUT', '/api/me', (ctx) => {
  const u = requireUser(ctx);
  const bio = str(ctx.body.bio, LIMITS.bio, 'Your bio');
  q(ctx.db, 'UPDATE users SET bio = ? WHERE id = ?').run(bio, u.id);
  return { ok: true };
});

route('POST', '/api/me/password', (ctx) => {
  if (!ctx.user) fail(401, 'Please sign in first.');
  const { current, next } = ctx.body;
  if (!auth.verifyPassword(String(current || ''), ctx.user.pass_hash)) fail(400, 'Your current password is wrong.');
  if (!auth.validPassword(next)) fail(400, 'Passwords need at least 8 characters.');
  q(ctx.db, 'UPDATE users SET pass_hash = ? WHERE id = ?').run(auth.hashPassword(next), ctx.user.id);
  auth.destroyUserSessions(ctx.db, ctx.user.id);
  ctx.setSession(auth.createSession(ctx.db, ctx.user.id));
  return { ok: true };
});

route('GET', '/api/users/:name', (ctx) => {
  requireRead(ctx);
  const { db } = ctx;
  const u = q(db, 'SELECT * FROM users WHERE username = ?').get(decodeURIComponent(ctx.params.name));
  if (!u) fail(404, 'There is no such user.');
  const edits = q(db, 'SELECT COUNT(*) AS n FROM revisions WHERE user_id = ?').get(u.id).n;
  const created = q(db, 'SELECT COUNT(*) AS n FROM articles WHERE created_by = ? AND deleted = 0').get(u.id).n;
  return {
    username: u.username, role: u.role, status: u.status, bio: u.bio, createdAt: u.created_at,
    banReason: isMod(ctx.user) || ctx.user?.id === u.id ? u.ban_reason : null,
    lastSeen: isMod(ctx.user) ? u.last_seen : null,
    id: isMod(ctx.user) ? u.id : null,
    edits, created,
    contributions: recent(ctx, { userId: u.id, limit: 50 }),
  };
});

// ---- namespaces & lists

route('GET', '/api/ns/:ns', (ctx) => {
  requireRead(ctx);
  const { db } = ctx;
  const ns = nsRow(db, ctx.user, ctx.params.ns);
  const counts = Object.fromEntries(q(db, 'SELECT template, COUNT(*) AS n FROM articles WHERE ns_id = ? AND deleted = 0 GROUP BY template')
    .all(ns.id).map((r) => [r.template, r.n]));
  // An article called "Main page" is the namespace's introduction.
  const main = findArticle(db, ns, 'main-page');
  const mainOut = main && !main.deleted ? {
    body: main.body, canEdit: canEdit(ctx.user, ns, main),
    existing: existing(db, q(db, 'SELECT to_ns AS ns, to_slug AS slug FROM links WHERE from_id = ?').all(main.id)),
  } : null;
  return {
    namespace: nsOut(ns), counts, main: mainOut,
    canCreate: canEdit(ctx.user, ns, null),
    recent: recent(ctx, { nsId: ns.id, limit: 12 }),
    newest: q(db, `SELECT slug, title, template, image, created_at AS createdAt FROM articles
                   WHERE ns_id = ? AND deleted = 0 AND slug <> 'main-page' ORDER BY created_at DESC LIMIT 8`).all(ns.id),
  };
});

route('GET', '/api/ns/:ns/list', (ctx) => {
  requireRead(ctx);
  const { db, query } = ctx;
  const ns = nsRow(db, ctx.user, ctx.params.ns);
  const order = query.sort === 'updated' ? 'updated_at DESC' : 'title COLLATE NOCASE';
  const rows = query.template
    ? q(db, `SELECT slug, title, template, image, fields, substr(body, 1, 400) AS teaser, updated_at AS updatedAt
             FROM articles WHERE ns_id = ? AND deleted = 0 AND template = ? ORDER BY ${order} LIMIT 1000`).all(ns.id, query.template)
    : q(db, `SELECT slug, title, template, image, fields, substr(body, 1, 400) AS teaser, updated_at AS updatedAt
             FROM articles WHERE ns_id = ? AND deleted = 0 ORDER BY ${order} LIMIT 1000`).all(ns.id);
  return { namespace: nsOut(ns), articles: rows.map((r) => ({ ...r, fields: JSON.parse(r.fields) })) };
});

route('GET', '/api/ns/:ns/wanted', (ctx) => {
  requireRead(ctx);
  const { db } = ctx;
  const ns = nsRow(db, ctx.user, ctx.params.ns);
  const rows = q(db, `SELECT l.to_slug AS slug, MAX(l.to_title) AS title, COUNT(DISTINCT l.from_id) AS n FROM links l JOIN articles src ON src.id = l.from_id AND src.deleted = 0
                      WHERE l.to_ns = ? AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.ns_id = ? AND a.slug = l.to_slug AND a.deleted = 0)
                        AND NOT EXISTS (SELECT 1 FROM redirects r WHERE r.ns_id = ? AND r.slug = l.to_slug)
                      GROUP BY l.to_slug ORDER BY n DESC, l.to_slug LIMIT 200`).all(ns.slug, ns.id, ns.id);
  return { namespace: nsOut(ns), wanted: rows };
});

route('GET', '/api/ns/:ns/random', (ctx) => {
  requireRead(ctx);
  const ns = nsRow(ctx.db, ctx.user, ctx.params.ns);
  const r = q(ctx.db, 'SELECT slug FROM articles WHERE ns_id = ? AND deleted = 0 ORDER BY random() LIMIT 1').get(ns.id);
  return { slug: r?.slug ?? null };
});

route('GET', '/api/titles', (ctx) => {
  requireRead(ctx);
  const { db, query } = ctx;
  const ns = nsRow(db, ctx.user, query.ns);
  const term = String(query.q || '').trim().slice(0, 80);
  if (!term) return { titles: [] };
  const like = `%${term.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
  const rows = q(db, `SELECT title, slug, template FROM articles WHERE ns_id = ? AND deleted = 0 AND title LIKE ? ESCAPE '\\'
                      ORDER BY (title LIKE ? ESCAPE '\\') DESC, length(title) LIMIT 10`)
    .all(ns.id, like, like.slice(1));
  return { titles: rows };
});

route('GET', '/api/search', (ctx) => {
  requireRead(ctx);
  const { db, query } = ctx;
  const words = String(query.q || '').match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) || [];
  if (!words.length) return { results: [] };
  const match = words.map((w) => `"${w}"*`).join(' ');
  const visible = visibleNamespaces(db, ctx.user).map((n) => n.slug);
  const nsFilter = query.ns && visible.includes(query.ns) ? [query.ns] : visible;
  if (!nsFilter.length) return { results: [] };
  const rows = q(db, `SELECT a.slug, a.title, a.template, a.image, n.slug AS ns, n.name AS nsName,
                         snippet(search, 1, '\u0001', '\u0002', '…', 24) AS snippet,
                         bm25(search, 8.0, 1.0) AS score
                      FROM search JOIN articles a ON a.id = search.rowid JOIN namespaces n ON n.id = a.ns_id
                      WHERE search MATCH ? AND a.deleted = 0
                      ORDER BY score LIMIT 100`).all(match);
  return { results: rows.filter((r) => nsFilter.includes(r.ns)).slice(0, 50) };
});

function recent(ctx, { nsId, userId, limit = 50, before } = {}) {
  const { db } = ctx;
  const where = ['1 = 1'];
  const args = [];
  if (nsId) { where.push('a.ns_id = ?'); args.push(nsId); }
  if (userId) { where.push('r.user_id = ?'); args.push(userId); }
  if (before) { where.push('r.id < ?'); args.push(Number(before)); }
  if (!isMod(ctx.user)) where.push('a.deleted = 0 AND n.hidden = 0');
  const rows = db.prepare(`SELECT r.id, r.article_id AS articleId, r.title, r.comment, r.size, r.hidden, r.created_at AS createdAt,
                                  u.username AS user, n.slug AS ns, n.name AS nsName, a.slug, a.title AS currentTitle, a.deleted,
                                  (SELECT p.size FROM revisions p WHERE p.article_id = r.article_id AND p.id < r.id ORDER BY p.id DESC LIMIT 1) AS prevSize
                           FROM revisions r JOIN articles a ON a.id = r.article_id JOIN namespaces n ON n.id = a.ns_id
                           LEFT JOIN users u ON u.id = r.user_id
                           WHERE ${where.join(' AND ')} ORDER BY r.id DESC LIMIT ?`).all(...args, Math.min(200, Number(limit) || 50));
  return rows.map((r) => ({ ...r, hidden: !!r.hidden, deleted: !!r.deleted, comment: r.hidden && !isMod(ctx.user) ? '' : r.comment, isNew: r.prevSize == null }));
}

route('GET', '/api/recent', (ctx) => {
  requireRead(ctx);
  const ns = ctx.query.ns ? nsRow(ctx.db, ctx.user, ctx.query.ns) : null;
  return { changes: recent(ctx, { nsId: ns?.id, limit: ctx.query.limit, before: ctx.query.before }) };
});

// ---- articles

route('GET', '/api/ns/:ns/article/:slug', (ctx) => {
  requireRead(ctx);
  const { db, user } = ctx;
  const ns = nsRow(db, user, ctx.params.ns);
  const slug = decodeURIComponent(ctx.params.slug);
  let a = findArticle(db, ns, slug);
  if (!a) {
    const r = q(db, 'SELECT a.slug FROM redirects r JOIN articles a ON a.id = r.article_id WHERE r.ns_id = ? AND r.slug = ?').get(ns.id, slug);
    if (r) return { redirect: r.slug };
    fail(404, 'This article doesn’t exist yet.', { canCreate: canEdit(user, ns, null) });
  }
  if (a.deleted && !isMod(user)) fail(404, 'This article was deleted by a moderator.', { deleted: true, canCreate: false });
  const links = q(db, 'SELECT to_ns AS ns, to_slug AS slug FROM links WHERE from_id = ?').all(a.id);
  const backlinks = q(db, `SELECT DISTINCT a.slug, a.title, a.template, n.slug AS ns FROM links l
                           JOIN articles a ON a.id = l.from_id AND a.deleted = 0 JOIN namespaces n ON n.id = a.ns_id
                           WHERE l.to_ns = ? AND (l.to_slug = ? OR l.to_slug IN (SELECT slug FROM redirects WHERE article_id = ?))
                           ORDER BY a.title LIMIT 200`).all(ns.slug, a.slug, a.id);
  return {
    article: articleOut(db, a, ns),
    namespace: nsOut(ns),
    canEdit: canEdit(user, ns, a),
    existing: existing(db, links),
    backlinks,
    openReports: isMod(user) ? q(db, "SELECT COUNT(*) AS n FROM reports WHERE article_id = ? AND status = 'open'").get(a.id).n : 0,
  };
});

// Which [[links]] in a draft point at real articles (for the editor preview)?
route('POST', '/api/ns/:ns/linkcheck', (ctx) => {
  requireRead(ctx);
  const ns = nsRow(ctx.db, ctx.user, ctx.params.ns);
  const text = str(ctx.body.text, LIMITS.body + LIMITS.field * LIMITS.fields, 'Text');
  return { existing: existing(ctx.db, extractLinks(text, ns.slug, nsSlugs(ctx.db))) };
});

function checkDraft(db, b) {
  const title = str(b.title, LIMITS.title, 'The title').replace(/\s+/g, ' ').trim();
  if (!title) fail(400, 'The article needs a title.');
  const slug = slugify(title);
  if (!slug) fail(400, 'The title needs at least one letter or number.');
  const template = String(b.template || 'page');
  if (!q(db, 'SELECT 1 FROM templates WHERE key = ?').get(template)) fail(400, 'Unknown template.');
  return {
    title, slug, template,
    fields: JSON.stringify(cleanFields(b.fields)),
    body: str(b.body, LIMITS.body, 'The article'),
    image: cleanImage(b.image),
    comment: str(b.comment, LIMITS.comment, 'The edit summary').trim(),
  };
}

route('POST', '/api/ns/:ns/articles', (ctx) => {
  const user = requireUser(ctx);
  const { db } = ctx;
  const ns = nsRow(db, user, ctx.params.ns);
  if (!canEdit(user, ns, null)) fail(403, ns.archived ? 'This namespace is archived: only moderators can add to it.' : 'You can’t create articles here.');
  if (!editLimit(`u${user.id}`)) fail(429, 'You’re editing very fast. Wait a minute and try again.');
  const d = checkDraft(db, ctx.body);
  return tx(db, () => {
    const clash = findArticle(db, ns, d.slug);
    if (clash) fail(409, clash.deleted ? 'An article with this title was deleted by a moderator.' : 'An article with this title already exists.', { slug: clash.slug });
    q(db, 'DELETE FROM redirects WHERE ns_id = ? AND slug = ?').run(ns.id, d.slug);
    const now = Date.now();
    const r = q(db, `INSERT INTO articles (ns_id, slug, title, template, fields, body, image, created_by, created_at, updated_by, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(ns.id, d.slug, d.title, d.template, d.fields, d.body, d.image, user.id, now, user.id, now);
    const a = q(db, 'SELECT * FROM articles WHERE id = ?').get(Number(r.lastInsertRowid));
    a.rev_id = writeRevision(db, user, a, d.comment || 'Created the article');
    q(db, 'UPDATE articles SET rev_id = ? WHERE id = ?').run(a.rev_id, a.id);
    indexArticle(db, a, ns);
    return { article: articleOut(db, a, ns) };
  });
});

function updateArticle(db, user, ns, a, d, comment) {
  const changed = ['title', 'template', 'fields', 'body', 'image'].some((k) => a[k] !== d[k]);
  if (!changed) return a;
  if (d.slug !== a.slug) {
    const clash = findArticle(db, ns, d.slug);
    if (clash) fail(409, 'Another article already has that title.', { slug: clash.slug });
    q(db, 'DELETE FROM redirects WHERE ns_id = ? AND slug = ?').run(ns.id, d.slug);
    q(db, 'INSERT OR REPLACE INTO redirects (ns_id, slug, article_id) VALUES (?, ?, ?)').run(ns.id, a.slug, a.id);
  }
  const next = { ...a, ...d, updated_by: user.id, updated_at: Date.now() };
  next.rev_id = writeRevision(db, user, next, comment);
  q(db, `UPDATE articles SET slug = ?, title = ?, template = ?, fields = ?, body = ?, image = ?, rev_id = ?, updated_by = ?, updated_at = ?
         WHERE id = ?`).run(next.slug, next.title, next.template, next.fields, next.body, next.image, next.rev_id, user.id, next.updated_at, a.id);
  indexArticle(db, next, ns);
  return next;
}

route('PUT', '/api/ns/:ns/article/:slug', (ctx) => {
  const user = requireUser(ctx);
  const { db } = ctx;
  const ns = nsRow(db, user, ctx.params.ns);
  if (!editLimit(`u${user.id}`)) fail(429, 'You’re editing very fast. Wait a minute and try again.');
  const d = checkDraft(db, ctx.body);
  return tx(db, () => {
    const a = findArticle(db, ns, decodeURIComponent(ctx.params.slug));
    if (!a || (a.deleted && !isMod(user))) fail(404, 'This article doesn’t exist.');
    if (!canEdit(user, ns, a)) fail(403, 'This article is protected: you can’t edit it.');
    if (ctx.body.baseRev != null && Number(ctx.body.baseRev) !== a.rev_id) {
      fail(409, 'Someone else saved this article while you were editing. Your text is still in the editor: copy it, reload, and merge your changes.',
        { conflict: true, current: articleOut(db, a, ns), by: userName(db, a.updated_by) });
    }
    const next = updateArticle(db, user, ns, a, d, d.comment);
    return { article: articleOut(db, next, ns) };
  });
});

route('GET', '/api/ns/:ns/article/:slug/history', (ctx) => {
  requireRead(ctx);
  const { db, user } = ctx;
  const ns = nsRow(db, user, ctx.params.ns);
  const a = findArticle(db, ns, decodeURIComponent(ctx.params.slug));
  if (!a || (a.deleted && !isMod(user))) fail(404, 'This article doesn’t exist.');
  const revs = q(db, `SELECT r.id, r.comment, r.size, r.hidden, r.created_at AS createdAt, r.title, u.username AS user
                      FROM revisions r LEFT JOIN users u ON u.id = r.user_id WHERE r.article_id = ? ORDER BY r.id DESC`).all(a.id);
  return {
    article: articleOut(db, a, ns), namespace: nsOut(ns), canEdit: canEdit(user, ns, a),
    revisions: revs.map((r) => ({ ...r, hidden: !!r.hidden, comment: r.hidden && !isMod(user) ? '' : r.comment })),
  };
});

route('GET', '/api/revision/:id', (ctx) => {
  requireRead(ctx);
  const { db, user } = ctx;
  const r = q(db, 'SELECT r.*, u.username AS user FROM revisions r LEFT JOIN users u ON u.id = r.user_id WHERE r.id = ?').get(Number(ctx.params.id));
  if (!r) fail(404, 'There is no such revision.');
  const a = q(db, 'SELECT * FROM articles WHERE id = ?').get(r.article_id);
  const ns = q(db, 'SELECT * FROM namespaces WHERE id = ?').get(a.ns_id);
  if ((a.deleted || ns.hidden) && !isMod(user)) fail(404, 'There is no such revision.');
  if (r.hidden && !isMod(user)) fail(403, 'A moderator hid this revision.');
  const prev = q(db, 'SELECT id FROM revisions WHERE article_id = ? AND id < ? ORDER BY id DESC LIMIT 1').get(a.id, r.id);
  return {
    revision: { id: r.id, title: r.title, template: r.template, fields: JSON.parse(r.fields), body: r.body, image: r.image,
      comment: r.comment, user: r.user, createdAt: r.created_at, hidden: !!r.hidden },
    prevId: prev?.id ?? null,
    current: a.rev_id === r.id,
    article: { ns: ns.slug, slug: a.slug, title: a.title },
    namespace: nsOut(ns),
  };
});

route('POST', '/api/ns/:ns/article/:slug/revert', (ctx) => {
  const user = requireUser(ctx);
  const { db } = ctx;
  const ns = nsRow(db, user, ctx.params.ns);
  return tx(db, () => {
    const a = findArticle(db, ns, decodeURIComponent(ctx.params.slug));
    if (!a || a.deleted) fail(404, 'This article doesn’t exist.');
    if (!canEdit(user, ns, a)) fail(403, 'This article is protected: you can’t edit it.');
    const r = q(db, 'SELECT * FROM revisions WHERE id = ? AND article_id = ?').get(Number(ctx.body.revId), a.id);
    if (!r) fail(404, 'There is no such revision.');
    if (r.hidden && !isMod(user)) fail(403, 'A moderator hid this revision.');
    const d = { title: a.title, slug: a.slug, template: r.template, fields: r.fields, body: r.body, image: r.image };
    const why = str(ctx.body.comment, LIMITS.comment, 'The reason').trim();
    const next = updateArticle(db, user, ns, a, d, `Reverted to the version of ${new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')}${why ? `: ${why}` : ''}`);
    return { article: articleOut(db, next, ns) };
  });
});

route('POST', '/api/ns/:ns/article/:slug/report', (ctx) => {
  const user = requireUser(ctx);
  const { db } = ctx;
  const ns = nsRow(db, user, ctx.params.ns);
  const a = findArticle(db, ns, decodeURIComponent(ctx.params.slug));
  if (!a || a.deleted) fail(404, 'This article doesn’t exist.');
  const reason = str(ctx.body.reason, LIMITS.reason, 'The reason').trim();
  if (!reason) fail(400, 'Say what’s wrong so a moderator can look at it.');
  if (!reportLimit(`u${user.id}`)) fail(429, 'You’ve sent a lot of reports. Try again later.');
  q(db, 'INSERT INTO reports (article_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)').run(a.id, user.id, reason, Date.now());
  return { ok: true };
});

// ---- moderation of articles

function modArticle(ctx) {
  const user = requireMod(ctx);
  const ns = nsRow(ctx.db, user, ctx.params.ns);
  const a = findArticle(ctx.db, ns, decodeURIComponent(ctx.params.slug));
  if (!a) fail(404, 'This article doesn’t exist.');
  return { user, ns, a };
}

route('POST', '/api/ns/:ns/article/:slug/delete', (ctx) => {
  const { user, ns, a } = modArticle(ctx);
  const reason = str(ctx.body.reason, LIMITS.reason, 'The reason').trim();
  tx(ctx.db, () => {
    q(ctx.db, 'UPDATE articles SET deleted = 1 WHERE id = ?').run(a.id);
    q(ctx.db, 'DELETE FROM redirects WHERE article_id = ?').run(a.id);
    indexArticle(ctx.db, { ...a, deleted: 1 }, ns);
    audit(ctx.db, user, 'delete', `${ns.slug}/${a.slug}`, reason);
  });
  return { ok: true };
});

route('POST', '/api/ns/:ns/article/:slug/restore', (ctx) => {
  const { user, ns, a } = modArticle(ctx);
  tx(ctx.db, () => {
    q(ctx.db, 'UPDATE articles SET deleted = 0 WHERE id = ?').run(a.id);
    indexArticle(ctx.db, { ...a, deleted: 0 }, ns);
    audit(ctx.db, user, 'restore', `${ns.slug}/${a.slug}`);
  });
  return { ok: true };
});

route('POST', '/api/ns/:ns/article/:slug/protect', (ctx) => {
  const { user, ns, a } = modArticle(ctx);
  const level = String(ctx.body.level);
  if (!PROTECTION[level]) fail(400, 'Unknown protection level.');
  if ((level === 'admins' || a.protection === 'admins') && !isAdmin(user)) fail(403, 'Only admins can set or lift admin-only protection.');
  q(ctx.db, 'UPDATE articles SET protection = ? WHERE id = ?').run(level, a.id);
  audit(ctx.db, user, 'protect', `${ns.slug}/${a.slug}`, level);
  return { ok: true };
});

route('POST', '/api/revision/:id/hide', (ctx) => {
  const user = requireMod(ctx);
  const r = q(ctx.db, 'SELECT r.*, a.rev_id AS current FROM revisions r JOIN articles a ON a.id = r.article_id WHERE r.id = ?').get(Number(ctx.params.id));
  if (!r) fail(404, 'There is no such revision.');
  const hidden = !!ctx.body.hidden;
  if (hidden && r.current === r.id) fail(400, 'This is the current version. Revert to an earlier one first, then hide this one.');
  q(ctx.db, 'UPDATE revisions SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, r.id);
  audit(ctx.db, user, hidden ? 'hide-revision' : 'unhide-revision', `rev ${r.id}`);
  return { ok: true };
});

// ---- moderation of people & reports

route('GET', '/api/mod/overview', (ctx) => {
  requireMod(ctx);
  const { db } = ctx;
  return {
    reports: q(db, `SELECT r.id, r.reason, r.status, r.note, r.created_at AS createdAt, u.username AS user, m.username AS resolvedBy,
                           a.slug, a.title, n.slug AS ns
                    FROM reports r JOIN articles a ON a.id = r.article_id JOIN namespaces n ON n.id = a.ns_id
                    LEFT JOIN users u ON u.id = r.user_id LEFT JOIN users m ON m.id = r.resolved_by
                    ORDER BY (r.status = 'open') DESC, r.id DESC LIMIT 100`).all(),
    pending: q(db, "SELECT id, username, created_at AS createdAt FROM users WHERE status = 'pending' ORDER BY id").all(),
    deleted: q(db, `SELECT a.slug, a.title, n.slug AS ns, a.updated_at AS updatedAt FROM articles a JOIN namespaces n ON n.id = a.ns_id
                    WHERE a.deleted = 1 ORDER BY a.updated_at DESC LIMIT 100`).all(),
    protected: q(db, `SELECT a.slug, a.title, a.protection, n.slug AS ns FROM articles a JOIN namespaces n ON n.id = a.ns_id
                      WHERE a.protection <> 'none' AND a.deleted = 0 ORDER BY a.title LIMIT 200`).all(),
    audit: q(db, `SELECT l.action, l.target, l.detail, l.created_at AS createdAt, u.username AS user
                  FROM audit l LEFT JOIN users u ON u.id = l.user_id ORDER BY l.id DESC LIMIT 100`).all(),
  };
});

route('POST', '/api/mod/reports/:id', (ctx) => {
  const user = requireMod(ctx);
  const status = String(ctx.body.status);
  if (!['open', 'resolved', 'dismissed'].includes(status)) fail(400, 'Unknown status.');
  const note = str(ctx.body.note, LIMITS.reason, 'The note');
  const r = q(ctx.db, 'UPDATE reports SET status = ?, note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?')
    .run(status, note, status === 'open' ? null : user.id, status === 'open' ? null : Date.now(), Number(ctx.params.id));
  if (!r.changes) fail(404, 'There is no such report.');
  audit(ctx.db, user, `report-${status}`, `report ${ctx.params.id}`, note);
  return { ok: true };
});

route('GET', '/api/mod/users', (ctx) => {
  requireMod(ctx);
  const term = String(ctx.query.q || '').trim();
  const like = `%${term.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
  const rows = q(ctx.db, `SELECT u.id, u.username, u.role, u.status, u.ban_reason AS banReason, u.created_at AS createdAt, u.last_seen AS lastSeen,
                                 (SELECT COUNT(*) FROM revisions r WHERE r.user_id = u.id) AS edits
                          FROM users u WHERE u.username LIKE ? ESCAPE '\\' ORDER BY (u.status = 'pending') DESC, u.username COLLATE NOCASE LIMIT 500`).all(like);
  return { users: rows };
});

route('POST', '/api/mod/users/:id', (ctx) => {
  const me = requireMod(ctx);
  const { db, body } = ctx;
  const target = q(db, 'SELECT * FROM users WHERE id = ?').get(Number(ctx.params.id));
  if (!target) fail(404, 'There is no such user.');
  if (target.id === me.id) fail(400, 'You can’t change your own account here.');
  if (rank(target.role) >= rank(me.role) && !isAdmin(me)) fail(403, 'You can only moderate people below your own role.');
  if (body.role !== undefined && body.role !== target.role) {
    if (!isAdmin(me)) fail(403, 'Only admins can change roles.');
    if (!['user', 'mod', 'admin'].includes(body.role)) fail(400, 'Unknown role.');
    q(db, 'UPDATE users SET role = ? WHERE id = ?').run(body.role, target.id);
    audit(db, me, 'role', target.username, body.role);
  }
  if (body.status !== undefined && body.status !== target.status) {
    if (!['active', 'pending', 'banned'].includes(body.status)) fail(400, 'Unknown status.');
    const reason = str(body.banReason, LIMITS.reason, 'The reason').trim();
    q(db, 'UPDATE users SET status = ?, ban_reason = ? WHERE id = ?').run(body.status, body.status === 'banned' ? reason : null, target.id);
    if (body.status === 'banned') auth.destroyUserSessions(db, target.id);
    audit(db, me, body.status === 'banned' ? 'ban' : body.status === 'active' ? (target.status === 'pending' ? 'approve' : 'unban') : body.status,
      target.username, reason);
  }
  return { ok: true };
});

// ---- admin

route('POST', '/api/admin/users', (ctx) => {
  const me = requireAdmin(ctx);
  const { username, password, role = 'user' } = ctx.body;
  if (!auth.validUsername(username)) fail(400, 'Usernames are 3–32 letters, numbers, dots, dashes or underscores.');
  if (!auth.validPassword(password)) fail(400, 'Passwords need at least 8 characters.');
  if (!['user', 'mod', 'admin'].includes(role)) fail(400, 'Unknown role.');
  if (q(ctx.db, 'SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'That username is taken.');
  q(ctx.db, 'INSERT INTO users (username, pass_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(username, auth.hashPassword(password), role, 'active', Date.now());
  audit(ctx.db, me, 'create-user', username, role);
  return { ok: true };
});

route('POST', '/api/admin/users/:id/password', (ctx) => {
  const me = requireAdmin(ctx);
  const target = q(ctx.db, 'SELECT * FROM users WHERE id = ?').get(Number(ctx.params.id));
  if (!target) fail(404, 'There is no such user.');
  if (!auth.validPassword(ctx.body.password)) fail(400, 'Passwords need at least 8 characters.');
  q(ctx.db, 'UPDATE users SET pass_hash = ? WHERE id = ?').run(auth.hashPassword(ctx.body.password), target.id);
  auth.destroyUserSessions(ctx.db, target.id);
  audit(ctx.db, me, 'reset-password', target.username);
  return { ok: true };
});

route('PUT', '/api/admin/settings', (ctx) => {
  const me = requireAdmin(ctx);
  const b = ctx.body;
  const next = {};
  if (b.siteName !== undefined) next.siteName = str(b.siteName, 60, 'The site name').trim() || DEFAULT_SETTINGS.siteName;
  if (b.tagline !== undefined) next.tagline = str(b.tagline, 200, 'The tagline').trim();
  if (b.welcome !== undefined) next.welcome = str(b.welcome, 4000, 'The welcome text');
  if (b.registration !== undefined) {
    if (!['open', 'approval', 'closed'].includes(b.registration)) fail(400, 'Unknown sign-up mode.');
    next.registration = b.registration;
  }
  if (b.readAccess !== undefined) {
    if (!['public', 'members'].includes(b.readAccess)) fail(400, 'Unknown read access.');
    next.readAccess = b.readAccess;
  }
  if (b.defaultTheme !== undefined) {
    if (!THEMES[b.defaultTheme]) fail(400, 'Unknown theme.');
    next.defaultTheme = b.defaultTheme;
  }
  const ins = q(ctx.db, 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(next)) ins.run(k, JSON.stringify(v));
  audit(ctx.db, me, 'settings', '', Object.keys(next).join(', '));
  return { settings: getSettings(ctx.db) };
});

function checkNamespace(b, partial) {
  const out = {};
  if (b.name !== undefined || !partial) {
    out.name = str(b.name, 60, 'The name').trim();
    if (!out.name) fail(400, 'The namespace needs a name.');
  }
  if (b.tagline !== undefined) out.tagline = str(b.tagline, 200, 'The tagline').trim();
  if (b.theme !== undefined || !partial) {
    out.theme = String(b.theme || 'gta');
    if (!THEMES[out.theme]) fail(400, 'Unknown theme.');
  }
  if (b.sort !== undefined) out.sort = Number(b.sort) || 0;
  if (b.archived !== undefined) out.archived = b.archived ? 1 : 0;
  if (b.hidden !== undefined) out.hidden = b.hidden ? 1 : 0;
  return out;
}

route('POST', '/api/admin/namespaces', (ctx) => {
  const me = requireAdmin(ctx);
  const slug = String(ctx.body.slug || '').toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]{0,23}$/.test(slug)) fail(400, 'The short name must be 1–24 lowercase letters, numbers or dashes, like “gta4”.');
  if (q(ctx.db, 'SELECT 1 FROM namespaces WHERE slug = ?').get(slug)) fail(409, 'That short name is taken.');
  const n = checkNamespace(ctx.body, false);
  q(ctx.db, 'INSERT INTO namespaces (slug, name, tagline, theme, sort, archived, hidden, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(slug, n.name, n.tagline || '', n.theme, n.sort || 0, n.archived || 0, n.hidden || 0, Date.now());
  audit(ctx.db, me, 'create-namespace', slug);
  return { namespaces: visibleNamespaces(ctx.db, me) };
});

route('PUT', '/api/admin/namespaces/:ns', (ctx) => {
  const me = requireAdmin(ctx);
  const ns = nsRow(ctx.db, me, ctx.params.ns);
  const n = checkNamespace(ctx.body, true);
  const keys = Object.keys(n);
  if (keys.length) {
    ctx.db.prepare(`UPDATE namespaces SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => n[k]), ns.id);
  }
  audit(ctx.db, me, 'edit-namespace', ns.slug, keys.join(', '));
  return { namespaces: visibleNamespaces(ctx.db, me) };
});

route('DELETE', '/api/admin/namespaces/:ns', (ctx) => {
  const me = requireAdmin(ctx);
  const ns = nsRow(ctx.db, me, ctx.params.ns);
  if (q(ctx.db, 'SELECT COUNT(*) AS n FROM articles WHERE ns_id = ?').get(ns.id).n) {
    fail(409, 'This namespace still has articles. Archive or hide it instead.');
  }
  q(ctx.db, 'DELETE FROM namespaces WHERE id = ?').run(ns.id);
  audit(ctx.db, me, 'delete-namespace', ns.slug);
  return { namespaces: visibleNamespaces(ctx.db, me) };
});

function checkTemplate(t) {
  if (!t || typeof t !== 'object') fail(400, 'Each template must be an object.');
  const key = String(t.key || '');
  if (!/^[a-z0-9-]{1,32}$/.test(key)) fail(400, `Template key “${key}” must be 1–32 lowercase letters, numbers or dashes.`);
  const label = str(t.label, 60, `${key}: label`).trim();
  if (!label) fail(400, `${key}: needs a label.`);
  const sections = Array.isArray(t.sections) ? t.sections : [];
  return {
    key, label,
    plural: str(t.plural, 60, `${key}: plural`).trim() || label,
    icon: str(t.icon, 40, `${key}: icon`).trim() || 'file-text',
    group: TEMPLATE_GROUPS[t.group] ? t.group : 'other',
    hint: str(t.hint, 200, `${key}: hint`).trim(),
    themes: (Array.isArray(t.themes) ? t.themes : []).filter((x) => THEMES[x]),
    sections: sections.slice(0, 12).map((s) => ({
      name: str(s?.name, 60, `${key}: section name`).trim(),
      fields: (Array.isArray(s?.fields) ? s.fields : []).slice(0, 20).map((f) => str(f, 60, `${key}: field name`).trim()).filter(Boolean),
    })),
    body: str(t.body, 20000, `${key}: body`),
  };
}

route('PUT', '/api/admin/templates', (ctx) => {
  const me = requireAdmin(ctx);
  const list = ctx.body.templates;
  if (!Array.isArray(list) || !list.length) fail(400, 'Send at least one template.');
  const clean = list.slice(0, 60).map(checkTemplate);
  const keys = new Set(clean.map((t) => t.key));
  if (keys.size !== clean.length) fail(400, 'Two templates have the same key.');
  const used = q(ctx.db, 'SELECT DISTINCT template FROM articles').all().map((r) => r.template);
  const missing = used.filter((k) => !keys.has(k));
  if (missing.length) fail(409, `These templates are still used by articles, so they can’t be removed: ${missing.join(', ')}.`);
  tx(ctx.db, () => {
    q(ctx.db, 'DELETE FROM templates').run();
    const ins = q(ctx.db, 'INSERT INTO templates (key, sort, data) VALUES (?, ?, ?)');
    clean.forEach((t, i) => ins.run(t.key, i, JSON.stringify(t)));
  });
  audit(ctx.db, me, 'templates', '', `${clean.length} templates`);
  return { templates: templates(ctx.db) };
});

// ---- uploads

const MAGIC = [
  ['png', 'image/png', (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  ['jpg', 'image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['gif', 'image/gif', (b) => b.subarray(0, 4).toString('latin1') === 'GIF8'],
  ['webp', 'image/webp', (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'],
];
export const UPLOAD_MAX = 8 * 1024 * 1024;

route('POST', '/api/upload', (ctx) => {
  const user = requireUser(ctx);
  const buf = ctx.rawBody;
  if (!buf?.length) fail(400, 'No file was sent.');
  if (!uploadLimit(`u${user.id}`)) fail(429, 'You’ve uploaded a lot of pictures. Try again later.');
  const kind = MAGIC.find(([, , test]) => test(buf));
  if (!kind) fail(415, 'Only PNG, JPEG, GIF and WebP pictures can be uploaded.');
  const name = `${crypto.randomBytes(12).toString('hex')}.${kind[0]}`;
  fs.writeFileSync(path.join(ctx.dataDir, 'uploads', name), buf);
  q(ctx.db, 'INSERT INTO uploads (name, user_id, mime, size, created_at) VALUES (?, ?, ?, ?, ?)').run(name, user.id, kind[1], buf.length, Date.now());
  return { url: `/uploads/${name}` };
});

// For link previews (Discord, etc.): the title, description and picture of a page.
export function pageMeta(db, pathname) {
  const s = getSettings(db);
  const base = { title: s.siteName, description: s.tagline, image: '' };
  if (s.readAccess !== 'public') return base;
  const m = /^\/w\/([a-z0-9-]+)(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!m) return base;
  const ns = q(db, 'SELECT * FROM namespaces WHERE slug = ? AND hidden = 0').get(m[1]);
  if (!ns) return base;
  if (!m[2]) return { title: `${ns.name} · ${s.siteName}`, description: ns.tagline || s.tagline, image: '' };
  let slug;
  try { slug = decodeURIComponent(m[2]); } catch { return base; }
  const a = q(db, 'SELECT * FROM articles WHERE ns_id = ? AND slug = ? AND deleted = 0').get(ns.id, slug);
  if (!a) return base;
  const text = a.body.replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, t, l) => l || t.replace(/^[a-z0-9-]+:/i, ''))
    .replace(/^>\s*\[![a-z]+\].*$/gim, '').replace(/[#>*_`|~-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: `${a.title} · ${ns.name}`, description: text.slice(0, 200), image: a.image };
}
