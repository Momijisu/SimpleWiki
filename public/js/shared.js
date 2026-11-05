// Code shared by the browser and the server: slugs and [[link]] parsing.
// Keep this file free of DOM and Node APIs.

export const LINK_RE = /\[\[([^\[\]|\n]+?)(?:\|([^\[\]\n]+?))?\]\]/g;

// "Los Santos Police Department" -> "los-santos-police-department"
export function slugify(title) {
  return String(title || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// Split a link target into namespace and title. "gta4:Tony Ramirez" points at
// another namespace only when "gta4" is the slug of a namespace that exists.
export function parseTarget(target, currentNs, nsSlugs) {
  const t = target.trim();
  const m = /^([a-z0-9-]+):(.+)$/i.exec(t);
  if (m && nsSlugs.includes(m[1].toLowerCase())) {
    return { ns: m[1].toLowerCase(), title: m[2].trim(), slug: slugify(m[2]) };
  }
  return { ns: currentNs, title: t, slug: slugify(t) };
}

// Every [[link]] in a piece of text, as {ns, slug, title}.
export function extractLinks(text, currentNs, nsSlugs) {
  const out = [];
  for (const m of String(text || '').matchAll(LINK_RE)) {
    const p = parseTarget(m[1], currentNs, nsSlugs);
    if (p.slug) out.push({ ns: p.ns, slug: p.slug, title: p.title });
  }
  return out;
}

export const ROLES = ['user', 'mod', 'admin'];
export const rank = (role) => Math.max(0, ROLES.indexOf(role));

export const PROTECTION = {
  none: 'Anyone with an account',
  mods: 'Moderators and admins',
  admins: 'Admins only',
};
