// Shared pieces of the front pages (the site's and each namespace's):
// logo, welcome title, search, directory buttons, and Markdown cut into cards.
import { esc } from '../util.js';
import { icon } from '../icons.js';
import { state } from '../state.js';

export function frontHero({ title, searchLabel, directories = [] }) {
  const logo = state.settings.logo;
  return `
    <section class="front-hero">
      <h1 class="front-title page-title">${esc(title)}</h1>
      <div class="front-logo">${logo ? `<img src="${esc(logo)}" alt="">` : '<span class="brand-mark"></span>'}</div>
      <button class="front-search" data-open-search type="button">${icon('magnifying-glass')}
        <span><span class="desk-only">Click here or press <kbd>/</kbd> to search</span><span class="phone-only">Search</span> ${esc(searchLabel)}</span></button>
      ${directories.length ? `<nav class="dir-row">${directories.map((d) => `
        <a class="dir-btn" href="${d.href}" data-link${d.theme ? ` data-theme="${d.theme}"` : ''}>
          <span>${esc(d.label)}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</span>${icon(d.icon)}</a>`).join('')}</nav>` : ''}
    </section>`;
}

// Cut rendered Markdown into cards at each "## Heading". Text before the first
// heading becomes an untitled card. A section that's only a list of links is
// drawn as a column of buttons, like "Official links".
export function cardsFromHtml(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  const cards = [];
  let cur = null;
  for (const node of [...box.childNodes]) {
    if (node.nodeName === 'H2') {
      cur = { title: node.innerHTML, nodes: [] };
      cards.push(cur);
    } else {
      if (!cur) { cur = { title: '', nodes: [] }; cards.push(cur); }
      cur.nodes.push(node);
    }
  }
  return cards
    .filter((c) => c.title || c.nodes.some((n) => n.textContent.trim() || n.nodeName === 'IMG' || n.querySelector?.('img')))
    .map((c) => {
      const holder = document.createElement('div');
      holder.append(...c.nodes);
      for (const ul of holder.querySelectorAll('ul')) {
        const items = [...ul.children];
        const onlyLinks = items.length && items.every((li) => li.children.length === 1 && li.firstElementChild.tagName === 'A' && li.textContent.trim() === li.firstElementChild.textContent.trim());
        if (onlyLinks) ul.classList.add('link-list');
      }
      return { title: c.title, html: holder.innerHTML };
    });
}

export const card = (title, html, cls = '') => `<section class="fcard ${cls}">${title ? `<h2 class="fcard-title">${title}</h2>` : ''}${html}</section>`;

export const stat = (n, label) => `<div class="stat"><b>${Number(n).toLocaleString()}</b><span>${esc(label)}</span></div>`;
