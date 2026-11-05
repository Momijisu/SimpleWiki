import { $, $$, esc, toast } from './util.js';
import * as api from './api.js';
import { icon } from './icons.js';
import { state, loadSession, isMod, isAdmin, canWrite, nsBySlug, templatesFor, applyTheme, themePref, setThemePref, md } from './state.js';
import { cardsFromHtml } from './views/frontpage.js';
import { slugify } from './shared.js';
import { viewPortal } from './views/portal.js';
import { viewNamespace, viewList, viewWanted } from './views/namespace.js';
import { viewArticle, viewHistory, viewRevision } from './views/article.js';
import { viewEditor, confirmLeave } from './views/editor.js';
import { viewSearch, viewRecent } from './views/lists.js';
import { viewLogin, viewUser, viewAccount } from './views/people.js';
import { viewMod } from './views/mod.js';
import { viewAdmin } from './views/admin.js';
import { newArticleDialog } from './views/picker.js';
import { openSearch, setNavigate } from './search.js';

const view = $('#view');

// ------------------------------------------------------------ routing

const ROUTES = [
  [/^\/$/, () => viewPortal()],
  [/^\/login$/, () => viewLogin()],
  [/^\/register$/, () => navigate('/login', true)],
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
    setupStickyHeader();
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
    else if (!samePage) scrollTo(0, 0);
  } catch (e) {
    if (ticket !== rendering) return;
    showError(e);
    setupStickyHeader();
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
setNavigate((url) => navigate(url));

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

const railIcons = { searchBtn: 'magnifying-glass', drawerBtn: 'list', newBtn: 'plus', prefsBtn: 'sliders-horizontal' };

export function renderChrome() {
  const s = state.settings;
  const u = state.user;
  for (const [id, name] of Object.entries(railIcons)) $(`#${id}`).innerHTML = icon(id === 'drawerBtn' && !$('#drawer').hidden ? 'x' : name);
  $('.rail-logo').innerHTML = s.logo ? `<img class="logo-img" src="${esc(s.logo)}" alt="">` : '<span class="brand-mark"></span>';
  $('.rail-logo').title = s.siteName;
  $('#newBtn').hidden = !(canWrite() && state.namespaces.some((n) => !n.archived || isMod()));
  $('#newBtn').title = 'New article (N)';
  $('#searchBtn').title = 'Search ( / )';

  $('#railUser').innerHTML = u
    ? `<button id="userBtn" aria-haspopup="true" title="${esc(u.username)}">${u.avatar ? `<img class="avatar" src="${esc(u.avatar)}" alt="">` : icon('user-circle')}</button>`
    : `<a href="/login?next=${encodeURIComponent(location.pathname + location.search)}" data-link title="Sign in with Discord">${icon('sign-in')}</a>`;
  $('#userMenu').innerHTML = u ? `
    <div class="menu-user">${u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : icon('user-circle', 'big')}
      <span><b>${esc(u.username)}</b><small>${esc(u.role)}${u.status !== 'active' ? ` · ${esc(u.status)}` : ''}</small></span></div><hr>
    <a href="/u/${encodeURIComponent(u.username)}" data-link>${icon('user')} Your profile</a>
    <a href="/account" data-link>${icon('gear')} Account</a>
    ${isMod() ? `<a href="/mod" data-link>${icon('gavel')} Moderation</a>` : ''}
    ${isAdmin() ? `<a href="/admin" data-link>${icon('crown')} Admin</a>` : ''}
    <hr><button id="logoutBtn">${icon('sign-out')} Sign out</button>` : '';
  $('#prefsMenu').innerHTML = themeMenu();
  renderDrawer();
  renderFooter();
}

function themeMenu() {
  const pref = themePref();
  return `<div class="menu-label">Theme</div>
    <button data-theme-pick="auto" class="${pref === 'auto' ? 'active' : ''}">${icon(pref === 'auto' ? 'check' : 'paint-brush')} Match the namespace</button>
    ${Object.entries(state.themes).map(([k, label]) => `<button data-theme-pick="${k}" class="${pref === k ? 'active' : ''}">
      ${pref === k ? icon('check') : `<span class="swatch theme-${k}"></span>`} ${esc(label)}</button>`).join('')}`;
}

// The menu: a panel beside the rail, as tall as its contents. A header with
// the logo and some numbers, then columns of links, then a bar of social links.
let drawerStats = null;
function renderDrawer() {
  const ns = state.ns;
  const d = $('#drawer');
  if (!state.canRead) { d.innerHTML = ''; return; }
  const s = state.settings;
  const col = (title, links) => links.length ? `<div class="drawer-col"><div class="drawer-section">${esc(title)}</div><nav class="drawer-nav">${links.join('')}</nav></div>` : '';
  const link = (href, ic, label) => `<a href="${href}" data-link>${ic ? icon(ic) : ''}<span>${esc(label)}</span></a>`;
  const nav = ns ? [
    link(`/w/${ns.slug}`, 'house', 'Main page'),
    link(`/w/${ns.slug}/~all`, 'book-open', 'All articles'),
    link(`/recent?ns=${ns.slug}`, 'clock-counter-clockwise', 'Recent changes'),
    link(`/w/${ns.slug}/~random`, 'cards', 'Random article'),
    link(`/w/${ns.slug}/~wanted`, 'ghost', 'Wanted articles'),
  ] : [link('/', 'house', 'Home'), link('/recent', 'clock-counter-clockwise', 'Recent changes')];
  if (canWrite() && state.namespaces.length) nav.push(`<button type="button" data-new-article>${icon('plus')}<span>New article</span></button>`);
  const wikis = state.namespaces.length > 1 ? state.namespaces.map((n) => `<a href="/w/${n.slug}" data-link class="${n.slug === ns?.slug ? 'current' : ''}">
      <span class="swatch theme-${n.theme}"></span><span>${esc(n.name)}${n.archived ? ' <i class="tag">archived</i>' : ''}${n.hidden ? ' <i class="tag">hidden</i>' : ''}</span></a>`) : [];
  const browse = ns ? templatesFor(ns).map((t) => link(`/w/${ns.slug}/~t/${t.key}`, '', t.plural)) : [];
  const tools = isMod() ? [link('/mod', 'gavel', 'Moderation'), ...(isAdmin() ? [link('/admin', 'crown', 'Admin')] : [])] : [];
  // Admin-made columns: each "## Heading" in Admin -> Site -> menu.
  const extra = s.menu ? cardsFromHtml(md(s.menu, ns?.slug || state.namespaces[0]?.slug || '', null)).filter((c) => c.title)
    .map((c) => {
      const box = document.createElement('div');
      box.innerHTML = c.html;
      // Wiki links in the menu go straight to the article (the menu doesn't check which exist).
      for (const el of box.querySelectorAll('a.wikilink.missing')) {
        const u = new URL(el.href, location.href);
        const title = u.searchParams.get('title');
        if (title) el.setAttribute('href', u.pathname.replace(/\/~new$/, `/${encodeURIComponent(slugify(title))}`));
        el.classList.remove('missing');
        el.removeAttribute('title');
      }
      const links = [...box.querySelectorAll('a')].map((el) => el.outerHTML);
      const head = document.createElement('div');
      head.innerHTML = c.title;
      return col(head.textContent, links);
    }) : [];
  const socials = socialLinks();
  const st = drawerStats;
  d.innerHTML = `
    <div class="drawer-head">
      <span class="drawer-logo">${s.logo ? `<img src="${esc(s.logo)}" alt="">` : '<span class="brand-mark"></span>'}</span>
      <div>
        <div class="drawer-stats">${st ? `<span title="Articles">${icon('article')} ${compact(st.articles)}</span><span title="Writers">${icon('user')} ${compact(st.editors)}</span><span title="Edits">${icon('pencil-simple')} ${compact(st.edits)}</span>` : '&nbsp;'}</div>
        <div class="drawer-title">${esc(s.siteName)}</div>
      </div>
    </div>
    <div class="drawer-cols">
      ${col('Navigation', nav)}
      ${col('Wikis', wikis)}
      ${ns ? col(`Browse ${ns.name}`, browse) : ''}
      ${extra.join('')}
      ${col('Tools', tools)}
    </div>
    <div class="drawer-bar">
      ${state.user ? `<a href="/u/${encodeURIComponent(state.user.username)}" data-link>Signed in as ${esc(state.user.username)}</a>`
        : `<a href="/login?next=${encodeURIComponent(location.pathname)}" data-link>Sign in with Discord to write</a>`}
      ${socials.length ? `<span class="drawer-bar-sep"></span><span class="drawer-bar-label">Follow us</span>${socials.map(([label, url, ic]) =>
        `<a class="icon-btn" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(label)}" aria-label="${esc(label)}">${icon(ic)}</a>`).join('')}` : ''}
    </div>`;
  for (const el of $$('.drawer-nav a[data-link]', d)) {
    const href = el.getAttribute('href');
    if (href === location.pathname + location.search || (href === location.pathname && !location.search)) el.classList.add('active');
  }
}
const compact = (n) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

async function openDrawer() {
  renderDrawer();
  if (!drawerStats && state.canRead) {
    try { drawerStats = await api.get('/api/stats'); renderDrawer(); } catch { /* the numbers are optional */ }
  }
}

// Social links in the footer get an icon by their address.
const SOCIAL = [[/discord\.(gg|com)/, 'discord-logo'], [/(twitter|x)\.com/, 'x-logo'], [/youtu\.?be/, 'youtube-logo'], [/tiktok\.com/, 'tiktok-logo'],
  [/twitch\.tv/, 'twitch-logo'], [/instagram\.com/, 'instagram-logo'], [/reddit\.com/, 'reddit-logo'], [/facebook\.com/, 'facebook-logo']];

function socialLinks() {
  return String(state.settings.socialLinks || '').split('\n').map((l) => l.split('|').map((x) => x.trim()))
    .filter(([, url]) => /^https:\/\//.test(url || ''))
    .map(([label, url]) => [label, url, SOCIAL.find(([re]) => re.test(url))?.[1] || 'globe']);
}

function renderFooter() {
  const s = state.settings;
  const links = socialLinks();
  $('#siteFooter').innerHTML = `
    <div class="footer-inner">
      <div class="footer-about">
        <div class="footer-name">${esc(s.siteName)}</div>
        ${s.footer ? `<p>${esc(s.footer)}</p>` : ''}
        ${links.length ? `<div class="footer-label">Follow us</div><div class="footer-social">${links.map(([label, url, ic]) =>
          `<a href="${esc(url)}" target="_blank" rel="noopener" title="${esc(label)}" aria-label="${esc(label)}">${icon(ic)}</a>`).join('')}</div>` : ''}
      </div>
      <nav class="footer-links">
        <a href="/" data-link>Home</a>
        <a href="/recent" data-link>Recent changes</a>
        ${state.namespaces.map((n) => `<a href="/w/${n.slug}" data-link>${esc(n.name)}</a>`).join('')}
      </nav>
      <div class="footer-powered">Powered by SimpleWiki</div>
    </div>`;
}

// ---- open/close: drawer and the rail's menus

function closeAll() {
  if (!$('#drawer').hidden) $('#drawerBtn').innerHTML = icon('list');
  $('#drawer').hidden = true;
  $('#prefsMenu').hidden = true;
  $('#userMenu').hidden = true;
  $('#drawerBtn').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('drawer-open', 'menu-open');
}
function toggle(el, cls, btn) {
  const open = el.hidden;
  closeAll();
  if (!open) return;
  el.hidden = false;
  document.body.classList.add(cls);
  btn?.setAttribute('aria-expanded', 'true');
}
function closeSidebar() { closeAll(); }

document.addEventListener('click', async (e) => {
  const t = e.target;
  if (t.closest('#drawerBtn')) {
    const opening = $('#drawer').hidden;
    toggle($('#drawer'), 'drawer-open', $('#drawerBtn'));
    if (opening) { $('#drawerBtn').innerHTML = icon('x'); openDrawer(); }
  } else if (t.closest('[data-new-article]')) { closeAll(); newArticleDialog(state.ns); }
  else if (t.closest('#prefsBtn')) toggle($('#prefsMenu'), 'menu-open');
  else if (t.closest('#userBtn')) toggle($('#userMenu'), 'menu-open');
  else if (t.closest('#scrim')) closeAll();
  else if (t.closest('#searchBtn, [data-open-search]')) { closeAll(); openSearch(); }
  else if (t.closest('#newBtn')) { closeAll(); newArticleDialog(state.ns); }
  else if (t.closest('[data-theme-pick]')) { setThemePref(t.closest('[data-theme-pick]').dataset.themePick); renderChrome(); }
  else if (t.closest('#logoutBtn')) {
    closeAll();
    await api.post('/api/logout');
    await loadSession();
    toast('Signed out.');
    route();
  } else if (t.closest('#drawer a, .rail-menu a')) closeAll();
  else if (t.closest('[data-top]')) scrollTo({ top: 0, behavior: 'smooth' });
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll();
  if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); openSearch(); }
  if (e.key === 'n' && !$('#newBtn').hidden) { e.preventDefault(); newArticleDialog(state.ns); }
  if (e.key === 'e' && $('[data-edit-link]')) { e.preventDefault(); $('[data-edit-link]').click(); }
});

// ---- the sticky header: the page's title once it has scrolled away

let titleObserver = null;
function setupStickyHeader() {
  const bar = $('#stickyHeader');
  titleObserver?.disconnect();
  bar.classList.remove('show');
  const title = $('#view .page-title, #view .page-head h1, #view .hero-title');
  if (!title || $('#view .page-head.sticky')) { bar.innerHTML = ''; return; }
  const edit = $('#view [data-edit-link]');
  const hist = $('#view [data-history-link]');
  bar.innerHTML = `<span class="sticky-title">${esc(title.textContent.trim())}</span>
    ${hist ? `<a class="icon-btn" href="${esc(hist.getAttribute('href'))}" data-link title="History">${icon('clock-counter-clockwise')}</a>` : ''}
    ${edit ? `<a class="icon-btn" href="${esc(edit.getAttribute('href'))}" data-link title="Edit">${icon('pencil-simple')}</a>` : ''}
    <button class="icon-btn" data-top title="Back to top">${icon('arrow-up')}</button>`;
  titleObserver = new IntersectionObserver(([en]) => {
    const show = !en.isIntersecting && en.boundingClientRect.top < 0;
    bar.classList.toggle('show', show);
    bar.setAttribute('aria-hidden', String(!show));
    $('#view .back-top')?.classList.toggle('show', show);
  });
  titleObserver.observe(title);
}

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
