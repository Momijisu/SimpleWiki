// "Sign in with Discord", against a small fake Discord API.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createServer } from '../server/index.js';

const GUILD = '900';
const MOD_ROLE = '11', ADMIN_ROLE = '12';
// Fake Discord: the code "c-<id>" signs in the Discord user <id>.
const people = {
  '1001': { user: { id: '1001', username: 'tony.ramirez', global_name: 'Tony', avatar: 'abc' }, member: { roles: [] } },
  '1002': { user: { id: '1002', username: 'dana', global_name: null, avatar: null }, member: { roles: [MOD_ROLE] } },
  '1003': { user: { id: '1003', username: 'stranger', avatar: null }, member: null },
  '1004': { user: { id: '1004', username: 'tony.ramirez', avatar: null }, member: { roles: [] } },
  '1005': { user: { id: '1005', username: 'linker', avatar: null }, member: { roles: [] } },
};
let fake, wiki, base, dir;
const tokenRequests = [];

before(async () => {
  fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const reply = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
      if (req.method === 'POST' && req.url === '/oauth2/token') {
        const p = new URLSearchParams(body);
        tokenRequests.push({ auth: req.headers.authorization, redirect: p.get('redirect_uri') });
        const id = p.get('code')?.replace(/^c-/, '');
        return people[id] ? reply(200, { access_token: `t-${id}`, token_type: 'Bearer' }) : reply(400, { error: 'invalid_grant' });
      }
      const id = String(req.headers.authorization || '').replace('Bearer t-', '');
      if (!people[id]) return reply(401, { message: '401: Unauthorized' });
      if (req.url === '/users/@me') return reply(200, people[id].user);
      if (req.url === `/users/@me/guilds/${GUILD}/member`) return people[id].member ? reply(200, people[id].member) : reply(404, { message: 'Unknown Guild' });
      reply(404, {});
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const api = `http://127.0.0.1:${fake.address().port}`;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simplewiki-discord-'));
  wiki = createServer({
    dataDir: dir,
    discord: { clientId: 'cid', clientSecret: 'secret', guildId: GUILD, modRoles: [MOD_ROLE], adminRoles: [ADMIN_ROLE], apiBase: api, authorizeUrl: `${api}/authorize` },
  });
  await new Promise((r) => wiki.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${wiki.address().port}`;
});
after(() => { wiki.close(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const cookieOf = (res, name) => res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith(`${name}=`));

// Go through the whole sign-in as Discord user `id`. Returns the wiki's final redirect and session cookie.
async function signIn(id, { next = '/w/gta', session = '', link = false } = {}) {
  const start = await fetch(`${base}/auth/discord?next=${encodeURIComponent(next)}${link ? '&link=1' : ''}`, { redirect: 'manual', headers: { cookie: session } });
  assert.equal(start.status, 302);
  const auth = new URL(start.headers.get('location'));
  const state = auth.searchParams.get('state');
  const stateCookie = cookieOf(start, 'sw_oauth');
  const cb = await fetch(`${base}/auth/discord/callback?code=c-${id}&state=${state}`, {
    redirect: 'manual', headers: { cookie: [stateCookie, session].filter(Boolean).join('; ') },
  });
  assert.equal(cb.status, 302);
  return { auth, location: cb.headers.get('location'), session: cookieOf(cb, 'sw_session') || session };
}
const api = (url, session, method = 'GET', body) => fetch(base + url, {
  method, headers: { cookie: session || '', 'X-Requested-With': 'SimpleWiki', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
}).then(async (r) => ({ status: r.status, data: await r.json() }));

test('the session says Discord sign-in is available', async () => {
  assert.equal((await api('/api/session')).data.discord, true);
});

test('the sign-in link goes to Discord with the right scopes', async () => {
  const start = await fetch(`${base}/auth/discord?next=/w/gta`, { redirect: 'manual' });
  const u = new URL(start.headers.get('location'));
  assert.equal(u.pathname, '/authorize');
  assert.equal(u.searchParams.get('client_id'), 'cid');
  assert.equal(u.searchParams.get('scope'), 'identify guilds.members.read');
  assert.equal(u.searchParams.get('redirect_uri'), `${base}/auth/discord/callback`);
  assert.ok(u.searchParams.get('state').length > 20);
  assert.match(start.headers.getSetCookie()[0], /HttpOnly/);
});

test('the first Discord account becomes the admin; later ones are users named after Discord', async () => {
  const a = await signIn('1001');
  assert.equal(a.location, '/w/gta');
  const me = (await api('/api/session', a.session)).data.user;
  assert.equal(me.username, 'tony.ramirez');
  assert.equal(me.role, 'admin');
  assert.equal(me.discordName, 'Tony');
  assert.equal(me.hasPassword, false);
  assert.equal(me.avatar, 'https://cdn.discordapp.com/avatars/1001/abc.png?size=128');
  const b = await signIn('1004'); // same Discord username, different person
  assert.equal((await api('/api/session', b.session)).data.user.username, 'tony.ramirez2');
  const again = await signIn('1001');
  assert.equal((await api('/api/session', again.session)).data.user.id, me.id, 'signing in again finds the same account');
  assert.equal(tokenRequests.at(-1).auth, `Basic ${Buffer.from('cid:secret').toString('base64')}`);
});

test('people outside the Discord server are turned away', async () => {
  const r = await signIn('1003');
  assert.match(r.location, /^\/login\?error=.*Discord%20server/);
  assert.equal(r.session, '');
});

test('a wrong or reused state is refused', async () => {
  const start = await fetch(`${base}/auth/discord`, { redirect: 'manual' });
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const forged = await fetch(`${base}/auth/discord/callback?code=c-1001&state=${state}`, { redirect: 'manual' }); // no state cookie
  assert.match(forged.headers.get('location'), /^\/login\?error=/);
  const reused = await fetch(`${base}/auth/discord/callback?code=c-1001&state=${state}`, { redirect: 'manual', headers: { cookie: `sw_oauth=${state}` } });
  assert.match(reused.headers.get('location'), /^\/login\?error=/, 'a state works only once');
  assert.equal(cookieOf(reused, 'sw_session'), undefined);
});

test('only safe local addresses are used to come back to', async () => {
  for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
    const r = await signIn('1001', { next });
    assert.equal(r.location, '/');
  }
});

test('Discord roles make moderators, and taking the role away takes it back', async () => {
  const d = await signIn('1002');
  assert.equal((await api('/api/session', d.session)).data.user.role, 'mod');
  people['1002'].member.roles = [];
  const d2 = await signIn('1002');
  assert.equal((await api('/api/session', d2.session)).data.user.role, 'user');
  // A role an admin sets by hand isn't taken away by Discord.
  const admin = (await signIn('1001')).session;
  const id = (await api('/api/session', d2.session)).data.user.id;
  assert.equal((await api(`/api/mod/users/${id}`, admin, 'POST', { role: 'mod' })).status, 200);
  const d3 = await signIn('1002');
  assert.equal((await api('/api/session', d3.session)).data.user.role, 'mod');
  people['1002'].member.roles = [ADMIN_ROLE];
  const d4 = await signIn('1002');
  assert.equal((await api('/api/session', d4.session)).data.user.role, 'admin', 'but it can still go up');
  people['1002'].member.roles = [];
});

test('a password account can link Discord, and a Discord account can be linked only once', async () => {
  const reg = await fetch(`${base}/api/register`, {
    method: 'POST', headers: { 'X-Requested-With': 'SimpleWiki', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'pat', password: 'password123' }),
  });
  const pat = cookieOf(reg, 'sw_session');
  const linked = await signIn('1005', { session: pat, link: true });
  assert.equal(linked.location, '/account?linked=1');
  const me = (await api('/api/session', pat)).data.user;
  assert.equal(me.discordName, 'linker');
  // Now signing in with that Discord account lands in pat's account.
  const viaDiscord = await signIn('1005');
  assert.equal((await api('/api/session', viaDiscord.session)).data.user.username, 'pat');
  // Someone else can't take it.
  const other = await signIn('1004');
  const steal = await signIn('1005', { session: other.session, link: true });
  assert.match(steal.location, /already%20linked/);
  // pat has a password, so may unlink.
  assert.equal((await api('/api/me/unlink-discord', pat, 'POST')).status, 200);
  assert.equal((await api('/api/session', pat)).data.user.discordName, null);
});

test('Discord-only accounts must set a password before unlinking, and need no old password to set one', async () => {
  const t = (await signIn('1004')).session;
  assert.equal((await api('/api/me/unlink-discord', t, 'POST')).status, 400);
  const set = await fetch(`${base}/api/me/password`, {
    method: 'POST', headers: { cookie: t, 'X-Requested-With': 'SimpleWiki', 'Content-Type': 'application/json' }, body: JSON.stringify({ next: 'newpassword1' }),
  });
  assert.equal(set.status, 200);
  const t2 = cookieOf(set, 'sw_session');
  assert.equal((await api('/api/session', t2)).data.user.hasPassword, true);
  // A Discord-only account can't be signed into with an empty or guessed password.
  assert.equal((await api('/api/login', '', 'POST', { username: 'tony.ramirez', password: '!discord' })).status, 401);
});

test('admins can make Discord the only way to sign up', async () => {
  const admin = (await signIn('1001')).session;
  assert.equal((await api('/api/admin/settings', admin, 'PUT', { passwordSignup: false })).status, 200);
  const r = await api('/api/register', '', 'POST', { username: 'newbie', password: 'password123' });
  assert.equal(r.status, 403);
  assert.match(r.data.error, /Discord/);
  await api('/api/admin/settings', admin, 'PUT', { passwordSignup: true });
});

test('closed sign-ups also apply to Discord', async () => {
  const admin = (await signIn('1001')).session;
  await api('/api/admin/settings', admin, 'PUT', { registration: 'closed' });
  people['1006'] = { user: { id: '1006', username: 'late', avatar: null }, member: { roles: [] } };
  const r = await signIn('1006');
  assert.match(r.location, /closed/);
  await api('/api/admin/settings', admin, 'PUT', { registration: 'open' });
});
