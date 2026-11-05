import { $, esc, toast, dialog } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, isMod } from '../state.js';
import { view, setTitle, changeList, when } from './common.js';
import { navigate } from '../app.js';

// Where to come back to after signing in: the page they were on, if any.
function nextPath() {
  const n = new URLSearchParams(location.search).get('next');
  return n && /^\/(?!\/)/.test(n) ? n : '/';
}

// The sign-in page. Everyone signs in with Discord; the first time makes the account.
export function viewLogin() {
  const s = state.settings;
  setTitle('Sign in');
  if (state.user) return navigate(nextPath(), true);
  const error = new URLSearchParams(location.search).get('error');
  view().innerHTML = `
    <div class="page narrow auth">
      <h1>Sign in</h1>
      ${error ? `<p class="banner danger">${icon('warning')} ${esc(error)}</p>` : ''}
      ${!state.canRead ? '<p class="muted center">This wiki is for members only.</p>' : ''}
      ${state.discord ? `<div class="panel">
        <a class="btn discord block" href="/auth/discord?next=${encodeURIComponent(nextPath())}">${icon('discord-logo')} Sign in with Discord</a>
        <p class="muted small center">New here? Signing in for the first time makes your account, named after your Discord username.
          ${s.registration === 'approval' ? 'A moderator approves new accounts before they can edit.' : ''}
          ${s.registration === 'closed' ? 'New accounts aren’t being accepted right now.' : ''}</p>
        <p class="muted small center">Only moderators can see which Discord account is yours.</p>
      </div>` : `<p class="banner">${icon('info')} Discord sign-in isn’t set up on this wiki yet. Ask the person who runs it.</p>`}
    </div>`;
}

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
        ${u.discordName ? `<p class="muted discord-who">${u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : icon('discord-logo')} Discord: <b>${esc(u.discordName)}</b>
          ${u.discordId ? `<code>${esc(u.discordId)}</code>` : ''} <span class="small">(only moderators and they can see this)</span></p>` : ''}
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
        ${u.discordName ? `<p class="discord-who">${u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : icon('discord-logo')}
          Signed in with Discord as <b>${esc(u.discordName)}</b></p>` : ''}
        <p>Your wiki name is <b>${esc(u.username)}</b> · ${esc(u.role)} · ${esc(u.status)}</p>
        ${u.status === 'pending' ? '<p class="banner">A moderator still has to approve your account before you can edit.</p>' : ''}
        ${u.status === 'banned' ? `<p class="banner danger">Your account is banned${u.banReason ? `: ${esc(u.banReason)}` : '.'}</p>` : ''}
        <p class="muted small">Only moderators can see which Discord account yours is. Your picture and name here update each time you sign in.</p>
        <a class="btn" href="/u/${encodeURIComponent(u.username)}" data-link>${icon('user')} Your profile</a>
      </div>
    </div>`;
}
