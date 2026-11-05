// "Sign in with Discord", against a small fake Discord API (helpers.js).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startWiki, signIn as signInTo, cookieOf } from './helpers.js';

const MOD_ROLE = '11', ADMIN_ROLE = '12';
// The fake Discord signs in user <id> for the code "c-<id>".
const people = {
  '1001': { user: { id: '1001', username: 'tony.ramirez', global_name: 'Tony', avatar: 'abc' }, member: { roles: [] } },
  '1002': { user: { id: '1002', username: 'dana', global_name: null, avatar: null }, member: { roles: [MOD_ROLE] } },
  '1003': { user: { id: '1003', username: 'stranger', avatar: null }, member: null },
  '1004': { user: { id: '1004', username: 'tony.ramirez', avatar: null }, member: { roles: [] } },
  '1007': { user: { id: '1007', username: 'newbie', avatar: null }, member: { roles: [], pending: true } },
};
let w, base, tokenRequests;

before(async () => {
  w = await startWiki(people, { modRoles: [MOD_ROLE], adminRoles: [ADMIN_ROLE] });
  ({ base, tokenRequests } = w);
});
after(() => w.close());

const signIn = (id, opts) => signInTo(base, id, opts);
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

test('new members still in Discord’s membership screening are turned away', async () => {
  const r = await signIn('1007');
  assert.match(r.location, /^\/login\?error=/);
  assert.equal(r.session, '');
});

test('signing out ends the session', async () => {
  const t = (await signIn('1004')).session;
  assert.ok((await api('/api/session', t)).data.user);
  await api('/api/logout', t, 'POST');
  assert.equal((await api('/api/session', t)).data.user, null);
});

test('closed sign-ups also apply to Discord', async () => {
  const admin = (await signIn('1001')).session;
  await api('/api/admin/settings', admin, 'PUT', { registration: 'closed' });
  people['1006'] = { user: { id: '1006', username: 'late', avatar: null }, member: { roles: [] } };
  const r = await signIn('1006');
  assert.match(r.location, /closed/);
  await api('/api/admin/settings', admin, 'PUT', { registration: 'open' });
});
