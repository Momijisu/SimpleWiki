// API tests: run with `npm test`. Each test file gets a fresh wiki in a temp folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server/index.js';

let server, base, dir;

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simplewiki-test-'));
  server = createServer({ dataDir: dir });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

// A client with its own cookie.
function client() {
  let cookie = '';
  const call = async (method, url, body, { raw, header = true } = {}) => {
    const headers = { cookie };
    if (header) headers['X-Requested-With'] = 'SimpleWiki';
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + url, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  return {
    get: (u) => call('GET', u), post: (u, b = {}, o) => call('POST', u, b, o), put: (u, b = {}) => call('PUT', u, b), del: (u) => call('DELETE', u),
    raw: (u, buf) => call('POST', u, undefined, { raw: buf }),
  };
}

const admin = client(), alice = client(), bob = client(), anon = client();
const page = (title, extra = {}) => ({ title, template: 'character', fields: { Age: '30' }, body: 'Text', ...extra });

test('the first account is the admin, later ones are users', async () => {
  const a = await admin.post('/api/register', { username: 'boss', password: 'password123' });
  assert.equal(a.data.user.role, 'admin');
  const b = await alice.post('/api/register', { username: 'alice', password: 'password123' });
  assert.equal(b.data.user.role, 'user');
  assert.equal(b.data.user.status, 'active');
  assert.equal((await bob.post('/api/register', { username: 'ALICE', password: 'password123' })).status, 409, 'usernames are case-insensitive');
  assert.equal((await bob.post('/api/register', { username: 'bob', password: 'short' })).status, 400);
  assert.equal((await bob.post('/api/register', { username: 'bob', password: 'password123' })).status, 200);
});

test('changes need the custom header (CSRF guard)', async () => {
  const r = await alice.post('/api/ns/gta/articles', page('No Header'), { header: false });
  assert.equal(r.status, 403);
});

test('wrong passwords are refused', async () => {
  const c = client();
  assert.equal((await c.post('/api/login', { username: 'alice', password: 'nope-nope' })).status, 401);
  assert.equal((await c.post('/api/login', { username: 'nobody', password: 'nope-nope' })).status, 401);
  assert.equal((await c.post('/api/login', { username: 'alice', password: 'password123' })).status, 200);
});

test('people with accounts create and edit articles; visitors only read', async () => {
  assert.equal((await anon.post('/api/ns/gta/articles', page('Tony'))).status, 401);
  const r = await alice.post('/api/ns/gta/articles', page('Tony “Two-Times” Ramirez', { body: 'Friends with [[Marisol]] and [[rdr:Silas Crane]].' }));
  assert.equal(r.status, 200);
  assert.equal(r.data.article.slug, 'tony-two-times-ramirez');
  const dup = await bob.post('/api/ns/gta/articles', page('tony two-times ramirez'));
  assert.equal(dup.status, 409);
  const read = await anon.get('/api/ns/gta/article/tony-two-times-ramirez');
  assert.equal(read.status, 200);
  assert.equal(read.data.canEdit, false);
  assert.deepEqual(read.data.existing, []);
  const edit = await bob.put('/api/ns/gta/article/tony-two-times-ramirez', { ...page('Tony “Two-Times” Ramirez'), body: 'Rewritten', baseRev: read.data.article.revId });
  assert.equal(edit.status, 200);
  assert.equal(edit.data.article.updatedBy, 'bob');
});

test('a stale edit is refused as a conflict', async () => {
  const { data } = await alice.get('/api/ns/gta/article/tony-two-times-ramirez');
  const old = data.article.revId;
  assert.equal((await alice.put('/api/ns/gta/article/tony-two-times-ramirez', { ...page('Tony “Two-Times” Ramirez'), body: 'A', baseRev: old })).status, 200);
  const r = await bob.put('/api/ns/gta/article/tony-two-times-ramirez', { ...page('Tony “Two-Times” Ramirez'), body: 'B', baseRev: old });
  assert.equal(r.status, 409);
  assert.equal(r.data.conflict, true);
});

test('renaming leaves a redirect, and links count towards backlinks and wanted pages', async () => {
  await alice.post('/api/ns/gta/articles', page('Marisol'));
  await bob.post('/api/ns/gta/articles', page('Saints', { template: 'gang', body: 'Led by [[Marisol]]. See [[Nobody Yet]].' }));
  const { data } = await alice.get('/api/ns/gta/article/marisol');
  assert.equal(data.backlinks.length, 1);
  const r = await alice.put('/api/ns/gta/article/marisol', { ...page('Marisol Vega'), baseRev: data.article.revId });
  assert.equal(r.data.article.slug, 'marisol-vega');
  assert.equal((await anon.get('/api/ns/gta/article/marisol')).data.redirect, 'marisol-vega');
  const saints = await anon.get('/api/ns/gta/article/saints');
  assert.ok(saints.data.existing.includes('gta/marisol'), 'an old name still counts as an existing link');
  const wanted = await anon.get('/api/ns/gta/wanted');
  assert.ok(wanted.data.wanted.some((w) => w.slug === 'nobody-yet' && w.title === 'Nobody Yet'));
  assert.ok(wanted.data.wanted.every((w) => w.slug !== 'marisol'));
});

test('cross-namespace links resolve', async () => {
  await alice.post('/api/ns/rdr/articles', page('Silas Crane'));
  await alice.post('/api/ns/gta/articles', page('Old Timer', { body: 'Grandson of [[rdr:Silas Crane]], not [[rdr:Nobody]].' }));
  const { data } = await anon.get('/api/ns/gta/article/old-timer');
  assert.deepEqual(data.existing, ['rdr/silas-crane']);
  const back = await anon.get('/api/ns/rdr/article/silas-crane');
  assert.ok(back.data.backlinks.some((b) => b.ns === 'gta' && b.slug === 'old-timer'));
});

test('search finds articles and skips deleted ones', async () => {
  const s = await anon.get('/api/search?q=marisol');
  assert.ok(s.data.results.some((r) => r.slug === 'marisol-vega'));
  assert.equal((await alice.post('/api/ns/gta/article/marisol-vega/delete')).status, 403, 'only mods delete');
  assert.equal((await admin.post('/api/ns/gta/article/marisol-vega/delete', { reason: 'test' })).status, 200);
  assert.ok(!(await anon.get('/api/search?q=marisol')).data.results.some((r) => r.slug === 'marisol-vega'));
  assert.equal((await anon.get('/api/ns/gta/article/marisol-vega')).status, 404);
  assert.equal((await admin.get('/api/ns/gta/article/marisol-vega')).data.article.deleted, true);
  assert.equal((await admin.post('/api/ns/gta/article/marisol-vega/restore')).status, 200);
  assert.equal((await anon.get('/api/ns/gta/article/marisol-vega')).status, 200);
});

test('protection limits who can edit', async () => {
  await admin.post('/api/mod/users/3', { role: 'mod' }); // bob
  assert.equal((await bob.post('/api/ns/gta/article/saints/protect', { level: 'mods' })).status, 200);
  const r = await alice.put('/api/ns/gta/article/saints', page('Saints', { template: 'gang' }));
  assert.equal(r.status, 403);
  assert.equal((await bob.put('/api/ns/gta/article/saints', page('Saints', { template: 'gang', body: 'mod edit' }))).status, 200);
  assert.equal((await bob.post('/api/ns/gta/article/saints/protect', { level: 'admins' })).status, 403, 'mods can’t set admin-only');
  assert.equal((await bob.post('/api/mod/users/1', { status: 'banned' })).status, 403, 'mods can’t ban admins');
});

test('hidden revisions: never the current one, and only mods can read them', async () => {
  const h = await anon.get('/api/ns/gta/article/tony-two-times-ramirez/history');
  const [current, older] = h.data.revisions;
  assert.equal((await bob.post(`/api/revision/${current.id}/hide`, { hidden: true })).status, 400);
  assert.equal((await bob.post(`/api/revision/${older.id}/hide`, { hidden: true })).status, 200);
  assert.equal((await anon.get(`/api/revision/${older.id}`)).status, 403);
  assert.equal((await bob.get(`/api/revision/${older.id}`)).status, 200);
  const rev = await alice.post('/api/ns/gta/article/tony-two-times-ramirez/revert', { revId: older.id });
  assert.equal(rev.status, 403, 'nobody but mods can restore a hidden version');
});

test('reverting restores an old version as a new edit', async () => {
  const h = await anon.get('/api/ns/gta/article/tony-two-times-ramirez/history');
  const first = h.data.revisions.at(-1);
  const r = await alice.post('/api/ns/gta/article/tony-two-times-ramirez/revert', { revId: first.id, comment: 'vandalism' });
  assert.equal(r.status, 200);
  assert.match(r.data.article.body, /Marisol/);
  const after = await anon.get('/api/ns/gta/article/tony-two-times-ramirez/history');
  assert.equal(after.data.revisions.length, h.data.revisions.length + 1);
});

test('banned people can’t edit and are signed out', async () => {
  const carol = client();
  const reg = await carol.post('/api/register', { username: 'carol', password: 'password123' });
  assert.equal((await bob.post(`/api/mod/users/${reg.data.user.id}`, { status: 'banned', banReason: 'spam' })).status, 200);
  const s = await carol.get('/api/session');
  assert.equal(s.data.user, null, 'their session was ended');
  await carol.post('/api/login', { username: 'carol', password: 'password123' });
  const r = await carol.post('/api/ns/gta/articles', page('Spam'));
  assert.equal(r.status, 403);
  assert.match(r.data.error, /spam/);
});

test('approval mode: new accounts wait for a moderator', async () => {
  await admin.put('/api/admin/settings', { registration: 'approval' });
  const dave = client();
  const reg = await dave.post('/api/register', { username: 'dave', password: 'password123' });
  assert.equal(reg.data.user.status, 'pending');
  assert.equal((await dave.post('/api/ns/gta/articles', page('Dave'))).status, 403);
  await bob.post(`/api/mod/users/${reg.data.user.id}`, { status: 'active' });
  assert.equal((await dave.post('/api/ns/gta/articles', page('Dave'))).status, 200);
  await admin.put('/api/admin/settings', { registration: 'closed' });
  assert.equal((await client().post('/api/register', { username: 'erin', password: 'password123' })).status, 403);
  await admin.put('/api/admin/settings', { registration: 'open' });
});

test('members-only reading', async () => {
  await admin.put('/api/admin/settings', { readAccess: 'members' });
  assert.equal((await anon.get('/api/ns/gta/article/saints')).status, 401);
  assert.deepEqual((await anon.get('/api/session')).data.namespaces, []);
  assert.equal((await alice.get('/api/ns/gta/article/saints')).status, 200);
  const html = await (await fetch(`${base}/w/gta/saints`)).text();
  assert.doesNotMatch(html, /og:title" content="Saints/, 'link previews don’t leak private articles');
  await admin.put('/api/admin/settings', { readAccess: 'public' });
  const html2 = await (await fetch(`${base}/w/gta/saints`)).text();
  assert.match(html2, /og:title" content="Saints/);
});

test('archived namespaces are read-only except for mods', async () => {
  await admin.post('/api/admin/namespaces', { slug: 'gta3', name: 'Old city', theme: 'gta', archived: true });
  assert.equal((await alice.post('/api/ns/gta3/articles', page('Old'))).status, 403);
  assert.equal((await bob.post('/api/ns/gta3/articles', page('Old'))).status, 200);
  assert.equal((await admin.del('/api/admin/namespaces/gta3')).status, 409, 'a namespace with articles can’t be deleted');
});

test('hidden namespaces are invisible to non-mods', async () => {
  await admin.post('/api/admin/namespaces', { slug: 'secret', name: 'Secret', theme: 'classic', hidden: true });
  assert.ok(!(await anon.get('/api/session')).data.namespaces.some((n) => n.slug === 'secret'));
  assert.equal((await anon.get('/api/ns/secret')).status, 404);
  assert.equal((await bob.get('/api/ns/secret')).status, 200);
  assert.equal((await admin.del('/api/admin/namespaces/secret')).status, 200);
});

test('templates in use can’t be removed', async () => {
  const { data } = await anon.get('/api/session');
  const r = await admin.put('/api/admin/templates', { templates: data.templates.filter((t) => t.key !== 'character') });
  assert.equal(r.status, 409);
  const ok = await admin.put('/api/admin/templates', { templates: [...data.templates, { key: 'mechanic', label: 'Mechanic shop', sections: [{ name: 'Shop', fields: ['Owner'] }] }] });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.templates.some((t) => t.key === 'mechanic'));
  assert.equal((await alice.put('/api/admin/templates', { templates: data.templates })).status, 403);
});

test('uploads accept pictures only', async () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
  const ok = await alice.raw('/api/upload', png);
  assert.equal(ok.status, 200);
  assert.match(ok.data.url, /^\/uploads\/[a-f0-9]{24}\.png$/);
  const file = await fetch(base + ok.data.url);
  assert.equal(file.headers.get('content-type'), 'image/png');
  assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await alice.raw('/api/upload', Buffer.from('<svg onload=alert(1)>'))).status, 415);
  assert.equal((await anon.raw('/api/upload', png)).status, 401);
  const bad = await alice.post('/api/ns/gta/articles', page('Bad image', { image: 'javascript:alert(1)' }));
  assert.equal(bad.status, 400);
});

test('reports reach moderators', async () => {
  assert.equal((await alice.post('/api/ns/gta/article/saints/report', { reason: 'Doxxing in section 2' })).status, 200);
  assert.equal((await alice.get('/api/mod/overview')).status, 403);
  const o = await bob.get('/api/mod/overview');
  const rep = o.data.reports.find((r) => r.reason === 'Doxxing in section 2');
  assert.ok(rep);
  assert.equal((await bob.post(`/api/mod/reports/${rep.id}`, { status: 'resolved', note: 'Removed' })).status, 200);
  assert.ok(o.data.audit.some((l) => l.action === 'ban'));
});

test('the app shell is served for wiki paths, with path traversal refused', async () => {
  const res = await fetch(`${base}/w/gta/tony-two-times-ramirez`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal((await fetch(`${base}/..%2fserver%2fapi.js`)).status, 404);
  assert.equal((await fetch(`${base}/uploads/../wiki.db`)).status, 404);
});
