export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function timeAgo(t) {
  if (!t) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const fullDate = (t) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

let toastTimer;
export function toast(msg, kind = '') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 3500);
}

// A modal dialog. `body` is HTML; returns {el, close}. onSubmit receives the
// form's FormData; return false to keep the dialog open.
export function dialog({ title, body, submit = 'OK', cancel = 'Cancel', danger = false, onSubmit, wide = false }) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `
    <form class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>
      <div class="modal-body">${body}</div>
      <div class="modal-actions">
        ${cancel ? `<button type="button" class="btn ghost" data-cancel>${esc(cancel)}</button>` : ''}
        ${submit ? `<button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submit)}</button>` : ''}
      </div>
    </form>`;
  root.append(wrap);
  const form = $('form', wrap);
  const close = () => { wrap.remove(); removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  $('[data-cancel]', wrap)?.addEventListener('click', close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      const keep = onSubmit ? await onSubmit(new FormData(form), form) : true;
      if (keep !== false) close();
    } catch (err) {
      toast(err.message, 'error');
    } finally { btn.disabled = false; }
  });
  setTimeout(() => $('input:not([type=hidden]), textarea, select', form)?.focus(), 0);
  return { el: wrap, close };
}

export function confirmDialog(title, text, submit = 'OK', danger = false) {
  return new Promise((resolve) => {
    let ok = false;
    const d = dialog({ title, body: `<p>${esc(text)}</p>`, submit, danger, onSubmit: () => { ok = true; } });
    new MutationObserver((_, obs) => { if (!d.el.isConnected) { obs.disconnect(); resolve(ok); } }).observe($('#modal-root'), { childList: true });
  });
}

// Text without Markdown, for teasers.
export function plain(md, max = 180) {
  const s = String(md || '')
    .replace(/^>\s*\[![a-z]+\].*$/gim, '')
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, t, l) => l || t.replace(/^[a-z0-9-]+:/i, ''))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\|.*\|$/gm, '')
    .replace(/[#>*_`~]+/g, '')
    .replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '…' : s;
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
