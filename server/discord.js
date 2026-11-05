// "Sign in with Discord" (OAuth2 authorization-code flow): the only way to sign in.
//
// Needs DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET. Optional:
//   DISCORD_GUILD_ID        only members of this Discord server can sign in
//   DISCORD_MOD_ROLE_IDS    Discord role ids (comma-separated) that make someone a wiki moderator
//   DISCORD_ADMIN_ROLE_IDS  ... and a wiki admin
// The role ids need DISCORD_GUILD_ID. Roles are checked each time someone signs in.
import crypto from 'node:crypto';
import * as auth from './auth.js';
import { getSettings } from './api.js';
import { rank } from '../public/js/shared.js';

const list = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export function discordConfig(opts = {}) {
  const env = process.env;
  const c = {
    clientId: opts.clientId ?? env.DISCORD_CLIENT_ID?.trim(),
    clientSecret: opts.clientSecret ?? env.DISCORD_CLIENT_SECRET?.trim(),
    guildId: opts.guildId ?? env.DISCORD_GUILD_ID?.trim() ?? '',
    modRoles: opts.modRoles ?? list(env.DISCORD_MOD_ROLE_IDS),
    adminRoles: opts.adminRoles ?? list(env.DISCORD_ADMIN_ROLE_IDS),
    // Overridable for tests.
    apiBase: opts.apiBase ?? 'https://discord.com/api/v10',
    authorizeUrl: opts.authorizeUrl ?? 'https://discord.com/oauth2/authorize',
  };
  c.enabled = !!(c.clientId && c.clientSecret);
  return c;
}

const STATE_COOKIE = 'sw_oauth';
const pending = new Map(); // state -> {next, expires}
setInterval(() => { const now = Date.now(); for (const [k, v] of pending) if (v.expires < now) pending.delete(k); }, 60_000).unref();
const callbackLimit = auth.limiter(30, 60_000);

const safeNext = (n) => (typeof n === 'string' && /^\/(?!\/)/.test(n) && !n.includes('\\') ? n : '/');

// Turn a Discord name into a free wiki username: letters, numbers, . _ - only, 3–32 long.
function freeUsername(db, wanted) {
  let base = String(wanted || '').normalize('NFKD').replace(/[^A-Za-z0-9_.-]+/g, '').slice(0, 28);
  if (base.length < 3) base = `user${base}`.slice(0, 28);
  const taken = (n) => db.prepare('SELECT 1 FROM users WHERE username = ?').get(n);
  if (!taken(base)) return base;
  for (let i = 2; i < 10000; i++) if (!taken(`${base}${i}`)) return `${base}${i}`;
  return `user${crypto.randomBytes(4).toString('hex')}`;
}

export function createDiscordHandlers({ db, config, publicUrl, isHttps, ipOf, parseCookies, audit }) {
  if (!config.enabled) {
    console.warn('Discord sign-in is not set up, so nobody can sign in. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET (see the README).');
  }
  const redirectUri = (req) => `${publicUrl || `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}`}/auth/discord/callback`;

  function redirect(res, location, cookies = []) {
    res.writeHead(302, { Location: location, 'Set-Cookie': cookies, 'Cache-Control': 'no-store' });
    res.end();
  }
  const errorTo = (res, req, message) =>
    redirect(res, `/login?error=${encodeURIComponent(message)}`, [`${STATE_COOKIE}=; Path=/auth/discord; HttpOnly; SameSite=Lax; Max-Age=0`]);

  // GET /auth/discord?next=/w/gta
  function start(req, res, url) {
    if (!config.enabled) return errorTo(res, req, 'Discord sign-in isn’t set up on this wiki yet.');
    const state = crypto.randomBytes(24).toString('base64url');
    pending.set(state, { next: safeNext(url.searchParams.get('next')), expires: Date.now() + 10 * 60_000 });
    const params = new URLSearchParams({
      response_type: 'code', client_id: config.clientId, redirect_uri: redirectUri(req), state, prompt: 'none',
      scope: config.guildId ? 'identify guilds.members.read' : 'identify',
    });
    redirect(res, `${config.authorizeUrl}?${params}`,
      [`${STATE_COOKIE}=${state}; Path=/auth/discord; HttpOnly; SameSite=Lax; Max-Age=600${isHttps(req) ? '; Secure' : ''}`]);
  }

  async function discordGet(path, accessToken) {
    const r = await fetch(config.apiBase + path, { headers: { Authorization: `Bearer ${accessToken}` } });
    return { status: r.status, data: r.ok ? await r.json() : null };
  }

  // GET /auth/discord/callback?code=…&state=…
  async function callback(req, res, url) {
    if (!config.enabled) return errorTo(res, req, 'Discord sign-in isn’t set up on this wiki yet.');
    if (!callbackLimit(ipOf(req))) return errorTo(res, req, 'Too many sign-in attempts. Wait a minute and try again.');
    const state = url.searchParams.get('state') || '';
    const cookieState = parseCookies(req.headers.cookie)[STATE_COOKIE] || '';
    const p = pending.get(state);
    pending.delete(state);
    if (!p || p.expires < Date.now() || state !== cookieState) return errorTo(res, req, 'That sign-in link expired. Please try again.');
    if (url.searchParams.get('error')) return errorTo(res, req, 'Discord sign-in was cancelled.');
    const code = url.searchParams.get('code');
    if (!code) return errorTo(res, req, 'Discord didn’t send a sign-in code. Please try again.');

    let me, member = null;
    try {
      const tr = await fetch(`${config.apiBase}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(req) }),
      });
      if (!tr.ok) throw new Error(`token exchange failed (${tr.status})`);
      const { access_token: accessToken } = await tr.json();
      const u = await discordGet('/users/@me', accessToken);
      if (!u.data?.id) throw new Error(`couldn’t read the Discord user (${u.status})`);
      me = u.data;
      if (config.guildId) {
        const m = await discordGet(`/users/@me/guilds/${config.guildId}/member`, accessToken);
        if (m.status === 404 || (m.data && m.data.pending)) {
          return errorTo(res, req, 'Only members of our Discord server can sign in. Join it first, then try again.');
        }
        if (!m.data) throw new Error(`couldn’t check server membership (${m.status})`);
        member = m.data;
      }
    } catch (e) {
      console.error('Discord sign-in:', e.message);
      return errorTo(res, req, 'Couldn’t reach Discord. Please try again in a moment.');
    }

    const name = me.global_name || me.username;
    const avatar = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null;
    const roles = member?.roles || [];
    const discordRole = config.adminRoles.some((r) => roles.includes(r)) ? 'admin'
      : config.modRoles.some((r) => roles.includes(r)) ? 'mod' : 'user';
    const syncRoles = !!(config.guildId && (config.modRoles.length || config.adminRoles.length));
    const clearState = `${STATE_COOKIE}=; Path=/auth/discord; HttpOnly; SameSite=Lax; Max-Age=0`;

    const owner = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(me.id);

    let user = owner;
    if (!user) {
      const s = getSettings(db);
      const first = !db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
      if (s.registration === 'closed' && !first) return errorTo(res, req, 'Sign-ups are closed. Ask an admin for an account.');
      const role = first ? 'admin' : syncRoles ? discordRole : 'user';
      const status = first || s.registration === 'open' ? 'active' : 'pending';
      const username = freeUsername(db, me.username);
      const r = db.prepare(`INSERT INTO users (username, pass_hash, role, status, created_at, discord_id, discord_name, discord_avatar, role_source)
                            VALUES (?, '!discord', ?, ?, ?, ?, ?, ?, ?)`)
        .run(username, role, status, Date.now(), me.id, name, avatar, !first && syncRoles ? 'discord' : 'manual');
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(r.lastInsertRowid));
      audit(db, user, 'register', username, `${status}, via Discord`);
    } else {
      db.prepare('UPDATE users SET discord_name = ?, discord_avatar = ? WHERE id = ?').run(name, avatar, user.id);
      if (syncRoles && user.role !== discordRole) {
        // A role Discord gave can be taken away by Discord; a role an admin set by hand only goes up.
        const next = user.role_source === 'discord' ? discordRole : rank(discordRole) > rank(user.role) ? discordRole : null;
        if (next) {
          db.prepare("UPDATE users SET role = ?, role_source = 'discord' WHERE id = ?").run(next, user.id);
          audit(db, null, 'role', user.username, `${next} (from Discord roles)`);
        }
      }
    }
    const session = auth.createSession(db, user.id);
    redirect(res, p.next, [clearState, auth.sessionCookie(session, isHttps(req))]);
  }

  return { start, callback };
}
