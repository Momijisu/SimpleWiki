#!/usr/bin/env python3
"""Builds the files for Special:Import on the wiki. Run:  python3 mediawiki/build.py

  dist/infoboxes.xml  the three infoboxes, their docs and preload pages
  dist/mainpage.xml   the front page: the Main Page itself (one line), the module,
                      its settings and styles
  dist/licenses.xml   the upload licences: the list on Special:Upload, the licence
                      templates and their categories (see licenses.py)
  dist/help.xml       the help hub (Help:Contents) and the Card template (see help.py)
  dist/guides.xml     the editing guides, Help:Editing and its sub-pages (see guides.py)
  dist/notices.xml    notice templates for wiki maintenance: Stub, Draft, Cleanup... (see notices.py)

Hand-written pages live in pages/ (the Lua module and the CSS). The
templates, their documentation and their "preload" starter pages are
generated here from FIELDS, so the docs always match the templates."""

import json

import guides
import help as helppages
import licenses
import notices
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

HERE = Path(__file__).parent
NOW = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

# (field, label, description, example). Lists of allowed values come from the
# module itself on the doc page, so they can't drift.
COMMON_TOP = [
    ('name', 'Name', 'Shown as the infobox title. Leave empty to use the page title.', ''),
    ('image', 'Image', 'File name of the main picture, e.g. Tony.png (no File: needed).', ''),
    ('caption', 'Caption', 'Text under the main picture.', ''),
    ('image_label', 'Image tab label', 'Tab name for the main picture when there are several, e.g. 2025.', ''),
    ('image2', 'Image 2', 'Another picture: they become tabs. image3 … image5 work the same way.', ''),
    ('caption2', 'Caption 2', 'Text under image 2.', ''),
    ('image2_label', 'Image 2 tab label', 'Tab name for image 2.', ''),
]
COMMON_BOTTOM = [
    ('version', 'Server version', "Which version of the server, e.g. 2.0. Adds the category Let's RP 2.0.", '2.0'),
    ('shortdesc', 'Short description', 'Replaces the automatic grey line under the page title.', ''),
]

TEMPLATES = {
    'character': {
        'title': 'Infobox character',
        'about': 'For a character. Shows their status and focus as badges, sorts the page into categories, and writes the grey line under the title.',
        'checked': [('status', True), ('focus', True)],
        'fields': COMMON_TOP + [
            ('status', 'Status', 'Active, Inactive (the player has stopped playing them, but they are alive) or Deceased.', 'Active'),
            ('focus', 'Focus', 'What the character is currently focused on: Civilian, Criminal or Public Sector.', 'Criminal'),
            ('full_name', 'Full name', '', 'Antonio "Tony" Ramirez'),
            ('nicknames', 'Nicknames', '', 'Two-Times'),
            ('date_of_birth', 'Date of birth', '', '3 March 1992'),
            ('gender', 'Gender', '', 'Male'),
            ('nationality', 'Nationality', '', 'American'),
            ('occupation', 'Occupation', '', 'Mechanic'),
            ('employer', 'Employer', 'Link to an organization.', '[[Big Rig Customs]]'),
            ('affiliation', 'Affiliation', 'Gangs or organizations, as links.', '[[Southside Saints]]'),
            ('rank', 'Rank', 'Their position in that organization.', 'Soldier'),
            ('residence', 'Residence', '', 'Grove Street'),
            ('phone', 'Phone number', 'In-character number.', '555-0142'),
            ('family', 'Family', '', ''),
            ('partner', 'Partner', '', ''),
            ('died', 'Died', 'Only shown when status is Deceased.', ''),
            ('cause_of_death', 'Cause of death', 'Only shown when status is Deceased.', ''),
            ('killed_by', 'Killed by', 'Only shown when status is Deceased.', ''),
            ('played_by', 'Played by', 'The player.', 'TwoTimesTony'),
            ('first_seen', 'First seen', '', 'March 2026'),
            ('last_seen', 'Last seen', 'Also shown under the badges when the character is Inactive.', ''),
        ] + COMMON_BOTTOM,
        'skeleton': """== Overview ==
Who they are, in two or three sentences.

== Background ==
Where they came from and how they ended up here.

== Personality ==

== Relationships ==

== Notable events ==
""",
    },
    'organization': {
        'title': 'Infobox organization',
        'about': 'For a gang, a business or an emergency service. The type decides which extra section shows.',
        'checked': [('type', True), ('status', False)],
        'fields': COMMON_TOP + [
            ('type', 'Type', 'Gang, Business or Emergency Services.', 'Gang'),
            ('subtype', 'Subtype', 'More detail on the type, e.g. Police, EMS, Car dealership, Motorcycle club.', ''),
            ('status', 'Status', 'Active, Inactive or Defunct.', 'Active'),
            ('leader', 'Leader', 'The boss, owner or chief.', '[[Marisol Vega]]'),
            ('founded', 'Founded', '', 'January 2026'),
            ('founder', 'Founder', '', ''),
            ('defunct', 'Defunct', 'When it ended.', ''),
            ('headquarters', 'Headquarters', '', ''),
            ('members', 'Members', 'A number, or a list of links.', ''),
            ('territory', 'Territory', 'Gangs only.', 'Grove Street'),
            ('colours', 'Colours', 'Gangs only.', 'Purple and gold'),
            ('activities', 'Activities', 'Gangs only.', ''),
            ('industry', 'Industry', 'Businesses only.', ''),
            ('services', 'Products & services', 'Businesses only.', ''),
            ('owner', 'Owner', 'Businesses only.', ''),
            ('location', 'Location', 'Businesses only.', ''),
            ('hours', 'Opening hours', 'Businesses only.', ''),
            ('phone', 'Phone number', 'Businesses only.', ''),
            ('jurisdiction', 'Jurisdiction', 'Emergency Services only.', ''),
            ('divisions', 'Divisions', 'Emergency Services only.', ''),
            ('ranks', 'Ranks', 'Emergency Services only.', ''),
            ('allies', 'Allies', '', ''),
            ('rivals', 'Rivals', '', '[[Eastside Vipers]]'),
            ('predecessor', 'Predecessor', 'What it grew out of.', ''),
            ('successor', 'Successor', 'What it became.', ''),
            ('first_seen', 'First seen', '', ''),
            ('last_seen', 'Last seen', '', ''),
        ] + COMMON_BOTTOM,
        'skeleton': """== Overview ==

== History ==

== Members ==
{| class="wikitable"
! Rank !! Members
|-
| Leader || [[Someone]]
|}

== Relations ==
""",
    },
    'event': {
        'title': 'Infobox event',
        'about': 'For a server event: a heist, a war, a trial, an election, a community or official event.',
        'checked': [('type', True)],
        'fields': COMMON_TOP + [
            ('type', 'Type', 'Heist, Gang war, Shooting, Trial, Election, Community event, Official server event or Other.', 'Heist'),
            ('date', 'Date', '', '14 June 2026'),
            ('end_date', 'Ended', 'For events over several days.', ''),
            ('location', 'Location', '', 'Harbor Savings & Loan'),
            ('organised_by', 'Organised by', 'Players, an organization, or Server staff.', '[[Southside Saints]]'),
            ('participants', 'Participants', '', ''),
            ('factions', 'Factions involved', '', ''),
            ('outcome', 'Outcome', '', ''),
            ('casualties', 'Casualties', '', ''),
            ('arrests', 'Arrests', '', ''),
            ('previous', 'Previous event', 'Link to the event before this one.', ''),
            ('next', 'Next event', 'Link to the event after this one.', ''),
            ('media', 'Clips & media', 'Links to clips or VODs.', ''),
        ] + COMMON_BOTTOM,
        'skeleton': """== Summary ==
What happened, in a paragraph.

== Background ==

== Timeline ==

== Aftermath ==
""",
    },
}

# Fields left out of the blank copy-and-paste version (they're for extras).
OPTIONAL_IN_BLANK = {'image_label', 'image2', 'caption2', 'image2_label', 'shortdesc'}


def blank(t, with_examples=False):
    lines = ['{{' + t['title']]
    width = max(len(f[0]) for f in t['fields'])
    for name, _label, _desc, example in t['fields']:
        if not with_examples and name in OPTIONAL_IN_BLANK:
            continue
        if with_examples and not example:
            continue
        lines.append(f'| {name.ljust(width)} = {example if with_examples else ""}'.rstrip())
    lines.append('}}')
    return '\n'.join(lines)


# Fields where plain names become links (must match `link = true` in Module:Infobox).
# Single ones get VisualEditor's page-name suggestions; lists stay free text.
LINK_SINGLE = {'employer', 'partner', 'killed_by', 'leader', 'founder', 'owner',
               'predecessor', 'successor', 'organised_by', 'previous', 'next'}
LINK_LIST = {'affiliation', 'family', 'allies', 'rivals', 'participants', 'factions'}


def templatedata(key, t):
    checked = {c[0]: c[1] for c in t['checked']}
    params = {}
    for name, label, desc, example in t['fields']:
        param = {'label': label, 'type': 'string'}
        if desc:
            param['description'] = desc
        if example:
            param['example'] = example
        if name in checked:
            param['required' if checked[name] else 'suggested'] = True
        elif name in ('image',):
            param['type'] = 'wiki-file-name'
            param['suggested'] = True
        if name in LINK_SINGLE:
            param['type'] = 'wiki-page-name'
        if name in LINK_SINGLE | LINK_LIST:
            param['description'] = (desc + ' ' if desc else '') + 'Plain names become links; separate several with commas.'
        params[name] = param
    if key == 'character':
        params['status']['suggestedvalues'] = ['Active', 'Inactive', 'Deceased']
        params['focus']['suggestedvalues'] = ['Civilian', 'Criminal', 'Public Sector']
    if key == 'organization':
        params['type']['suggestedvalues'] = ['Gang', 'Business', 'Emergency Services']
        params['status']['suggestedvalues'] = ['Active', 'Inactive', 'Defunct']
    if key == 'event':
        params['type']['suggestedvalues'] = ['Heist', 'Gang war', 'Shooting', 'Trial', 'Election',
                                             'Community event', 'Official server event', 'Other']
    return json.dumps({
        'description': t['about'],
        'format': 'block',
        'params': params,
        'paramOrder': [f[0] for f in t['fields']],
    }, indent='\t', ensure_ascii=False)


def doc(key, t):
    checked_rows = '\n'.join(
        f'| <code>{f}</code> || {{{{#invoke:Infobox|values|{key}|{f}}}}} || {"yes" if req else "no"}\n|-'
        for f, req in t['checked'])
    field_rows = '\n'.join(
        f'| <code>{name}</code> || {label} || {desc}\n|-' for name, label, desc, _ in t['fields'])
    return f"""{t['about']}

The fields, sections and look are shared by all infoboxes and live in [[Module:Infobox]] and [[Template:Infobox/styles.css]].

== Copy and paste ==
<pre>
{blank(t)}
</pre>
Empty fields don't show. Extra pictures (<code>image2</code> … <code>image5</code>) turn into tabs.

In fields that name people, groups or events (employer, affiliation, family, leader, rivals, participants…), plain names become links: <code>Big Rig Customs</code> shows as [[Big Rig Customs]]. Separate several with commas; a note in brackets stays outside the link (<code>Rosa Ramirez (mother)</code>). Words like ''Unknown'' or ''None'', numbers, and anything that already has links or other markup are left as typed. The status, focus and type badges link to their categories.

== Checked fields ==
These only take certain values. Anything else is listed in [[:Category:Pages with infobox problems]].
{{| class="wikitable"
! Field !! Allowed values !! Required
|-
{checked_rows}
|}}

== All fields ==
{{| class="wikitable"
! Field !! Shows as !! Notes
|-
{field_rows}
|}}

== Example ==
<pre>
{blank(t, with_examples=True)}
</pre>

== Start a new page with this infobox ==
Put this box on a page (for example a directory page) to let people start a new article with the infobox and section headings already filled in:
<pre>
<inputbox>
type=create
preload=Template:{t['title']}/preload
buttonlabel=Create a page
placeholder=Page title
</inputbox>
</pre>

== TemplateData ==
<templatedata>
{templatedata(key, t)}
</templatedata>
"""


CATEGORIES = [
    ('Characters', None, 'Every character on the wiki. Pages are added by [[Template:Infobox character]].'),
    ('Active characters', 'Characters', 'Characters who are still being played.'),
    ('Inactive characters', 'Characters', "Characters whose player has stopped playing them. They're alive in the story."),
    ('Deceased characters', 'Characters', 'Characters who have died.'),
    ('Civilian characters', 'Characters', 'Characters currently focused on civilian life.'),
    ('Criminal characters', 'Characters', 'Characters currently focused on crime.'),
    ('Public Sector characters', 'Characters', 'Characters currently working in the public sector: police, medical, government.'),
    ('Organizations', None, 'Every gang, business and emergency service. Pages are added by [[Template:Infobox organization]].'),
    ('Gangs', 'Organizations', 'Gangs, crews, cartels, families and posses.'),
    ('Businesses', 'Organizations', 'Shops, bars, garages, clubs and other businesses.'),
    ('Emergency Services', 'Organizations', 'Police, EMS, fire and other emergency services.'),
    ('Active organizations', 'Organizations', 'Organizations that are active now.'),
    ('Inactive organizations', 'Organizations', 'Organizations that are quiet but not gone.'),
    ('Defunct organizations', 'Organizations', 'Organizations that no longer exist.'),
    ('Events', None, 'Every server event. Pages are added by [[Template:Infobox event]].'),
    ('Heists', 'Events', 'Heists and robberies.'),
    ('Gang wars', 'Events', 'Wars between gangs.'),
    ('Shootings', 'Events', 'Shootings.'),
    ('Trials', 'Events', 'Trials and court cases.'),
    ('Elections', 'Events', 'Elections.'),
    ('Community events', 'Events', 'Events organised by players.'),
    ('Official server events', 'Events', 'Events run by the server staff.'),
    ('Other events', 'Events', 'Events that fit no other type.'),
]


def pages():
    out = []
    out.append(('Module:Infobox', 828, 'Scribunto', 'text/plain', (HERE / 'pages/Module/Infobox.lua').read_text()))
    out.append(('Template:Infobox/styles.css', 10, 'sanitized-css', 'text/css', (HERE / 'pages/Template/Infobox/styles.css').read_text()))
    for key, t in TEMPLATES.items():
        title = 'Template:' + t['title']
        out.append((title, 10, 'wikitext', 'text/x-wiki',
                    f"<includeonly>{{{{#invoke:Infobox|{key}}}}}</includeonly><noinclude>\n{{{{{title}/doc}}}}\n</noinclude>"))
        out.append((title + '/doc', 10, 'wikitext', 'text/x-wiki', doc(key, t)))
        out.append((title + '/preload', 10, 'wikitext', 'text/x-wiki',
                    '<noinclude>The starting text for a new page; see [[' + title + ']].</noinclude>'
                    + blank(t) + '\n\n' + t['skeleton']))
    # The categories the infoboxes put pages in, so badge links and directory buttons
    # lead to real category pages. (category, parent, description)
    for cat, parent, about in CATEGORIES:
        text = about + ('\n\n[[Category:' + parent + ']]' if parent else '')
        out.append(('Category:' + cat, 14, 'wikitext', 'text/x-wiki', text))
    # Categories the ShortDescription and TabberNeue extensions add to every page that
    # uses them: hidden, so they don't show at the bottom of articles.
    for cat, what in (('Pages with short description', 'have a short description (the grey line under the title)'),
                      ('Pages using Tabber parser tag', 'use tabs (the <nowiki><tabber></nowiki> tag)')):
        out.append(('Category:' + cat, 14, 'wikitext', 'text/x-wiki',
                    f'__HIDDENCAT__\nAdded automatically to pages that {what}. Hidden from readers.'))
    out.append(('Category:Pages with infobox problems', 14, 'wikitext', 'text/x-wiki',
                '__HIDDENCAT__\nPages whose infobox has a missing or unknown value in a checked field '
                '(like status or type). The infobox on each page says what to fix.'))
    return out


def xml(pages, summary):
    parts = ['<mediawiki xmlns="http://www.mediawiki.org/xml/export-0.11/" version="0.11" xml:lang="en">']
    for title, ns, model, fmt, text in pages:
        parts.append(f"""  <page>
    <title>{escape(title)}</title>
    <ns>{ns}</ns>
    <revision>
      <timestamp>{NOW}</timestamp>
      <contributor><username>Wiki setup import</username></contributor>
      <comment>{escape(summary)}</comment>
      <model>{model}</model>
      <format>{fmt}</format>
      <text xml:space="preserve">{escape(text)}</text>
    </revision>
  </page>""")
    parts.append('</mediawiki>\n')
    return '\n'.join(parts)


MAINPAGE_DOC = """The front page. The '''Main Page''' only contains <code><nowiki>{{#invoke:Main page|render}}</nowiki></code>; everything on it is set in '''[[Module:Main page/config.json]]'''. Edit the settings there, not this module.

== Settings ==
{| class="wikitable"
! Setting !! What it does
|-
| <code>title</code>, <code>subtitle</code> || The welcome line and the line under it.
|-
| <code>logo</code> || File name of the logo (shown round). Upload it first; until it exists, no logo shows.
|-
| <code>background</code> || Optional picture behind the top of the page.
|-
| <code>stats</code> || <code>true</code> shows the article, file, member and edit counts at the top.
|-
| <code>search.text</code> || The words in the search bar. Clicking it opens the site search.
|-
| <code>search.suggestions</code> || Small buttons under the search bar. Each opens search with its <code>label</code> (or <code>prefill</code>) typed in.
|-
| <code>directories</code> || The row of directory buttons. Each has a <code>label</code> and either a <code>category</code> (it links there and shows how many pages it has) or a <code>link</code> to any page. Optional: <code>icon</code> (a small picture on the right), <code>image</code> (a picture filling the whole button, shown as it is; the label sits on its left side, so keep that part plain), <code>description</code> (instead of the count), <code>showCount: false</code>.
|-
| <code>intro</code> || An optional welcome card across the page: <code>title</code> and <code>text</code> (wikitext, links work).
|-
| <code>columns</code> || The cards under the intro: up to three columns, each a list of cards from top to bottom. On phones they stack. Each card has a <code>type</code> (below); add <code>"show": false</code> to hide one without deleting it.
|}

== Card types ==
{| class="wikitable"
! <code>type</code> !! Settings
|-
| <code>featured</code> || <code>pages</code>: featured articles; with several, a different one shows each day. Each entry is a page name, or <code>{ "page": "…", "image": "…", "text": "…", "label": "…" }</code> to override the picture, the text or the shown title. By default the picture comes from the article's infobox and the text is its first paragraph. Also <code>label</code>, <code>excerptLength</code>, <code>moreText</code>.
|-
| <code>startEditing</code> || <code>title</code>, <code>text</code>, <code>link</code> (the page the title goes to) and <code>stats</code>: any of <code>articles</code>, <code>edits</code>, <code>files</code>, <code>users</code>, <code>activeUsers</code>.
|-
| <code>links</code> || <code>title</code> and <code>links</code>: each <code>{ "label": "…", "page": "…" }</code> for a wiki page or <code>{ "label": "…", "url": "https://…" }</code> for a website. A link with an empty address shows greyed out until you fill it in.
|-
| <code>recentChanges</code> || <code>limit</code> (how many), <code>days</code>, <code>hideBots</code>, <code>hideMinor</code>, <code>hideLogs</code> (uploads, moves, deletions), <code>namespace</code> (0 = articles only; leave it out for every kind of page), <code>title</code>, <code>moreText</code>.
|-
| <code>text</code> || <code>title</code> and <code>text</code> (wikitext): rules, the latest update, an announcement.
|}

Leave a setting out (or empty) to hide that part. Problems, like a featured page that doesn't exist, show as a red note on the front page.

To try changes before they go live, preview any page with <code><nowiki>{{#invoke:Main page|render}}</nowiki></code> after saving the settings.
"""


def mainpage_pages():
    base = HERE / 'pages'
    return [
        ('Main Page', 0, 'wikitext', 'text/x-wiki', '{{#invoke:Main page|render}}'),
        ('Module:Main page', 828, 'Scribunto', 'text/plain', (base / 'Module/Main page.lua').read_text()),
        ('Module:Main page/config.json', 828, 'json', 'application/json', (base / 'Module/Main page/config.json').read_text()),
        ('Module:Main page/doc', 828, 'wikitext', 'text/x-wiki', MAINPAGE_DOC),
        ('Template:Main page/styles.css', 10, 'sanitized-css', 'text/css', (base / 'Template/Main page/styles.css').read_text()),
    ]


if __name__ == '__main__':
    dist = HERE / 'dist'
    dist.mkdir(exist_ok=True)
    for name, built, summary in (('infoboxes.xml', pages(), 'Infobox templates'), ('mainpage.xml', mainpage_pages(), 'Front page'),
                                  ('licenses.xml', licenses.pages(), 'Upload licences'),
                                  ('help.xml', helppages.pages(), 'Help pages'),
                                  ('guides.xml', guides.pages(), 'Editing guides'),
                                  ('notices.xml', notices.pages(), 'Notice templates')):
        (dist / name).write_text(xml(built, summary))
        print(f'Wrote {dist / name} with {len(built)} pages:')
        for p in built:
            print('  ', p[0])
