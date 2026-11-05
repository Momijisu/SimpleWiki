# Infoboxes for the Let's RP MediaWiki

Three infobox templates for MediaWiki 1.46 with the Citizen skin:
`{{Infobox character}}`, `{{Infobox organization}}` and `{{Infobox event}}`.

> **Status: not yet tested on a running MediaWiki.** Try the import on a test page first.

## Needs

ParserFunctions, Scribunto, TemplateStyles, TemplateData, TabberNeue, ShortDescription and InputBox (all enabled on the wiki).

## Install

1. Build the import file (or use the one in `dist/`):
   `python3 mediawiki/build.py`
2. On the wiki, go to **Special:Import** and upload `dist/infoboxes.xml`. The form asks for an
   **interwiki prefix**: type anything short, like `tpl` (it only labels who made the edits).
3. Open **Template:Infobox character** to see its documentation, a copy-and-paste blank and an example.

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
