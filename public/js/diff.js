// A small line diff (LCS), with word-level highlights inside changed lines.
import { esc } from './util.js';

function lcs(a, b) {
  const n = a.length, m = b.length;
  // Trim the common start and end so the table stays small.
  let start = 0;
  while (start < n && start < m && a[start] === b[start]) start++;
  let endA = n, endB = m;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const A = a.slice(start, endA), B = b.slice(start, endB);
  const ops = [];
  for (let i = 0; i < start; i++) ops.push(['=', a[i]]);
  if (A.length * B.length > 4_000_000) {
    // Too big to compare closely: show as replaced.
    A.forEach((x) => ops.push(['-', x]));
    B.forEach((x) => ops.push(['+', x]));
  } else {
    const w = B.length + 1;
    const t = new Uint32Array((A.length + 1) * w);
    for (let i = A.length - 1; i >= 0; i--) {
      for (let j = B.length - 1; j >= 0; j--) {
        t[i * w + j] = A[i] === B[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < A.length && j < B.length) {
      if (A[i] === B[j]) { ops.push(['=', A[i]]); i++; j++; }
      else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) ops.push(['-', A[i++]]);
      else ops.push(['+', B[j++]]);
    }
    while (i < A.length) ops.push(['-', A[i++]]);
    while (j < B.length) ops.push(['+', B[j++]]);
  }
  for (let i = endA; i < n; i++) ops.push(['=', a[i]]);
  return ops;
}

function wordDiff(a, b) {
  const ops = lcs(a.split(/(\s+)/), b.split(/(\s+)/));
  let left = '', right = '';
  for (const [op, w] of ops) {
    if (op === '=') { left += esc(w); right += esc(w); }
    else if (op === '-') left += `<del>${esc(w)}</del>`;
    else right += `<ins>${esc(w)}</ins>`;
  }
  return [left, right];
}

// Returns HTML rows for a unified diff, with unchanged runs folded.
export function diffHtml(before, after) {
  const ops = lcs(before.split('\n'), after.split('\n'));
  const rows = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i][0] === '=') { rows.push({ op: '=', html: esc(ops[i][1]) }); continue; }
    // Gather a block of removals followed by additions.
    const dels = [], adds = [];
    while (i < ops.length && ops[i][0] === '-') dels.push(ops[i++][1]);
    while (i < ops.length && ops[i][0] === '+') adds.push(ops[i++][1]);
    i--;
    const paired = Math.min(dels.length, adds.length);
    const outDel = [], outAdd = [];
    for (let k = 0; k < paired; k++) {
      const [l, r] = wordDiff(dels[k], adds[k]);
      outDel.push(l); outAdd.push(r);
    }
    dels.slice(paired).forEach((x) => outDel.push(esc(x)));
    adds.slice(paired).forEach((x) => outAdd.push(esc(x)));
    outDel.forEach((h) => rows.push({ op: '-', html: h }));
    outAdd.forEach((h) => rows.push({ op: '+', html: h }));
  }
  if (!rows.some((r) => r.op !== '=')) return '<p class="muted">No differences.</p>';
  // Fold long unchanged stretches, keeping 2 lines of context.
  const keep = rows.map((r, i) => r.op !== '=' || rows.slice(Math.max(0, i - 2), i + 3).some((x) => x.op !== '='));
  let html = '';
  let skipped = 0;
  rows.forEach((r, i) => {
    if (!keep[i]) { skipped++; return; }
    if (skipped) { html += `<div class="d-fold">… ${skipped} unchanged line${skipped === 1 ? '' : 's'} …</div>`; skipped = 0; }
    html += `<div class="d-${r.op === '=' ? 'same' : r.op === '-' ? 'del' : 'add'}"><span class="d-sign">${r.op === '=' ? ' ' : r.op}</span><span>${r.html || '&nbsp;'}</span></div>`;
  });
  if (skipped) html += `<div class="d-fold">… ${skipped} unchanged line${skipped === 1 ? '' : 's'} …</div>`;
  return `<div class="diff">${html}</div>`;
}

// One article version as text, so infobox changes show in the diff too.
export function revisionText(r) {
  const lines = [`Title: ${r.title}`, `Template: ${r.template}`];
  if (r.image) lines.push(`Image: ${r.image}`);
  for (const [k, v] of Object.entries(r.fields || {})) lines.push(`${k}: ${v}`);
  return `${lines.join('\n')}\n\n${r.body}`;
}
