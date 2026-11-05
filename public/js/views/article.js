import { $, $$, esc, dialog, toast, confirmDialog, fullDate, timeAgo } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, mdInline, template, isMod, isAdmin, canWrite } from '../state.js';
import { view, setTitle, userLink, when, articleHref } from './common.js';
import { navigate, route, enterNamespace } from '../app.js';
import { diffHtml, revisionText } from '../diff.js';

// The infobox card: picture, kind and title, then each template section's
// filled-in fields (foldable), then any extra fields.
export function infoboxHtml(a, ns, existing) {
  const t = template(a.template);
  const fields = { ...a.fields };
  const sections = [];
  for (const s of t.sections || []) {
    const rows = s.fields.filter((f) => fields[f]).map((f) => {
      const row = [f, fields[f]];
      delete fields[f];
      return row;
    });
    if (rows.length) sections.push([s.name, rows]);
  }
  const extra = Object.entries(fields);
  if (extra.length) sections.push([sections.length ? 'More' : '', extra]);
  if (!sections.length && !a.image) return '';
  const dl = (rows) => `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${mdInline(v, ns, existing)}</dd>`).join('')}</dl>`;
  // The first section shows straight under the title, like a summary.
  const [first, ...rest] = sections;
  return `<aside class="infobox">
    ${a.image ? `<div class="infobox-img"><img src="${esc(a.image)}" alt=""></div>` : ''}
    <div class="infobox-head">
      <div class="infobox-kind">${icon(t.icon)} ${esc(t.label)}</div>
      <div class="infobox-title">${esc(a.title)}</div>
    </div>
    ${first ? dl(first[1]) : ''}
    ${rest.map(([name, rows]) => `<details class="infobox-section" open>
      <summary>${esc(name || 'Details')}${icon('caret-up')}</summary>${dl(rows)}</details>`).join('')}
  </aside>`;
}

// Wrap each "## Section" and what follows it, so sections can fold.
function sectionize(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  const out = document.createElement('div');
  let body = out;
  for (const node of [...box.childNodes]) {
    if (node.nodeName === 'H2') {
      const sec = document.createElement('section');
      sec.className = 'section';
      const head = document.createElement('h2');
      head.className = 'section-heading';
      head.id = node.id;
      head.innerHTML = `<span>${node.innerHTML}</span><button class="icon-btn sec-toggle" type="button" aria-label="Fold this section" aria-expanded="true">${icon('caret-up')}</button>`;
      body = document.createElement('div');
      body.className = 'section-body';
      sec.append(head, body);
      out.append(sec);
    } else body.append(node);
  }
  return out.innerHTML;
}

function tocList(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  const hs = [...box.querySelectorAll('h2, h3')];
  if (!hs.length) return '';
  return `<div class="aside-block"><p class="aside-label">On this page</p><ul class="toc">${hs.map((h) =>
    `<li class="toc-${h.tagName.toLowerCase()}"><a href="#${h.id}" data-link data-toc="${h.id}">${esc(h.textContent)}</a></li>`).join('')}</ul></div>`;
}

// Highlight the section being read in "On this page".
let spy = null;
function scrollSpy() {
  spy?.disconnect();
  const links = $$('[data-toc]');
  if (!links.length) return;
  const heads = links.map((l) => document.getElementById(l.dataset.toc)).filter(Boolean);
  const visible = new Set();
  spy = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
    // The active one: the last heading above the middle of the screen.
    let current = heads[0]?.id;
    for (const h of heads) if (h.getBoundingClientRect().top < innerHeight * 0.4) current = h.id;
    links.forEach((l) => l.classList.toggle('active', l.dataset.toc === current));
  }, { rootMargin: '0px 0px -55% 0px' });
  heads.forEach((h) => spy.observe(h));
}

export async function viewArticle(nsSlug, slug) {
  let data;
  try {
    data = await api.get(api.articleUrl(nsSlug, slug));
  } catch (e) {
    if (e.status === 404 && !e.data.deleted) return missingArticle(nsSlug, slug, e.data.canCreate);
    throw e;
  }
  if (data.redirect) return navigate(articleHref(nsSlug, data.redirect) + location.hash, true);
  const { article: a, namespace: ns, canEdit, existing, backlinks } = data;
  setTitle(a.title, ns.name);
  const raw = md(a.body, ns.slug, existing);
  const body = sectionize(raw);
  const base = articleHref(ns.slug, a.slug);
  const t = template(a.template);
  const notes = [];
  if (a.deleted) notes.push(`<div class="banner danger">${icon('trash')} This article is deleted. Only moderators can see it.
    <button class="btn small" id="restoreBtn">${icon('arrow-counter-clockwise')} Restore</button></div>`);
  if (data.openReports) notes.push(`<div class="banner warn">${icon('flag')} ${data.openReports} open report${data.openReports === 1 ? '' : 's'} on this article. <a href="/mod" data-link>Review</a></div>`);
  if (a.protection !== 'none') notes.push(`<div class="banner">${icon('lock')} Protected: only ${esc(state.protection[a.protection]?.toLowerCase())} can edit this article.</div>`);
  if (ns.archived) notes.push(`<div class="banner">${icon('lock')} ${esc(ns.name)} is archived and kept for reading.</div>`);

  view().innerHTML = `
    <div class="page article">
      <header class="page-header">
        <div class="page-heading">
          <h1 class="page-title">${esc(a.title)}</h1>
          <p class="page-sub">${esc(t.label)} in <a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a></p>
        </div>
        <div class="page-actions">
          <button class="icon-btn" data-act="copy" title="Copy link">${icon('share-fat')}</button>
          <a class="btn" href="${base}/history" data-link data-history-link>${icon('clock-counter-clockwise')}<span>History</span></a>
          ${canEdit ? `<a class="btn primary" href="${base}/edit" data-link data-edit-link>${icon('pencil-simple')}<span>Edit this page</span></a>` : ''}
          <button class="icon-btn" id="moreBtn" aria-haspopup="true" title="More">${icon('dots-three')}</button>
          <div class="menu right" id="moreMenu" hidden style="top: 44px">
            ${canWrite() ? `<button data-act="report">${icon('flag')} Report a problem</button>` : '<div class="menu-label">Sign in to report a problem</div>'}
            ${isMod() ? `<hr><div class="menu-label">Moderation</div>
              <button data-act="feature">${icon('star')} ${data.featured ? 'Stop featuring' : 'Feature on the main page'}</button>
              <button data-act="protect">${icon('lock')} Protection…</button>
              ${a.deleted ? `<button data-act="restore">${icon('arrow-counter-clockwise')} Restore</button>`
                : `<button data-act="delete" class="danger">${icon('trash')} Delete…</button>`}` : ''}
          </div>
        </div>
      </header>
      <div class="page-body">
        <div class="page-content">
          ${notes.join('')}
          <div class="article-body">
            ${infoboxHtml(a, ns.slug, existing)}
            <div class="prose">${body || '<p class="muted">This article is empty.</p>'}</div>
          </div>
          ${backlinks.length ? `<section class="backlinks">
            <h2 class="section-title">${icon('link')} What links here</h2>
            <ul>${backlinks.map((b) => `<li><a href="${articleHref(b.ns, b.slug)}" data-link>${esc(b.title)}</a>${b.ns !== ns.slug ? ` <span class="ns-chip">${esc(state.namespaces.find((n) => n.slug === b.ns)?.name || b.ns)}</span>` : ''}</li>`).join('')}</ul>
          </section>` : ''}
          <footer class="article-foot">
            Last edited by ${userLink(a.updatedBy)} ${when(a.updatedAt)} · Created by ${userLink(a.createdBy)} on ${esc(new Date(a.createdAt).toLocaleDateString())}
          </footer>
        </div>
        <aside class="page-aside"><div class="aside-inner">
          <button class="back-top link-btn" data-top>${icon('arrow-up')} Back to top</button>
          <div class="aside-block"><p class="aside-label">Last modified</p>
            <a class="aside-meta" href="${base}/history" data-link title="${esc(fullDate(a.updatedAt))}">${icon('clock-clockwise')} ${esc(timeAgo(a.updatedAt))}</a></div>
          ${tocList(raw)}
        </div></aside>
      </div>
    </div>`;

  scrollSpy();
  const page = $('.page.article');
  const menu = $('#moreMenu');
  $('#moreBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    if (!menu.hidden) setTimeout(() => document.addEventListener('click', () => { menu.hidden = true; }, { once: true }), 0);
  });
  $('#restoreBtn')?.addEventListener('click', () => restore(ns.slug, a.slug));
  page.addEventListener('click', async (e) => {
    const fold = e.target.closest('.sec-toggle');
    if (fold) {
      const sec = fold.closest('.section');
      sec.classList.toggle('collapsed');
      fold.setAttribute('aria-expanded', String(!sec.classList.contains('collapsed')));
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'copy') {
      await navigator.clipboard?.writeText(location.origin + base).catch(() => {});
      toast('Link copied.');
    }
    if (act === 'report') reportDialog(ns.slug, a);
    if (act === 'protect') protectDialog(ns.slug, a);
    if (act === 'delete') deleteDialog(ns.slug, a);
    if (act === 'restore') restore(ns.slug, a.slug);
    if (act === 'feature') {
      await api.post(`${api.articleUrl(ns.slug, a.slug)}/feature`, { on: !data.featured });
      toast(data.featured ? 'No longer featured.' : 'Featured on the main page.');
      route();
    }
  });
  // A link to a folded section opens it.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.closest('.section')?.classList.remove('collapsed');
}

function missingArticle(nsSlug, slug, canCreate) {
  const title = slug.replace(/-/g, ' ');
  setTitle(title);
  view().innerHTML = `<div class="page narrow empty-state">${icon('ghost', 'big')}
    <h1>${esc(title)}</h1>
    <p>This article doesn’t exist yet.</p>
    ${canCreate ? `<a class="btn primary" href="/w/${nsSlug}/~new?title=${encodeURIComponent(title)}" data-link>${icon('plus')} Write it</a>`
      : state.user ? '' : '<p><a href="/login" data-link>Sign in</a> to write it.</p>'}
    <p><a href="/search?q=${encodeURIComponent(title)}&ns=${nsSlug}" data-link>Search for “${esc(title)}”</a></p></div>`;
}

function reportDialog(ns, a) {
  dialog({
    title: `Report “${a.title}”`, submit: 'Send report',
    body: `<p class="muted">Moderators will take a look. Say what’s wrong: vandalism, rule breaks, personal info, metagaming…</p>
      <label class="field"><span>What’s the problem?</span><textarea name="reason" rows="4" required maxlength="1000"></textarea></label>`,
    onSubmit: async (f) => {
      await api.post(`${api.articleUrl(ns, a.slug)}/report`, { reason: f.get('reason') });
      toast('Thanks. A moderator will look at it.');
    },
  });
}

function protectDialog(ns, a) {
  dialog({
    title: 'Protection', submit: 'Save',
    body: `<p class="muted">Who can edit “${esc(a.title)}”?</p>
      ${Object.entries(state.protection).map(([k, label]) => `<label class="radio"><input type="radio" name="level" value="${k}" ${a.protection === k ? 'checked' : ''}
        ${k === 'admins' && !isAdmin() ? 'disabled' : ''}> ${esc(label)}</label>`).join('')}`,
    onSubmit: async (f) => {
      await api.post(`${api.articleUrl(ns, a.slug)}/protect`, { level: f.get('level') });
      toast('Protection saved.');
      route();
    },
  });
}

function deleteDialog(ns, a) {
  dialog({
    title: `Delete “${a.title}”?`, submit: 'Delete', danger: true,
    body: `<p class="muted">The article and its history are kept, hidden from everyone but moderators, and can be restored.</p>
      <label class="field"><span>Reason (for the moderation log)</span><input name="reason" maxlength="1000"></label>`,
    onSubmit: async (f) => {
      await api.post(`${api.articleUrl(ns, a.slug)}/delete`, { reason: f.get('reason') });
      toast('Deleted.');
      route();
    },
  });
}

async function restore(ns, slug) {
  await api.post(`${api.articleUrl(ns, slug)}/restore`);
  toast('Restored.');
  route();
}

// ------------------------------------------------------------ history

export async function viewHistory(nsSlug, slug) {
  const { article: a, namespace: ns, revisions, canEdit } = await api.get(`${api.articleUrl(nsSlug, slug)}/history`);
  setTitle(`History of ${a.title}`, ns.name);
  const base = articleHref(ns.slug, a.slug);
  view().innerHTML = `
    <div class="page">
      <header class="page-head"><div>
        <div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a></div>
        <h1>History of <a href="${base}" data-link>${esc(a.title)}</a></h1>
        <p class="muted">${revisions.length} version${revisions.length === 1 ? '' : 's'}. Pick two to compare.</p>
      </div>
      <div class="head-actions"><button class="btn" id="compareBtn">${icon('copy')} Compare selected</button></div></header>
      <ul class="history">${revisions.map((r, i) => `
        <li class="${r.hidden ? 'is-hidden' : ''}">
          <input type="checkbox" class="pick" value="${r.id}" ${i < 2 ? 'checked' : ''} aria-label="Select this version">
          <a href="/rev/${r.id}" data-link class="when">${esc(fullDate(r.createdAt))}</a>
          <span class="who">${userLink(r.user)}</span>
          <span class="size muted">${r.size} bytes</span>
          <span class="comment">${r.hidden ? '<i class="tag">hidden by a moderator</i> ' : ''}${esc(r.comment)}</span>
          <span class="links">
            ${i < revisions.length - 1 ? `<a href="/rev/${r.id}?diff=prev" data-link>diff</a>` : ''}
            ${i > 0 && canEdit && (!r.hidden || isMod()) ? `<button class="link-btn" data-revert="${r.id}">restore this version</button>` : ''}
            ${isMod() && i > 0 ? `<button class="link-btn" data-hide="${r.id}" data-hidden="${r.hidden ? 1 : 0}">${r.hidden ? 'unhide' : 'hide'}</button>` : ''}
          </span>
        </li>`).join('')}</ul>
    </div>`;

  $('#compareBtn').addEventListener('click', () => {
    const picks = [...document.querySelectorAll('.pick:checked')].map((c) => Number(c.value)).sort((x, y) => x - y);
    if (picks.length !== 2) return toast('Select exactly two versions.', 'error');
    navigate(`/rev/${picks[1]}?diff=${picks[0]}`);
  });
  view().querySelector('.history').addEventListener('click', async (e) => {
    const rev = e.target.closest('[data-revert]')?.dataset.revert;
    const hide = e.target.closest('[data-hide]');
    if (rev) {
      dialog({
        title: 'Restore this version?', submit: 'Restore',
        body: `<p class="muted">This saves the old version as a new edit. Nothing in the history is lost.</p>
          <label class="field"><span>Why? (optional)</span><input name="comment" maxlength="200" placeholder="e.g. undoing vandalism"></label>`,
        onSubmit: async (f) => {
          await api.post(`${api.articleUrl(ns.slug, a.slug)}/revert`, { revId: Number(rev), comment: f.get('comment') });
          toast('Restored.');
          navigate(base);
        },
      });
    }
    if (hide) {
      const hidden = hide.dataset.hidden !== '1';
      if (hidden && !(await confirmDialog('Hide this version?', 'Its text and summary will be hidden from everyone but moderators. Use this for personal info or abuse.', 'Hide'))) return;
      try {
        await api.post(`/api/revision/${hide.dataset.hide}/hide`, { hidden });
        route();
      } catch (err) { toast(err.message, 'error'); }
    }
  });
}

export async function viewRevision(id, diffWith) {
  const data = await api.get(`/api/revision/${id}`);
  const { revision: r, article: a, namespace: ns } = data;
  enterNamespace(ns.slug);
  const base = articleHref(a.ns, a.slug);
  const otherId = diffWith === 'prev' ? data.prevId : Number(diffWith) || null;
  setTitle(`${otherId ? 'Changes to' : 'Old version of'} ${a.title}`, ns.name);
  let content;
  if (diffWith) {
    let before = '';
    if (otherId) {
      try { before = revisionText((await api.get(`/api/revision/${otherId}`)).revision); } catch (e) { before = `(${e.message})`; }
    }
    content = diffHtml(before, revisionText(r));
  } else {
    const { existing } = await api.post(`/api/ns/${a.ns}/linkcheck`, { text: `${r.body}\n${Object.values(r.fields).join('\n')}` });
    content = `<div class="article-body">${infoboxHtml({ ...r }, a.ns, existing)}<div class="prose">${md(r.body, a.ns, existing)}</div></div>`;
  }
  view().innerHTML = `
    <div class="page ${diffWith ? '' : 'article'}">
      <header class="page-head"><div>
        <div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a> · <a href="${base}/history" data-link>History</a></div>
        <h1>${diffWith ? 'Changes to' : ''} <a href="${base}" data-link>${esc(a.title)}</a></h1>
        <p class="muted">${diffWith ? (otherId ? `From <a href="/rev/${otherId}" data-link>${diffWith === 'prev' ? 'the version before' : 'an earlier version'}</a> to ` : 'First version: ') : ''}
          the version by ${userLink(r.user)} on ${esc(fullDate(r.createdAt))}${r.comment ? ` · “${esc(r.comment)}”` : ''}
          ${data.current ? ' <i class="tag">current</i>' : ''}${r.hidden ? ' <i class="tag">hidden</i>' : ''}</p>
      </div>
      <div class="head-actions">
        ${diffWith ? `<a class="btn" href="/rev/${r.id}" data-link>View this version</a>` : data.prevId ? `<a class="btn" href="/rev/${r.id}?diff=prev" data-link>See what changed</a>` : ''}
      </div></header>
      ${!data.current && !diffWith ? `<div class="banner">${icon('info')} This is an old version. <a href="${base}" data-link>See the current article</a>.</div>` : ''}
      ${content}
    </div>`;
}
