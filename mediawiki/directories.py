"""The three directories (Characters, Organizations, Server events): picture cards
for each sub-category, a box to start a new page, and a sortable table of every
page made with DynamicPageList4. Also the {{Directory card}} template the cards
use. build.py writes these to dist/directories.xml."""

CARD = """<includeonly><templatestyles src="Template:Directory card/styles.css" /><div class="rp-dcard rp-dcard--image">{{#ifexist:File:{{{image|-}}}|<div class="rp-dcard-bg">[[File:{{{image}}}|600px|link=|alt=]]</div>|{{#ifexist:File:{{{fallback|-}}}|<div class="rp-dcard-bg">[[File:{{{fallback}}}|600px|link=|alt=]]</div>|{{#ifexist:File:CardBackground_Default.png|<div class="rp-dcard-bg">[[File:CardBackground_Default.png|600px|link=|alt=]]</div>}}}}}}<div class="rp-dcard-text"><div class="rp-dcard-label">[[:{{#if:{{{link|}}}|{{{link}}}|Category:{{{category}}}}}|{{{label|{{{category}}}}}}]]</div>{{#if:{{{category|}}}|<div class="rp-dcard-count">{{PAGESINCATEGORY:{{{category}}}|pages}} {{#ifeq:{{PAGESINCATEGORY:{{{category}}}|pages|R}}|1|page|pages}}</div>}}</div></div></includeonly><noinclude>
{{Template:Directory card/doc}}
</noinclude>"""

STYLES = """/* Template:Directory card/styles.css: the picture cards on the directory pages,
   matching the directory buttons on the front page (TemplateStyles). */
.rp-dcards {
	display: grid;
	grid-template-columns: repeat( auto-fill, minmax( 210px, 1fr ) );
	gap: 10px;
	margin: 0.6em 0 1.4em;
}
.rp-dcard {
	position: relative;
	display: flex;
	align-items: center;
	min-height: 52px;
	padding: 10px 16px;
	overflow: hidden;
	border: 1px solid rgba( 127, 127, 127, 0.28 );
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.07 );
	transition: border-color 0.15s, transform 0.15s;
}
.rp-dcard:hover {
	border-color: rgba( 127, 127, 127, 0.55 );
	transform: translateY( -2px );
}
/* With a picture: the art sits on the right, over a dark fade from the left */
.rp-dcard--image {
	border-color: transparent;
	background: linear-gradient( to right, #000 0%, rgba( 0, 0, 0, 0.85 ) 35%, rgba( 0, 0, 0, 0.35 ) 100% );
}
.rp-dcard--image:hover {
	border-color: rgba( 255, 255, 255, 0.25 );
}
.rp-dcard-bg {
	position: absolute;
	inset: 0;
}
.rp-dcard-bg span,
.rp-dcard-bg a {
	display: block;
	width: 100%;
	height: 100%;
}
.rp-dcard-bg img {
	display: block;
	width: 100%;
	height: 100%;
	max-width: none;
	object-fit: cover;
	object-position: right center;
}
.rp-dcard--image::after {
	content: '';
	position: absolute;
	inset: 0;
	z-index: 1;
	background: linear-gradient( to right, rgba( 0, 0, 0, 0.9 ) 0%, rgba( 0, 0, 0, 0.5 ) 35%, rgba( 0, 0, 0, 0 ) 65% );
}
.rp-dcard-text {
	position: relative;
	z-index: 2;
	flex: 1;
	align-self: stretch;
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-width: 0;
	/* fill the whole card, so the stretched link below covers all of it */
	margin: -10px -16px;
	padding: 10px 16px;
}
.rp-dcard--image .rp-dcard-text {
	text-shadow: 0 1px 3px rgba( 0, 0, 0, 0.7 );
}
.rp-dcard-label {
	font-weight: 600;
}
.rp-dcard-label a,
.rp-dcard-label a:visited {
	color: inherit;
}
.rp-dcard--image .rp-dcard-label a,
.rp-dcard--image .rp-dcard-count {
	color: #fff;
}
/* The whole card is clickable: the label's link stretches over it */
.rp-dcard-label a::after {
	content: '';
	position: absolute;
	inset: 0;
}
.rp-dcard-count {
	margin-top: 2px;
	font-size: 0.8125rem;
	opacity: 0.8;
}

/* "Add a page" box and the tables */
.rp-dir-add {
	margin: 0.4em 0 1.4em;
	padding: 12px 16px;
	border: 1px solid rgba( 127, 127, 127, 0.28 );
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.07 );
}
.rp-dir-add .mw-inputbox-centered {
	margin: 0;
}
.rp-dir-add form {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start !important;
	gap: 8px;
}
.rp-dir-add .cdx-text-input {
	flex: 0 1 280px;
	min-width: 0;
}
.rp-dir-table table {
	width: 100%;
}
"""

DOC = """A picture card linking to a category, with how many pages are in it. Used on the directory pages ([[Characters]], [[Organizations]], [[Server events]]); it looks like the directory buttons on the [[Main Page|front page]].

<pre>
<div class="rp-dcards">
{{Directory card | label = Criminal | category = Criminal characters | image = CardBackground_Criminal.png }}
{{Directory card | label = Civilian | category = Civilian characters }}
</div>
</pre>

{| class="wikitable"
! Value !! What it does
|-
| <code>category</code> || The category it links to and counts.
|-
| <code>label</code> || The words on the card (default: the category's name).
|-
| <code>image</code> || The picture, as on the front page: art on the right, roughly 3:1. Until it's uploaded, the card uses <code>fallback</code> if given, then the default background, [[:File:CardBackground_Default.png]].
|-
| <code>fallback</code> || Optional: a picture to use before the default, until <code>image</code> exists.
|-
| <code>link</code> || A page to link to instead of the category.
|}

Put the cards inside <code><nowiki><div class="rp-cards"></nowiki></code>… no: inside <code><nowiki><div class="rp-dcards"></nowiki></code> … <code><nowiki></div></nowiki></code>, which lays them out in a grid.

[[Category:Help templates]]"""
DOC = DOC.replace("Put the cards inside <code><nowiki><div class=\"rp-cards\"></nowiki></code>… no: inside ", "Put the cards inside ")


def cards(group):
    """group: (heading, [(label, category, image)], fallback)"""
    heading, items, fallback = group
    rows = '\n'.join(
        f'{{{{Directory card | label = {label} | category = {cat} | image = {img} }}}}'
        for label, cat, img in items)
    return f"=== {heading} ===\n<div class=\"rp-dcards\">\n{rows}\n</div>\n"


def add_box(kind, placeholder, label):
    return f"""<div class="rp-dir-add">
<inputbox>
type=create
preload=Template:Infobox {kind}/preload
placeholder={placeholder}
buttonlabel={label}
break=no
width=30
</inputbox>
</div>"""


def dpl(category, template, fields, headers, empty):
    return ('<div class="rp-dir-table">\n{{#dpl:\n'
            f' |category        = {category}\n'
            ' |notnamespace    = Category\n'
            ' |ordermethod     = title\n'
            ' |count           = 500\n'
            f' |include         = {{{template}}}:' + ':'.join(fields) + '\n'
            ' |table           = class="wikitable sortable",' + ','.join(headers) + '\n'
            ' |tablerow        = ' + ','.join(['%%'] * len(fields)) + '\n'
            f' |noresultsheader = {empty}\n'
            ' |suppresserrors  = true\n'
            '}}\n</div>')


STYLE = '<templatestyles src="Template:Directory card/styles.css" />'

CHARACTERS = STYLE + """
Every character on the Let's RP Wiki. Pick a group below, or find a character in the full list. Click a column heading to sort the list.

== Browse ==
""" + cards(('By status', [
    ('Active', 'Active characters', 'CardBackground_Active.png'),
    ('Inactive', 'Inactive characters', 'CardBackground_Inactive.png'),
    ('Deceased', 'Deceased characters', 'CardBackground_Deceased.png'),
], 'CardBackground_Characters.png')) + cards(('By focus', [
    ('Civilian', 'Civilian characters', 'CardBackground_Civilian.png'),
    ('Criminal', 'Criminal characters', 'CardBackground_Criminal.png'),
    ('Public Sector', 'Public Sector characters', 'CardBackground_PublicSector.png'),
], 'CardBackground_Characters.png')) + """
== Add a character ==
Type the character's name to start their page, with the infobox and headings ready to fill in.
""" + add_box('character', 'Character name', 'Create character page') + """

== All characters ==
""" + dpl('Characters', 'Infobox character',
          ['status', 'focus', 'occupation', 'affiliation', 'played_by', 'version'],
          ['Character', 'Status', 'Focus', 'Occupation', 'Affiliation', 'Played by', 'Version'],
          'No characters yet. Add the first one above!') + """

__NOTOC__"""

ORGANIZATIONS = STYLE + """
Every group in the city: gangs, businesses, the police, EMS, the government and more. Pick a group below, or find one in the full list. Click a column heading to sort the list.

== Browse ==
""" + cards(('By focus', [
    ('Criminal', 'Criminal organizations', 'CardBackground_Criminal.png'),
    ('Civilian', 'Civilian organizations', 'CardBackground_Civilian.png'),
    ('Public Sector', 'Public Sector organizations', 'CardBackground_PublicSector.png'),
], 'CardBackground_Factions.png')) + cards(('By type', [
    ('Gangs', 'Gangs', 'CardBackground_Gangs.png'),
    ('Businesses', 'Businesses', 'CardBackground_Businesses.png'),
    ('Police', 'Police', 'CardBackground_Police.png'),
    ('EMS', 'EMS', 'CardBackground_EMS.png'),
    ('Government', 'Government', 'CardBackground_Government.png'),
], 'CardBackground_Factions.png')) + cards(('By status', [
    ('Active', 'Active organizations', 'CardBackground_Active.png'),
    ('Inactive', 'Inactive organizations', 'CardBackground_Inactive.png'),
    ('Defunct', 'Defunct organizations', 'CardBackground_Defunct.png'),
], 'CardBackground_Factions.png')) + """
== Add an organisation ==
Type the organisation's name to start its page, with the infobox and headings ready to fill in.
""" + add_box('organization', 'Organisation name', 'Create organisation page') + """

== All organisations ==
""" + dpl('Organizations', 'Infobox organization',
          ['type', 'status', 'leader', 'headquarters', 'version'],
          ['Organisation', 'Type', 'Status', 'Leader', 'Headquarters', 'Version'],
          'No organisations yet. Add the first one above!') + """

__NOTOC__"""

EVENTS = STYLE + """
Every server event: heists, gang wars, trials, elections, community and official events. Pick a type below, or find an event in the full list. Click a column heading to sort the list.

== Browse ==
""" + cards(('By type', [
    ('Heists', 'Heists', 'CardBackground_Heists.png'),
    ('Gang wars', 'Gang wars', 'CardBackground_GangWars.png'),
    ('Shootings', 'Shootings', 'CardBackground_Shootings.png'),
    ('Trials', 'Trials', 'CardBackground_Trials.png'),
    ('Elections', 'Elections', 'CardBackground_Elections.png'),
    ('Community events', 'Community events', 'CardBackground_CommunityEvents.png'),
    ('Official server events', 'Official server events', 'CardBackground_OfficialEvents.png'),
], 'CardBackground_Events.png')) + """
== Add an event ==
Type the event's name to start its page, with the infobox and headings ready to fill in.
""" + add_box('event', 'Event name', 'Create event page') + """

== All events ==
""" + dpl('Events', 'Infobox event',
          ['type', 'date', 'location', 'organised_by', 'outcome'],
          ['Event', 'Type', 'Date', 'Location', 'Organised by', 'Outcome'],
          'No events yet. Add the first one above!') + """

__NOTOC__"""


# DynamicPageList4 adds pages that use it to these tracking categories. They're
# hidden, so they don't show at the bottom of the directory and task pages.
DPL_CATEGORIES = [
    'Pages using DynamicPageList4',
    'Pages using DynamicPageList4 parser tag',
    'Pages using DynamicPageList4 Intersection parser tag',
    'Pages using DynamicPageList4 parser function',
    'Pages using DynamicPageList4 dplnum parser function',
    'Pages using DynamicPageList4 dplvar parser function',
    'Pages using DynamicPageList4 dplreplace parser function',
    'Pages using DynamicPageList4 dplchapter parser function',
    'Pages using DynamicPageList4 dplmatrix parser function',
]


def pages():
    return [('Category:' + c, 14, 'wikitext', 'text/x-wiki',
             '__HIDDENCAT__\nAdded automatically to pages that use DynamicPageList4 (lists made from categories), '
             'like the directories and [[Project:Tasks]]. Hidden from readers.') for c in DPL_CATEGORIES] + [
        ('Template:Directory card', 10, 'wikitext', 'text/x-wiki', CARD),
        ('Template:Directory card/styles.css', 10, 'sanitized-css', 'text/css', STYLES),
        ('Template:Directory card/doc', 10, 'wikitext', 'text/x-wiki', DOC),
        ('Characters', 0, 'wikitext', 'text/x-wiki', CHARACTERS),
        ('Organizations', 0, 'wikitext', 'text/x-wiki', ORGANIZATIONS),
        ('Server events', 0, 'wikitext', 'text/x-wiki', EVENTS),
    ]
