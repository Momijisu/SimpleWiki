// The search popup: opens with "/" or the search button, shows matching
// titles as you type, then full-text matches. Enter opens the highlighted
// result, or the full search page.
import { $, $$, esc, debounce } from './util.js';
import * as api from './api.js';
import { icon } from './icons.js';
import { state, template, nsBySlug } from './state.js';

let navigate = () => {};
export function setNavigate(fn) { navigate = fn; }

export function openSearch(initial = '') {
  if ($('.palette-wrap')) return $('.palette-wrap input').focus();
  const ns = state.ns;
  const root = $('#search-root');
  root.innerHTML = `
    <div class="palette-wrap">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Search">
        <div class="palette-input">${icon('magnifying-glass')}
          <input type="search" placeholder="${esc(ns ? `Search ${ns.name}` : `Search ${state.settings.siteName}`)}" autocomplete="off" aria-label="Search" value="${esc(initial)}">
          ${ns && state.namespaces.length > 1 ? `<label class="palette-scope check small"><input type="checkbox" id="scopeAll"> Everywhere</label>` : ''}
        </div>
        <div class="palette-results" role="listbox"></div>
        <div class="palette-foot"><span><kbd>↵</kbd> open</span><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>esc</kbd> close</span></div>
      </div>
    </div>`;
  const wrap = $('.palette-wrap', root);
  const input = $('.palette-input input[type=search]', root);
  const list = $('.palette-results', root);
  let items = [];
  let active = -1;
  let seq = 0;

  const close = () => { root.innerHTML = ''; removeEventListener('keydown', onKey, true); };
  const everywhere = () => !ns || $('#scopeAll', root)?.checked;
  const go = (url) => { close(); navigate(url); };
  const searchPage = () => {
    const q = input.value.trim();
    if (q) go(`/search?q=${encodeURIComponent(q)}${everywhere() ? '' : `&ns=${ns.slug}`}`);
  };

  const row = (r, i) => `<a class="palette-item ${i === active ? 'on' : ''}" href="/w/${r.ns}/${encodeURIComponent(r.slug)}" data-i="${i}" role="option">
      <span class="list-img">${r.image ? `<img src="${esc(r.image)}" alt="">` : icon(template(r.template).icon)}</span>
      <span><b>${esc(r.title)}</b><small>${esc(template(r.template).label)}${r.ns !== ns?.slug ? ` · ${esc(nsBySlug(r.ns)?.name || r.ns)}` : ''}${r.snippet ? ` · ${r.snippet}` : ''}</small></span>
    </a>`;

  function draw(groups) {
    items = groups.flatMap((g) => g.rows);
    if (!input.value.trim()) {
      list.innerHTML = `<div class="palette-empty">Type to search ${esc(ns ? ns.name : 'the wiki')}.</div>`;
      return;
    }
    let i = 0;
    list.innerHTML = groups.filter((g) => g.rows.length).map((g) => `<div class="palette-group">${esc(g.label)}</div>${g.rows.map((r) => row(r, i++)).join('')}`).join('')
      + `<a class="palette-item ${active === items.length ? 'on' : ''}" href="#" data-all>${icon('magnifying-glass')}<span><b>Search for “${esc(input.value.trim())}”</b><small>See every result</small></span></a>`;
  }

  const run = debounce(async () => {
    const q = input.value.trim();
    const mine = ++seq;
    if (!q) { draw([]); return; }
    const snip = (s) => esc(s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/^#+\s*|[*_`>|]+/gm, '').replace(/\s*\n+\s*/g, ' '))
      .replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
    const [titles, full] = await Promise.all([
      ns && !everywhere() ? api.get(`/api/titles?ns=${ns.slug}&q=${encodeURIComponent(q)}`).then((r) => r.titles.map((t) => ({ ...t, ns: ns.slug }))).catch(() => []) : [],
      api.get(`/api/search?q=${encodeURIComponent(q)}${everywhere() ? '' : `&ns=${ns.slug}`}`).then((r) => r.results).catch(() => []),
    ]);
    if (mine !== seq) return;
    const seen = new Set(titles.map((t) => `${t.ns}/${t.slug}`));
    const rest = full.filter((r) => !seen.has(`${r.ns}/${r.slug}`)).slice(0, 8).map((r) => ({ ...r, snippet: snip(r.snippet || '') }));
    active = titles.length || rest.length ? 0 : -1;
    draw([{ label: 'Articles', rows: titles }, { label: titles.length ? 'Also mentioned in' : 'Articles', rows: rest }]);
  }, 120);

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = items.length + 1;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      $$('.palette-item', list).forEach((el, i) => el.classList.toggle('on', i === active));
      $$('.palette-item', list)[active]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && e.target === input) {
      e.preventDefault();
      const r = items[active];
      if (r) go(`/w/${r.ns}/${encodeURIComponent(r.slug)}`);
      else searchPage();
    }
  }
  addEventListener('keydown', onKey, true);
  input.addEventListener('input', () => run());
  $('#scopeAll', root)?.addEventListener('change', () => { run(); input.focus(); });
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('.palette-item');
    if (!a) return;
    e.preventDefault();
    if (a.hasAttribute('data-all')) searchPage();
    else go(a.getAttribute('href'));
  });
  draw([]);
  if (initial) run();
  input.focus();
}
