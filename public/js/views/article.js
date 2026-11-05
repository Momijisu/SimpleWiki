import { $, esc, dialog, toast, confirmDialog, fullDate } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, mdInline, template, isMod, isAdmin, canWrite } from '../state.js';
import { view, setTitle, userLink, when, articleHref, templateBadge } from './common.js';
import { navigate, route, enterNamespace } from '../app.js';
import { diffHtml, revisionText } from '../diff.js';

// The infobox: picture, then each template section's filled-in fields, then any extra fields.
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
  return `<aside class="infobox">
    <div class="infobox-title">${esc(a.title)}</div>
    ${a.image ? `<div class="infobox-img"><img src="${esc(a.image)}" alt=""></div>` : ''}
    <div class="infobox-kind">${icon(t.icon)} ${esc(t.label)}</div>
    ${sections.map(([name, rows]) => `
      ${name ? `<div class="infobox-section">${esc(name)}</div>` : ''}
      <dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${mdInline(v, ns, existing)}</dd>`).join('')}</dl>`).join('')}
  </aside>`;
}

function tocHtml(body) {
  const tpl = document.createElement('div');
  tpl.innerHTML = body;
  const hs = [...tpl.querySelectorAll('h2, h3')];
  if (hs.filter((h) => h.tagName === 'H2').length < 3) return '';
  return `<nav class="toc"><div class="toc-title">Contents</div><ol>${hs.map((h) =>
    `<li class="toc-${h.tagName.toLowerCase()}"><a href="#${h.id}" data-link>${esc(h.textContent)}</a></li>`).join('')}</ol></nav>`;
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
  const body = md(a.body, ns.slug, existing);
  const base = articleHref(ns.slug, a.slug);
  const notes = [];
  if (a.deleted) notes.push(`<div class="banner danger">${icon('trash')} This article is deleted. Only moderators can see it.
    <button class="btn small" id="restoreBtn">${icon('arrow-counter-clockwise')} Restore</button></div>`);
  if (data.openReports) notes.push(`<div class="banner warn">${icon('flag')} ${data.openReports} open report${data.openReports === 1 ? '' : 's'} on this article. <a href="/mod" data-link>Review</a></div>`);
  if (a.protection !== 'none') notes.push(`<div class="banner">${icon('lock')} Protected: only ${esc(state.protection[a.protection]?.toLowerCase())} can edit this article.</div>`);
  if (ns.archived) notes.push(`<div class="banner">${icon('lock')} ${esc(ns.name)} is archived and kept for reading.</div>`);

  view().innerHTML = `
    <div class="page article">
      ${notes.join('')}
      <header class="article-head">
        <div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a> · ${templateBadge(a.template)}</div>
        <h1>${esc(a.title)}</h1>
        <div class="article-actions">
          ${canEdit ? `<a class="btn primary small" href="${base}/edit" data-link data-edit-link>${icon('pencil-simple')} Edit</a>` : ''}
          <a class="btn small" href="${base}/history" data-link>${icon('clock-counter-clockwise')} History</a>
          <button class="btn small ghost" id="moreBtn" aria-haspopup="true">More ${icon('caret-down')}</button>
          <div class="menu" id="moreMenu" hidden>
            <button data-act="copy">${icon('link')} Copy link</button>
            ${canWrite() ? `<button data-act="report">${icon('flag')} Report a problem</button>` : ''}
            ${isMod() ? `<hr><div class="menu-label">Moderation</div>
              <button data-act="protect">${icon('lock')} Protection…</button>
              ${a.deleted ? `<button data-act="restore">${icon('arrow-counter-clockwise')} Restore</button>`
                : `<button data-act="delete" class="danger">${icon('trash')} Delete…</button>`}` : ''}
          </div>
        </div>
      </header>
      <div class="article-body">
        ${infoboxHtml(a, ns.slug, existing)}
        ${tocHtml(body)}
        <div class="prose">${body || '<p class="muted">This article is empty.</p>'}</div>
      </div>
      ${backlinks.length ? `<section class="backlinks">
        <h2 class="section-title">${icon('link')} What links here</h2>
        <ul>${backlinks.map((b) => `<li><a href="${articleHref(b.ns, b.slug)}" data-link>${esc(b.title)}</a>${b.ns !== ns.slug ? ` <span class="ns-chip">${esc(state.namespaces.find((n) => n.slug === b.ns)?.name || b.ns)}</span>` : ''}</li>`).join('')}</ul>
      </section>` : ''}
      <footer class="article-foot">
        Last edited by ${userLink(a.updatedBy)} ${when(a.updatedAt)} · Created by ${userLink(a.createdBy)} on ${esc(new Date(a.createdAt).toLocaleDateString())}
      </footer>
    </div>`;

  const menu = $('#moreMenu');
  $('#moreBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    if (!menu.hidden) setTimeout(() => document.addEventListener('click', () => { menu.hidden = true; }, { once: true }), 0);
  });
  $('#restoreBtn')?.addEventListener('click', () => restore(ns.slug, a.slug));
  menu.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'copy') {
      await navigator.clipboard?.writeText(location.origin + base).catch(() => {});
      toast('Link copied.');
    }
    if (act === 'report') reportDialog(ns.slug, a);
    if (act === 'protect') protectDialog(ns.slug, a);
    if (act === 'delete') deleteDialog(ns.slug, a);
    if (act === 'restore') restore(ns.slug, a.slug);
  });
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
