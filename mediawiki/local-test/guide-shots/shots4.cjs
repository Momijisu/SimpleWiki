const { start, mark, unmark, shot, openVE, W, clickEndOf, markText, resetTony } = require('./shots-common.cjs');
(async () => {
  resetTony();
  const { b, p } = await start();
  const step = async (n, f) => { try { await f(); } catch (e) { console.log('FAILED', n, e.message.split('\n')[0]); } await unmark(p); };
  const top = { x: 0, y: 0, width: 1280, height: 520 };
  const menu = async (group) => { await p.locator(`.ve-ui-toolbar-group-${group} .oo-ui-popupToolGroup-handle`).first().click(); await p.waitForTimeout(800); };
  await openVE(p, 'Southside Saints');
  await step('rowmenu', async () => {
    await p.keyboard.press('Control+End'); await p.waitForTimeout(300);
    await clickEndOf(p, 'Grove Street'); await p.keyboard.press('End'); await p.keyboard.press('Enter');
    await menu('insert'); await p.locator('.oo-ui-tool-name-insertTable a').first().click(); await p.waitForTimeout(1500);
    await p.locator('.ve-ce-surface table td').first().click(); await p.waitForTimeout(800);
    console.log(await p.evaluate(() => [...document.querySelectorAll('[class*=tableLineContext]')].map(e => e.className + ' ' + e.offsetWidth).slice(0, 8)));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
    const rb = await p.locator('.ve-ui-tableLineContext-row').first().boundingBox();
    await p.mouse.click(rb.x + rb.width / 2, rb.y + rb.height / 2); await p.waitForTimeout(900);
    await shot(p, 'VE advanced - insert row.png', top); await p.keyboard.press('Escape');
  });
  await step('reflist', async () => {
    await clickEndOf(p, 'Grove Street');
    await menu('insert'); await p.locator('.oo-ui-tool-name-more-fewer a:visible').first().click(); await p.waitForTimeout(800);
    const rl = p.locator('.oo-ui-tool-name-referencesList').first(); await rl.scrollIntoViewIfNeeded().catch(() => {});
    await shot(p, 'VE advanced - references list.png', top); await p.keyboard.press('Escape');
  });
  // ---- citation: a references section, in preview ----
  await step('refsection', async () => {
    await p.goto(W + 'Harbor_Bank_Heist&action=edit'); await p.waitForTimeout(2500);
    const ta = p.locator('#wpTextbox1'); const cur = await ta.inputValue();
    await ta.fill(cur.replace(/(\n[^\n]*\S[^\n]*)\s*$/, '$1') + "\n\nThe crew escaped by boat.<ref>[https://clips.twitch.tv/example Clip of the boat getaway], Tony's stream, 14 June 2026</ref> Two of them were arrested at the docks the next morning.<ref>[https://www.twitch.tv/videos/123456789 VOD of the arrests] (1:23:00), 15 June 2026</ref>\n\n== References ==\n<references />");
    await p.locator('#wpPreview').click(); await p.waitForTimeout(2500);
    const h = p.locator('#References, h2:has-text("References")').last(); await h.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    const bb = await h.boundingBox();
    await shot(p, 'Citation - reference section.png', { x: 0, y: Math.max(0, bb.y - 150), width: 1280, height: 330 });
  });
  // ---- adding images: upload ----
  await step('menu', async () => {
    await p.goto(W + 'Main_Page'); await p.waitForTimeout(1500);
    await p.locator('.citizen-drawer summary').first().click(); await p.waitForTimeout(1000);
    await markText(p, 'Upload file', '.citizen-drawer a, #citizen-drawer a, nav a');
    await shot(p, 'Adding images - menu upload file.png', { x: 0, y: 0, width: 900, height: 800 });
    await unmark(p);
  });
  await step('upload', async () => {
    await p.goto(W + 'Special:Upload'); await p.waitForTimeout(1500);
    await markText(p, 'Choose File', '.mw-htmlform-field-UploadSourceField, #wpUploadFile, .mw-upload-filefield, fieldset');
    const fs = p.locator('#mw-htmlform-source'); const bb = await fs.boundingBox();
    await shot(p, 'Adding images - choose file.png', { x: 0, y: Math.max(0, bb.y - 80), width: 1280, height: Math.min(560, bb.height + 160) });
    await unmark(p);
    await p.setInputFiles('#wpUploadFile', '/tmp/claude-0/-home-user/34c1a0e5-9da2-570e-b3ab-b8d14a9d5829/scratchpad/upl/Tony Ramirez portrait.png');
    await p.fill('#wpUploadDescription', "Tony Ramirez's look in Let's RP 2.0, from Tony's stream on 14 June 2026.");
    const d = p.locator('#mw-htmlform-description'); await d.scrollIntoViewIfNeeded(); const db = await d.boundingBox();
    await shot(p, 'Adding images - file details.png', { x: 0, y: Math.max(0, db.y - 20), width: 1280, height: Math.min(560, db.height + 40) });
    await p.selectOption('#wpLicense', 'Screenshot'); await p.waitForTimeout(2500);
    const l = p.locator('#wpLicense'); await l.scrollIntoViewIfNeeded(); const lb = await l.boundingBox();
    await shot(p, 'Adding images - licensing.png', { x: 0, y: Math.max(0, lb.y - 60), width: 1280, height: 300 });
    await p.locator('input[name=wpUpload], button[name=wpUpload]').first().click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(2000);
    await shot(p, 'Adding images - file uploaded.png', { x: 0, y: 0, width: 1280, height: 800 });
  });
  // ---- adding images: the Image field in the infobox form ----
  await openVE(p, 'Tony Ramirez');
  await step('ibform', async () => {
    const ib = p.locator('.ve-ce-surface .rp-infobox').first(); const bb = await ib.boundingBox();
    await p.mouse.click(bb.x + 60, bb.y + 420); await p.waitForTimeout(1200);
    await p.locator('.ve-ui-context a.oo-ui-buttonElement-button', { hasText: 'Edit' }).first().click(); await p.waitForTimeout(3000);
    await p.locator('.oo-ui-dialog').getByText('Image', { exact: true }).first().click(); await p.waitForTimeout(800);
    const input = p.locator('.oo-ui-dialog .ve-ui-mwParameterPage', { hasText: 'File name of the main picture' }).locator('textarea, input').first();
    await input.click(); await p.keyboard.type('Tony Ramirez portrait.png'); await p.waitForTimeout(800);
    await shot(p, 'Adding images - infobox edit 02.png');
  });
  await b.close();
})();
