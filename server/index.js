// SimpleWiki server: serves the app from public/, pictures from DATA_DIR/uploads,
// and the JSON API under /api. No dependencies beyond Node itself (22.13+).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import * as auth from './auth.js';
import { routes, HttpError, pageMeta, UPLOAD_MAX, audit } from './api.js';
import { discordConfig, createDiscordHandlers } from './discord.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:", "font-src 'self'", "connect-src 'self'",
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'",
  ].join('; '),
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'That’s too big to send.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export function createServer({ dataDir = process.env.DATA_DIR || path.join(ROOT, 'data'), trustProxy = process.env.TRUST_PROXY === '1',
  secureCookies = process.env.COOKIE_SECURE, publicUrl = (process.env.PUBLIC_URL || '').replace(/\/+$/, ''), discord: discordOpts } = {}) {
  const db = openDb(dataDir);
  const discord = discordConfig(discordOpts);
  const uploadsDir = path.join(dataDir, 'uploads');
  const indexHtml = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');

  const ipOf = (req) => (trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '';
  const isHttps = (req) => secureCookies === '1' || (secureCookies !== '0' && (req.socket.encrypted || (trustProxy && req.headers['x-forwarded-proto'] === 'https')));

  function send(res, status, body, headers = {}) {
    res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
    res.end(body);
  }
  const json = (res, status, obj, headers = {}) =>
    send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });

  function serveFile(req, res, file, cache) {
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, 'Not found', { 'Content-Type': 'text/plain' });
      const etag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
      if (req.headers['if-none-match'] === etag) return send(res, 304, '', { ETag: etag });
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size, ETag: etag, 'Cache-Control': cache,
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  }

  function serveApp(req, res, pathname) {
    const m = pageMeta(db, pathname);
    const origin = publicUrl || `${isHttps(req) ? 'https' : 'http'}://${req.headers.host}`;
    const image = m.image && m.image.startsWith('/') ? origin + m.image : m.image;
    const meta = [
      `<title>${esc(m.title)}</title>`,
      `<meta name="description" content="${esc(m.description)}">`,
      `<meta property="og:title" content="${esc(m.title)}">`,
      `<meta property="og:description" content="${esc(m.description)}">`,
      `<meta property="og:type" content="website">`,
      image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : '',
    ].join('\n  ');
    send(res, 200, indexHtml.replace(/<title>.*?<\/title>/, meta), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  }

  async function handleApi(req, res, url) {
    const route = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!route) return json(res, 404, { error: 'Unknown API call.' });
    // Every change must come from our own pages: a custom header can't be
    // sent cross-site without a CORS preflight, which we never allow.
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'SimpleWiki') {
      return json(res, 403, { error: 'Missing request header.' });
    }
    const token = parseCookies(req.headers.cookie)[auth.COOKIE];
    const headers = {};
    const ctx = {
      db, dataDir, ip: ipOf(req), token, discord,
      user: auth.userFromToken(db, token),
      params: Object.fromEntries(route.keys.map((k, i) => [k, url.pathname.match(route.re)[i + 1]])),
      query: Object.fromEntries(url.searchParams),
      body: {},
      setSession: (t) => { headers['Set-Cookie'] = t ? auth.sessionCookie(t, isHttps(req)) : auth.clearCookie(isHttps(req)); },
    };
    try {
      if (req.method !== 'GET') {
        if (url.pathname === '/api/upload') ctx.rawBody = await readBody(req, UPLOAD_MAX);
        else {
          const raw = await readBody(req, 1024 * 1024);
          if (raw.length) {
            try { ctx.body = JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'Bad JSON.'); }
            if (!ctx.body || typeof ctx.body !== 'object') ctx.body = {};
          }
        }
      }
      const out = await route.handler(ctx);
      json(res, 200, out, headers);
    } catch (e) {
      if (e instanceof HttpError) return json(res, e.status, { error: e.message, ...e.extra }, headers);
      console.error(e);
      json(res, 500, { error: 'Something went wrong on the server.' }, headers);
    }
  }

  const discordAuth = createDiscordHandlers({ db, config: discord, publicUrl, isHttps, ipOf, parseCookies, audit });

  const server = http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url, 'http://x'); } catch { return send(res, 400, 'Bad request'); }
    let p;
    try { p = decodeURIComponent(url.pathname).replace(/\\/g, '/'); } catch { return send(res, 400, 'Bad request'); }
    if (p.startsWith('/api/')) return handleApi(req, res, url);
    if (p === '/auth/discord' || p === '/auth/discord/callback') {
      if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
      return (p === '/auth/discord' ? discordAuth.start(req, res, url) : discordAuth.callback(req, res, url))?.catch?.((e) => {
        console.error(e);
        if (!res.headersSent) send(res, 500, 'Something went wrong.');
      });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    if (p.startsWith('/uploads/')) {
      const name = p.slice('/uploads/'.length);
      if (!/^[a-f0-9]{24}\.(png|jpg|gif|webp)$/.test(name)) return send(res, 404, 'Not found');
      return serveFile(req, res, path.join(uploadsDir, name), 'public, max-age=31536000, immutable');
    }
    // Static files from public/ (anything with an extension); everything else is the app.
    if (/\.[a-z0-9]+$/i.test(p) && p !== '/index.html') {
      const file = path.normalize(path.join(PUBLIC, p));
      if (!file.startsWith(PUBLIC + path.sep)) return send(res, 404, 'Not found');
      return serveFile(req, res, file, 'no-cache');
    }
    serveApp(req, res, url.pathname);
  });
  server.db = db;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  const host = process.env.HOST || '0.0.0.0';
  createServer().listen(port, host, () => console.log(`SimpleWiki is running on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`));
}
