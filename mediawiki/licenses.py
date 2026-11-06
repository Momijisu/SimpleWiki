"""The upload licences: the drop-down on Special:Upload (MediaWiki:Licenses), one
template per licence, the shared box they use, and the categories they fill.
build.py writes these to dist/licenses.xml."""

# Each licence: template name, what it says in the box, its category, and the colour
# of its box (game, free, permission, fairuse, none). In the text, {{{1}}} is the
# optional first value, e.g. {{Permission|Rosa}} for who gave permission.
LICENSES = [
    ('Screenshot', 'game', 'In-game screenshots', 'In-game screenshot',
     "A screenshot or video still from ''{{{1|Grand Theft Auto V}}}'', taken on the Let's RP server. "
     "The game and everything in it are the copyright of {{{2|Rockstar Games and Take-Two Interactive}}}. "
     "It is used here to record the server's roleplay, on a non-commercial fan wiki."),
    ('Self', 'free', 'Own work', 'Own work, shared under CC BY-SA 4.0',
     "{{{1|The uploader}}} made this and shares it under the "
     "[https://creativecommons.org/licenses/by-sa/4.0/ Creative Commons Attribution-ShareAlike 4.0] licence: "
     "anyone may reuse or change it, if they credit the creator and share their version the same way."),
    ('Permission', 'permission', 'Files used with permission', "Used with the creator's permission",
     "{{{1|The creator}}} has allowed this file to be used on the Let's RP Wiki. "
     "All other rights stay with the creator: ask them before using it anywhere else."),
    ('Server', 'permission', "Official Let's RP files", "Official Let's RP material",
     "Official material of the Let's RP server (logos, artwork or announcements), "
     "used with the server's permission. Ask the server team before using it anywhere else."),
    ('Fair use', 'fairuse', 'Fair use files', 'Copyrighted, used as fair use',
     "This file is the copyright of {{{1|its owner}}}. It is believed to be fair use: "
     "it is a small copy, used to identify or comment on its subject on a non-commercial fan wiki, "
     "and it does not replace the original. It may be removed if the owner asks."),
    ('CC-BY-SA-4.0', 'free', 'CC BY-SA 4.0 files', 'Creative Commons Attribution-ShareAlike 4.0',
     "Made by {{{1|the creator named in the description}}} and shared under the "
     "[https://creativecommons.org/licenses/by-sa/4.0/ CC BY-SA 4.0] licence: "
     "anyone may reuse or change it, if they credit the creator and share their version the same way."),
    ('CC-BY-4.0', 'free', 'CC BY 4.0 files', 'Creative Commons Attribution 4.0',
     "Made by {{{1|the creator named in the description}}} and shared under the "
     "[https://creativecommons.org/licenses/by/4.0/ CC BY 4.0] licence: "
     "anyone may reuse or change it, if they credit the creator."),
    ('CC0', 'free', 'Public domain files', 'Public domain',
     "The creator has given up all rights to this file "
     "([https://creativecommons.org/publicdomain/zero/1.0/ CC0]), or its copyright has run out. "
     "Anyone may use it for anything."),
    ('No license', 'none', 'Files with no license', 'No licence given',
     "Nobody has said where this file comes from or who may use it. "
     "If you know, edit this page and replace this box with the right licence. "
     "Files without a licence may be deleted."),
]

# The drop-down on Special:Upload. "* Heading" lines can't be picked;
# "** Template|Text" lines add {{Template}} to the new file page.
DROPDOWN = """* Pictures from the game
** Screenshot|A screenshot or video still from the game
* Made by you
** Self|I made it, and anyone may reuse it (CC BY-SA 4.0)
** Permission|I made it, but it may only be used on this wiki
* Made by someone else
** Permission|The creator gave permission to use it here
** Server|Official Let's RP material (logos, artwork, announcements)
** Fair use|Copyrighted material (logos, covers, artwork) used as fair use
* Free licences
** CC-BY-SA-4.0|Creative Commons Attribution-ShareAlike 4.0
** CC-BY-4.0|Creative Commons Attribution 4.0
** CC0|Public domain (CC0)
* Not sure
** No license|I don't know where it comes from
"""

BOX = """<includeonly><templatestyles src="Template:License/styles.css" /><div class="rp-license rp-license--{{{kind|none}}}">
<div class="rp-license-title">{{{title|Licence}}}</div>
<div class="rp-license-text">{{{text|}}}</div>
</div>{{#ifeq:{{NAMESPACE}}|{{ns:File}}|{{#if:{{{category|}}}|[[Category:{{{category}}}]]}}}}</includeonly><noinclude>
{{Template:License/doc}}
</noinclude>"""

STYLES = """/* Template:License/styles.css: the licence box on file pages (TemplateStyles). */
.rp-license {
	margin: 0.5em 0 1em;
	padding: 10px 14px;
	max-width: 46em;
	border: 1px solid rgba( 127, 127, 127, 0.28 );
	border-left: 4px solid rgba( 127, 127, 127, 0.6 );
	border-radius: 8px;
	background: rgba( 127, 127, 127, 0.07 );
	font-size: 0.875rem;
	line-height: 1.5;
}
.rp-license-title {
	font-weight: 600;
	margin-bottom: 2px;
}
.rp-license-text {
	opacity: 0.85;
}
.rp-license--game { border-left-color: rgba( 59, 130, 246, 0.8 ); }
.rp-license--free { border-left-color: rgba( 34, 197, 94, 0.8 ); }
.rp-license--permission { border-left-color: rgba( 168, 85, 247, 0.8 ); }
.rp-license--fairuse { border-left-color: rgba( 245, 158, 11, 0.85 ); }
.rp-license--none {
	border-left-color: rgba( 239, 68, 68, 0.85 );
	background: rgba( 239, 68, 68, 0.08 );
}
"""

PARAM_NOTES = {
    'Screenshot': "<code>1</code> = the game, if not GTA V; <code>2</code> = who owns it.",
    'Self': "<code>1</code> = your name, to be credited.",
    'Permission': "<code>1</code> = who gave permission.",
    'Fair use': "<code>1</code> = who owns the copyright.",
    'CC-BY-SA-4.0': "<code>1</code> = the creator, to be credited.",
    'CC-BY-4.0': "<code>1</code> = the creator, to be credited.",
}


def doc():
    rows = '\n'.join(
        f"|-\n| <code><nowiki>{{{{{name}}}}}</nowiki></code> || {title} || [[:Category:{cat}]] || {PARAM_NOTES.get(name, '')}"
        for name, kind, cat, title, text in LICENSES)
    return f"""Every uploaded file should say where it comes from and who may use it. When you upload with [[Special:Upload]], pick a licence from the '''Licensing''' list and its box is added to the file page for you. To fix or add one later, edit the file page and put one of these under <code><nowiki>== Licensing ==</nowiki></code>.

{{| class="wikitable"
! Template !! Means !! Category !! Optional values
{rows}
|}}

Which one?
* '''Screenshots and clips from the game''' (even ones you took yourself): <code><nowiki>{{{{Screenshot}}}}</nowiki></code>. The game's pictures belong to Rockstar.
* '''Your own drawing, edit or photo''': <code><nowiki>{{{{Self}}}}</nowiki></code> to let anyone reuse it, or <code><nowiki>{{{{Permission|your name}}}}</nowiki></code> to keep it to this wiki.
* '''Someone else's art''' (a commission, stream art): ask them first, then <code><nowiki>{{{{Permission|their name}}}}</nowiki></code>.
* '''Real-world logos, album covers, film posters''': <code><nowiki>{{{{Fair use|owner}}}}</nowiki></code>, at a small size.

Files tagged <code><nowiki>{{{{No license}}}}</nowiki></code> are listed in [[:Category:Files with no license]] (hidden) for moderators to check.

The list on the upload page is set in [[MediaWiki:Licenses]]. All licence templates use [[Template:License]] for their box, styled by [[Template:License/styles.css]].

== The shared box ==
<code><nowiki>{{{{License|kind=…|title=…|text=…|category=…}}}}</nowiki></code>: <code>kind</code> sets the colour (<code>game</code>, <code>free</code>, <code>permission</code>, <code>fairuse</code>, <code>none</code>). The category is only added on file pages.

[[Category:Files by license]]"""


def pages():
    out = [
        ('MediaWiki:Licenses', 8, 'wikitext', 'text/x-wiki', DROPDOWN),
        ('Template:License', 10, 'wikitext', 'text/x-wiki', BOX),
        ('Template:License/styles.css', 10, 'sanitized-css', 'text/css', STYLES),
        ('Template:License/doc', 10, 'wikitext', 'text/x-wiki', doc()),
    ]
    for name, kind, cat, title, text in LICENSES:
        out.append(('Template:' + name, 10, 'wikitext', 'text/x-wiki',
                    f"{{{{License|kind={kind}|category={cat}|title={title}|text={text}}}}}"
                    f"<noinclude>\nThe licence box for file pages. See [[Template:License/doc]] for all licences.\n"
                    f"[[Category:License templates]]</noinclude>"))
    out.append(('Category:Files by license', 14, 'wikitext', 'text/x-wiki',
                'Uploaded files, sorted by licence. See [[Template:License/doc]].'))
    out.append(('Category:License templates', 14, 'wikitext', 'text/x-wiki',
                'The licence boxes for file pages. See [[Template:License/doc]].'))
    for name, kind, cat, title, text in LICENSES:
        about = f"Files tagged <code><nowiki>{{{{{name}}}}}</nowiki></code>: {title.lower() if kind != 'free' else title}."
        if kind == 'none':
            about = ('__HIDDENCAT__\nFiles with no licence. Find out where each comes from and replace '
                     '<code><nowiki>{{No license}}</nowiki></code> with the right licence, or delete the file.')
        out.append(('Category:' + cat, 14, 'wikitext', 'text/x-wiki', about + '\n\n[[Category:Files by license]]'))
    return out
