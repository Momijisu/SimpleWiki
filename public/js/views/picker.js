// "New article": pick a namespace (if needed), a template and a title.
import { $, $$, esc, dialog, toast } from '../util.js';
import { icon } from '../icons.js';
import { state, templatesFor, nsBySlug, canWrite, isMod } from '../state.js';
import { navigate } from '../app.js';

export function newArticleDialog(ns, presetTitle = '') {
  if (!canWrite()) { toast('Sign in with an approved account to write.', 'error'); return; }
  const writable = state.namespaces.filter((n) => !n.archived || isMod());
  ns = ns || writable[0];
  if (!ns) return;
  const groups = Object.entries(state.groups);
  const body = () => {
    const list = templatesFor(ns);
    return `
      ${writable.length > 1 ? `<label class="field"><span>Namespace</span>
        <select name="ns">${writable.map((n) => `<option value="${n.slug}" ${n.slug === ns.slug ? 'selected' : ''}>${esc(n.name)}</option>`).join('')}</select></label>` : ''}
      <label class="field"><span>Title</span><input name="title" required maxlength="120" value="${esc(presetTitle)}" placeholder="e.g. Tony “Two-Times” Ramirez"></label>
      <div class="field"><span>Template</span>
        <div class="tpl-grid">
          ${groups.map(([g, label]) => {
            const ts = list.filter((t) => t.group === g);
            return ts.length ? `<div class="tpl-group"><h4>${esc(label)}</h4>${ts.map((t, i) => `
              <label class="tpl-option"><input type="radio" name="template" value="${t.key}" ${t.key === 'character' || (!list.some((x) => x.key === 'character') && i === 0 && g === groups[0][0]) ? 'checked' : ''} required>
                <span>${icon(t.icon)}<b>${esc(t.label)}</b><small>${esc(t.hint)}</small></span></label>`).join('')}</div>` : '';
          }).join('')}
        </div>
      </div>`;
  };
  const d = dialog({
    title: 'New article', body: body(), submit: 'Start writing', wide: true,
    onSubmit: (f) => {
      const slug = f.get('ns') || ns.slug;
      const t = f.get('template') || 'page';
      navigate(`/w/${slug}/~new?template=${encodeURIComponent(t)}&title=${encodeURIComponent(f.get('title').trim())}`);
    },
  });
  // Changing the namespace changes which templates are offered.
  d.el.addEventListener('change', (e) => {
    if (e.target.name !== 'ns') return;
    const title = $('[name=title]', d.el).value;
    ns = nsBySlug(e.target.value);
    $('.modal-body', d.el).innerHTML = body();
    $('[name=title]', d.el).value = title;
  });
  if (!$$('[name=template]:checked', d.el).length) $('[name=template]', d.el)?.click();
}
