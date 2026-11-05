// Markdown → safe HTML, with [[wiki links]], callouts and heading anchors.
// marked and DOMPurify are loaded as plain scripts in index.html.
import { parseTarget, slugify } from './shared.js';
import { esc } from './util.js';

let ctx = { ns: '', nsSlugs: [], existing: new Set(), nsNames: {} };
let ready = false;

function setup() {
  if (ready) return;
  ready = true;
  window.marked.use({
    gfm: true,
    extensions: [{
      name: 'wikilink',
      level: 'inline',
      start: (src) => { const i = src.indexOf('[['); return i < 0 ? undefined : i; },
      tokenizer(src) {
        const m = /^\[\[([^\[\]|\n]+?)(?:\|([^\[\]\n]+?))?\]\]/.exec(src);
        if (m) return { type: 'wikilink', raw: m[0], target: m[1], label: m[2] };
      },
      renderer: (tok) => linkHtml(tok.target, tok.label),
    }],
  });
}

export function linkHtml(target, label) {
  const t = parseTarget(target, ctx.ns, ctx.nsSlugs);
  if (!t.slug) return esc(label || target);
  const known = ctx.existing.has(`${t.ns}/${t.slug}`);
  const text = label?.trim() || t.title;
  const other = t.ns !== ctx.ns ? ` data-ns="${esc(ctx.nsNames[t.ns] || t.ns)}"` : '';
  const href = known ? `/w/${t.ns}/${encodeURIComponent(t.slug)}`
    : `/w/${t.ns}/~new?title=${encodeURIComponent(t.title)}`;
  return `<a href="${href}" class="wikilink${known ? '' : ' missing'}"${other} data-link ${known ? '' : `title="${esc(t.title)} (not written yet)"`}>${esc(text)}</a>`;
}

const CALLOUTS = {
  note: 'Note', info: 'Info', tip: 'Tip', warning: 'Warning', danger: 'Danger',
  ooc: 'Out of character', quote: 'Quote', rumor: 'Rumour', secret: 'Spoiler',
};

// options: {ns, nsSlugs, nsNames, existing: string[] of "ns/slug"}
export function render(md, options = {}) {
  setup();
  ctx = { ns: options.ns || '', nsSlugs: options.nsSlugs || [], nsNames: options.nsNames || {}, existing: new Set(options.existing || []) };
  const html = window.DOMPurify.sanitize(window.marked.parse(String(md || '')), { ADD_ATTR: ['data-link', 'data-ns'] });
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const root = tpl.content;

  // > [!ooc] Optional title
  for (const bq of root.querySelectorAll('blockquote')) {
    const first = bq.firstElementChild;
    const m = first && /^\s*\[!([a-z]+)\]([+-]?)[ \t]*([^\n]*)\n?/i.exec(first.innerHTML);
    if (!m) continue;
    const kind = m[1].toLowerCase();
    const label = m[3].trim() || CALLOUTS[kind] || kind;
    first.innerHTML = first.innerHTML.slice(m[0].length);
    if (!first.innerHTML.trim()) first.remove();
    const box = document.createElement(kind === 'secret' || m[2] === '-' ? 'details' : 'div');
    box.className = `callout callout-${CALLOUTS[kind] ? kind : 'note'}`;
    const head = document.createElement(box.tagName === 'DETAILS' ? 'summary' : 'div');
    head.className = 'callout-title';
    head.innerHTML = label;
    box.append(head, ...bq.childNodes);
    bq.replaceWith(box);
  }

  const seen = new Map();
  for (const h of root.querySelectorAll('h1, h2, h3, h4')) {
    let id = slugify(h.textContent) || 'section';
    const n = seen.get(id) || 0;
    seen.set(id, n + 1);
    if (n) id += `-${n + 1}`;
    h.id = `h-${id}`;
  }
  for (const a of root.querySelectorAll('a[href]')) {
    if (/^https?:\/\//i.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener noreferrer nofollow'; a.classList.add('external'); }
  }
  for (const t of root.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    t.replaceWith(wrap);
    wrap.append(t);
  }
  for (const img of root.querySelectorAll('img')) img.loading = 'lazy';
  const div = document.createElement('div');
  div.append(root);
  return div.innerHTML;
}

// One line of Markdown (an infobox value), without the wrapping <p>.
export function renderInline(md, options) {
  return render(md, options).replace(/^<p>([\s\S]*)<\/p>\s*$/, '$1');
}
