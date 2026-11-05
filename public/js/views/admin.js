// Admin: site settings, namespaces and templates.
import { $, $$, esc, toast, dialog, confirmDialog } from '../util.js';
import * as api from '../api.js';
import { icon, ICON_NAMES } from '../icons.js';
import { state, isAdmin, loadSession } from '../state.js';
import { view, setTitle } from './common.js';
import { renderChrome } from '../app.js';

const TABS = [['settings', 'Site', 'gear'], ['namespaces', 'Namespaces', 'globe'], ['templates', 'Templates', 'file-text']];

export async function viewAdmin(tab) {
  if (!isAdmin()) throw new api.ApiError(403, { error: 'Only admins can see this page.' });
  setTitle('Admin');
  view().innerHTML = `
    <div class="page wide">
      <header class="page-head"><div><h1>${icon('crown')} Admin</h1>
        <p class="muted">People and roles are under <a href="/mod?tab=users" data-link>Moderation → People</a>.</p></div></header>
      <nav class="tabs">${TABS.map(([k, l, ic]) => `<a href="/admin/${k}" data-link class="${k === tab ? 'on' : ''}">${icon(ic)} ${l}</a>`).join('')}</nav>
      <div id="adminBody"></div>
    </div>`;
  if (tab === 'settings') settingsTab($('#adminBody'));
  else if (tab === 'namespaces') namespacesTab($('#adminBody'));
  else if (tab === 'templates') templatesTab($('#adminBody'));
}

function settingsTab(el) {
  const s = state.settings;
  const opt = (v, cur, label) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  el.innerHTML = `
    <form class="panel form-grid" id="settingsForm">
      <label class="field"><span>Wiki name</span><input name="siteName" value="${esc(s.siteName)}" maxlength="60" required></label>
      <label class="field"><span>Tagline</span><input name="tagline" value="${esc(s.tagline)}" maxlength="200"></label>
      <label class="field wide"><span>Welcome text on the front page (Markdown)</span><textarea name="welcome" rows="5" maxlength="4000">${esc(s.welcome)}</textarea></label>
      <label class="field"><span>Who can sign up</span><select name="registration">
        ${opt('open', s.registration, 'Anyone who signs in with Discord can edit straight away')}
        ${opt('approval', s.registration, 'Anyone, but a moderator approves each new account')}
        ${opt('closed', s.registration, 'Nobody new: only people who already have an account')}</select>
        ${state.discord ? '' : '<small class="banner danger">Discord sign-in isn’t set up, so nobody can sign in. See the README.</small>'}</label>
      <label class="field"><span>Who can read</span><select name="readAccess">
        ${opt('public', s.readAccess, 'Everyone, even without an account')}
        ${opt('members', s.readAccess, 'Only signed-in, approved members')}</select></label>
      <label class="field"><span>Theme for pages outside a namespace</span><select name="defaultTheme">
        ${Object.entries(state.themes).map(([k, l]) => opt(k, s.defaultTheme, l)).join('')}</select></label>
      <div class="wide"><button class="btn primary">Save settings</button></div>
    </form>`;
  $('#settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.put('/api/admin/settings', Object.fromEntries(new FormData(e.target)));
      await loadSession();
      renderChrome();
      toast('Settings saved.');
    } catch (err) { toast(err.message, 'error'); }
  });
}

function nsForm(n = {}) {
  return `
    ${n.slug ? '' : `<label class="field"><span>Short name (used in links like [[gta4:Tony]] and in addresses; can’t be changed later)</span>
      <input name="slug" required pattern="[a-z0-9][a-z0-9\\-]{0,23}" placeholder="gta4"></label>`}
    <label class="field"><span>Name</span><input name="name" required maxlength="60" value="${esc(n.name || '')}" placeholder="Los Santos 4.0"></label>
    <label class="field"><span>Tagline</span><input name="tagline" maxlength="200" value="${esc(n.tagline || '')}" placeholder="The 2024–2025 city"></label>
    <label class="field"><span>Theme</span><select name="theme">${Object.entries(state.themes).map(([k, l]) => `<option value="${k}" ${k === n.theme ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="field"><span>Order</span><input name="sort" type="number" value="${n.sort ?? state.namespaces.length}"></label>
    <label class="check"><input type="checkbox" name="archived" ${n.archived ? 'checked' : ''}> Archived: readable, but only moderators can edit (for past versions of the server)</label>
    <label class="check"><input type="checkbox" name="hidden" ${n.hidden ? 'checked' : ''}> Hidden: only moderators can see it (for setting one up)</label>`;
}
const nsData = (f) => ({ ...Object.fromEntries(f), archived: f.has('archived'), hidden: f.has('hidden'), sort: Number(f.get('sort')) });

function namespacesTab(el) {
  el.innerHTML = `
    <p class="muted">Each namespace is its own wiki inside this one, with its own articles and look: one per server version, say. Links can point across them with <code>[[short-name:Title]]</code>.</p>
    <div class="ns-admin">${state.namespaces.map((n) => `
      <div class="ns-admin-row panel" data-theme="${n.theme}">
        <span class="swatch theme-${n.theme}"></span>
        <div><b>${esc(n.name)}</b> <code>${esc(n.slug)}</code> ${n.archived ? '<i class="tag">archived</i>' : ''} ${n.hidden ? '<i class="tag">hidden</i>' : ''}
          <br><small class="muted">${esc(n.tagline)} · ${esc(state.themes[n.theme])}</small></div>
        <span class="spacer"></span>
        <button class="btn small" data-edit="${n.slug}">${icon('pencil-simple')} Edit</button>
        <button class="btn small ghost" data-del="${n.slug}">${icon('trash')}</button>
      </div>`).join('')}</div>
    <button class="btn primary" id="addNs">${icon('plus')} Add a namespace</button>`;
  const refresh = async () => { await loadSession(); renderChrome(); namespacesTab(el); };
  el.onclick = async (e) => {
    if (e.target.closest('#addNs')) {
      dialog({ title: 'New namespace', submit: 'Create', body: nsForm(), onSubmit: async (f) => { await api.post('/api/admin/namespaces', nsData(f)); toast('Created.'); refresh(); } });
    }
    const ed = e.target.closest('[data-edit]')?.dataset.edit;
    if (ed) {
      const n = state.namespaces.find((x) => x.slug === ed);
      dialog({ title: `Edit ${n.name}`, submit: 'Save', body: nsForm(n), onSubmit: async (f) => { await api.put(`/api/admin/namespaces/${ed}`, nsData(f)); toast('Saved.'); refresh(); } });
    }
    const del = e.target.closest('[data-del]')?.dataset.del;
    if (del && await confirmDialog('Delete this namespace?', 'Only an empty namespace can be deleted. For one with articles, archive or hide it instead.', 'Delete', true)) {
      try { await api.del(`/api/admin/namespaces/${del}`); toast('Deleted.'); refresh(); } catch (err) { toast(err.message, 'error'); }
    }
  };
}

// Sections are edited as text, one per line: "Basics: Full name, Age, Gender".
const sectionsToText = (sections) => (sections || []).map((s) => `${s.name}: ${s.fields.join(', ')}`).join('\n');
const textToSections = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.indexOf(':');
  return i < 0 ? { name: l, fields: [] } : { name: l.slice(0, i).trim(), fields: l.slice(i + 1).split(',').map((f) => f.trim()).filter(Boolean) };
});

function templatesTab(el) {
  let list = structuredClone(state.templates);
  let openKey = null;
  const draw = () => {
    el.innerHTML = `
      <p class="muted">Templates give each kind of article its infobox fields and starter text. Changing one doesn’t change articles already written, apart from which infobox fields are grouped where.</p>
      <div class="tpl-admin">${list.map((t, i) => `
        <details class="panel tpl-item" ${openKey === t.key ? 'open' : ''} data-i="${i}">
          <summary>${icon(t.icon)} <b>${esc(t.label)}</b> <code>${esc(t.key)}</code>
            <small class="muted">${esc(state.groups[t.group] || '')}${t.themes?.length ? ` · only ${t.themes.map((x) => esc(state.themes[x] || x)).join(', ')}` : ''}</small>
            <span class="spacer"></span>
            <button type="button" class="icon-btn" data-up="${i}" title="Move up">↑</button>
            <button type="button" class="icon-btn" data-down="${i}" title="Move down">↓</button>
          </summary>
          <div class="form-grid">
            <label class="field"><span>Name</span><input data-k="label" value="${esc(t.label)}"></label>
            <label class="field"><span>Plural (for lists)</span><input data-k="plural" value="${esc(t.plural)}"></label>
            <label class="field"><span>Group</span><select data-k="group">${Object.entries(state.groups).map(([k, l]) => `<option value="${k}" ${k === t.group ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
            <label class="field"><span>Icon</span><select data-k="icon">${ICON_NAMES.map((n) => `<option ${n === t.icon ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field wide"><span>When to use it</span><input data-k="hint" value="${esc(t.hint)}"></label>
            <div class="field wide"><span>Offer it in namespaces with these themes (none ticked = all)</span>
              <div class="row">${Object.entries(state.themes).map(([k, l]) => `<label class="check"><input type="checkbox" data-theme-k="${k}" ${t.themes?.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div></div>
            <label class="field wide"><span>Infobox: one section per line, as <code>Section: Field, Field, Field</code></span>
              <textarea data-k="sections" rows="5">${esc(sectionsToText(t.sections))}</textarea></label>
            <label class="field wide"><span>Starter text (Markdown)</span><textarea data-k="body" rows="8">${esc(t.body)}</textarea></label>
            <div class="wide"><button type="button" class="btn small danger" data-remove="${i}">${icon('trash')} Remove this template</button></div>
          </div>
        </details>`).join('')}</div>
      <div class="row">
        <button class="btn" id="addTpl">${icon('plus')} Add a template</button>
        <span class="spacer"></span>
        <button class="btn primary" id="saveTpl">${icon('check')} Save templates</button>
      </div>`;
  };
  const read = () => {
    for (const d of $$('.tpl-item', el)) {
      const t = list[Number(d.dataset.i)];
      for (const inp of $$('[data-k]', d)) t[inp.dataset.k] = inp.dataset.k === 'sections' ? textToSections(inp.value) : inp.value;
      t.themes = $$('[data-theme-k]:checked', d).map((c) => c.dataset.themeK);
      if (d.open) openKey = t.key;
    }
  };
  draw();
  el.onclick = async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.up || b.dataset.down) {
      e.preventDefault();
      read();
      const i = Number(b.dataset.up ?? b.dataset.down), j = b.dataset.up ? i - 1 : i + 1;
      if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
      draw();
    }
    if (b.dataset.remove) {
      read();
      list.splice(Number(b.dataset.remove), 1);
      draw();
    }
    if (b.id === 'addTpl') {
      read();
      dialog({
        title: 'New template', submit: 'Add',
        body: '<label class="field"><span>Key (lowercase, can’t be changed later)</span><input name="key" required pattern="[a-z0-9\\-]{1,32}" placeholder="mechanic"></label><label class="field"><span>Name</span><input name="label" required placeholder="Mechanic shop"></label>',
        onSubmit: (f) => {
          const key = f.get('key');
          if (list.some((t) => t.key === key)) { toast('That key is taken.', 'error'); return false; }
          list.push({ key, label: f.get('label'), plural: f.get('label'), icon: 'file-text', group: 'other', hint: '', themes: [], sections: [], body: '' });
          openKey = key;
          draw();
        },
      });
    }
    if (b.id === 'saveTpl') {
      read();
      try {
        await api.put('/api/admin/templates', { templates: list });
        await loadSession();
        list = structuredClone(state.templates);
        toast('Templates saved.');
        draw();
      } catch (err) { toast(err.message, 'error'); }
    }
  };
}
