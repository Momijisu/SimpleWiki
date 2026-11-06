# Infoboxes for the Let's RP MediaWiki

Three infobox templates for MediaWiki 1.46 with the Citizen skin:
`{{Infobox character}}`, `{{Infobox organization}}` and `{{Infobox event}}`.

> **Tested** on MediaWiki 1.46.2 with Citizen 3.25.1, ParserFunctions, Scribunto (Lua 5.1), TemplateStyles, TemplateData, TabberNeue, ShortDescription and InputBox: imported with Special:Import's engine, in light and dark mode, on desktop and phone.

## Needs

ParserFunctions, Scribunto, TemplateStyles, TemplateData, TabberNeue, ShortDescription and InputBox (all enabled on the wiki).

## Install

1. Build the import file (or use the one in `dist/`):
   `python3 mediawiki/build.py`
2. On the wiki, go to **Special:Import** and upload `dist/infoboxes.xml`. The form asks for an
   **interwiki prefix**: type anything short, like `tpl` (it only labels who made the edits).
3. Upload `files/Image_unavailable.png` at **Special:Upload** with exactly that name. Infoboxes
   without a picture show it; until it's uploaded they just show no picture.
4. Open **Template:Infobox character** to see its documentation, a copy-and-paste blank and an example.

## What's where

| Page | What it does |
|---|---|
| `Module:Infobox` | The Lua engine: fields, sections, badges, categories and short descriptions for all three |
| `Template:Infobox/styles.css` | The look (TemplateStyles), following Citizen's light and dark modes |
| `Template:Infobox …` | Each template: one line that calls the module |
| `Template:Infobox …/doc` | Documentation, allowed values and TemplateData |
| `Template:Infobox …/preload` | Starting text for new pages, used by `<inputbox>` buttons |

To change fields, edit `TYPES` in `pages/Module/Infobox.lua` **and** `TEMPLATES` in `build.py`
(which writes the docs), then rebuild. Or edit `Module:Infobox` directly on the wiki.

# Front page

A settings-driven Main Page: logo, search (opens Citizen's search), directory buttons with page
counts, an optional intro card, a featured article (picture and first paragraph taken from the
article itself; several rotate daily) and recent changes.

> **Tested** on the same local MediaWiki 1.46.2 + Citizen setup, desktop and phone, light and dark.

| Page | What it does |
|---|---|
| `Module:Main page/config.json` | **The settings**: edit this to change the front page. Protect it. |
| `Module:Main page` | Draws the page from the settings (its doc page lists every setting) |
| `Template:Main page/styles.css` | The look |

## Install

1. Import `dist/mainpage.xml` at **Special:Import** (prefix `tpl`). This **replaces the Main Page**
   with the one line `{{#invoke:Main page|render}}` (anything there before stays in its history).
2. Upload your logo with the file name used in the settings (`Lets RP Wiki logo.png`), or change
   `logo` in `Module:Main page/config.json` to the name of a logo you already have.
3. Add featured articles to `"featured": { "pages": [ … ] }` in the settings.
4. Protect `Module:Main page/config.json` and `Main Page` (admins only) so they can't be vandalised.

# Upload licences

`dist/licenses.xml` sets up the **Licensing** list on Special:Upload. Picking an entry adds its
licence box to the new file page, and the box files the picture in a category.

| Template | For |
|---|---|
| `{{Screenshot}}` | Screenshots and clips from the game, including your own (the game's pictures belong to Rockstar) |
| `{{Self}}` | Your own work, anyone may reuse it (CC BY-SA 4.0) |
| `{{Permission\|name}}` | Used with the creator's permission, all other rights kept |
| `{{Server}}` | Official Let's RP logos, artwork, announcements |
| `{{Fair use\|owner}}` | Real-world logos, covers or artwork, at a small size |
| `{{CC-BY-SA-4.0}}`, `{{CC-BY-4.0}}`, `{{CC0}}` | Someone else's freely licensed work |
| `{{No license}}` | Unknown: lands in the hidden *Files with no license* category for moderators |

Import it at **Special:Import** (prefix `tpl`). It replaces `MediaWiki:Licenses`. The wording is in
`licenses.py`; change it there and rebuild. `Template:License/doc` on the wiki explains which to use.

Optional, for the licence of the wiki's **text** (shown in the footer), in `LocalSettings.php`:

```php
$wgRightsUrl = 'https://creativecommons.org/licenses/by-sa/4.0/';
$wgRightsText = 'Creative Commons Attribution-ShareAlike 4.0';
$wgRightsIcon = "$wgResourceBasePath/resources/assets/licenses/cc-by-sa.png";
```

# If an import doesn't seem to change a page

MediaWiki only makes an imported version the current one when it's **newer than the page's last
edit**. The files are stamped with the time they were built, so if someone edited one of these pages
on the wiki after that, the import is added to the page's history but doesn't replace it.
Rebuild the files (`python3 mediawiki/build.py`) and import again, or paste the page by hand.
