"""The help hub: Help:Contents (rebuilt from the old Let's RP Wiki's page, same
layout and wording), the Card template it is built from, and a redirect from
Project:Help portal (where the front page points). build.py writes these to
dist/help.xml."""

# {{Card}}: a title, some text and a coloured button along the bottom.
# heading = yes makes the title a big centred heading that shows in the page's contents.
CARD = """<includeonly><templatestyles src="Template:Card/styles.css" /><div class="rp-card">
<div class="rp-card-body">{{#if:{{{heading|}}}|<h2 class="rp-card-heading">{{{title|}}}</h2>|<div class="rp-card-title">{{{title|}}}</div>}}
{{{text|}}}
</div>{{#if:{{{link|}}}|<div class="rp-card-button rp-card-button--{{#ifexist:{{{link}}}|{{{colour|{{{color|blue}}}}}}|soon}}">[[{{{link}}}|{{#ifexist:{{{link}}}|{{{button|Read this guide}}}|Coming soon}}]]</div>}}
</div></includeonly><noinclude>
{{Template:Card/doc}}
</noinclude>"""

STYLES = """/* Template:Card/styles.css: cards with a button along the bottom (TemplateStyles).
   Put cards inside <div class="rp-cards rp-cards--3"> (or --2, --1) to lay them out. */
.rp-cards {
	display: grid;
	grid-template-columns: repeat( auto-fit, minmax( 240px, 1fr ) );
	gap: 8px;
	margin: 1.6em 0;
}
.rp-cards--3 { grid-template-columns: repeat( 3, minmax( 0, 1fr ) ); }
.rp-cards--2 { grid-template-columns: repeat( 2, minmax( 0, 1fr ) ); }
.rp-cards--1 { grid-template-columns: minmax( 0, 1fr ); }
.rp-cards--padded { padding: 0 20px; }

.rp-card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 0;
	overflow: hidden;
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.1 );
	box-shadow: 0 1px 3px rgba( 0, 0, 0, 0.03 ), 0 1px 2px rgba( 0, 0, 0, 0.06 );
	font-size: 0.875rem;
	line-height: 1.6;
	transition: box-shadow 0.2s ease;
}
.rp-card:hover {
	box-shadow: 0 10px 20px rgba( 0, 0, 0, 0.0475 ), 0 6px 6px rgba( 0, 0, 0, 0.0575 );
}
.rp-card-body {
	padding: 1.2rem;
}
.rp-card-body p:first-of-type {
	margin-top: 0;
}
.rp-card-body p:last-child {
	margin-bottom: 0;
}
.rp-card-title {
	margin: 0 0 0.8rem;
	font-size: 1.25rem;
	font-weight: 600;
	line-height: 1.2;
}
/* The big centred titles of the top cards */
.rp-card .rp-card-heading {
	margin: 0.2em auto 0.8rem;
	padding: 0;
	border: 0;
	font-size: 1.6rem;
	font-weight: 600;
	line-height: 1.25;
	text-align: center;
}

.rp-card-button a,
.rp-card-button a:visited,
.rp-card-button a.new {
	display: block;
	padding: 0.6rem;
	color: #fff;
	font-size: 0.875rem;
	font-weight: 600;
	letter-spacing: 0.25px;
	text-align: center;
	text-decoration: none;
}
.rp-card-button {
	transition: opacity 0.2s ease;
}
.rp-card-button:hover {
	opacity: 0.8;
}
.rp-card-button--blue { background: #3366cc; }
.rp-card-button--green { background: #2e7d32; }
.rp-card-button--orange { background: #ef6c00; }
.rp-card-button--purple { background: #7e57c2; }
.rp-card-button--red { background: #c62828; }
.rp-card-button--grey,
.rp-card-button--soon { background: rgba( 127, 127, 127, 0.45 ); }

/* "Start a new page" boxes */
.rp-create {
	margin: 1em 0 1.6em;
	padding: 1.2rem;
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.1 );
}
.rp-create .mw-inputbox-centered {
	margin: 0.5em 0;
}
.rp-create form {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start !important;
	gap: 8px;
	text-align: left;
}
.rp-create .cdx-text-input {
	flex: 0 1 280px;
	min-width: 0;
}
.rp-create .cdx-text-input input {
	width: 100%;
}

/* A note in a grey bar */
.rp-note {
	margin: 0.6rem 0 0.8rem;
	padding: 10px 15px;
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.12 );
	font-size: 0.875rem;
	line-height: 1.4;
	opacity: 0.9;
}

/* Tablets: two across; phones: one card per row */
@media ( max-width: 1000px ) {
	.rp-cards--3 { grid-template-columns: repeat( 2, minmax( 0, 1fr ) ); }
}
@media ( max-width: 720px ) {
	.rp-cards--3,
	.rp-cards--2 { grid-template-columns: minmax( 0, 1fr ); }
	.rp-cards--padded { padding: 0; }
}
"""

DOC = """A card with a title, some text and a coloured button along the bottom. Used on [[Help:Contents]].

<pre>
<div class="rp-cards rp-cards--2">
{{Card
 | title  = Your first edits
 | text   = A beginner's guide to VisualEditor.
 | link   = Help:Editing/Your first edit
 | button = Read this guide
 | colour = blue
}}
{{Card | title = … | text = … | link = … }}
</div>
</pre>

{| class="wikitable"
! Value !! What it does
|-
| <code>title</code> || The card's title.
|-
| <code>heading</code> || <code>yes</code> makes the title a big centred heading that also shows in the page's contents.
|-
| <code>text</code> || The text (wikitext: links, lists and line breaks work).
|-
| <code>link</code> || The page the button goes to. Leave it out for a card without a button. If the page doesn't exist yet, the button is grey and says "Coming soon" until someone writes it.
|-
| <code>button</code> || The button's words. Default: "Read this guide".
|-
| <code>colour</code> || <code>blue</code> (default), <code>green</code>, <code>orange</code>, <code>purple</code>, <code>red</code> or <code>grey</code>.
|}

Wrap the cards in a <code><nowiki><div class="rp-cards rp-cards--3"></nowiki></code> … <code><nowiki></div></nowiki></code> to set how many go side by side: <code>rp-cards--3</code>, <code>rp-cards--2</code> or <code>rp-cards--1</code> (one full-width card). Add <code>rp-cards--padded</code> for a little space at the sides. On phones the cards stack.

[[Category:Help templates]]"""


CONTENTS = """<templatestyles src="Template:Card/styles.css" />
Welcome to the '''Let's RP Wiki!''' This page is dedicated to the fledgling editor, eager hopeful, or anyone interested in reading up on the Let's RP lore and this wiki.

Take a look through the below categories to find out where we can help you best.

<div class="rp-cards rp-cards--3 rp-cards--padded">
{{Card
 | heading = yes
 | title   = I want to ''EDIT'' an Article
 | text    = Contributing to the wiki is simple; check out our [[Help:Getting Started|Getting Started]] guide to get started, the [[Help:Editing/Cheat sheet|cheat sheet]] page for a syntax guide, or practise in your own [[Special:MyPage/Sandbox|Sandbox]] to get the hang of wikicode; or simply take a chance and edit your first article!

Don't be afraid to edit any page that needs updates, fixes, or more content; we would rather that you created an article with simple, limited content and request some assistance than to create no article at all.
 | link    = Help:Getting Started
 | button  = Let's RP Wiki - Getting Started Guide
 | colour  = green
}}
{{Card
 | heading = yes
 | title   = I want to ''Create a New Article'' or ''Upload Images''
 | text    = First, use the search feature to confirm that there are no pages which currently cover your topic; it's always better to improve an existing article rather than create a new one if they contain similar information.

If it doesn't exist, then simply search for the exact name you want the page to have, and click the red link that appears at the top of the results.

Not sure what to create? Take a look at [[Special:WantedPages|Wanted Pages]] for a list of pages that have been linked to but not yet created for ideas!

For uploading images, simply follow the [[Special:Upload|Upload Wizard]] by clicking "Upload File" in the sidebar to the left.
 | link    = Help:Editing
 | button  = Help:Editing
 | colour  = orange
}}
{{Card
 | heading = yes
 | title   = How can I ''HELP''?
 | text    = Easy! The simplest thing to do is read through our big pages (like [[:Category:Characters|Characters]] or [[:Category:Organizations|Factions]] or [[:Category:Businesses|Businesses]]) and see if it reads well. Is the page easy to understand? Laid out well? Are there enough or too many images? Is it linked to other important pages? Characters, especially, always need new information as more are released.

Beyond small fixes, take a look through our [[Project:Tasks|Tasks]] page to see what the bigwigs are working on.
 | link    = Project:Tasks
 | button  = Let's RP Wiki - Tasks & Issues
 | colour  = blue
}}
</div>

<div class="rp-cards rp-cards--1">
{{Card
 | title  = Quickstart Guide
 | text   = Creating your first article
 | link   = Help:Getting Started
 | colour = green
}}
</div>

== Start a new page ==
<div class="rp-create">
Type the page's name (the character's full name, the organisation's or the event's) and the page opens with its infobox and headings ready to fill in.

<inputbox>
type=create
preload=Template:Infobox character/preload
placeholder=Character name
buttonlabel=Create character page
break=no
width=30
</inputbox>
<inputbox>
type=create
preload=Template:Infobox organization/preload
placeholder=Organisation name
buttonlabel=Create organisation page
break=no
width=30
</inputbox>
<inputbox>
type=create
preload=Template:Infobox event/preload
placeholder=Event name
buttonlabel=Create event page
break=no
width=30
</inputbox>
</div>

= Get started with editing the wiki. =
Anyone can edit any page and improve articles immediately for all readers. You just need to [[Special:CreateAccount|create an account]]. The Let's RP Wiki uses two methods of editing: the simpler VisualEditor, and classic editing through source mode.

<div class="rp-cards rp-cards--2">
{{Card
 | title = Your first edits
 | text  = A beginner's guide on how to use VisualEditor, a user-friendly system that allows you to edit without the need to learn wikitext.
 | link  = Help:Editing/Your first edit
}}
{{Card
 | title = The basics of VisualEditor
 | text  = Some more detailed tips on editing using VisualEditor, including how to add links and format bold and italic text.
 | link  = Help:Editing/VisualEditor basics
}}
</div>

== Using source mode ==
Source mode allows you to see all of the wikitext on a page and to edit it directly. If you are trying to make more complex changes, you should switch to the source mode in the editor.

<div class="rp-cards rp-cards--2">
{{Card
 | title = Introduction to source mode
 | text  = Editing using the classic source mode, which allows you to view and change wikitext directly.
 | link  = Help:Editing/Source mode basics
}}
{{Card
 | title = Cheat sheet for source mode
 | text  = A short guide that lists the syntax needed to create font styles, links, templates, and headers in source mode.
 | link  = Help:Editing/Cheat sheet
}}
</div>

== Advanced guides ==
<div class="rp-cards rp-cards--2">
{{Card
 | title = Advanced guide to VisualEditor
 | text  = Making more complicated edits using the default editor.
 | link  = Help:Editing/VisualEditor advanced
}}
{{Card
 | title = What's possible with source mode
 | text  = Examples of some of the more complicated types of edits that can be made on the wiki.
 | link  = Help:Editing/Advanced editing
}}
{{Card
 | title = Tables
 | text  = More details about editing tables in source mode.
 | link  = Help:Editing/Tables
}}
{{Card
 | title  = Finding images
 | text   = How to find images online to use on the wiki.
 | link   = :Category:Images
 | button = Image Gallery
}}
{{Card
 | title = Using templates
 | text  = How to use templates across the wiki.
 | link  = Help:Templates
}}
</div>

== The wiki's building blocks ==
<div class="rp-cards rp-cards--3">
{{Card
 | title  = Infoboxes
 | text   = The box at the top of every character, organisation and event page: how to fill in each field, and what the badges mean.
 | link   = Help:Infoboxes
 | colour = purple
}}
{{Card
 | title  = Templates
 | text   = Every template on the wiki, what it's for and how to add it.
 | link   = Help:Templates
 | button = See all templates
 | colour = purple
}}
{{Card
 | title  = Pictures and licences
 | text   = Uploading screenshots and artwork, and which licence to pick for each.
 | link   = Template:License/doc
 | button = Choosing a licence
 | colour = purple
}}
</div>

<div class="rp-note">'''Note:''' A portion of the text above originated from the [https://runescape.wiki/ RuneScape Wiki] and [https://starcitizen.tools/ SC Tools wiki] under [https://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0] license.</div>

=== Other Resources ===
{| class="wikitable"
! Editing Articles !! Guidelines and Resources
|- style="vertical-align: top;"
|
* [[Help:Getting Started|Getting Started]]
* [[Help:Editing|Editing Guide]]
* [[Help:Editing/Cheat sheet|A basic overview of editing syntax]]
* [[Help:Style guide|General style guide]]
* [[wikipedia:Help:Link#Wikilinks|Linking to other pages]]
* [[Help:Images|Inserting images into pages]]
* [[wikipedia:Help:Table#Pipe syntax tutorial|Inserting tables into pages]]
* [[Help:Standard Terms|Standard Terms]]
|
* [[Help:Templates|Templates]]
* [[:Category:Example articles|LRP Wiki Example Pages]]
* [[Help:Infoboxes|Infoboxes]]
* [[Help:Images|Image uploading guidelines]]
* [[Project:Policies|Content policies]]
* [[Help:Discussion|Discussion rules]]
* [[:Category:Images|Image Galleries]]
* And when in doubt, refer to [[wikipedia:Wikipedia:Manual of Style|Wikipedia's Manual of Style]]
|}

[[Category:Help]]"""


def pages():
    return [
        ('Help:Contents', 12, 'wikitext', 'text/x-wiki', CONTENTS),
        ('Project:Help portal', 4, 'wikitext', 'text/x-wiki', '#REDIRECT [[Help:Contents]]'),
        ('Template:Card', 10, 'wikitext', 'text/x-wiki', CARD),
        ('Template:Card/styles.css', 10, 'sanitized-css', 'text/css', STYLES),
        ('Template:Card/doc', 10, 'wikitext', 'text/x-wiki', DOC),
        ('Category:Help', 14, 'wikitext', 'text/x-wiki', "Help pages for editors of the Let's RP Wiki. Start at [[Help:Contents]]."),
        ('Category:Help templates', 14, 'wikitext', 'text/x-wiki', 'Templates used on the help pages.\n\n[[Category:Help]]'),
    ]
