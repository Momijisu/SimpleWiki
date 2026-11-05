import { $, $$, esc, toast, dialog, debounce } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, template, templatesFor, nsBySlug, canWrite } from '../state.js';
import { view, setTitle, articleHref } from './common.js';
import { navigate } from '../app.js';
import { infoboxHtml } from './article.js';

let dirty = false;
addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

// Called before leaving a page inside the app.
export function confirmLeave() {
  if (!dirty) return true;
  if (!confirm('Leave without saving? Your changes will be lost.')) return false;
  dirty = false;
  return true;
}

const CALLOUTS = [
  ['ooc', 'Out of character', 'Something players know but characters don’t.'],
  ['note', 'Note', ''],
  ['warning', 'Warning', ''],
  ['rumor', 'Rumour', 'Unconfirmed street talk.'],
  ['secret', 'Spoiler (folded)', 'Hidden until the reader opens it.'],
];

export async function viewEditor(nsSlug, slug, preset = {}) {
  dirty = false;
  const ns = nsBySlug(nsSlug);
  if (!ns) throw new api.ApiError(404, { error: 'There is no such namespace.' });
  if (!canWrite()) {
    throw new api.ApiError(state.user ? 403 : 401, { error: state.user ? 'Your account can’t edit right now.' : 'Sign in to write and edit articles.' });
  }
  let a;
  if (slug) {
    const data = await api.get(api.articleUrl(nsSlug, slug));
    if (data.redirect) return navigate(`${articleHref(nsSlug, data.redirect)}/edit`, true);
    if (!data.canEdit) throw new api.ApiError(403, { error: 'This article is protected, so you can’t edit it.' });
    a = data.article;
  } else {
    const tkey = templatesFor(ns).some((t) => t.key === preset.template) ? preset.template : (templatesFor(ns).find((t) => t.key === 'page') || templatesFor(ns)[0])?.key;
    a = { title: preset.title || '', template: tkey, fields: {}, body: template(tkey).body || '', image: '', revId: null };
  }
  const isNew = !slug;
  setTitle(isNew ? 'New article' : `Editing ${a.title}`, ns.name);
  const draft = { ...a, fields: { ...a.fields } };

  view().innerHTML = `
    <div class="page editor">
      <form id="editForm" autocomplete="off">
        <header class="page-head sticky">
          <div>
            <div class="kicker"><a href="/w/${ns.slug}" data-link>${esc(ns.name)}</a> · ${isNew ? 'New article' : 'Editing'}</div>
            <input class="title-input" name="title" value="${esc(draft.title)}" placeholder="Title" maxlength="120" required aria-label="Title">
          </div>
          <div class="head-actions">
            <a class="btn ghost" href="${isNew ? `/w/${ns.slug}` : articleHref(ns.slug, a.slug)}" data-link id="cancelBtn">Cancel</a>
            <button class="btn primary" type="submit" id="saveBtn">${icon('check')} ${isNew ? 'Publish' : 'Save'}</button>
          </div>
        </header>

        <div class="editor-grid">
          <section class="editor-main">
            <div class="toolbar" id="toolbar">
              <button type="button" data-md="bold" title="Bold (Ctrl+B)"><b>B</b></button>
              <button type="button" data-md="italic" title="Italic (Ctrl+I)"><i>I</i></button>
              <button type="button" data-md="h2" title="Section heading">H2</button>
              <button type="button" data-md="h3" title="Sub-heading">H3</button>
              <button type="button" data-md="link" title="Link to an article">[[ ]]</button>
              <button type="button" data-md="list" title="Bulleted list">• List</button>
              <button type="button" data-md="table" title="Table">Table</button>
              <button type="button" data-md="image" title="Upload a picture">${icon('image')}</button>
              <select data-md="callout" aria-label="Insert a callout">
                <option value="">Callout…</option>
                ${CALLOUTS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}
              </select>
              <span class="spacer"></span>
              <div class="seg" id="modeSeg">
                <button type="button" data-mode="write" class="on">Write</button>
                <button type="button" data-mode="split">Side by side</button>
                <button type="button" data-mode="preview">Preview</button>
              </div>
            </div>
            <div class="write-area mode-write" id="writeArea">
              <div class="ta-wrap">
                <textarea name="body" id="bodyInput" spellcheck="true" placeholder="Write in Markdown. Link other articles with [[Their title]]."></textarea>
                <div class="suggest" id="suggest" hidden></div>
              </div>
              <div class="preview article" id="preview"></div>
            </div>
            <label class="field summary"><span>Summary of your changes</span>
              <input name="comment" maxlength="300" placeholder="${isNew ? 'Created the article' : 'e.g. added the 2026 bank job'}"></label>
            <details class="help"><summary>${icon('info')} Formatting help</summary>
              <div class="help-grid">
                <code>[[Tony Ramirez]]</code><span>link to an article (red if it doesn’t exist yet)</span>
                <code>[[Tony Ramirez|Tony]]</code><span>link with different text</span>
                ${state.namespaces.length > 1 ? `<code>[[${esc(state.namespaces.find((n) => n.slug !== ns.slug)?.slug)}:Someone]]</code><span>link into another namespace</span>` : ''}
                <code>## Heading</code><span>a section (three or more make a table of contents)</span>
                <code>**bold** *italic*</code><span>emphasis</span>
                <code>&gt; [!ooc]</code><span>an out-of-character callout; also note, warning, rumor, secret</span>
                <code>![caption](url)</code><span>a picture: paste or drop one into the text to upload it</span>
              </div>
            </details>
          </section>

          <aside class="editor-side">
            <div class="panel">
              <label class="field"><span>Template</span>
                <select name="template" id="tplSelect">
                  ${templatesFor(ns).concat(templatesFor(ns).some((t) => t.key === draft.template) ? [] : [template(draft.template)])
                    .map((t) => `<option value="${t.key}" ${t.key === draft.template ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
                </select>
              </label>
              <div class="field"><span>Picture</span>
                <div class="image-pick" id="imagePick"></div>
              </div>
              <div id="fieldsBox"></div>
            </div>
          </aside>
        </div>
      </form>
    </div>`;

  const form = $('#editForm');
  const ta = $('#bodyInput');
  ta.value = draft.body; // (not as HTML content: a textarea drops a leading newline)
  ta.setSelectionRange(0, 0);
  const markDirty = () => { dirty = true; };

  // ---- infobox fields
  function renderFields() {
    const t = template(draft.template);
    const known = new Set((t.sections || []).flatMap((s) => s.fields));
    const extra = Object.keys(draft.fields).filter((k) => !known.has(k));
    $('#fieldsBox').innerHTML = `
      ${(t.sections || []).map((s) => `<fieldset class="ib-section"><legend>${esc(s.name)}</legend>
        ${s.fields.map((f) => `<label class="field compact"><span>${esc(f)}</span><input data-field="${esc(f)}" value="${esc(draft.fields[f] || '')}" maxlength="2000"></label>`).join('')}
      </fieldset>`).join('')}
      <fieldset class="ib-section"><legend>${t.sections?.length ? 'Extra fields' : 'Infobox fields'}</legend>
        <div id="extraFields">${extra.map((k) => extraRow(k, draft.fields[k])).join('')}</div>
        <button type="button" class="btn small ghost" id="addField">${icon('plus')} Add a field</button>
      </fieldset>
      <p class="muted small">Fields can contain links: <code>[[Vagos]]</code></p>`;
  }
  const extraRow = (k = '', v = '') => `<div class="extra-row"><input class="xk" placeholder="Name" value="${esc(k)}" maxlength="80"><input class="xv" placeholder="Value" value="${esc(v)}" maxlength="2000"><button type="button" class="icon-btn" data-remove-field aria-label="Remove">${icon('x')}</button></div>`;
  function readFields() {
    const out = {};
    for (const i of $$('[data-field]', form)) if (i.value.trim()) out[i.dataset.field] = i.value;
    for (const row of $$('.extra-row', form)) {
      const k = $('.xk', row).value.trim(), v = $('.xv', row).value;
      if (k && v.trim()) out[k] = v;
    }
    draft.fields = out;
  }
  renderFields();

  // ---- picture
  function renderImage() {
    $('#imagePick').innerHTML = draft.image
      ? `<div class="image-preview"><img src="${esc(draft.image)}" alt=""></div>
         <div class="row"><button type="button" class="btn small" id="imgChange">${icon('upload-simple')} Change</button><button type="button" class="btn small ghost" id="imgRemove">${icon('x')} Remove</button></div>`
      : `<div class="row"><button type="button" class="btn small" id="imgChange">${icon('upload-simple')} Upload</button><button type="button" class="btn small ghost" id="imgUrl">${icon('link')} From a link</button></div>`;
  }
  renderImage();
  async function pickFile() {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp' });
    return new Promise((resolve) => {
      input.onchange = () => resolve(input.files[0] || null);
      input.click();
    });
  }
  async function uploadFile(file) {
    if (!file) return null;
    if (file.size > 8 * 1024 * 1024) { toast('Pictures can be at most 8 MB.', 'error'); return null; }
    toast('Uploading…');
    try { return (await api.upload(file)).url; } catch (e) { toast(e.message, 'error'); return null; }
  }
  $('#imagePick').addEventListener('click', async (e) => {
    if (e.target.closest('#imgChange')) {
      const url = await uploadFile(await pickFile());
      if (url) { draft.image = url; markDirty(); renderImage(); updatePreview(); toast('Uploaded.'); }
    } else if (e.target.closest('#imgRemove')) { draft.image = ''; markDirty(); renderImage(); updatePreview(); }
    else if (e.target.closest('#imgUrl')) {
      dialog({
        title: 'Picture from a link', submit: 'Use it',
        body: '<label class="field"><span>Image address (https://…)</span><input name="url" type="url" pattern="https://.*" required></label>',
        onSubmit: (f) => { draft.image = f.get('url').trim(); markDirty(); renderImage(); updatePreview(); },
      });
    }
  });

  // ---- template change: keep the fields; swap the starter text if untouched
  $('#tplSelect').addEventListener('change', (e) => {
    readFields();
    const old = template(draft.template);
    draft.template = e.target.value;
    if (!ta.value.trim() || ta.value.trim() === (old.body || '').trim()) ta.value = template(draft.template).body || '';
    renderFields();
    updatePreview();
    markDirty();
  });

  form.addEventListener('input', (e) => {
    markDirty();
    if (e.target.matches('[data-field], .xk, .xv, [name=title]')) updatePreview();
  });
  form.addEventListener('click', (e) => {
    if (e.target.closest('#addField')) { $('#extraFields').insertAdjacentHTML('beforeend', extraRow()); $('#extraFields .extra-row:last-child .xk').focus(); }
    const rm = e.target.closest('[data-remove-field]');
    if (rm) { rm.parentElement.remove(); markDirty(); updatePreview(); }
  });

  // ---- preview
  let mode = innerWidth > 1500 ? 'split' : 'write';
  const setMode = (m) => {
    mode = m;
    $('#writeArea').className = `write-area mode-${m}`;
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    if (m !== 'write') updatePreview(true);
  };
  $('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  let linkCache = { text: null, existing: [] };
  const updatePreview = debounce(async () => {
    if (mode === 'write' || !form.isConnected) return;
    readFields();
    const text = `${ta.value}\n${Object.values(draft.fields).join('\n')}`;
    if (text !== linkCache.text) {
      try { linkCache = { text, existing: (await api.post(`/api/ns/${ns.slug}/linkcheck`, { text })).existing }; } catch { /* keep the old */ }
    }
    if (!form.isConnected) return; // left the editor meanwhile
    const art = { ...draft, title: form.title.value || 'Untitled', body: ta.value };
    $('#preview').innerHTML = `<div class="article-body">${infoboxHtml(art, ns.slug, linkCache.existing)}<div class="prose">${md(ta.value, ns.slug, linkCache.existing)}</div></div>`;
  }, 250);
  ta.addEventListener('input', () => updatePreview());
  setMode(mode);

  // ---- toolbar
  function wrap(before, after = before, placeholder = '') {
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || placeholder;
    ta.setRangeText(before + sel + after, s, e, 'end');
    ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function insertBlock(text) {
    const { selectionStart: s, value } = ta;
    const pre = s > 0 && value[s - 1] !== '\n' ? '\n\n' : (s > 1 && value[s - 2] !== '\n' ? '\n' : '');
    ta.setRangeText(`${pre}${text}\n`, s, ta.selectionEnd, 'end');
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  $('#toolbar').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-md]');
    if (!b) return;
    const k = b.dataset.md;
    if (k === 'bold') wrap('**', '**', 'bold text');
    if (k === 'italic') wrap('*', '*', 'italic text');
    if (k === 'h2') insertBlock('## Heading');
    if (k === 'h3') insertBlock('### Sub-heading');
    if (k === 'link') wrap('[[', ']]', 'Article title');
    if (k === 'list') insertBlock('- First\n- Second');
    if (k === 'table') insertBlock('| Name | Role |\n|---|---|\n| [[Someone]] | Leader |');
    if (k === 'image') {
      const url = await uploadFile(await pickFile());
      if (url) insertBlock(`![](${url})`);
    }
  });
  $('#toolbar select').addEventListener('change', (e) => {
    const k = e.target.value;
    if (k) insertBlock(`> [!${k}]\n> ${k === 'ooc' ? 'What players should know.' : 'Text'}`);
    e.target.value = '';
  });
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); wrap('**', '**', 'bold text'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); wrap('*', '*', 'italic text'); }
  });

  // ---- paste or drop pictures
  async function dropFiles(files) {
    for (const f of [...files].filter((x) => x.type.startsWith('image/'))) {
      const url = await uploadFile(f);
      if (url) insertBlock(`![](${url})`);
    }
  }
  ta.addEventListener('paste', (e) => { if (e.clipboardData.files.length) { e.preventDefault(); dropFiles(e.clipboardData.files); } });
  ta.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); });
  ta.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); dropFiles(e.dataTransfer.files); } });

  // ---- [[ link suggestions
  const box = $('#suggest');
  let sugg = [], active = 0;
  const closeSuggest = () => { box.hidden = true; sugg = []; };
  const findSuggestions = debounce(async (term) => {
    let targetNs = ns.slug, q = term;
    const m = /^([a-z0-9-]+):(.*)$/i.exec(term);
    if (m && nsBySlug(m[1].toLowerCase())) { targetNs = m[1].toLowerCase(); q = m[2]; }
    if (!q.trim()) return closeSuggest();
    try {
      const { titles } = await api.get(`/api/titles?ns=${targetNs}&q=${encodeURIComponent(q)}`);
      sugg = titles.map((t) => ({ ...t, insert: targetNs === ns.slug ? t.title : `${targetNs}:${t.title}` }));
    } catch { sugg = []; }
    if (!sugg.length) return closeSuggest();
    active = 0;
    renderSuggest();
  }, 150);
  function renderSuggest() {
    box.innerHTML = sugg.map((s, i) => `<button type="button" class="${i === active ? 'on' : ''}" data-i="${i}">${icon(template(s.template).icon)} ${esc(s.insert)}</button>`).join('');
    const pos = caretXY(ta);
    box.style.left = `${Math.min(pos.x, ta.clientWidth - 260)}px`;
    box.style.top = `${pos.y + 24}px`;
    box.hidden = false;
  }
  function accept(i) {
    const s = sugg[i];
    if (!s) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const start = before.lastIndexOf('[[') + 2;
    const after = ta.value.slice(ta.selectionStart);
    const close = after.startsWith(']]') ? '' : ']]';
    ta.setRangeText(s.insert + close, start, ta.selectionStart, 'end');
    if (!close) ta.setSelectionRange(ta.selectionStart + 2, ta.selectionStart + 2);
    closeSuggest();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus();
  }
  ta.addEventListener('input', () => {
    const m = /\[\[([^\[\]|\n]{1,60})$/.exec(ta.value.slice(0, ta.selectionStart));
    if (m) findSuggestions(m[1]); else closeSuggest();
  });
  ta.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % sugg.length; renderSuggest(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + sugg.length) % sugg.length; renderSuggest(); }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); accept(active); }
    else if (e.key === 'Escape') { e.preventDefault(); closeSuggest(); }
  });
  box.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); accept(Number(b.dataset.i)); } });
  ta.addEventListener('blur', () => setTimeout(closeSuggest, 150));

  // ---- save
  let saving = false;
  async function save() {
    if (saving) return;
    readFields();
    const body = {
      title: form.title.value, template: draft.template, fields: draft.fields, body: ta.value, image: draft.image,
      comment: form.comment.value, baseRev: a.revId,
    };
    if (!body.title.trim()) { form.title.focus(); return toast('The article needs a title.', 'error'); }
    saving = true;
    $('#saveBtn').disabled = true;
    try {
      const r = isNew ? await api.post(`/api/ns/${ns.slug}/articles`, body) : await api.put(api.articleUrl(ns.slug, a.slug), body);
      dirty = false;
      toast(isNew ? 'Published.' : 'Saved.');
      navigate(articleHref(ns.slug, r.article.slug));
    } catch (e) {
      if (e.status === 409 && e.data.conflict) {
        dialog({
          title: 'Edit conflict', submit: '', cancel: 'Back to my text',
          body: `<p>${esc(e.message)}</p><p>${esc(e.data.by || 'Someone')} saved the newer version.
            <a href="${articleHref(ns.slug, a.slug)}" target="_blank" rel="noopener">Open it in a new tab</a> to compare.</p>`,
        });
      } else if (e.status === 409 && e.data.slug) {
        dialog({
          title: 'That title is taken', submit: '', cancel: 'OK',
          body: `<p>${esc(e.message)}</p><p><a href="${articleHref(ns.slug, e.data.slug)}" target="_blank" rel="noopener">Open the existing article</a></p>`,
        });
      } else toast(e.message, 'error');
    } finally {
      saving = false;
      $('#saveBtn') && ($('#saveBtn').disabled = false);
    }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); save(); });
  form.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    if (e.key === 'Enter' && e.target.matches('input') && !e.target.closest('.modal')) e.preventDefault();
  });
  (isNew && !draft.title ? form.title : ta).focus();
}

// Where the caret is inside a textarea, in pixels (mirror-element trick).
function caretXY(ta) {
  const cs = getComputedStyle(ta);
  const div = document.createElement('div');
  for (const p of ['font', 'letterSpacing', 'lineHeight', 'padding', 'border', 'boxSizing', 'whiteSpace', 'wordWrap', 'tabSize']) div.style[p] = cs[p];
  Object.assign(div.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', wordWrap: 'break-word', width: `${ta.clientWidth}px` });
  div.textContent = ta.value.slice(0, ta.selectionStart);
  const span = document.createElement('span');
  span.textContent = '​';
  div.append(span);
  document.body.append(div);
  const x = span.offsetLeft, y = span.offsetTop - ta.scrollTop;
  div.remove();
  return { x, y };
}
