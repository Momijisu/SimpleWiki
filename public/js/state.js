// Shared app state: who's signed in, the site settings, namespaces and templates.
import * as api from './api.js';
import { rank } from './shared.js';
import { render, renderInline } from './markdown.js';

export const state = {
  user: null,
  settings: {},
  namespaces: [],
  templates: [],
  groups: {},
  themes: {},
  protection: {},
  canRead: true,
  ns: null,        // the namespace being viewed, if any
};

export async function loadSession() {
  const s = await api.get('/api/session');
  Object.assign(state, s);
  return s;
}

export const isMod = () => state.user?.status === 'active' && rank(state.user.role) >= rank('mod');
export const isAdmin = () => state.user?.status === 'active' && state.user.role === 'admin';
export const canWrite = () => state.user?.status === 'active';

export const nsBySlug = (slug) => state.namespaces.find((n) => n.slug === slug);
export const template = (key) => state.templates.find((t) => t.key === key) || { key, label: key, plural: key, icon: 'file-text', sections: [], body: '' };

// Templates offered in a namespace (filtered by its theme).
export const templatesFor = (ns) => state.templates.filter((t) => !t.themes?.length || t.themes.includes(ns?.theme));

const mdOptions = (ns, existing) => ({
  ns, existing,
  nsSlugs: state.namespaces.map((n) => n.slug),
  nsNames: Object.fromEntries(state.namespaces.map((n) => [n.slug, n.name])),
});
export const md = (text, ns, existing) => render(text, mdOptions(ns, existing));
export const mdInline = (text, ns, existing) => renderInline(text, mdOptions(ns, existing));

// Theme: the reader's own choice, or the namespace's, or the site default.
export function themePref() {
  try { return localStorage.getItem('sw-theme') || 'auto'; } catch { return 'auto'; }
}
export function setThemePref(v) {
  try { localStorage.setItem('sw-theme', v); } catch { /* storage blocked */ }
  applyTheme();
}
export function applyTheme() {
  const pref = themePref();
  const theme = pref !== 'auto' && state.themes[pref] ? pref : state.ns?.theme || state.settings.defaultTheme || 'gta';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('sw-last-theme', theme); } catch { /* storage blocked */ }
}
