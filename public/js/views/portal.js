import * as api from '../api.js';
import { icon } from '../icons.js';
import { state, md, isAdmin } from '../state.js';
import { view, setTitle, changeList } from './common.js';
import { frontHero, cardsFromHtml, card, stat } from './frontpage.js';

// The site's front page: one directory button per namespace, and the welcome
// text (Admin → Site) cut into cards at each "## Heading".
export async function viewPortal() {
  setTitle();
  const s = state.settings;
  const [{ changes }, stats] = await Promise.all([api.get('/api/recent?limit=8'), api.get('/api/stats')]);
  const cards = cardsFromHtml(md(s.welcome || '', '', []));
  const intro = cards.shift();
  view().innerHTML = `
    <div class="page front">
      ${frontHero({
        title: `Welcome to the ${s.siteName}!`,
        searchLabel: 'the wiki',
        directories: state.namespaces.map((n) => ({ href: `/w/${n.slug}`, label: n.name, sub: n.archived ? 'Archived' : n.tagline, icon: 'globe', theme: n.theme })),
      })}
      ${intro ? card(intro.title, `<div class="prose">${intro.html}</div>`, 'fcard-intro') : ''}
      <div class="front-grid">
        ${card('The wiki in numbers', `<div class="stats">${stat(stats.articles, 'Articles')}${stat(stats.edits, 'Edits')}${stat(stats.editors, 'Writers')}</div>
          <p class="muted small">${state.user ? 'Pick a wiki above and start writing.' : '<a href="/login" data-link>Sign in with Discord</a> to start writing.'}</p>`, 'fcard-accent')}
        ${cards.map((c) => card(c.title, `<div class="prose">${c.html}</div>`)).join('')}
        ${card('Latest changes', `${changeList(changes.slice(0, 6))}<p class="fcard-more"><a href="/recent" data-link>All recent changes ${icon('arrow-right')}</a></p>`)}
      </div>
      ${isAdmin() ? `<p class="front-edit"><a href="/admin" data-link>[edit this page in Admin → Site]</a></p>` : ''}
      ${!state.namespaces.length ? `<p class="muted center">No namespaces yet.${isAdmin() ? ' <a href="/admin/namespaces" data-link>Add one</a>.' : ''}</p>` : ''}
    </div>`;
}
