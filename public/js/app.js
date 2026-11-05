import { $, $$, esc, toast } from './util.js';
import * as api from './api.js';
import { icon } from './icons.js';
import { state, loadSession, isMod, isAdmin, canWrite, nsBySlug, templatesFor, applyTheme, themePref, setThemePref } from './state.js';
import { viewPortal } from './views/portal.js';
import { viewNamespace, viewList, viewWanted } from './views/namespace.js';
import { viewArticle, viewHistory, viewRevision } from './views/article.js';
import { viewEditor, confirmLeave } from './views/editor.js';
import { viewSearch, viewRecent } from './views/lists.js';
import { viewLogin, viewRegister, viewUser, viewAccount } from './views/people.js';
import { viewMod } from './views/mod.js';
import { viewAdmin } from './views/admin.js';
import { newArticleDialog } from './views/picker.js';

const view = $('#view');

// ------------------------------------------------------------ routing

const ROUTES = [
  [/^\/$/, () => viewPortal()],
  [/^\/login$/, () => viewLogin()],
  [/^\/register$/, () => viewRegister()],
  [/^\/search$/, (m, q) => viewSearch(q.get('q') || '', q.get('ns') || '')],
  [/^\/recent$/, (m, q) => viewRecent(q.get('ns') || '')],
  [/^\/u\/([^/]+)$/, (m) => viewUser(decodeURIComponent(m[1]))],
  [/^\/account$/, () => viewAccount()],
  [/^\/mod$/, () => viewMod()],
  [/^\/admin(?:\/(\w+))?$/, (m) => viewAdmin(m[1] || 'settings')],
  [/^\/rev\/(\d+)$/, (m, q) => viewRevision(Number(m[1]), q.get('diff'))],
  [/^\/w\/([a-z0-9-]+)\/?$/, (m) => viewNamespace(m[1])],
  [/^\/w\/([a-z0-9-]+)\/~all$/, (m, q) => viewList(m[1], '', q.get('sort'))],
  [/^\/w\/([a-z0-9-]+)\/~t\/([a-z0-9-]+)$/, (m, q) => viewList(m[1], m[2], q.get('sort'))],
  [/^\/w\/([a-z0-9-]+)\/~wanted$/, (m) => viewWanted(m[1])],
  [/^\/w\/([a-z0-9-]+)\/~new$/, (m, q) => viewEditor(m[1], null, { template: q.get('template'), title: q.get('title') })],
  [/^\/w\/([a-z0-9-]+)\/~random$/, async (m) => {
    const r = await api.get(`/api/ns/${m[1]}/random`);
    navigate(r.slug ? `/w/${m[1]}/${encodeURIComponent(r.slug)}` : `/w/${m[1]}`, true);
  }],
  [/^\/w\/([a-z0-9-]+)\/([^/~][^/]*)\/edit$/, (m) => viewEditor(m[1], decodeURIComponent(m[2]))],
  [/^\/w\/([a-z0-9-]+)\/([^/~][^/]*)\/history$/, (m) => viewHistory(m[1], decodeURIComponent(m[2]))],
  [/^\/w\/([a-z0-9-]+)\/([^/~][^/]*)$/, (m) => viewArticle(m[1], decodeURIComponent(m[2]))],
];

let rendering = 0;
let lastPath = null;

export async function route() {
  const ticket = ++rendering;
  const { pathname, search, hash } = location;
  const q = new URLSearchParams(search);
  const nsMatch = /^\/w\/([a-z0-9-]+)/.exec(pathname);
  enterNamespace(nsMatch ? nsMatch[1] : q.get('ns'));
  closeSidebar();

  if (!state.canRead && !/^\/(login|register)$/.test(pathname)) {
    return navigate('/login', true);
  }
  const hit = ROUTES.map(([re, fn]) => [pathname.match(re), fn]).find(([m]) => m);
  try {
    if (!hit) throw new api.ApiError(404, { error: 'There’s no page here.' });
    const samePage = pathname === lastPath;
    lastPath = pathname;
    await hit[1](hit[0], q);
    if (ticket !== rendering) return;
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    else if (!samePage) scrollTo(0, 0);
  } catch (e) {
    if (ticket !== rendering) return;
    showError(e);
  }
}

// Pages outside /w/… (diffs, filtered recent changes) can still belong to a namespace.
export function enterNamespace(slug) {
  state.ns = (slug && nsBySlug(slug)) || null;
  applyTheme();
  renderChrome();
}

export function showError(e) {
  if (e?.status === 401 && !state.user) {
    view.innerHTML = `<div class="page narrow empty-state">${icon('lock', 'big')}<h1>Members only</h1><p>${esc(e.message)}</p>
      <a class="btn primary" href="/login" data-link>Sign in</a></div>`;
    return;
  }
  console.error(e);
  view.innerHTML = `<div class="page narrow empty-state">${icon('warning', 'big')}<h1>${e?.status === 404 ? 'Not found' : 'Something went wrong'}</h1>
    <p>${esc(e?.message || String(e))}</p><a class="btn" href="/" data-link>Back to the start</a></div>`;
}

export function navigate(url, replace = false) {
  if (!confirmLeave()) return;
  if (replace) history.replaceState(null, '', url);
  else history.pushState(null, '', url);
  route();
}

addEventListener('popstate', () => route());

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  if (url.pathname === location.pathname && url.search === location.search && url.hash) {
    history.replaceState(null, '', url.hash);
    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  navigate(url.pathname + url.search + url.hash);
});

// ------------------------------------------------------------ chrome

function closeSidebar() { document.body.classList.remove('nav-open'); }

export function renderChrome() {
  const s = state.settings;
  $('#siteName').textContent = s.siteName || 'Wiki';
  $('#menuBtn').innerHTML = icon('list');
  const ns = state.ns;

  // Namespace switcher
  $('#nsSwitch').innerHTML = state.namespaces.length ? `
    <button class="ns-current" id="nsBtn" aria-haspopup="true">
      <span>${esc(ns ? ns.name : 'All namespaces')}</span>${icon('caret-down')}
    </button>
    <div class="menu" id="nsMenu" hidden>
      ${state.namespaces.map((n) => `<a href="/w/${n.slug}" data-link class="${n.slug === ns?.slug ? 'active' : ''}">
        <span class="swatch theme-${n.theme}"></span><span><b>${esc(n.name)}</b>${n.archived ? ' <i class="tag">archived</i>' : ''}${n.hidden ? ' <i class="tag">hidden</i>' : ''}
        <small>${esc(n.tagline)}</small></span></a>`).join('')}
    </div>` : '';
  $('#searchInput').placeholder = ns ? `Search ${ns.name}…  ( / )` : 'Search…  ( / )';

  // Account & actions
  const u = state.user;
  $('#topActions').innerHTML = `
    ${ns && canWrite() && !(ns.archived && !isMod()) ? `<button class="btn primary small" id="newBtn" title="New article (N)">${icon('plus')}<span>New</span></button>` : ''}
    ${u ? `
      <button class="user-btn" id="userBtn" aria-haspopup="true">${u.avatar ? `<img class="avatar" src="${esc(u.avatar)}" alt="">` : icon('user-circle')}<span>${esc(u.username)}</span>${u.role !== 'user' ? `<i class="role role-${u.role}">${u.role}</i>` : ''}</button>
      <div class="menu right" id="userMenu" hidden>
        <a href="/u/${encodeURIComponent(u.username)}" data-link>${icon('user')} Your profile</a>
        <a href="/account" data-link>${icon('gear')} Account</a>
        ${isMod() ? `<a href="/mod" data-link>${icon('gavel')} Moderation</a>` : ''}
        ${isAdmin() ? `<a href="/admin" data-link>${icon('crown')} Admin</a>` : ''}
        <hr>${themeMenu()}<hr>
        <button id="logoutBtn">${icon('sign-out')} Sign out</button>
      </div>`
    : `<button class="icon-btn" id="themeBtn" title="Theme" aria-haspopup="true">${icon('paint-brush')}</button>
       <div class="menu right" id="themeMenu" hidden>${themeMenu()}</div>
       <a class="btn small" href="/login?next=${encodeURIComponent(location.pathname + location.search)}" data-link>${icon('sign-in')}<span>Sign in</span></a>`}`;

  renderSidebar();
}

function themeMenu() {
  const pref = themePref();
  return `<div class="menu-label">Theme</div>
    <button data-theme-pick="auto" class="${pref === 'auto' ? 'active' : ''}">${icon(pref === 'auto' ? 'check' : 'paint-brush')} Match the namespace</button>
    ${Object.entries(state.themes).map(([k, label]) => `<button data-theme-pick="${k}" class="${pref === k ? 'active' : ''}">
      ${icon(pref === k ? 'check' : 'paint-brush')} ${esc(label)}</button>`).join('')}`;
}

function renderSidebar() {
  const ns = state.ns;
  const side = $('#sidebar');
  if (!state.canRead) { side.innerHTML = ''; return; }
  const nsLinks = ns ? `
    <div class="side-head"><span class="swatch theme-${ns.theme}"></span><b>${esc(ns.name)}</b></div>
    ${ns.archived ? `<div class="side-note">${icon('lock')} Archived: kept for reading.</div>` : ''}
    <nav class="side-nav">
      <a href="/w/${ns.slug}" data-link>${icon('house')} Main page</a>
      <a href="/w/${ns.slug}/~all" data-link>${icon('book-open')} All articles</a>
      <a href="/recent?ns=${ns.slug}" data-link>${icon('clock-counter-clockwise')} Recent changes</a>
      <a href="/w/${ns.slug}/~random" data-link>${icon('cards')} Random article</a>
      <a href="/w/${ns.slug}/~wanted" data-link>${icon('ghost')} Wanted articles</a>
    </nav>
    <div class="side-label">Browse</div>
    <nav class="side-nav">
      ${templatesFor(ns).map((t) => `<a href="/w/${ns.slug}/~t/${t.key}" data-link>${icon(t.icon)} ${esc(t.plural)}</a>`).join('')}
    </nav>` : `
    <nav class="side-nav">
      <a href="/" data-link>${icon('house')} Home</a>
      <a href="/recent" data-link>${icon('clock-counter-clockwise')} Recent changes</a>
    </nav>
    <div class="side-label">Namespaces</div>
    <nav class="side-nav">
      ${state.namespaces.map((n) => `<a href="/w/${n.slug}" data-link><span class="swatch theme-${n.theme}"></span> ${esc(n.name)}</a>`).join('')}
    </nav>`;
  side.innerHTML = `${nsLinks}
    ${isMod() ? `<div class="side-label">Tools</div><nav class="side-nav">
      <a href="/mod" data-link>${icon('gavel')} Moderation</a>
      ${isAdmin() ? `<a href="/admin" data-link>${icon('crown')} Admin</a>` : ''}</nav>` : ''}
    <div class="side-foot">${state.user ? '' : `<a href="/register" data-link>Create an account</a> to write.`}</div>`;
  for (const a of $$('.side-nav a', side)) {
    const href = a.getAttribute('href');
    if (href === location.pathname + location.search || (href === location.pathname && !location.search)) a.classList.add('active');
  }
}

function toggleMenu(menu, btn) {
  const open = menu.hidden;
  $$('.menu').forEach((m) => { m.hidden = true; });
  menu.hidden = !open;
  if (open) {
    const close = (e) => {
      if (menu.contains(e.target) && !e.target.closest('a,button')) return;
      if (btn.contains(e.target)) return;
      menu.hidden = true;
      document.removeEventListener('click', close, true);
    };
    setTimeout(() => document.addEventListener('click', close, true), 0);
  }
}

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.closest('#menuBtn')) document.body.classList.toggle('nav-open');
  else if (t.closest('#scrim')) closeSidebar();
  else if (t.closest('#nsBtn')) toggleMenu($('#nsMenu'), $('#nsBtn'));
  else if (t.closest('#userBtn')) toggleMenu($('#userMenu'), $('#userBtn'));
  else if (t.closest('#themeBtn')) toggleMenu($('#themeMenu'), $('#themeBtn'));
  else if (t.closest('#newBtn')) newArticleDialog(state.ns);
  else if (t.closest('[data-theme-pick]')) { setThemePref(t.closest('[data-theme-pick]').dataset.themePick); renderChrome(); }
  else if (t.closest('#logoutBtn')) {
    await api.post('/api/logout');
    await loadSession();
    toast('Signed out.');
    route();
  }
});

$('#searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (!q) return;
  navigate(`/search?q=${encodeURIComponent(q)}${state.ns ? `&ns=${state.ns.slug}` : ''}`);
  $('#searchInput').blur();
});

addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); $('#searchInput').focus(); }
  if (e.key === 'n' && $('#newBtn')) { e.preventDefault(); newArticleDialog(state.ns); }
  if (e.key === 'e' && $('[data-edit-link]')) { e.preventDefault(); $('[data-edit-link]').click(); }
});

// ------------------------------------------------------------ boot

async function boot() {
  try {
    await loadSession();
  } catch (e) {
    view.innerHTML = `<div class="page narrow empty-state"><h1>Can’t reach the wiki</h1><p>${esc(e.message)}</p></div>`;
    return;
  }
  document.title = state.settings.siteName;
  await route();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
