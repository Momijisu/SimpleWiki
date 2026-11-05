import { esc, timeAgo, fullDate } from '../util.js';
import { icon } from '../icons.js';
import { state, template } from '../state.js';

export const view = () => document.getElementById('view');

export function setTitle(...parts) {
  document.title = [...parts.filter(Boolean), state.settings.siteName].join(' · ');
}

export const userLink = (name) => (name ? `<a href="/u/${encodeURIComponent(name)}" data-link class="user-link">${esc(name)}</a>` : '<i>someone</i>');

export const articleHref = (ns, slug) => `/w/${ns}/${encodeURIComponent(slug)}`;

export const when = (t) => `<time datetime="${new Date(t).toISOString()}" title="${esc(fullDate(t))}">${esc(timeAgo(t))}</time>`;

export function templateBadge(key) {
  const t = template(key);
  return `<span class="badge">${icon(t.icon)}${esc(t.label)}</span>`;
}

export function sizeDelta(size, prev) {
  if (prev == null) return `<span class="delta plus">+${size}</span>`;
  const d = size - prev;
  return `<span class="delta ${d > 0 ? 'plus' : d < 0 ? 'minus' : ''}">${d > 0 ? '+' : ''}${d}</span>`;
}

// A list of changes, as on Recent changes and user profiles.
export function changeList(changes, { showNs = true } = {}) {
  if (!changes.length) return '<p class="muted">No changes yet.</p>';
  return `<ul class="changes">${changes.map((c) => `
    <li class="${c.deleted ? 'is-deleted' : ''}">
      <span class="when">${when(c.createdAt)}</span>
      <span class="what">
        ${c.isNew ? '<b class="new-mark" title="New article">N</b>' : ''}
        <a href="${articleHref(c.ns, c.slug)}" data-link>${esc(c.currentTitle)}</a>
        ${showNs ? `<span class="ns-chip">${esc(c.nsName)}</span>` : ''}
        ${c.deleted ? '<i class="tag">deleted</i>' : ''}
      </span>
      <span class="links"><a href="/rev/${c.id}?diff=prev" data-link>diff</a> · <a href="/w/${c.ns}/${encodeURIComponent(c.slug)}/history" data-link>history</a></span>
      ${sizeDelta(c.size, c.prevSize)}
      <span class="who">${userLink(c.user)}</span>
      <span class="comment">${c.hidden ? '<i class="tag">hidden</i> ' : ''}${esc(c.comment)}</span>
    </li>`).join('')}</ul>`;
}

export function articleCard(a, ns) {
  return `<a class="card" href="${articleHref(ns, a.slug)}" data-link>
    <div class="card-img">${a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy">` : icon(template(a.template).icon)}</div>
    <div class="card-text"><b>${esc(a.title)}</b><small>${esc(template(a.template).label)}</small></div>
  </a>`;
}
