import { esc, plain } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, templatesFor, template, canWrite, isMod } from '../state.js';
import { view, setTitle, changeList, articleHref, when } from './common.js';
import { frontHero, cardsFromHtml, card, stat } from './frontpage.js';

export async function viewNamespace(slug) {
  const info = await api.get(`/api/ns/${slug}`);
  const ns = info.namespace;
  setTitle(ns.name);
  const main = info.main;
  const cards = main ? cardsFromHtml(md(main.body, ns.slug, main.existing)) : [];
  const intro = cards.shift();
  const f = info.featured;
  const featured = f ? `<a class="fcard fcard-featured" href="${articleHref(ns.slug, f.slug)}" data-link>
      ${f.image ? `<img src="${esc(f.image)}" alt="">` : `<span class="fcard-featured-icon">${icon(template(f.template).icon)}</span>`}
      <span class="fcard-featured-text"><small>Featured</small><b>${esc(f.title)}</b></span></a>` : '';
  const startEditing = card(`<a href="${info.canCreate ? `/w/${ns.slug}/~new` : '/login'}" data-link>Start editing ${icon('caret-right')}</a>`, `
      <p>${esc(state.settings.siteName)} is written by people like you.${info.canCreate ? ' Pick a template and start writing.' : ' Sign in with Discord to start.'}</p>
      <div class="stats">${stat(info.stats.articles, 'Articles')}${stat(info.stats.edits, 'Edits')}${stat(info.stats.editors, 'Writers')}</div>`, 'fcard-accent');
  const recent = card('Recent changes', `${changeList(info.recent.slice(0, 6), { showNs: false })}
      <p class="fcard-more"><a href="/recent?ns=${ns.slug}" data-link>All recent changes ${icon('arrow-right')}</a></p>`);
  const newest = info.newest.length ? card('New articles', `<ul class="link-list">${info.newest.map((x) =>
      `<li><a href="${articleHref(ns.slug, x.slug)}" data-link>${icon(template(x.template).icon)} ${esc(x.title)}</a></li>`).join('')}</ul>`) : '';
  view().innerHTML = `
    <div class="page front">
      ${frontHero({
        title: `Welcome to ${ns.name}`,
        searchLabel: ns.name,
        directories: templatesFor(ns).filter((t) => t.key !== 'page').map((t) => ({ href: `/w/${ns.slug}/~t/${t.key}`, label: t.plural, icon: t.icon, sub: `${info.counts[t.key] || 0}` })),
      })}
      ${ns.archived ? `<div class="banner">${icon('lock')} ${esc(ns.name)} is archived: it’s kept for reading, and only moderators can change it.</div>` : ''}
      ${intro ? card(intro.title, `<div class="prose">${intro.html}</div>`, 'fcard-intro')
        : card(ns.tagline ? esc(ns.tagline) : '', info.canCreate
          ? `<p class="muted">Write an article called <b>Main page</b> and it appears here. Its first part becomes this introduction, and each <code>## Heading</code> becomes a card below: rules, links, the latest update…</p>
             <p><a class="btn primary" href="/w/${ns.slug}/~new?template=page&title=Main%20page" data-link>${icon('pencil-simple')} Write the main page</a></p>`
          : '', 'fcard-intro')}
      <div class="front-grid">
        ${featured}
        ${startEditing}
        ${cards.map((c) => card(c.title, `<div class="prose">${c.html}</div>`)).join('')}
        ${recent}
        ${newest}
      </div>
      ${main?.canEdit ? `<p class="front-edit"><a href="/w/${ns.slug}/main-page/edit" data-link>[edit this page]</a> <a href="/w/${ns.slug}/main-page/history" data-link>[history]</a></p>` : ''}
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
