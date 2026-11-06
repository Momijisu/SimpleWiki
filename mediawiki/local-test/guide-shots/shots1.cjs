const { start, mark, unmark, shot, openVE, W, clickEndOf, markText, resetTony } = require('./shots-common.cjs');
(async () => {
  resetTony();
  const { b, p } = await start();
  const step = async (n, f) => { try { await f(); } catch (e) { console.log('FAILED', n, e.message.split('\n')[0]); } };
  // ---- Your first edit ----
  await p.goto(W + 'Tony_Ramirez'); await p.waitForTimeout(1500);
  await step('problem', async () => { await markText(p, 'mechanic by day'); await shot(p, 'YFE - problem found.png', { x: 0, y: 0, width: 1280, height: 420 }); await unmark(p); });
  await step('editbtn', async () => { const sel = (await p.$('#ca-ve-edit')) ? '#ca-ve-edit' : '#ca-edit'; await mark(p, sel); await shot(p, 'YFE - edit button.png', { x: 560, y: 0, width: 720, height: 160 }); await unmark(p); });
  await openVE(p, 'Tony Ramirez');
  await step('veopen', async () => shot(p, 'YFE - editor opened.png'));
  await step('typing', async () => {
    await clickEndOf(p, 'mechanic by day');
    await p.keyboard.type(' Born and raised on the south side, he is known around Los Santos as "Two-Times" and is rarely seen without a wrench in his hand.');
    await p.waitForTimeout(500);
    await shot(p, 'YFE - text edited.png', { x: 0, y: 0, width: 1280, height: 480 });
  });
  await step('savedlg', async () => {
    await p.locator('.ve-ui-toolbar-saveButton').click(); await p.waitForSelector('.ve-ui-mwSaveDialog', { state: 'visible' }); await p.waitForTimeout(1200);
    await shot(p, 'YFE - save your changes.png');
  });
  await step('review', async () => {
    await p.getByRole('button', { name: /Review your changes/ }).click(); await p.waitForTimeout(2500);
    await shot(p, 'YFE - review your changes.png');
    await p.getByRole('button', { name: /Return to save form/ }).click(); await p.waitForTimeout(800);
  });
  await step('summary', async () => {
    await p.locator('.ve-ui-mwSaveDialog-summary textarea').first().fill('Rewrote the introduction'); await p.waitForTimeout(400);
    await shot(p, 'YFE - edit summary.png');
  });
  await step('saved', async () => {
    await p.locator('.ve-ui-mwSaveDialog .oo-ui-processDialog-actions-primary a, .ve-ui-mwSaveDialog .oo-ui-processDialog-actions-primary button').first().click();
    await p.waitForSelector('.ve-ui-mwSaveDialog', { state: 'hidden', timeout: 20000 }); await p.waitForTimeout(2500);
    await shot(p, 'YFE - edit complete.png', { x: 0, y: 0, width: 1280, height: 560 });
  });
  await b.close();
})();
