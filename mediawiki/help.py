"""The help hub: Help:Contents, the Card template it is built from, and a redirect
from Project:Help portal (where the front page points). build.py writes these to
dist/help.xml."""

CARD = """<includeonly><templatestyles src="Template:Card/styles.css" /><div class="rp-card">
<div class="rp-card-body">
<div class="rp-card-title">{{{title|}}}</div>
{{{text|}}}
</div>{{#if:{{{link|}}}|<div class="rp-card-button rp-card-button--{{#ifexist:{{{link}}}|{{{colour|{{{color|blue}}}}}}|soon}}">[[{{{link}}}|{{#ifexist:{{{link}}}|{{{button|Read this guide}}}|Coming soon}}]]</div>}}
</div></includeonly><noinclude>
{{Template:Card/doc}}
</noinclude>"""

STYLES = """/* Template:Card/styles.css: cards with a button along the bottom (TemplateStyles).
   Put cards inside <div class="rp-cards"> to lay them out side by side. */
.rp-cards {
	display: grid;
	grid-template-columns: repeat( auto-fit, minmax( 240px, 1fr ) );
	gap: 12px;
	margin: 1em 0 1.6em;
}
.rp-cards--2 {
	grid-template-columns: repeat( auto-fit, minmax( 300px, 1fr ) );
}
.rp-card {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 0;
	overflow: hidden;
	border: 1px solid rgba( 127, 127, 127, 0.28 );
	border-radius: 12px;
	background: rgba( 127, 127, 127, 0.07 );
	font-size: 0.875rem;
	line-height: 1.55;
	transition: border-color 0.15s, transform 0.15s;
}
.rp-card:hover {
	border-color: rgba( 127, 127, 127, 0.55 );
	transform: translateY( -2px );
}
.rp-card-body {
	padding: 16px 18px;
}
.rp-card-body p:first-child {
	margin-top: 0;
}
.rp-card-body p:last-child {
	margin-bottom: 0;
}
.rp-card-title {
	margin-bottom: 8px;
	font-size: 1.125rem;
	font-weight: 600;
	line-height: 1.25;
}
.rp-card-button a,
.rp-card-button a:visited,
.rp-card-button a.new {
	display: block;
	padding: 10px;
	color: #fff;
	font-weight: 600;
	text-align: center;
	text-decoration: none;
}
.rp-card-button:hover {
	filter: brightness( 1.12 );
}
.rp-card-button--blue { background: #3366cc; }
.rp-card-button--green { background: #2e7d32; }
.rp-card-button--orange { background: #ef6c00; }
.rp-card-button--purple { background: #7e57c2; }
.rp-card-button--red { background: #c62828; }
.rp-card-button--soon { background: rgba( 127, 127, 127, 0.35 ); }

/* "Start a new page" boxes */
.rp-create {
	margin: 1em 0 1.6em;
	padding: 16px 18px;
	border: 1px solid rgba( 127, 127, 127, 0.28 );
	border-radius: 12px;
	background: rgba( 127, 127, 127, 0.07 );
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

.rp-note {
	margin: 1em 0;
	padding: 10px 15px;
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.1 );
	font-size: 0.875rem;
	opacity: 0.9;
}
"""

DOC = """A card with a title, some text and a button along the bottom. Used on [[Help:Contents]].

<pre>
<div class="rp-cards">
{{Card
 | title  = Your first edit
 | text   = A short guide to VisualEditor.
 | link   = Help:Your first edit
 | button = Read this guide
 | colour = green
}}
{{Card | title = … | text = … | link = … }}
</div>
</pre>

{| class="wikitable"
! Value !! What it does
|-
| <code>title</code> || The heading.
|-
| <code>text</code> || The text (wikitext: links, lists and line breaks work).
|-
| <code>link</code> || The page the button goes to. Leave it out for a card without a button. If the page doesn't exist yet, the button is grey and says "Coming soon".
|-
| <code>button</code> || The button's words. Default: "Read this guide".
|-
| <code>colour</code> || <code>blue</code> (default), <code>green</code>, <code>orange</code>, <code>purple</code> or <code>red</code>.
|}

Wrap cards in <code><nowiki><div class="rp-cards"></nowiki></code> … <code><nowiki></div></nowiki></code> to put them side by side; they wrap onto new rows on narrow screens. Use <code>rp-cards rp-cards--2</code> for wider cards (two per row).

[[Category:Help templates]]"""


def create_box(label, kind, placeholder):
    return f"""<inputbox>
type=create
preload=Template:Infobox {kind}/preload
placeholder={placeholder}
buttonlabel={label}
break=no
width=30
</inputbox>"""


CONTENTS = """<templatestyles src="Template:Card/styles.css" />
Welcome to the '''Let's RP Wiki''' help pages! Whether you've never edited a wiki before or just want to look something up, start here.

<div class="rp-cards">
{{Card
 | title  = I want to edit an article
 | text   = Anyone with an account can edit. Our [[Help:Getting started|getting started]] guide covers the basics, the [[Help:Cheat sheet|cheat sheet]] lists the formatting codes, and your own [[Special:MyPage/Sandbox|sandbox]] is a safe place to practise.

Don't be afraid to edit a page that needs fixing or more detail: a short article is better than none.
 | link   = Help:Getting started
 | button = Getting started guide
 | colour = green
}}
{{Card
 | title  = I want to create a page or upload a picture
 | text   = First search to check the page doesn't exist already: improving an article beats starting a second one. If it doesn't, use the boxes below to start one with the right infobox in place.

Not sure what to write? [[Special:WantedPages|Wanted pages]] lists pages that are linked to but not written yet. To add a picture, use [[Special:Upload|Upload file]] and pick a licence.
 | link   = Help:Editing
 | button = How to edit
 | colour = orange
}}
{{Card
 | title  = How can I help?
 | text   = Read through the big directories, like [[:Category:Characters|characters]], [[:Category:Gangs|gangs]] or [[:Category:Businesses|businesses]]. Is the page easy to follow? Does it have pictures and links to related pages? Characters always need updating as their stories go on.

For bigger jobs, see the [[Project:Tasks|task list]].
 | link   = Project:Tasks
 | button = Tasks and issues
}}
</div>

== Start a new page ==
<div class="rp-create">
Type the page's name (the character's full name, the organization's or the event's) and the page opens with its infobox and headings ready to fill in.

""" + create_box('Create character page', 'character', 'Character name') + "\n" \
    + create_box('Create organization page', 'organization', 'Organization name') + "\n" \
    + create_box('Create event page', 'event', 'Event name') + """
</div>

== Editing the wiki ==
You only need to [[Special:CreateAccount|create an account]] to start. There are two ways to edit: '''VisualEditor''', which works like a word processor, and '''source mode''', where you edit the page's wikitext directly. You can switch between them while editing.

<div class="rp-cards rp-cards--2">
{{Card
 | title = Your first edit
 | text  = A beginner's guide to VisualEditor: edit a page without learning any code.
 | link  = Help:Your first edit
}}
{{Card
 | title = VisualEditor basics
 | text  = More tips: adding links, pictures, bold and italic text, and infoboxes.
 | link  = Help:VisualEditor
}}
{{Card
 | title = Introduction to source mode
 | text  = Editing the wikitext directly, for when you want full control.
 | link  = Help:Source mode
}}
{{Card
 | title = Cheat sheet
 | text  = The codes for links, headings, bold, lists, pictures and templates, on one page.
 | link  = Help:Cheat sheet
}}
</div>

== The wiki's building blocks ==
<div class="rp-cards">
{{Card
 | title  = Infoboxes
 | text   = The box at the top of every character, organization and event page: how to fill in each field, and what the badges mean.
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
 | link   = Help:Images
 | colour = purple
}}
</div>

== Other resources ==
{| class="wikitable"
! Editing articles !! Guidelines and resources
|- style="vertical-align: top;"
|
* [[Help:Getting started|Getting started]]
* [[Help:Editing|Editing guide]]
* [[Help:Cheat sheet|Formatting cheat sheet]]
* [[Project:Style guide|Style guide]]
* [[Help:Images|Adding pictures to pages]]
* [[Help:Tables|Tables]]
* [[Help:Standard terms|Standard terms]]
|
* [[Help:Templates|Templates]]
* [[Help:Infoboxes|Infoboxes]]
* [[Template:License/doc|Choosing a licence]]
* [[Project:Policies|Content policies]]
* [[Help:Discussion|Discussion rules]]
* [[:Category:Example articles|Example articles]]
* When in doubt: [[wikipedia:Wikipedia:Manual of Style|Wikipedia's Manual of Style]]
|}

<div class="rp-note">'''Remember:''' everything on this wiki is out of character. Nothing you read here can be used as in-character knowledge.</div>

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
