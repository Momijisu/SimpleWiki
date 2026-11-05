import { $, esc } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { nsBySlug, template, canWrite } from '../state.js';
import { view, setTitle, changeList, articleHref } from './common.js';
import { slugify } from '../shared.js';
import { navigate } from '../app.js';

export async function viewSearch(q, nsSlug) {
  setTitle(`Search: ${q}`);
  const ns = nsBySlug(nsSlug);
  const { results } = await api.get(`/api/search?q=${encodeURIComponent(q)}${ns ? `&ns=${ns.slug}` : ''}`);
  const exact = ns && results.some((r) => r.ns === ns.slug && r.slug === slugify(q));
  const snip = (s) => esc(s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/^#+\s*|[*_`>|]+/gm, '').replace(/\s*\n+\s*/g, ' · '))
    .replace(/\u0001/g, '<mark>').replace(/\u0002/g, '</mark>');
  view().innerHTML = `
    <div class="page">
      <header class="page-head"><div>
        <h1>${icon('magnifying-glass')} Search</h1>
        <p class="muted">${results.length} result${results.length === 1 ? '' : 's'} for “${esc(q)}”${ns ? ` in ${esc(ns.name)} · <a href="/search?q=${encodeURIComponent(q)}" data-link>search everywhere</a>` : ''}</p>
      </div></header>
      <form class="search-again" id="searchAgain"><input type="search" name="q" value="${esc(q)}" aria-label="Search again"><button class="btn primary">${icon('magnifying-glass')} Search</button></form>
      ${ns && !exact && canWrite() && !ns.archived ? `<p class="banner">${icon('plus')} No article is called “${esc(q)}”. <a href="/w/${ns.slug}/~new?title=${encodeURIComponent(q)}" data-link>Write it</a></p>` : ''}
      <ul class="results">${results.map((r) => `
        <li><a href="${articleHref(r.ns, r.slug)}" data-link class="result">
          <span class="list-img">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy">` : icon(template(r.template).icon)}</span>
          <span><b>${esc(r.title)}</b> <span class="ns-chip">${esc(r.nsName)}</span> <small class="muted">${esc(template(r.template).label)}</small>
          <span class="snippet">${snip(r.snippet)}</span></span></a></li>`).join('')}</ul>
    </div>`;
  $('#searchAgain').addEventListener('submit', (e) => {
    e.preventDefault();
    const nq = e.target.q.value.trim();
    if (nq) navigate(`/search?q=${encodeURIComponent(nq)}${ns ? `&ns=${ns.slug}` : ''}`);
  });
}

export async function viewRecent(nsSlug) {
  const ns = nsBySlug(nsSlug);
  setTitle('Recent changes', ns?.name);
  const url = `/api/recent?limit=100${ns ? `&ns=${ns.slug}` : ''}`;
  const { changes } = await api.get(url);
  view().innerHTML = `
    <div class="page wide">
      <header class="page-head"><div>
        ${ns ? `<div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a></div>` : ''}
        <h1>${icon('clock-counter-clockwise')} Recent changes</h1>
        <p class="muted">${ns ? `Edits in ${esc(ns.name)}. <a href="/recent" data-link>All namespaces</a>` : 'Edits across the whole wiki.'}</p>
      </div></header>
      <div id="changes">${changeList(changes, { showNs: !ns })}</div>
      ${changes.length === 100 ? '<p><button class="btn" id="moreBtn">Older changes</button></p>' : ''}
    </div>`;
  let last = changes.at(-1)?.id;
  $('#moreBtn')?.addEventListener('click', async (e) => {
    const { changes: more } = await api.get(`${url}&before=${last}`);
    $('#changes').insertAdjacentHTML('beforeend', changeList(more, { showNs: !ns }));
    last = more.at(-1)?.id;
    if (more.length < 100) e.target.remove();
  });
}
