import { $, esc, toast, dialog } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, loadSession, md, isMod } from '../state.js';
import { view, setTitle, changeList, when } from './common.js';
import { navigate } from '../app.js';

function authPage(kind) {
  const reg = kind === 'register';
  const s = state.settings;
  setTitle(reg ? 'Create an account' : 'Sign in');
  if (state.user) return navigate('/', true);
  const closed = reg && s.registration === 'closed';
  view().innerHTML = `
    <div class="page narrow auth">
      <h1>${reg ? 'Create an account' : 'Sign in'}</h1>
      ${!state.canRead && !reg ? '<p class="muted">This wiki is for members only.</p>' : ''}
      ${closed ? '<p class="banner">Sign-ups are closed. Ask an admin to make you an account.</p>' : `
      ${reg && s.registration === 'approval' ? '<p class="banner">New accounts are checked by a moderator before they can edit.</p>' : ''}
      <form id="authForm" class="panel">
        <label class="field"><span>Username</span><input name="username" required autocomplete="username" ${reg ? 'pattern="[A-Za-z0-9_.\\-]{3,32}" title="3–32 letters, numbers, dots, dashes or underscores"' : ''}></label>
        <label class="field"><span>Password</span><input name="password" type="password" required autocomplete="${reg ? 'new-password' : 'current-password'}" ${reg ? 'minlength="8"' : ''}></label>
        ${reg ? '<p class="muted small">Tip: use your out-of-character name or Discord name so people know who you are. Your characters get their own articles.</p>' : ''}
        <button class="btn primary block" type="submit">${reg ? 'Create account' : 'Sign in'}</button>
      </form>`}
      <p class="muted">${reg ? 'Already have an account? <a href="/login" data-link>Sign in</a>' : s.registration === 'closed' ? '' : 'New here? <a href="/register" data-link>Create an account</a>'}</p>
    </div>`;
  $('#authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.post(reg ? '/api/register' : '/api/login', { username: f.get('username'), password: f.get('password') });
      await loadSession();
      toast(reg ? (state.user.status === 'pending' ? 'Account created. A moderator will approve it soon.' : `Welcome, ${state.user.username}!`) : 'Signed in.');
      navigate(state.user.role === 'admin' && reg ? '/admin' : '/');
    } catch (err) { toast(err.message, 'error'); }
  });
}

export const viewLogin = () => authPage('login');
export const viewRegister = () => authPage('register');

export async function viewUser(name) {
  const u = await api.get(`/api/users/${encodeURIComponent(name)}`);
  setTitle(u.username);
  const me = state.user?.username === u.username;
  view().innerHTML = `
    <div class="page wide">
      <header class="page-head"><div>
        <div class="kicker">User</div>
        <h1>${icon('user-circle')} ${esc(u.username)} ${u.role !== 'user' ? `<i class="role role-${u.role}">${u.role}</i>` : ''}
          ${u.status !== 'active' ? `<i class="tag">${esc(u.status)}</i>` : ''}</h1>
        <p class="muted">Joined ${esc(new Date(u.createdAt).toLocaleDateString())} · ${u.edits} edit${u.edits === 1 ? '' : 's'} · ${u.created} article${u.created === 1 ? '' : 's'} started
          ${u.lastSeen ? ` · last seen ${when(u.lastSeen)}` : ''}</p>
        ${u.banReason ? `<p class="banner danger">Banned: ${esc(u.banReason)}</p>` : ''}
      </div>
      <div class="head-actions">
        ${me ? `<button class="btn" id="bioBtn">${icon('pencil-simple')} Edit about me</button>` : ''}
        ${isMod() && !me && u.id ? `<a class="btn" href="/mod?user=${encodeURIComponent(u.username)}" data-link>${icon('gavel')} Moderate</a>` : ''}
      </div></header>
      ${u.bio ? `<div class="prose panel">${md(u.bio, '', [])}</div>` : ''}
      <section class="panel">
        <h2 class="section-title">${icon('clock-counter-clockwise')} Contributions</h2>
        ${changeList(u.contributions)}
      </section>
    </div>`;
  $('#bioBtn')?.addEventListener('click', () => dialog({
    title: 'About me', submit: 'Save',
    body: `<label class="field"><span>Shown on your profile. Markdown works, and you can link your characters with [[gta:Their name]].</span>
      <textarea name="bio" rows="8" maxlength="2000">${esc(u.bio)}</textarea></label>`,
    onSubmit: async (f) => { await api.put('/api/me', { bio: f.get('bio') }); toast('Saved.'); viewUser(name); },
  }));
}

export function viewAccount() {
  if (!state.user) return navigate('/login', true);
  setTitle('Account');
  const u = state.user;
  view().innerHTML = `
    <div class="page narrow">
      <h1>${icon('gear')} Account</h1>
      <div class="panel">
        <p>Signed in as <b>${esc(u.username)}</b> · ${esc(u.role)} · ${esc(u.status)}</p>
        ${u.status === 'pending' ? '<p class="banner">A moderator still has to approve your account before you can edit.</p>' : ''}
        ${u.status === 'banned' ? `<p class="banner danger">Your account is banned${u.banReason ? `: ${esc(u.banReason)}` : '.'}</p>` : ''}
      </div>
      <form id="pwForm" class="panel">
        <h2 class="section-title">Change password</h2>
        <label class="field"><span>Current password</span><input name="current" type="password" required autocomplete="current-password"></label>
        <label class="field"><span>New password</span><input name="next" type="password" required minlength="8" autocomplete="new-password"></label>
        <button class="btn primary">Change password</button>
        <p class="muted small">This signs you out everywhere else.</p>
      </form>
    </div>`;
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api.post('/api/me/password', { current: f.get('current'), next: f.get('next') });
      e.target.reset();
      toast('Password changed.');
    } catch (err) { toast(err.message, 'error'); }
  });
}
