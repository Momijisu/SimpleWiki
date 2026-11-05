// Calls to the server's JSON API.
export class ApiError extends Error {
  constructor(status, data) { super(data?.error || `Request failed (${status})`); this.status = status; this.data = data || {}; }
}

async function call(method, url, body, raw) {
  const opts = { method, headers: { 'X-Requested-With': 'SimpleWiki' }, credentials: 'same-origin' };
  if (raw) { opts.body = raw; opts.headers['Content-Type'] = raw.type || 'application/octet-stream'; }
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  let res;
  try { res = await fetch(url, opts); } catch { throw new ApiError(0, { error: 'Can’t reach the server. Check your connection.' }); }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const get = (url) => call('GET', url);
export const post = (url, body = {}) => call('POST', url, body);
export const put = (url, body = {}) => call('PUT', url, body);
export const del = (url) => call('DELETE', url);
export const upload = (file) => call('POST', '/api/upload', undefined, file);

const e = encodeURIComponent;
export const articleUrl = (ns, slug) => `/api/ns/${e(ns)}/article/${e(slug)}`;
