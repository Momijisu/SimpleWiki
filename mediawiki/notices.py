"""Notice templates for wiki maintenance: a shared box ({{Notice}}) and the common
notices built on it (Stub, Draft, In use, Cleanup, Delete, Merge, Rename, Sources,
Outdated, Disputed, Needs image, Spoiler, Archived, Disambiguation), plus inline
notes ({{Citation needed}}, {{Clarify}}). Each puts the page in a maintenance
category. build.py writes these to dist/notices.xml."""

# The box. type sets the colour and icon:
#   delete (red), content (orange), style (yellow), notice (blue), move (purple),
#   archive (grey). Categories are only added outside the Template namespace,
#   and never with |nocat=yes.
NOTICE = """<includeonly><templatestyles src="Template:Notice/styles.css" /><div class="rp-notice rp-notice--{{{type|notice}}} {{#if:{{{small|}}}|rp-notice--small}}" role="note">
<div class="rp-notice-icon" aria-hidden="true">{{{icon|{{#switch:{{{type|notice}}}|delete=✕|content=!|style=✎|move=⇄|archive=▤|#default=i}}}}}</div>
<div class="rp-notice-body">{{#if:{{{title|}}}|<div class="rp-notice-title">{{{title}}}</div>}}<div class="rp-notice-text">{{{text|}}}{{#if:{{{date|}}}|<span class="rp-notice-date"> ({{{date}}})</span>}}</div></div>
</div>{{#if:{{{category|}}}|{{#ifeq:{{NAMESPACE}}|{{ns:Template}}||{{#if:{{{nocat|}}}||[[Category:{{{category}}}]]}}}}}}</includeonly><noinclude>
{{Template:Notice/doc}}
</noinclude>"""

STYLES = """/* Template:Notice/styles.css: notice boxes for wiki maintenance (TemplateStyles). */
.rp-notice {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	box-sizing: border-box;
	margin: 0 0 1em;
	padding: 10px 14px;
	border: 1px solid rgba( 127, 127, 127, 0.28 );
	border-left: 4px solid rgba( 59, 130, 246, 0.85 );
	border-radius: 8px;
	background: rgba( 59, 130, 246, 0.08 );
	font-size: 0.875rem;
	line-height: 1.5;
	clear: both;
}
.rp-notice-icon {
	flex: none;
	width: 26px;
	height: 26px;
	margin-top: 1px;
	border-radius: 50%;
	background: rgba( 59, 130, 246, 0.85 );
	color: #fff;
	font-size: 0.9rem;
	font-weight: 700;
	line-height: 26px;
	text-align: center;
}
.rp-notice-body {
	flex: 1;
	min-width: 0;
}
.rp-notice-title {
	font-weight: 600;
}
.rp-notice-date {
	opacity: 0.7;
	font-size: 0.8125rem;
}
.rp-notice-text p {
	margin: 0.3em 0 0;
}

/* Colours by type */
.rp-notice--delete { border-left-color: rgba( 239, 68, 68, 0.9 ); background: rgba( 239, 68, 68, 0.1 ); }
.rp-notice--delete .rp-notice-icon { background: rgba( 220, 38, 38, 0.95 ); }
.rp-notice--content { border-left-color: rgba( 249, 115, 22, 0.9 ); background: rgba( 249, 115, 22, 0.09 ); }
.rp-notice--content .rp-notice-icon { background: rgba( 234, 88, 12, 0.95 ); }
.rp-notice--style { border-left-color: rgba( 234, 179, 8, 0.9 ); background: rgba( 234, 179, 8, 0.09 ); }
.rp-notice--style .rp-notice-icon { background: rgba( 202, 138, 4, 0.95 ); }
.rp-notice--move { border-left-color: rgba( 168, 85, 247, 0.9 ); background: rgba( 168, 85, 247, 0.09 ); }
.rp-notice--move .rp-notice-icon { background: rgba( 147, 51, 234, 0.95 ); }
.rp-notice--archive { border-left-color: rgba( 127, 127, 127, 0.7 ); background: rgba( 127, 127, 127, 0.1 ); }
.rp-notice--archive .rp-notice-icon { background: rgba( 107, 114, 128, 0.95 ); }

/* Small: for sections */
.rp-notice--small {
	padding: 6px 10px;
	font-size: 0.8125rem;
}
.rp-notice--small .rp-notice-icon {
	width: 20px;
	height: 20px;
	font-size: 0.75rem;
	line-height: 20px;
}

/* Inline notes: [citation needed] */
.rp-inline-note {
	font-size: 0.75em;
	font-style: italic;
	white-space: nowrap;
	vertical-align: super;
	line-height: 1;
}
"""

# (template, type, title, text, category, notes for the doc, example values)
NOTICES = [
    ('Stub', 'notice', '',
     "This article is a '''stub'''. You can help the Let's RP Wiki by <span class='plainlinks'>[{{fullurl:{{FULLPAGENAME}}|action=edit}} adding to it]</span>{{#if:{{{1|}}}|&#58; {{{1}}}|.}}",
     'Stubs', "<code>1</code> = what's missing, e.g. <code><nowiki>{{Stub|their time in the LSPD}}</nowiki></code>.", 'their time in the LSPD'),
    ('Draft', 'notice', 'This page is a draft',
     "It isn't finished yet and may change a lot{{#if:{{{1|}}}|. Being written by {{{1}}}}}. Feel free to help, or leave a note on the [[{{TALKPAGENAME}}|talk page]].",
     'Drafts', "<code>1</code> = who is writing it.", '[[User:Admin|Admin]]'),
    ('In use', 'move', 'Being edited right now',
     "{{#if:{{{1|}}}|{{{1}}} is|Someone is}} making a big edit to this page. To avoid edit conflicts, please wait before editing. Remove this notice when you're done.",
     'Pages in use', "<code>1</code> = who is editing. Remove it when you finish; moderators remove forgotten ones after a day.", '[[User:Admin|Admin]]'),
    ('Cleanup', 'style', 'This page needs cleaning up',
     "{{#if:{{{1|}}}|{{{1}}}|It may need better formatting, wording or layout to match the [[Help:Style guide|style guide]].}}",
     'Pages needing cleanup', "<code>1</code> = what needs fixing.", 'The history section is one long paragraph.'),
    ('Expand section', 'content', '',
     "This section needs more detail. You can help by <span class='plainlinks'>[{{fullurl:{{FULLPAGENAME}}|action=edit}} adding to it]</span>{{#if:{{{1|}}}|&#58; {{{1}}}|.}}",
     'Pages needing expansion', "Goes under a section heading. <code>1</code> = what's missing.", ''),
    ('Sources', 'content', 'This page needs sources',
     "Please help by adding clips, VODs or screenshots that back up what it says. See [[Help:Editing/Citations|citing sources]].",
     'Pages needing sources', '', ''),
    ('Outdated', 'content', 'This page may be out of date',
     "{{#if:{{{1|}}}|{{{1}}}|Things have changed in the city since it was written.}} Please help update it.",
     'Outdated pages', "<code>1</code> = what's changed.", "He left the Saints in August 2026."),
    ('Disputed', 'content', 'Disputed',
     "The accuracy of this page is disputed{{#if:{{{1|}}}|&#58; {{{1}}}|.}} See the [[{{TALKPAGENAME}}|talk page]] before relying on it.",
     'Disputed pages', "<code>1</code> = what's disputed.", ''),
    ('Needs image', 'style', '',
     "This page needs {{#if:{{{1|}}}|{{{1}}}|a picture}}. If you have one, [[Help:Editing/Adding images|upload it and add it]].",
     'Pages needing pictures', "<code>1</code> = what kind of picture, e.g. <code><nowiki>{{Needs image|a portrait}}</nowiki></code>. Not needed for the main picture: an infobox with no picture already shows a placeholder.", 'a portrait'),
    ('Merge', 'move', '',
     "It has been suggested that this page be '''merged''' with [[{{{1|?}}}]].{{#if:{{{2|}}}| Reason: {{{2}}}}} Discuss on the [[{{TALKPAGENAME}}|talk page]].",
     'Pages to merge', "<code>1</code> = the other page; <code>2</code> = why (optional).", 'Southside Saints (gang)'),
    ('Rename', 'move', '',
     "It has been suggested that this page be '''renamed''' to [[{{{1|?}}}]].{{#if:{{{2|}}}| Reason: {{{2}}}}} Discuss on the [[{{TALKPAGENAME}}|talk page]].",
     'Pages to rename', "<code>1</code> = the suggested name; <code>2</code> = why (optional).", 'Antonio Ramirez'),
    ('Delete', 'delete', 'This page is up for deletion',
     "Reason: {{{1|no reason given}}}. If you disagree, explain why on the [[{{TALKPAGENAME}}|talk page]]. A moderator will decide.",
     'Candidates for deletion', "<code>1</code> = why. Only moderators delete pages.", 'Duplicate of Tony Ramirez'),
    ('Spoiler', 'content', 'Spoiler warning',
     "This page reveals {{#if:{{{1|}}}|{{{1}}}|things some characters don't know}}. Everything on the wiki is out of character: don't use it in roleplay.",
     'Pages with spoilers', "<code>1</code> = what it reveals, e.g. <code><nowiki>{{Spoiler|who planned the heist}}</nowiki></code>.", 'who planned the heist'),
    ('Archived', 'archive', 'Archived',
     "This page is about {{#if:{{{1|}}}|Let's RP {{{1}}}, a past version of the server|a past version of the server}}. It is kept as a record and is no longer updated.",
     'Archived pages', "<code>1</code> = the version, e.g. <code><nowiki>{{Archived|1.0}}</nowiki></code>.", '1.0'),
    ('Disambiguation', 'notice', '',
     "'''{{{1|{{PAGENAME}}}}}''' may refer to more than one page. If a link led you here, you may want to change it to point straight to the right one.",
     'Disambiguation pages', "Goes at the top of a disambiguation page, above a list of the pages. <code>1</code> = the shared name (default: this page's name).", ''),
]

INLINE = [
    ('Citation needed', '[citation needed]', 'Pages with unsourced statements',
     "After a sentence that needs a source: <code><nowiki>He ran the city's biggest garage.{{Citation needed}}</nowiki></code>. Short form: <code><nowiki>{{cn}}</nowiki></code>."),
    ('Clarify', '[clarification needed]', 'Pages needing clarification',
     "After something unclear: <code><nowiki>{{Clarify|which garage?}}</nowiki></code> (the text shows when you hover)."),
]


def notice_template(name, type_, title, text, cat):
    return ('<includeonly>{{Notice|type=' + type_ + '|title=' + title + '|text=' + text
            + '|date={{{date|}}}|small={{{small|}}}|nocat={{{nocat|}}}|category=' + cat + '}}</includeonly>'
            + '<noinclude>{{' + name + '|nocat=yes}}\n\nA notice for wiki maintenance. See [[Template:Notice/doc]] for all notices.\n'
            + '[[Category:Notice templates]]</noinclude>')


def inline_template(name, label, cat):
    return ('<includeonly><templatestyles src="Template:Notice/styles.css" /><span class="rp-inline-note" title="{{{1|}}}">'
            '[[Help:Editing/Citations|' + label + ']]{{#if:{{{date|}}}|<span title="{{{date}}}"></span>}}</span>'
            '{{#ifeq:{{NAMESPACE}}|{{ns:Template}}||[[Category:' + cat + ']]}}</includeonly>'
            '<noinclude>Example: the city was quiet that night.{{' + name + '}}\n\nAn inline note. See [[Template:Notice/doc]].\n'
            '[[Category:Notice templates]]</noinclude>')


def doc():
    rows = []
    for name, type_, title, text, cat, notes, example in NOTICES:
        ex = '{{' + name + ('|' + example if example else '') + '|nocat=yes}}'
        rows.append(f"|-\n| <code><nowiki>{{{{{name}}}}}</nowiki></code><br/>[[:Category:{cat}|{cat}]] || {notes}\n|-\n| colspan=\"2\" | {ex}")
    inline = '\n'.join(f"|-\n| <code><nowiki>{{{{{n}}}}}</nowiki></code><br/>[[:Category:{c}|{c}]] || {notes}<br/>Gives: He ran the city's biggest garage.{{{{{n}}}}}" for n, l, c, notes in INLINE)
    return """Notices flag pages that need work, or warn readers. Put a notice at the very top of the page (or under a section heading, for one section). Every notice adds the page to a maintenance category, so moderators and editors can find what needs doing: see [[:Category:Wiki maintenance]].

Most notices take an optional reason as their first value, and all take <code>date=</code> (e.g. <code><nowiki>{{Cleanup|date=June 2026}}</nowiki></code>), <code>small=yes</code> (a smaller box, for sections) and <code>nocat=yes</code> (no category, for examples).

== Notices ==
{| class="wikitable" style="width:100%"
! Template !! Use
""" + '\n'.join(rows) + """
|}

== Inline notes ==
Small notes inside a sentence.
{| class="wikitable"
! Template !! Use
""" + inline + """
|}

== Making a new notice ==
All notices use <code><nowiki>{{Notice}}</nowiki></code>:
<pre>{{Notice
 | type     = content
 | title    = Short title (optional)
 | text     = What's wrong, and how to help.
 | category = Pages needing something
}}</pre>
<code>type</code> sets the colour and icon: <code>delete</code> (red), <code>content</code> (orange), <code>style</code> (yellow), <code>notice</code> (blue), <code>move</code> (purple) or <code>archive</code> (grey). <code>icon</code> changes the symbol. The box's look is in [[Template:Notice/styles.css]].

[[Category:Notice templates]]"""


def pages():
    out = [
        ('Template:Notice', 10, 'wikitext', 'text/x-wiki', NOTICE),
        ('Template:Notice/styles.css', 10, 'sanitized-css', 'text/css', STYLES),
        ('Template:Notice/doc', 10, 'wikitext', 'text/x-wiki', doc()),
    ]
    for name, type_, title, text, cat, notes, example in NOTICES:
        out.append(('Template:' + name, 10, 'wikitext', 'text/x-wiki', notice_template(name, type_, title, text, cat)))
    for name, label, cat, notes in INLINE:
        out.append(('Template:' + name, 10, 'wikitext', 'text/x-wiki', inline_template(name, label, cat)))
    # Short names people expect
    for alias, target in (('Cn', 'Citation needed'), ('Fact', 'Citation needed'), ('Wip', 'In use'),
                          ('Under construction', 'Draft'), ('Unreferenced', 'Sources'), ('Update', 'Outdated'),
                          ('Disambig', 'Disambiguation'), ('Speedy', 'Delete'), ('Delete me', 'Delete')):
        out.append(('Template:' + alias, 10, 'wikitext', 'text/x-wiki', f'#REDIRECT [[Template:{target}]]'))
    # Categories: maintenance ones are hidden; Archived and Disambiguation are for readers
    out.append(('Category:Wiki maintenance', 14, 'wikitext', 'text/x-wiki',
                '__HIDDENCAT__\nPages that need work, sorted by what they need. Added by the notices on [[Template:Notice/doc]].'))
    out.append(('Category:Notice templates', 14, 'wikitext', 'text/x-wiki',
                'Notices for wiki maintenance. See [[Template:Notice/doc]].\n\n[[Category:Help templates]]'))
    visible = {'Archived pages', 'Disambiguation pages'}
    for cat in [n[4] for n in NOTICES] + [i[2] for i in INLINE]:
        if cat in visible:
            text = {'Archived pages': "Pages about past versions of the server, kept as a record.",
                    'Disambiguation pages': "Pages that list other pages sharing a name."}[cat]
        else:
            text = f'__HIDDENCAT__\nPages tagged with a notice that adds them here. See [[Template:Notice/doc]].\n\n[[Category:Wiki maintenance]]'
        out.append(('Category:' + cat, 14, 'wikitext', 'text/x-wiki', text))
    return out
