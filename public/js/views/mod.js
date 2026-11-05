// Moderation: reports, people, deleted & protected articles, and the log.
import { $, esc, toast, dialog, fullDate } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, isMod, isAdmin } from '../state.js';
import { view, setTitle, userLink, when, articleHref } from './common.js';
import { rank } from '../shared.js';

const TABS = [['reports', 'Reports', 'flag'], ['users', 'People', 'users-three'], ['deleted', 'Deleted', 'trash'], ['protected', 'Protected', 'lock'], ['log', 'Log', 'newspaper']];

export async function viewMod() {
  if (!isMod()) throw new api.ApiError(403, { error: 'Only moderators can see this page.' });
  setTitle('Moderation');
  const params = new URLSearchParams(location.search);
  const tab = params.get('user') ? 'users' : params.get('tab') || 'reports';
  const data = await api.get('/api/mod/overview');
  const open = data.reports.filter((r) => r.status === 'open').length;
  const badge = { reports: open, users: data.pending.length };
  view().innerHTML = `
    <div class="page wide">
      <header class="page-head"><div><h1>${icon('gavel')} Moderation</h1>
        <p class="muted">${open} open report${open === 1 ? '' : 's'} · ${data.pending.length} account${data.pending.length === 1 ? '' : 's'} waiting for approval</p></div></header>
      <nav class="tabs">${TABS.map(([k, l, ic]) => `<a href="/mod?tab=${k}" data-link class="${k === tab ? 'on' : ''}">${icon(ic)} ${l}${badge[k] ? ` <span class="count hot">${badge[k]}</span>` : ''}</a>`).join('')}</nav>
      <div id="modBody"></div>
    </div>`;
  const body = $('#modBody');

  if (tab === 'reports') {
    body.innerHTML = data.reports.length ? `<ul class="reports">${data.reports.map((r) => `
      <li class="report ${r.status}">
        <div><a href="${articleHref(r.ns, r.slug)}" data-link><b>${esc(r.title)}</b></a> <span class="ns-chip">${esc(r.ns)}</span>
          · reported by ${userLink(r.user)} ${when(r.createdAt)} <i class="tag">${esc(r.status)}</i></div>
        <blockquote>${esc(r.reason)}</blockquote>
        ${r.status !== 'open' ? `<p class="muted small">${esc(r.status)} by ${userLink(r.resolvedBy)}${r.note ? `: ${esc(r.note)}` : ''}</p>` : ''}
        <div class="row">
          <a class="btn small" href="${articleHref(r.ns, r.slug)}/history" data-link>${icon('clock-counter-clockwise')} History</a>
          ${r.status === 'open' ? `<button class="btn small primary" data-report="${r.id}" data-status="resolved">${icon('check')} Resolved</button>
            <button class="btn small ghost" data-report="${r.id}" data-status="dismissed">Dismiss</button>`
            : `<button class="btn small ghost" data-report="${r.id}" data-status="open">Reopen</button>`}
        </div>
      </li>`).join('')}</ul>` : '<p class="muted">No reports. All quiet.</p>';
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-report]');
      if (!b) return;
      const status = b.dataset.status;
      const done = async (note = '') => { await api.post(`/api/mod/reports/${b.dataset.report}`, { status, note }); toast('Saved.'); viewMod(); };
      if (status === 'open') return done().catch((err) => toast(err.message, 'error'));
      dialog({
        title: status === 'resolved' ? 'Mark as resolved' : 'Dismiss report', submit: 'Save',
        body: '<label class="field"><span>Note (optional, for other moderators)</span><input name="note" maxlength="1000"></label>',
        onSubmit: (f) => done(f.get('note')),
      });
    });
  }

  if (tab === 'users') await usersTab(body, params.get('user') || '');

  if (tab === 'deleted') {
    body.innerHTML = data.deleted.length ? `<ul class="plain-list">${data.deleted.map((a) => `
      <li><a href="${articleHref(a.ns, a.slug)}" data-link>${esc(a.title)}</a> <span class="ns-chip">${esc(a.ns)}</span>
        <button class="btn small" data-restore="${esc(a.ns)}/${esc(a.slug)}">${icon('arrow-counter-clockwise')} Restore</button></li>`).join('')}</ul>`
      : '<p class="muted">Nothing has been deleted.</p>';
    body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-restore]');
      if (!b) return;
      const [ns, slug] = b.dataset.restore.split('/');
      await api.post(`${api.articleUrl(ns, slug)}/restore`);
      toast('Restored.');
      viewMod();
    });
  }

  if (tab === 'protected') {
    body.innerHTML = data.protected.length ? `<ul class="plain-list">${data.protected.map((a) => `
      <li><a href="${articleHref(a.ns, a.slug)}" data-link>${esc(a.title)}</a> <span class="ns-chip">${esc(a.ns)}</span>
        <span class="muted">${esc(state.protection[a.protection])}</span></li>`).join('')}</ul>`
      : '<p class="muted">No protected articles. Protect one from its “More” menu.</p>';
  }

  if (tab === 'log') {
    body.innerHTML = `<table class="log"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead><tbody>
      ${data.audit.map((l) => `<tr><td title="${esc(fullDate(l.createdAt))}">${when(l.createdAt)}</td><td>${userLink(l.user)}</td>
        <td>${esc(l.action)}</td><td>${esc(l.target)}</td><td>${esc(l.detail)}</td></tr>`).join('')}</tbody></table>`;
  }
}

async function usersTab(body, initial) {
  body.innerHTML = `
    <div class="row"><input type="search" id="userSearch" placeholder="Find a user or Discord name…" value="${esc(initial)}"></div>
    <div id="userList"></div>`;
  const load = async () => {
    const { users } = await api.get(`/api/mod/users?q=${encodeURIComponent($('#userSearch').value)}`);
    $('#userList').innerHTML = `<table class="users"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Edits</th><th>Joined</th><th></th></tr></thead><tbody>
      ${users.map((u) => {
        const self = u.id === state.user.id;
        const canTouch = !self && (isAdmin() || rank(u.role) < rank(state.user.role));
        return `<tr class="${u.status}">
          <td>${userLink(u.username)}${u.discordName ? `<br><small class="muted" title="Discord id ${esc(u.discordId)}">${icon('discord-logo')} ${esc(u.discordName)}</small>` : ''}</td>
          <td>${isAdmin() && !self ? `<select data-role="${u.id}">${['user', 'mod', 'admin'].map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select>` : esc(u.role)}
            ${u.roleSource === 'discord' ? '<br><small class="muted">from Discord roles</small>' : ''}</td>
          <td><span class="status-${u.status}">${esc(u.status)}</span>${u.banReason ? `<br><small class="muted">${esc(u.banReason)}</small>` : ''}</td>
          <td>${u.edits}</td>
          <td>${esc(new Date(u.createdAt).toLocaleDateString())}</td>
          <td class="row">${canTouch ? `
            ${u.status === 'pending' ? `<button class="btn small primary" data-status="active" data-id="${u.id}">Approve</button>` : ''}
            ${u.status === 'banned' ? `<button class="btn small" data-status="active" data-id="${u.id}">Unban</button>`
              : `<button class="btn small danger" data-status="banned" data-id="${u.id}" data-name="${esc(u.username)}">Ban</button>`}` : ''}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  };
  await load();
  $('#userSearch').addEventListener('input', () => load());
  body.addEventListener('change', async (e) => {
    const id = e.target.dataset.role;
    if (!id) return;
    try { await api.post(`/api/mod/users/${id}`, { role: e.target.value }); toast('Role changed.'); } catch (err) { toast(err.message, 'error'); load(); }
  });
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.status === 'banned') {
      return dialog({
        title: `Ban ${b.dataset.name}?`, submit: 'Ban', danger: true,
        body: '<label class="field"><span>Reason (they’ll see it)</span><input name="reason" maxlength="1000" required></label><p class="muted small">They can still read, but can’t edit or report, and can’t get back in with a new account from the same Discord account. Their edits stay; revert them from each article’s history.</p>',
        onSubmit: async (f) => { await api.post(`/api/mod/users/${b.dataset.id}`, { status: 'banned', banReason: f.get('reason') }); toast('Banned.'); load(); },
      });
    }
    if (b.dataset.status) {
      try { await api.post(`/api/mod/users/${b.dataset.id}`, { status: b.dataset.status }); toast('Saved.'); load(); } catch (err) { toast(err.message, 'error'); }
    }
  });
}
