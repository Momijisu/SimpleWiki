const { start, mark, unmark, shot, openVE, W, clickEndOf, markText, resetTony } = require('./shots-common.cjs');
(async () => {
  resetTony();
  const { b, p } = await start();
  const step = async (n, f) => { try { await f(); } catch (e) { console.log('FAILED', n, e.message.split('\n')[0]); } await unmark(p); };
  const top = { x: 0, y: 0, width: 1280, height: 520 };
  await openVE(p, 'Tony Ramirez');
  await step('open', () => shot(p, 'VE basics - editor opened.png'));
  await step('linkpopup', async () => {
    const bb = await p.locator('.ve-ce-surface .ve-ce-linkAnnotation', { hasText: 'Southside Saints' }).first().boundingBox(); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(1200);
    await shot(p, 'VE basics - link popup.png', top);
  });
  await step('linkedit', async () => {
    await p.locator('.ve-ui-context').getByRole('button', { name: 'Edit' }).first().click(); await p.waitForTimeout(1500);
    await shot(p, 'VE basics - link editing.png', top);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  });
  await step('linkinsert', async () => {
    // select the word "mechanic" and press the link button
    await p.evaluate(() => {
      const el = [...document.querySelectorAll('.ve-ce-surface p')].find(e => e.textContent.includes('mechanic by day'));
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const i = n.textContent.indexOf('mechanic'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 8); const s = getSelection(); s.removeAllRanges(); s.addRange(r); break; } }
      document.dispatchEvent(new Event('selectionchange'));
    });
    await p.waitForTimeout(400);
    await p.locator('.oo-ui-tool-name-link a').first().click(); await p.waitForTimeout(1800);
    await shot(p, 'VE basics - link insert.png', top);
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  });
  await step('bold', async () => {
    await p.locator('.ve-ui-toolbar-group-style .oo-ui-popupToolGroup-handle').first().click(); await p.waitForTimeout(800);
    await shot(p, 'VE basics - bolding.png', top);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  });
  await step('list', async () => {
    await clickEndOf(p, 'mechanic by day');
    await p.locator('.ve-ui-toolbar-group-structure .oo-ui-popupToolGroup-handle').first().click(); await p.waitForTimeout(800);
    await shot(p, 'VE basics - list.png', top);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  });
  await step('insertmenu', async () => {
    await clickEndOf(p, 'tow truck');
    await p.locator('.ve-ui-toolbar-group-insert .oo-ui-popupToolGroup-handle').first().click(); await p.waitForTimeout(800);
    await shot(p, 'VE basics - insert image button.png', top);
  });
  await step('mediadlg', async () => {
    await p.locator('.oo-ui-tool-name-media a').first().click(); await p.waitForTimeout(2000);
    const box = p.locator('.ve-ui-mwMediaDialog input[type=search], .ve-ui-mwMediaDialog .oo-ui-searchWidget-query input').first();
    await box.fill('Saints'); await p.waitForTimeout(3000);
    await shot(p, 'VE basics - insert image dialog.png');
  });
  await step('caption', async () => {
    await p.locator('.mw-widget-mediaResultWidget').first().click({ force: true }); await p.waitForTimeout(2500);
    await p.locator('.ve-ui-mwMediaDialog .oo-ui-processDialog-actions-primary', { hasText: 'Use this image' }).locator('a, button').first().click(); await p.waitForTimeout(2000);
    const cap = p.locator('.ve-ui-mwMediaDialog [contenteditable=true]').first();
    await cap.click(); await p.keyboard.type("The Southside Saints' logo"); await p.waitForTimeout(600);
    await shot(p, 'VE basics - image caption.png');
  });
  await step('position', async () => {
    await p.locator('.ve-ui-mwMediaDialog').getByText('Advanced', { exact: true }).first().click(); await p.waitForTimeout(1000);
    await shot(p, 'VE basics - image position.png');
    await p.locator('.ve-ui-mwMediaDialog').getByText('Left', { exact: true }).first().click(); await p.waitForTimeout(400);
  });
  await step('inserted', async () => {
    await p.locator('.ve-ui-mwMediaDialog .oo-ui-processDialog-actions-primary a, .ve-ui-mwMediaDialog .oo-ui-processDialog-actions-primary button').first().click(); await p.waitForTimeout(2500);
    await shot(p, 'VE basics - image inserted.png');
  });
  await b.close();
})();
