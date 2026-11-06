const { start, mark, unmark, shot, openVE, W, clickEndOf, markText, resetTony } = require('./shots-common.cjs');
(async () => {
  resetTony();
  const { b, p } = await start();
  const step = async (n, f) => { try { await f(); } catch (e) { console.log('FAILED', n, e.message.split('\n')[0]); } await unmark(p); };
  const top = { x: 0, y: 0, width: 1280, height: 520 };
  const menu = async (group) => { await p.locator(`.ve-ui-toolbar-group-${group} .oo-ui-popupToolGroup-handle`).first().click(); await p.waitForTimeout(800); };
  const tool = async (name) => { await p.locator(`.oo-ui-tool-name-${name} a`).first().click(); await p.waitForTimeout(1500); };
  await openVE(p, 'Southside Saints');
  // ---- VE advanced: headings, table ----
  await step('heading', async () => { await clickEndOf(p, ''); await menu('format'); await shot(p, 'VE advanced - insert heading.png', top); await p.keyboard.press('Escape'); });
  await step('tablemenu', async () => {
    // a new empty line at the end of the first paragraph
    await p.keyboard.press('End'); await p.keyboard.press('Enter');
    await menu('insert'); await shot(p, 'VE advanced - insert table.png', top);
  });
  await step('tableins', async () => { await tool('insertTable'); await p.waitForTimeout(800); await shot(p, 'VE advanced - table inserted.png', top); });
  await step('tablefill', async () => {
    const cells = [['Member', 'Rank', 'Joined'], ['Marisol Vega', 'Leader', 'January 2026'], ['Tony Ramirez', 'Getaway driver', 'March 2026']];
    // the new table has its first cell selected: type, Tab to the next cell
    const first = p.locator('.ve-ce-surface table.wikitable th, .ve-ce-surface table th').first();
    await first.dblclick(); await p.waitForTimeout(300);
    for (let r = 0; r < cells.length; r++) for (let c = 0; c < 3; c++) {
      const cell = p.locator('.ve-ce-surface table tr').nth(r).locator('td, th').nth(c);
      await cell.dblclick(); await p.waitForTimeout(150); await p.keyboard.type(cells[r][c]); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    }
    await p.waitForTimeout(500); await shot(p, 'VE advanced - table filled out.png', top);
  });
  await step('insertrow', async () => {
    await p.locator('.ve-ce-surface table tr').nth(2).locator('td').first().click(); await p.waitForTimeout(600);
    const h = p.locator('.ve-ui-tableLineContext-row, .ve-ui-tableLineContext').first();
    await p.locator('.ve-ce-tableNodeOverlay-editor, .ve-ui-tableLineContext-indicator-row, .ve-ce-tableNode-rowContext').first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(800); await shot(p, 'VE advanced - insert row.png', top); await p.keyboard.press('Escape');
  });
  // ---- references ----
  await step('cite', async () => { await clickEndOf(p, ''); await p.locator('.ve-ui-toolbar-group-cite .oo-ui-popupToolGroup-handle, .ve-ui-toolbar-group-cite').first().click(); await p.waitForTimeout(800); await shot(p, 'VE advanced - insert reference.png', top); });
  await step('reftext', async () => {
    const basic = p.locator('.oo-ui-tool-name-reference a').first();
    if (await basic.count()) await basic.click(); await p.waitForTimeout(1800);
    await p.locator('.ve-ui-mwReferenceDialog [contenteditable=true]').first().click();
    await p.keyboard.type("Clip of the Saints' first meeting, 12 January 2026"); await p.waitForTimeout(600);
    await shot(p, 'VE advanced - reference text.png');
    await p.locator('.ve-ui-mwReferenceDialog .oo-ui-processDialog-actions-primary a, .ve-ui-mwReferenceDialog .oo-ui-processDialog-actions-primary button').first().click(); await p.waitForTimeout(1200);
  });
  await step('reflist', async () => { await menu('insert'); const more = p.locator('.ve-ui-toolbar-group-insert .oo-ui-tool-name-more, .oo-ui-toolGroup-expandable-handle').first(); if (await more.count()) { await more.click().catch(() => {}); await p.waitForTimeout(600); } await shot(p, 'VE advanced - references list.png', top); await p.keyboard.press('Escape'); });
  // ---- template (infobox) ----
  await openVE(p, 'Tony Ramirez');
  await step('tplclick', async () => {
    const ib = p.locator('.ve-ce-surface .rp-infobox').first(); const bb = await ib.boundingBox();
    await p.mouse.click(bb.x + 60, bb.y + 420); await p.waitForTimeout(1200);
    await shot(p, 'VE advanced - template editing.png');
    await shot(p, 'Adding images - infobox edit 01.png');
  });
  await step('tplform', async () => {
    await p.locator('.ve-ui-context').getByRole('button', { name: 'Edit' }).first().click(); await p.waitForTimeout(3000);
    await shot(p, 'VE advanced - template form.png');
    // the Image field, for the adding images guide
    const img = p.locator('.ve-ui-mwTransclusionDialog .ve-ui-mwParameterPage', { hasText: 'Image' }).first();
    await img.scrollIntoViewIfNeeded().catch(() => {});
    const input = img.locator('textarea, input').first(); await input.click(); await p.keyboard.type('Tony Ramirez portrait.png'); await p.waitForTimeout(600);
    await shot(p, 'Adding images - infobox edit 02.png');
    await p.keyboard.press('Escape');
  });
  // ---- source mode ----
  await openVE(p, 'Tony Ramirez');
  await step('switch', async () => { await menu('editMode'); await shot(p, 'SM basics - switch to source.png', top); });
  await step('source', async () => {
    await p.locator('.oo-ui-tool-name-editModeSource a').first().click(); await p.waitForTimeout(3500);
    await shot(p, 'SM basics - source editor.png');
  });
  // ---- making a page from search ----
  await step('newpage', async () => {
    await p.goto(W + 'Special:Search&search=Marisol+Vega&fulltext=1'); await p.waitForTimeout(1500);
    await markText(p, 'Create the page', 'p, .mw-search-createlink');
    await shot(p, 'SM basics - making a page.png', { x: 0, y: 0, width: 1280, height: 420 });
  });
  // ---- redirect page (in source mode, as typed) ----
  await step('redirect', async () => {
    await p.goto(W + 'LSPD&action=edit'); await p.waitForTimeout(2500);
    const ta = p.locator('#wpTextbox1'); if (await ta.isVisible()) await ta.fill('#REDIRECT [[Los Santos Police Department]]');
    else { await p.locator('.CodeMirror, .cm-content').first().click(); await p.keyboard.type('#REDIRECT [[Los Santos Police Department]]'); }
    await p.locator('#wpPreview').click(); await p.waitForTimeout(2500);
    await shot(p, 'Redirect page.png', { x: 0, y: 0, width: 1280, height: 640 });
  });
  await b.close();
})();
