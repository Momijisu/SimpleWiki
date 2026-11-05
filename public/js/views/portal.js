import { esc } from '../util.js';
import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, isAdmin } from '../state.js';
import { view, setTitle, changeList } from './common.js';

export async function viewPortal() {
  setTitle();
  const s = state.settings;
  const { changes } = await api.get('/api/recent?limit=15');
  view().innerHTML = `
    <div class="page wide">
      <section class="hero">
        <h1 class="hero-title">${esc(s.siteName)}</h1>
        ${s.tagline ? `<p class="hero-tagline">${esc(s.tagline)}</p>` : ''}
        ${s.welcome ? `<div class="prose hero-welcome">${md(s.welcome, '', [])}</div>` : ''}
      </section>
      <section class="ns-cards">
        ${state.namespaces.map((n) => `
          <a class="ns-card" data-theme="${n.theme}" href="/w/${n.slug}" data-link>
            <span class="ns-card-kicker">${esc(state.themes[n.theme] || n.theme)}${n.archived ? ' · Archived' : ''}${n.hidden ? ' · Hidden' : ''}</span>
            <span class="ns-card-title">${esc(n.name)}</span>
            <span class="ns-card-tagline">${esc(n.tagline)}</span>
            <span class="ns-card-go">Enter ${icon('arrow-right')}</span>
          </a>`).join('') || `<p class="muted">No namespaces yet.${isAdmin() ? ' <a href="/admin/namespaces" data-link>Add one</a>.' : ''}</p>`}
      </section>
      <section class="panel">
        <h2 class="section-title">${icon('clock-counter-clockwise')} Latest changes</h2>
        ${changeList(changes)}
        <p><a href="/recent" data-link>All recent changes →</a></p>
      </section>
    </div>`;
}
