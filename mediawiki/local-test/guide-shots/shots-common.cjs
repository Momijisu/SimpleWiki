const { chromium } = require('playwright');
const OUT = '/home/user/SimpleWiki/mediawiki/files/guides/';
const W = 'http://localhost:8080/index.php?title=';
async function start() {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.goto(W + 'Special:UserLogin');
  await p.fill('#wpName1', 'Admin'); await p.fill('#wpPassword1', 'LocalTestPass123'); await p.click('#wpLoginAttempt');
  await p.waitForLoadState('networkidle');
  // hide VisualEditor's welcome dialogs and the edit-mode notices
  await p.evaluate(async () => {
    const api = new mw.Api();
    await api.saveOptions({ 'visualeditor-hidebetawelcome': 1, 'visualeditor-hideusered': 1, 'visualeditor-hidetabdialog': 1, 'visualeditor-hidesourceswitchpopup': 1, 'visualeditor-hidevisualswitchpopup': 1, 'visualeditor-editor': 'visualeditor', 'visualeditor-tabs': 'remember-last' });
  });
  return { b, p };
}
// Draw a red box around an element (for "click here" pictures)
async function mark(p, sel) {
  await p.evaluate((s) => {
    document.querySelectorAll('.shot-mark').forEach(e => e.remove());
    const el = typeof s === 'string' ? document.querySelector(s) : null; if (!el) return;
    const r = el.getBoundingClientRect(); const m = document.createElement('div'); m.className = 'shot-mark';
    Object.assign(m.style, { position: 'fixed', left: (r.left - 4) + 'px', top: (r.top - 4) + 'px', width: (r.width + 8) + 'px', height: (r.height + 8) + 'px', border: '3px solid #ef4444', borderRadius: '6px', zIndex: 99999, pointerEvents: 'none' });
    document.body.appendChild(m);
  }, sel);
}
async function unmark(p) { await p.evaluate(() => document.querySelectorAll('.shot-mark').forEach(e => e.remove())); }
async function shot(p, name, clip) {
  const opts = { path: OUT + name };
  if (clip) opts.clip = clip;
  await p.screenshot(opts); console.log('saved', name);
}
async function openVE(p, title) {
  await p.goto(W + encodeURIComponent(title) + '&veaction=edit');
  await p.waitForSelector('.ve-ce-surface .ve-ce-branchNode', { timeout: 30000 });
  await p.waitForTimeout(1500);
  for (const t of ['Start editing', 'Okay', 'Got it']) { const btn = p.getByRole('button', { name: t }); if (await btn.count()) await btn.first().click().catch(() => {}); }
  await p.waitForTimeout(500);
}
module.exports = { start, mark, unmark, shot, openVE, W, OUT };
// Put the cursor at the very end of the paragraph containing `text`
module.exports.clickEndOf = async function (p, text) {
  const pt = await p.evaluate((t) => {
    const ps = [...document.querySelectorAll('.ve-ce-surface p')].filter(e => e.textContent.includes(t));
    const el = ps[0]; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let last = null, n;
    while ((n = w.nextNode())) if (n.textContent.trim()) last = n;
    const r = document.createRange(); r.setStart(last, last.textContent.length - 1); r.setEnd(last, last.textContent.length);
    const b = r.getBoundingClientRect(); return { x: b.right - 1, y: b.top + b.height / 2 };
  }, text);
  await p.mouse.click(pt.x, pt.y); await p.keyboard.press('End');
};
module.exports.markText = async function (p, text, sel = '.mw-parser-output p') {
  await p.evaluate(([t, s]) => {
    const el = [...document.querySelectorAll(s)].find(e => e.textContent.includes(t)); if (!el) return;
    const r = el.getBoundingClientRect(); const m = document.createElement('div'); m.className = 'shot-mark';
    Object.assign(m.style, { position: 'fixed', left: (r.left - 6) + 'px', top: (r.top - 4) + 'px', width: (r.width + 12) + 'px', height: (r.height + 8) + 'px', border: '3px solid #ef4444', borderRadius: '6px', zIndex: 99999, pointerEvents: 'none' });
    document.body.appendChild(m);
  }, [text, sel]);
};
module.exports.resetTony = async function () {
  require('child_process').execSync(`cd /home/user/SimpleWiki/mediawiki/local-test && docker compose exec -T wiki bash -c 'cd /var/www/html && php maintenance/run.php edit --user Admin --summary reset "Tony Ramirez" < /import/test-pages/Tony_Ramirez.wiki'`);
};
