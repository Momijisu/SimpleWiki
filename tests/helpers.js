// Test helpers: a fake Discord API, a wiki that signs in through it, and
// clients that sign in as a given Discord user.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createServer } from '../server/index.js';

export const GUILD = '900';

// `people` maps a Discord id to {user, member}; member null = not in the server.
export async function startWiki(people, discordExtra = {}) {
  const tokenRequests = [];
  const fake = http.createServer((req, res) => {
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
      // The consent screen: approve at once as the user named by ?as= (or the first one).
      if (req.method === 'GET' && req.url.startsWith('/authorize')) {
        const q = new URL(req.url, 'http://x').searchParams;
        const back = new URL(q.get('redirect_uri'));
        back.searchParams.set('code', `c-${q.get('as') || Object.keys(people)[0]}`);
        back.searchParams.set('state', q.get('state'));
        res.writeHead(302, { Location: back.toString() });
        return res.end();
      }
      const id = String(req.headers.authorization || '').replace('Bearer t-', '');
      if (!people[id]) return reply(401, { message: '401: Unauthorized' });
      if (req.url === '/users/@me') return reply(200, people[id].user);
      if (req.url === `/users/@me/guilds/${GUILD}/member`) return people[id].member ? reply(200, people[id].member) : reply(404, { message: 'Unknown Guild' });
      reply(404, {});
    });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const discordApi = `http://127.0.0.1:${fake.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simplewiki-test-'));
  const wiki = createServer({
    dataDir: dir,
    discord: { clientId: 'cid', clientSecret: 'secret', guildId: GUILD, modRoles: [], adminRoles: [], apiBase: discordApi, authorizeUrl: `${discordApi}/authorize`, ...discordExtra },
  });
  await new Promise((r) => wiki.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${wiki.address().port}`;
  return {
    base, wiki, tokenRequests,
    close() { wiki.close(); fake.close(); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}

export const cookieOf = (res, name) => res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith(`${name}=`));

// Go through "Sign in with Discord" as Discord user `id`.
// Returns the wiki's final redirect and the session cookie (if any).
export async function signIn(base, id, { next = '/w/gta' } = {}) {
  const start = await fetch(`${base}/auth/discord?next=${encodeURIComponent(next)}`, { redirect: 'manual' });
  assert.equal(start.status, 302);
  const auth = new URL(start.headers.get('location'));
  const cb = await fetch(`${base}/auth/discord/callback?code=c-${id}&state=${auth.searchParams.get('state')}`, {
    redirect: 'manual', headers: { cookie: cookieOf(start, 'sw_oauth') },
  });
  assert.equal(cb.status, 302);
  return { auth, location: cb.headers.get('location'), session: cookieOf(cb, 'sw_session') || '' };
}

// An API client holding one session cookie (none = a visitor).
export function client(base, session = '') {
  let cookie = session;
  const call = async (method, url, body, { raw, header = true } = {}) => {
    const headers = { cookie };
    if (header) headers['X-Requested-With'] = 'SimpleWiki';
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + url, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const set = cookieOf(res, 'sw_session');
    if (set) cookie = set;
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  return {
    get: (u) => call('GET', u), post: (u, b = {}, o) => call('POST', u, b, o), put: (u, b = {}) => call('PUT', u, b), del: (u) => call('DELETE', u),
    raw: (u, buf) => call('POST', u, undefined, { raw: buf }),
    signIn: async (id) => { cookie = (await signIn(base, id)).session; return cookie; },
  };
}
