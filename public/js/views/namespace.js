import { esc, plain } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, templatesFor, template, canWrite, isMod } from '../state.js';
import { view, setTitle, changeList, articleCard, articleHref, when } from './common.js';

export async function viewNamespace(slug) {
  const info = await api.get(`/api/ns/${slug}`);
  const main = info.main;
  const ns = info.namespace;
  setTitle(ns.name);
  const tpls = templatesFor(ns);
  const mainHtml = main
    ? `<article class="prose main-page">${md(main.body, ns.slug, main.existing)}</article>
       ${main.canEdit ? `<p class="edit-main"><a href="/w/${ns.slug}/main-page/edit" data-link>${icon('pencil-simple')} Edit this introduction</a></p>` : ''}`
    : `${ns.tagline ? `<p class="hero-tagline">${esc(ns.tagline)}</p>` : ''}
       ${info.canCreate ? `<p class="muted">Tip: write an article called <b>Main page</b> and it appears here as this namespace’s introduction.
         <a href="/w/${ns.slug}/~new?template=page&title=Main%20page" data-link>Write it now</a>.</p>` : ''}`;
  view().innerHTML = `
    <div class="page wide">
      <section class="ns-hero">
        <div class="kicker">${esc(state.themes[ns.theme] || '')}${ns.archived ? ' · Archived' : ''}</div>
        <h1 class="hero-title">${esc(ns.name)}</h1>
        ${mainHtml}
      </section>
      <section>
        <div class="tiles">
          ${tpls.map((t) => `<a class="tile" href="/w/${ns.slug}/~t/${t.key}" data-link>
            ${icon(t.icon)}<b>${esc(t.plural)}</b><span class="count">${info.counts[t.key] || 0}</span></a>`).join('')}
        </div>
      </section>
      <div class="two-col">
        <section class="panel">
          <h2 class="section-title">${icon('star')} Newest articles</h2>
          ${info.newest.length ? `<div class="cards">${info.newest.map((a) => articleCard(a, ns.slug)).join('')}</div>`
            : `<p class="muted">Nothing here yet.${info.canCreate ? ' Be the first to write something.' : ''}</p>`}
        </section>
        <section class="panel">
          <h2 class="section-title">${icon('clock-counter-clockwise')} Recent changes</h2>
          ${changeList(info.recent, { showNs: false })}
          <p><a href="/recent?ns=${ns.slug}" data-link>All recent changes →</a></p>
        </section>
      </div>
    </div>`;
}

export async function viewList(slug, tplKey, sort) {
  const { namespace: ns, articles } = await api.get(`/api/ns/${slug}/list?${tplKey ? `template=${tplKey}&` : ''}${sort === 'updated' ? 'sort=updated' : ''}`);
  const t = tplKey ? template(tplKey) : null;
  setTitle(t ? t.plural : 'All articles', ns.name);
  const base = tplKey ? `/w/${ns.slug}/~t/${tplKey}` : `/w/${ns.slug}/~all`;
  // Show a couple of the template's infobox fields as columns.
  const cols = t ? (t.sections || []).flatMap((s) => s.fields).slice(0, 3) : [];
  view().innerHTML = `
    <div class="page wide">
      <header class="page-head">
        <div>
          <div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a></div>
          <h1>${t ? icon(t.icon) : ''} ${esc(t ? t.plural : 'All articles')} <span class="count">${articles.length}</span></h1>
          ${t?.hint ? `<p class="muted">${esc(t.hint)}</p>` : ''}
        </div>
        <div class="head-actions">
          <div class="seg">
            <a href="${base}" data-link class="${sort !== 'updated' ? 'on' : ''}">A–Z</a>
            <a href="${base}?sort=updated" data-link class="${sort === 'updated' ? 'on' : ''}">Recently edited</a>
          </div>
          ${canWrite() && (!ns.archived || isMod()) ? `<a class="btn primary" href="/w/${ns.slug}/~new?template=${tplKey || 'page'}" data-link>${icon('plus')} New ${esc(t ? t.label.toLowerCase() : 'article')}</a>` : ''}
        </div>
      </header>
      ${articles.length ? `<div class="list">${articles.map((a) => `
        <a class="list-row" href="${articleHref(ns.slug, a.slug)}" data-link>
          <span class="list-img">${a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy">` : icon(template(a.template).icon)}</span>
          <span class="list-main"><b>${esc(a.title)}</b>
            ${cols.length ? `<span class="list-fields">${cols.filter((c) => a.fields[c]).map((c) => `<span><i>${esc(c)}</i> ${esc(plain(a.fields[c], 60))}</span>`).join('')}</span>` : ''}
            <small>${esc(plain(a.teaser, 140))}</small></span>
          <span class="list-when">${when(a.updatedAt)}</span>
        </a>`).join('')}</div>`
        : `<div class="empty-state">${icon(t?.icon || 'file-text', 'big')}<p>No ${esc((t?.plural || 'articles').toLowerCase())} yet.</p></div>`}
    </div>`;
}

export async function viewWanted(slug) {
  const { namespace: ns, wanted } = await api.get(`/api/ns/${slug}/wanted`);
  setTitle('Wanted articles', ns.name);
  view().innerHTML = `
    <div class="page">
      <header class="page-head"><div>
        <div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a></div>
        <h1>${icon('ghost')} Wanted articles</h1>
        <p class="muted">Links to articles nobody has written yet, most-linked first.</p>
      </div></header>
      ${wanted.length ? `<ul class="wanted">${wanted.map((w) => `
        <li><a class="wikilink missing" href="/w/${ns.slug}/~new?title=${encodeURIComponent(w.title || w.slug)}" data-link>${esc(w.title || w.slug)}</a>
        <span class="muted">${w.n} link${w.n === 1 ? '' : 's'}</span></li>`).join('')}</ul>`
        : '<p class="muted">Every link points to a real article. Nice.</p>'}
    </div>`;
}
