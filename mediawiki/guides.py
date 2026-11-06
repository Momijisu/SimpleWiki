"""The editing guides (Help:Editing and its sub-pages), rewritten for the Let's RP
Wiki from the Star Citizen Wiki's guides (starcitizen.tools, CC BY-SA 4.0), which in
turn adapted parts of the RuneScape Wiki's. Also the small helper templates they use
and redirects from the old help page names. build.py writes these to dist/guides.xml.
The screenshots they show are in files/guides/ (see shots.cjs)."""

NOTE = ("<div class=\"rp-note\">'''Note:''' Parts of this guide are adapted from the "
        "[https://starcitizen.tools/ Star Citizen Wiki] editing guides "
        "([https://creativecommons.org/licenses/by-sa/4.0/ CC BY-SA 4.0]), which in turn adapted parts of the "
        "[https://runescape.wiki/ RuneScape Wiki]'s "
        "([https://creativecommons.org/licenses/by-nc-sa/3.0/ CC BY-NC-SA 3.0]).</div>")

STYLE = '<templatestyles src="Template:Card/styles.css" />'


def page(shortdesc, body, cat=True):
    return (STYLE + '\n' + body.strip() + '\n\n' + NOTE + '\n'
            + '{{SHORTDESC:' + shortdesc + '}}\n'
            + ('[[Category:Editing guides]]' if cat else ''))


def img(name, caption):
    return f'[[File:{name}|500px|center|thumb|{caption}]]'


EDITING = """
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
 | text  = Making more complicated edits using the default editor: headings, tables, references and infoboxes.
 | link  = Help:Editing/VisualEditor advanced
}}
{{Card
 | title = What's possible with source mode
 | text  = Templates, categories, references, redirects and disambiguation pages.
 | link  = Help:Editing/Advanced editing
}}
{{Card
 | title = Citations
 | text  = How to back up what you write with a clip, a VOD or an announcement.
 | link  = Help:Editing/Citations
}}
{{Card
 | title = Tables
 | text  = More details about editing tables in source mode.
 | link  = Help:Editing/Tables
}}
{{Card
 | title = Using templates
 | text  = How to use templates across the wiki.
 | link  = Help:Templates
}}
{{Card
 | title = Adding images
 | text  = Uploading screenshots, choosing a licence, and putting pictures in infoboxes.
 | link  = Help:Editing/Adding images
}}
</div>
__NOTOC__
"""

YOUR_FIRST_EDIT = f"""
This is '''part 1''' of the series of [[Help:Editing|editing guides]] of the Let's RP Wiki. This guide is a step-by-step process to '''your first edit''' - or, '''how to edit plain text with the visual editor'''.

This guide is made from the perspective of a logged-in user with default preferences.

== Walkthrough ==
=== Spotting an error ===
Finding an error to fix can sometimes be hard, but there are definitely pages that need fixing; the wiki is far from perfect. Let's assume you've found a page with something simple to fix (e.g. just something in the prose). For this demonstration we'll use the introduction of the Tony Ramirez page, which is a bit short and could say more about who he is. We're going to reword it.

{img('YFE - problem found.png', 'The introduction we are going to improve')}

=== Opening the editor ===
Opening the editor is simple; just click the ''Edit'' button (the one with a pen) at the top right of the page, next to the page title.

{img('YFE - edit button.png', 'The Edit button')}

You are now in the editor. It looks like the page, but some bits may move around, and there's an edit toolbar at the top. This editor is called the '''VisualEditor''', a WYSIWYG (what you see is what you get) editor. It behaves like any word processor (e.g. Microsoft Word or Google Docs). Feel free to click around and explore the parts of a page and what they look like when clicked.

{img('YFE - editor opened.png', 'The page open in VisualEditor')}

=== Editing the page ===
Now we're just going to edit the introduction. This bit is just plain text with no additional stuff; so to edit it, we just click where we want to type, and type there. You can select text to copy, paste, delete, etc. A new paragraph can be created by pressing enter.

{img('YFE - text edited.png', 'The reworded introduction')}

It may not be perfect, but it says more and reads clearly.

=== Saving the edit ===
Saving an edit is done by clicking the ''Save changes...'' button on the right side of the toolbar. Click it to open the save dialogue.

{img('YFE - save your changes.png', 'The save dialogue')}

In the dialogue, there's a box to put an edit summary and a few buttons. First, we're going to click ''Review your changes''.

==== Reviewing changes ====
{img('YFE - review your changes.png', 'Reviewing the changes before saving')}

Your changes are shown as a ''diff'': a comparison of the page before and after your edit. Text that was removed is highlighted on one side, and the text that replaced it on the other. You can switch between a visual view and the page's ''wikitext'' (the code behind the page, covered in [[Help:Editing/Source mode basics|later guides]]).

What we're looking for is twofold: double-check our changes are what we want to do (proofread it), and see if anything has changed that should not have changed. VisualEditor occasionally changes parts of a page you didn't touch. If you notice this has happened to you, it may be possible to fix it using source mode; however, you might have to start the edit over. Luckily, our example edit seems fine so we'll continue.

It is optional but recommended to do this for every edit.

==== Saving ====
Clicking ''Return to save form'' brings us back to the previous dialogue. Here we're going to add an edit summary and finally save the page.

{img('YFE - edit summary.png', 'Writing an edit summary')}

An edit summary is a short note attached to your edit. It isn't shown on the page itself, but anyone can see it in the page's history and in recent changes. Try to sum up what you did, so that other editors can see at a glance. You can be as brief or as descriptive as you like, up to 500 characters, and you can use links.

Edit summaries are covered by the community rules like everything else (being rude to other users in a summary is as much grounds for a block as being rude anywhere else). They can't be changed afterwards, only hidden by an administrator.

We'll simply describe the edit as "Rewrote the introduction".

Now, we just click ''Save changes''. After a moment (don't close or reload the page while it saves, or your edit may be lost!), the edit is saved and the page reloads to show the new version.

{img('YFE - edit complete.png', 'The saved edit')}

And that's it! The edit has been saved and is viewable to all.

== Common things to fix and not fix ==
There are several simple things you should fix if you see them, for example:

* Typos
* Links to incorrect places
* Incorrect or outdated information (a character's status, an organisation's leader)
* Poorly-formatted or poorly-worded paragraphs

Things you shouldn't change or should otherwise bear in mind:

* The wiki uses [[Help:Style guide|British English]] throughout, as the server does. This means that:
** Words should be spelled the British way; common examples include "colour" (not "color"), "organise" (not "organize") and "licence" (the noun, not "license").
** Dates should be written as ''14 June 2026'' (day, month, year).
* Always use sentence case unless the name is or includes a proper noun; i.e. don't capitalise words unless they are part of a name. "Tony works at Big Rig Customs as a mechanic." not "Tony works at Big Rig Customs as a Mechanic."
* Write in-character history as it happened, in the past tense, and keep out-of-character details (the player, their stream) for the ''Meta'' part of the infobox.
* Opinions are not valuable content; e.g. "Tony is the best getaway driver in the city" is not appropriate, but "Tony drove the getaway car in the Harbor Bank Heist" is.

== See also ==
* The next guide in the series is [[Help:Editing/VisualEditor basics]], about using VisualEditor to edit other parts of an article. You may prefer to skip straight to source mode with [[Help:Editing/Source mode basics]].
* [[Help:Style guide|Style guide of the Let's RP Wiki]]
"""

VE_BASICS = f"""
This is '''part 2''' of the series of [[Help:Editing|editing guides]] of the Let's RP Wiki. This guide is a step-by-step process on '''VisualEditor basics''' - or, '''how to use the most common tools the VisualEditor offers'''.

This guide is made from the perspective of a logged-in user with default preferences. It also assumes you have read [[Help:Editing/Your first edit|the first guide]]; if you haven't, please do so first!

This guide covers four very common things:

* Links
* Bold and italics
* Bulleted and numbered lists
* Images

== Walkthrough ==
=== Starting ===
For this demonstration we'll use Tony Ramirez again, but we won't save any of the edits. This is just to show how to do things. The sections below were done in this order, but you don't have to follow it.

Open up the editor.

{img('VE basics - editor opened.png', 'The editor, ready to go')}

=== Links ===
Links are probably the most important thing to use after plain text. First off, click the "Southside Saints" link in the introduction to show this popup:

{img('VE basics - link popup.png', 'Clicking a link shows where it goes')}

The icon shows what the thing is (a link has a chain) and the text shows where the link goes. From here you can follow the link to the page, remove the link, or change it using the ''Edit'' button.

{img('VE basics - link editing.png', 'The link editor')}

This is the link editor. As you can see, it is pretty simple. You can change where the link goes by typing in the search box and picking the page you want to link to. Changing the destination won't change the text on the page (you do that by just typing in the paragraph).

Adding a link is as simple as selecting the text you want to link, then clicking the link button in the toolbar (the chain). This opens the link editor with a search for the words you selected.

{img('VE basics - link insert.png', 'Adding a new link')}

That's really all there is for links.

==== Policy ====
How to link is covered by [[Help:Style guide#Linking|the style guide]]. The main takeaways for VisualEditor are:

* If you mention the same thing on a page several times, in general, it should only be linked once, unless the page is very long (not counting tables, infoboxes and navigation boxes).
* Link the names of characters, organisations, places and events the first time they come up: it's how readers find their way around the city's story.

=== Bold and italics ===
This is simpler than links but generally less important. '''Bold''' and ''italic'' are applied by selecting the text and clicking '''B''' or ''I'' in the ''Style text'' menu (the ''A'' button) in the toolbar.

{img('VE basics - bolding.png', 'The Style text menu')}

Removing bold or italics is done in exactly the same way: select the text and click the button again.

Bold and italics can '''''both be applied to the same thing''''' by clicking both buttons.

==== Policy ====
This is also covered by [[Help:Style guide|the style guide]].

* Bold and italics should generally be used sparingly.
* Using both at the same time should be done even less often.
* The first mention of the article's name (in the opening sentence, usually) should be bold. Other mentions should not.
* Titles of works should be in italics: real-world films, songs and games, like ''Grand Theft Auto V'', and in-character ones too, like a radio show, a newspaper or an album recorded in the city.
* Bold and italics can be used for emphasis, but only when necessary. Bolding an entire sentence is never appropriate. If a part of the text is important enough that it needs to stand out, reword it to make that point instead; for example, move it to the start of the paragraph, or give it a paragraph of its own.

Underlines should be avoided, so they are not covered here.

=== Lists ===
Lists come in two forms - bulleted lists and numbered lists - which work the same way. Numbered lists are for things that have an order, like the steps of a plan, whereas bulleted lists are for things that don't, like a gang's members.

Lists are added with the list button in the toolbar:

{img('VE basics - list.png', 'Adding a list')}

If your cursor is on a line that already has text (or you have text selected), the whole line or paragraph becomes the first item in the list. To start with a blank item, press enter first to make a new line, then click the button. You can also click the button again to remove the list, or change its type.

Once you have one item, the next is added by pressing enter at the end of a line. Pressing enter on an empty item removes it and finishes the list.

==== Policy ====
There are currently no guidelines on how to use lists, but common sense should prevail.

If each item in your list has the same kind of information in the same pattern (a name, a rank, a date joined...), consider using a table instead. Tables are covered in [[Help:Editing/VisualEditor advanced|the next guide]].

=== Images ===
Images are the most complex thing covered in this guide, but they're used a lot, so they're pretty important.

Images are added from the ''Insert'' menu in the toolbar, with ''Images and media''. (You can remove an image by clicking it and pressing backspace or delete.)

{img('VE basics - insert image button.png', 'Insert, then Images and media')}

This opens the media dialogue, where you can search for a picture that's already on the wiki or upload a new one. Uploading is covered in [[Help:Editing/Adding images|the adding images guide]], so we're just going to search for now. For this example we'll search for "Saints" and pick the gang's logo.

{img('VE basics - insert image dialog.png', 'Searching for a picture')}

Clicking a picture shows a bigger view with some information about it. Clicking ''Use this image'' at the top right opens the image settings.

Under ''General'' you can set a caption, which appears below the picture. Captions can contain links, bold, italics and so on, like normal text.

{img('VE basics - image caption.png', 'Writing a caption')}

Under ''Advanced'' you can set the position and size of the picture: whether it sits on the left, the right or in the centre of the page, and how big it is, instead of using the drag handles.

{img('VE basics - image position.png', 'Position and size')}

Clicking ''Insert'' adds the picture to the page.

{img('VE basics - image inserted.png', 'The picture on the page')}

Once the picture is on the page you can drag it to move it, resize it with the handles in its corners, and get back to its settings by clicking it and then clicking ''Edit'' in the popup.

==== Notes ====
Moving a picture around too much can sometimes leave it somewhere VisualEditor can't place properly; you may have to use source mode.

Pictures can do more than VisualEditor shows - those things are covered in [[Help:Editing/Source mode basics|the source mode guide]].

==== Policy ====
How to use pictures is, again, covered by [[Help:Style guide|the style guide]].

* Pictures should mostly be on the left or the right, with the centre used sparingly.
** The infobox takes up the right side at the top of most pages. Put pictures near it on the left or in the centre instead.
** Keep in mind that pictures can sit differently on phones.
* Captions should end in a full stop if they are a complete sentence, and not have one if they are not.
* The main picture of a character, organisation or event goes in its infobox, not in the text. See [[Help:Editing/Adding images#Adding an image to an infobox|adding an image to an infobox]].

Every picture you upload needs a licence; see [[Template:License/doc|choosing a licence]] and [[Help:Editing/Adding images|the adding images guide]].

== See also ==
* The next guide in the series is [[Help:Editing/VisualEditor advanced]], about using VisualEditor to edit headings, tables, references and infoboxes. You may prefer to see the source mode version of this guide at [[Help:Editing/Source mode basics]].
* [[Help:Style guide]]
* [[Template:License/doc|Choosing a licence]]
"""

VE_ADVANCED = f"""
This guide is a step-by-step process on more '''advanced editing in VisualEditor''', covering four more complex things: headings, tables, references, and templates.

This guide is made from the perspective of a logged-in user with default preferences. It also assumes you have read [[Help:Editing/Your first edit|the first]] and [[Help:Editing/VisualEditor basics|second guide]]; if you haven't, please do so first!

== Walkthrough ==
=== Headings ===
Headings are fairly simple. They're added from the paragraph menu at the left of the toolbar:

{img('VE advanced - insert heading.png', 'Choosing a heading')}

Each sub-heading is smaller than the one before. Most pages only need ''Heading'' and ''Sub-heading 1''; below sub-heading 2, they start getting comical, so stay away from those.

=== Tables ===
Tables are a common way to show information compactly. We're just going to cover basic tables here - more advanced ones are better done in source mode, or may already have a template.

==== Inserting and editing ====
To insert a table, choose ''Table'' from the ''Insert'' menu in the toolbar.

{img('VE advanced - insert table.png', 'Insert, then Table')}

This inserts a blank table, with the top row as header cells.

{img('VE advanced - table inserted.png', 'A new, empty table')}

You can type into a cell by clicking it and typing; you can add links, pictures, bold and so on as normal. For this example we'll make a list of the Southside Saints' members, with their rank and when they joined.

{img('VE advanced - table filled out.png', 'The table, filled in')}

==== New rows and columns ====
Clicking any cell adds a small arrow above its column and to the left of its row, outside the table. Clicking these gives the option to add (and remove) rows and columns.

{img('VE advanced - insert row.png', 'Adding a row')}

==== Header cells ====
Header cells can be added and removed using the cell menu in the same place. Much like a spreadsheet, you can select several cells by clicking and dragging, so you can change a whole column at once.

==== Merging ====
Click and drag to select the cells to merge, then click ''Merge cells'' in the table's menu. This is also where you can delete the table, or give it a caption.

=== References ===
References cover two types of things: citations and footnotes. Citations back up a statement with a source; footnotes add a side note to a statement.

On this wiki, sources are usually stream clips, VODs, screenshots or official Let's RP announcements; [[Help:Editing/Citations|the citation guide]] covers which to use and how to write them. If you aren't sure, just add a normal footnote with a link and someone can tidy it up later.

==== Inserting ====
References are inserted with the ''Cite'' button in the toolbar.

{img('VE advanced - insert reference.png', 'The Cite button')}

This opens the reference dialogue.

{img('VE advanced - reference text.png', 'Writing a reference')}

Here you set the text of the reference. Paste the link to the clip or VOD and say what it shows, then click ''Insert''.

==== References list ====
Inserting the reference is half of the process: the page also needs a ''references list'', the place where all of its references are listed.

The list for citations should go at the end of the page, in a section called '''References''', above any navigation boxes. Footnotes can go at the end of the section they belong to - use common sense on where to place it.

References lists are added from the ''Insert'' menu in the toolbar, with ''References list''.

{img('VE advanced - references list.png', 'Adding the references list')}

;Tips
* A references list shows every reference above it on the page, back to the previous list or the top of the page.
* If there are no references, the list isn't needed and should be removed.
* If there are references but no list, a warning appears at the bottom of the page until a list is added.

==== Reusing references ====
Sometimes one source backs up several parts of the same article. Rather than adding it twice, you can reuse it: click ''Cite'', then ''Re-use'', and pick the reference from the list. It shows up once in the references list, with a link back to each place it's used.

==== Reference groups ====
To keep different kinds of references apart (for example, sources and side notes), you can put them in groups. In the reference dialogue, type a group name, like "notes", under ''Use this group''. References in a group are numbered separately ("notes 1") and need their own references list for that group.

=== Templates ===
Templates are the last thing we're going to cover in VisualEditor. First, a quick introduction.

Templates use a process called '''transclusion''': including part or all of one page inside another. This has a few benefits:

* The same information can be on every page that needs it without typing it each time.
* When the information needs updating, all those pages change at once.
* Pages look and work the same way, making the key information easy to find.

You can also pass information into a template, and it changes what it shows to match. On this wiki, the most important templates are the '''infoboxes''': the box at the top right of every character, organisation and event page.

Templates are made up of two parts:

* A name, which decides which template is used
* Parameters and their values: the information passed into the template. There may be none, one or many, depending on the template.

==== Editing an infobox ====
Click the infobox, then click ''Edit'' in the popup to open the template editor.

{img('VE advanced - template editing.png', 'Clicking an infobox')}

Here you have a list of the infobox's fields and their values; change them as you like. Fields with a fixed set of answers, like '''Status''', give you a list to choose from. Click ''Apply changes'' to finish, or ''Cancel'' to undo your changes to it.

{img('VE advanced - template form.png', 'Filling in the infobox')}

To add a field that isn't shown yet, use ''Add more information'' at the bottom of the list. To add an infobox (or any template) to a page, use ''Insert'' then ''Template'', and type its name. Every infobox's own page lists what each field is for; see [[Help:Templates]].

== See also ==
* This guide concludes the VisualEditor guides. To do more, you need source mode; luckily, the next guide is [[Help:Editing/Source mode basics]].
* [[Help:Style guide]]
* [[Help:Editing/Citations]]
* [[Help:Templates]]
"""

SOURCE_BASICS = f"""
The default editing mode for everyone on the wiki is visual editing mode. Some kinds of edits made in the visual mode can introduce mistakes elsewhere on the page.

'''Source mode''' allows you to see all of the wikitext on a page and to edit it directly. If you want to make a more complex edit you should switch to source mode in the editor.

== Switching editors ==
You can switch between visual and source mode at any time while editing, with the pen button at the top right of the toolbar.

{img('SM basics - switch to source.png', 'Switching to source mode')}

The editor reloads in source mode. It works the same way as the visual mode, except that the page's content is now shown as wikitext.

{img('SM basics - source editor.png', 'The same page in source mode')}

== Basics in source mode ==
This part of the guide covers how to do the same things as [[Help:Editing/VisualEditor basics]], using source mode. The same policies and guidelines apply.

=== Bold and italics ===
'''Bold''' is added by putting <nowiki>'''three apostrophes'''</nowiki> around the text and ''italics'' by putting <nowiki>''two apostrophes''</nowiki> around it.

You can type these with the apostrophe key, or select the text and use the bold or italic buttons in the toolbar.

=== Headings ===
Headings are added by putting == == around your section title. Further sub-headings can be added by adding more equals signs. E.g.:

<pre>== Heading 1 ==
=== Sub-heading 1 ===
==== Another section ====
=== Sub-heading 2 ===
== Heading 2 ==</pre>

Try not to overuse headings: having too many can make it hard to find your way around a page. An alternative is bold text on its own line, which looks like a small heading but doesn't appear in the page's contents. E.g.:

<code><nowiki>'''Heading'''</nowiki></code>
gives
'''Heading'''

=== Lists ===
Numbered lists are added by putting # before each item on the list. Each item should begin on a new line. E.g.:

<pre># First point
# Second point</pre>

Gives:
# First point
# Second point

Bulleted lists are added with *:

<pre>* First point
* Second point</pre>

Makes:
* First point
* Second point

You can also make lists within lists:

<pre># First point
## One more thing
## Another thing
# Second point</pre>

Gives:
# First point
## One more thing
## Another thing
# Second point

<pre>* First point
** One more thing
** Another thing
* Second point</pre>

Makes:
* First point
** One more thing
** Another thing
* Second point

=== Links ===
* To add a link, put <nowiki>[[ ]]</nowiki> around the name of the page you want to link to. You can type these yourself or use the link button. E.g. <nowiki>[[Southside Saints]]</nowiki> creates Southside Saints.
* If the text between <nowiki>[[ ]]</nowiki> doesn't match an existing page or redirect, you get a red link. Red links lead to an empty page, inviting the reader to create it. Use ''Show preview'' to check your links go where you expect.

Links should fit in with the rest of the sentence. You can do this in a few ways:

* Letters straight after a link, without a space, become part of the link's text; this is useful for plurals, e.g. <nowiki>[[Heist]]s</nowiki> gives Heists.
* You can change the text a link shows without changing where it goes; this is useful when a page's name doesn't fit your sentence, e.g. <nowiki>[[Los Santos Police Department|the police]]</nowiki> gives the police.
* All page names start with a capital letter, but you don't have to capitalise the first letter of a link for it to work. This helps keep the right capitalisation in sentences, e.g. <nowiki>[[heist]]</nowiki> links to the ''Heist'' page.
** Other words in a page name have to match its capitals exactly. If they don't fit your sentence, change the link's text instead, e.g. <nowiki>[[Official Server Events|official server events]]</nowiki>.
* Sometimes something doesn't have its own page, but has a section on a bigger one. You can link straight to that section by adding # and the section's heading after the page name, e.g. <nowiki>[[Tony Ramirez#Background]]</nowiki>. This is usually combined with changing the link's text, e.g. <nowiki>[[Tony Ramirez#Background|Tony's early life]]</nowiki>.

=== Images ===
* Show a picture by linking to its file, like this: <nowiki>[[File:The file's name.png]]</nowiki>. You must use the exact file name, including its spelling, capitals, spaces and ending (.png, .jpg...).
* You'll usually want to set the size and position of the picture:
** Adding <code>|thumb|left</code>, <code>|thumb|right</code> or <code>|thumb|center</code> after the file name puts it on that side of the page, in a frame, e.g. <nowiki>[[File:Example portrait.png|thumb|left]]</nowiki>.
** Adding a width like <code>|200px</code> in the same place sets how wide it is. E.g. <nowiki>[[File:Example portrait.png|thumb|center|200px|A character portrait]]</nowiki> adds a centred picture 200 pixels wide, with a caption:

[[File:Example portrait.png|thumb|center|200px|A character portrait]]

* You can also add pictures the same way as in the visual mode. See [[Help:Editing/VisualEditor basics#Images|this guide]] for more details.

=== Tables ===
Tables can be useful for showing some kinds of information. A standard table can be added with ''Insert'' then ''Table'' in the toolbar. This adds the wikitext:

<pre>{{| class="wikitable"
|+ Caption
! Header cell !! Header cell
|-
| Content cell || Content cell
|}}</pre>

Which gives a table with headings and rows like this one:

{{| class="wikitable"
! Member !! Rank !! Joined
|-
| Tony Ramirez || Getaway driver || March 2026
|-
| Rosa Ramirez || Associate || May 2026
|}}

In table wikitext:
* <code>|-</code> starts a new row
* <code>|</code> starts a new cell (or <code>||</code> for the next cell on the same line)
* <code>!</code> starts a heading cell

=== Making a new page ===
If you search for a page that doesn't exist, the search results offer to create it. Before you do, check the spelling, spacing and capitals of the name, so you don't make a second page for something that already has one. If you're sure no page exists, click the red link to create it.

{img('SM basics - making a page.png', 'Creating a page from the search results')}

The quickest way to start a character, organisation or event page is with the boxes under ''Start a new page'' on [[Help:Contents]]: the new page opens with its infobox and headings ready to fill in.

Start adding what you know. The page is only created when you save it.

You can then look at existing pages about similar things to see how they're laid out, and copy their structure.

== See also ==
* [[Help:Editing/Cheat sheet]]
* [[Help:Editing/Advanced editing]]
* [[Help:Style guide]]
"""

def row(desc, typed, got, note=''):
    d = desc + (f'<br /><span style="font-size:0.9em;">\'\'{note}\'\'</span>' if note else '')
    return f"|-\n| {d}\n| {typed}\n| {got}\n"


CHEAT_SHEET = """
This page is a '''cheat sheet''' to help you learn the basics of editing and formatting. The Let's RP Wiki uses a markup language called ''wikitext'' to create the different parts of a page. It's the same language used on every website that runs [[mw:MediaWiki|MediaWiki]], including Wikipedia, and is designed to be a simpler alternative to HTML.

== Cheat sheet ==
{| class="wikitable" style="width:100%"
! Description !! You type !! You get
""" + row('Italic text', "<code><nowiki>''italic''</nowiki></code>", "''italic''") \
    + row('Bold text', "<code><nowiki>'''bold'''</nowiki></code>", "'''bold'''") \
    + row('Bold and italic', "<code><nowiki>'''''bold & italic'''''</nowiki></code>", "'''''bold & italic'''''") \
    + row('Internal link',
          "<code><nowiki>[[Southside Saints]]</nowiki></code><br /><code><nowiki>[[Southside Saints|the Saints]]</nowiki></code><br /><code><nowiki>[[Heist]]s</nowiki></code>",
          "Southside Saints<br />the Saints<br />Heists", 'within the wiki') \
    + row('Link to a section',
          "<code><nowiki>[[#Heading|Heading]]</nowiki></code><br /><code><nowiki>[[Other page#Heading|Heading]]</nowiki></code>",
          "''Scrolls this page down to the heading.''<br />''Goes to the other page, then scrolls to the heading.''") \
    + row('Category', "<code><nowiki>[[Category:Gangs]]</nowiki></code>", "''Puts the page in [[:Category:Gangs]]''", 'at the bottom of the page') \
    + row('External link',
          "<code><nowiki>[https://www.example.org Text to show]</nowiki></code><br /><code><nowiki>[https://www.example.org]</nowiki></code><br /><code><nowiki>https://www.example.org</nowiki></code>",
          "[https://www.example.org Text to show]<br />[https://www.example.org]<br />https://www.example.org", 'to other websites') \
    + row('Redirect to another page', "<code><nowiki>#REDIRECT [[Target page]]</nowiki></code>", "''Sends readers straight to Target page''", 'the only thing on the page') \
    + row('Picture', "<code><nowiki>[[File:Example portrait.png|thumb|right|200px|Caption]]</nowiki></code>", "''A 200-pixel picture on the right, with a caption''") \
    + row('Template', "<code><nowiki>{{Infobox character}}</nowiki></code>", "''Adds the template; see [[Help:Templates]]''") \
    + row('Section headings',
          "<code><nowiki>== Level 1 ==</nowiki></code><br /><code><nowiki>=== Level 2 ===</nowiki></code><br /><code><nowiki>==== Level 3 ====</nowiki></code><br /><code><nowiki>===== Level 4 =====</nowiki></code>",
          "''Headings, each smaller than the last''", 'a table of contents appears once a page has four headings') \
    + row('Bulleted and numbered lists', "<code><nowiki>* Item</nowiki></code><br /><code><nowiki>** Sub-item</nowiki></code><br /><code><nowiki># Step</nowiki></code>", "''A bullet, an indented bullet, and a numbered step''") \
    + row('Reference', "<code><nowiki><ref>[https://clip.link Clip of the heist]</ref></nowiki></code><br /><code><nowiki><references /></nowiki></code>", "''A numbered footnote, and the list of them''", 'see [[Help:Editing/Citations]]') \
    + row('Signature', "<code><nowiki>~~~~</nowiki></code>", "''Your name and the time, on talk pages only''") \
    + "|}"

ADVANCED_EDITING = """
This page covers some of the more advanced things that go into making articles on the wiki. If you aren't familiar with source editing yet, you can find out how [[Help:Editing/Source mode basics|here]].

== Templates ==
{{Main|Help:Templates}}
Templates are used to show the same information across several pages, and to give pages about similar things the same layout.

Templates have their own namespace: their page names start with ''Template:'' followed by the template's name, e.g. [[Template:Infobox character]]. To add a template to a page, type its name between <nowiki>{{ }}</nowiki>. The name is the part after the colon, so for <nowiki>Template:Infobox character</nowiki> you type {{tl|Infobox character}}.

If you're not sure which templates a page should use, look at existing articles about similar things. Each template's own page also explains how to use it. Some templates, like infoboxes, have fields to fill in.

A full list of templates is on [[Help:Templates]].

== Categories ==
Categories group together pages and files that are related. They help readers find their way around and help editors keep the wiki tidy. Add a category by typing <nowiki>[[Category:Name]]</nowiki> at the very bottom of the page, after everything else.

'''Most pages don't need categories added by hand.''' The infoboxes add them for you: a character with <code>status = Active</code> and <code>focus = Criminal</code> is put in [[:Category:Characters]], [[:Category:Active characters]] and [[:Category:Criminal characters]] automatically. Only add categories the infobox doesn't cover.

You can see what belongs in a category on its own page, e.g. [[:Category:Gangs]]. To create a new category, [[Help:Editing/Source mode basics#Making a new page|make a new page]] whose name starts with ''Category:'', and describe what goes in it.

== Tables ==
Tables can be much more complicated than the basic guide describes: merged cells, sortable columns, colours and more. A full guide is coming soon; until then, see [[wikipedia:Help:Table|Wikipedia's guide to tables]].

== References ==
{{See also|Help:Editing/Citations}}
References show where the information on a page comes from. Add them for anything a reader might doubt or want to see for themselves: a big moment in a character's story, the result of an event, a quote. Good sources are stream clips, VODs, screenshots and official Let's RP announcements.

Put the source between <code><nowiki><ref></nowiki></code> and <code><nowiki></ref></nowiki></code> at the end of the sentence it backs up:

<pre>Tony drove the getaway car.<ref>[https://clips.twitch.tv/example Clip of the getaway], 14 June 2026</ref></pre>

When a page has references it needs a section that lists them, at the end of the page, before any navigation boxes but after everything else:

<pre>== References ==
<references /></pre>

== Redirects and disambiguation ==
Redirects send readers to another page when they search for or follow a link to a name. For example, a redirect called ''LSPD'' would take readers to the Los Santos Police Department page when they search for the short name.

Pages should always use the full, correct name of things; redirects make the wiki easier to get around by catching nicknames, short names and common misspellings. Characters' nicknames are a good use: a redirect from ''Two-Times'' to Tony Ramirez.

To create a redirect, [[Help:Editing/Source mode basics#Making a new page|create a new page]] with the redirect's name, containing only:

<pre>#REDIRECT [[Name of the real page]]</pre>

[[File:Redirect page.png|thumb|center|500px|A redirect page]]

Disambiguation pages also help readers find their way. Sometimes one name could mean several things: two characters with the same first name, or a business and the street it's on. A disambiguation page lists the pages the reader might be looking for, with a short line about each, so they can pick the right one.

== See also ==
* [[Help:Style guide]]
* [[Help:Templates]]
* [[Help:Editing/Citations]]
"""

CITATIONS = f"""
{{{{Note|This guide is a work-in-progress.}}}}

This guide is a step-by-step process on '''citing sources''': showing where the information on a page comes from.

This guide is made from the perspective of a logged-in user with default preferences. It also assumes you have read [[Help:Editing/VisualEditor advanced#References|the basic references guide]]; if you haven't, please do so first!

== What to cite ==
Most of the wiki is written from what people saw happen in the city, so you don't need a source for every sentence. Add one for:

* Big moments: a death, an arrest, a takeover, a wedding, the result of an event
* Anything someone might argue about
* Quotes

Good sources, from best to worst:

# '''Clips''' of the moment itself (Twitch, YouTube, Medal...)
# '''VODs''' (full stream recordings), with the time of the moment
# '''Official Let's RP announcements''', for server events and rule changes
# '''Screenshots''', uploaded to the wiki

Don't use private messages or things said out of character as sources for in-character history.

== Walkthrough ==
=== Creating a references section ===
Before adding citations, check whether the '''bottom of the page has a references section''' to keep them in.

{img('Citation - reference section.png', 'A typical references section')}

If there isn't one, make a new heading called '''References''' at the end of the page, then add a references list below it with ''Insert'' then ''References list'' in the toolbar.

=== Citing information ===
Click at the end of the sentence you want to back up, then click ''Cite'' in the toolbar.

{img('VE advanced - insert reference.png', 'The Cite button')}

In the reference, paste the link to your source and say what it is: whose stream, and when. For a VOD, add the time, like this:

<pre>[https://www.twitch.tv/videos/123456789?t=1h23m Tony's stream, 14 June 2026] (1:23:00)</pre>

Click ''Insert'', and the reference appears as a small number at the end of the sentence, with the source listed in the references section.

== See also ==
* [[Help:Editing/VisualEditor advanced#References]]
* [[Help:Editing/Advanced editing#References]]
"""

ADDING_IMAGES = f"""
This guide is a step-by-step process on '''adding images''' to pages, covering the most common image edits: uploading a picture, and putting it in an infobox.

== Walkthrough ==
=== Uploading an image to the wiki ===
Click the '''menu button''' at the top left to open the menu, then click '''Upload file'''.

{img('Adding images - menu upload file.png', 'Upload file, in the menu')}

Click '''Choose file''' and pick the picture from your computer.

{img('Adding images - choose file.png', 'Choosing the file')}

Give the file a clear '''name''' in ''Destination filename''. Use what the picture shows, like ''Tony Ramirez portrait.png'' or ''Harbor Bank Heist getaway.png'', not the name your computer gave it. Add a short '''summary''' of what it shows and where it's from (whose stream, and when).

{img('Adding images - file details.png', 'The file name and summary')}

Under '''Licensing''', pick where the picture comes from. A preview of the licence box appears underneath.

{img('Adding images - licensing.png', 'Picking a licence')}

* '''In-game screenshots and clips''', including ones you took yourself: ''A screenshot or video still from the game''. The game's pictures belong to Rockstar.
* '''Your own drawing, edit or photo''': one of the ''Made by you'' options.
* '''Someone else's art''': ask them first, then ''The creator gave permission to use it here''.
* Not sure? Pick ''I don't know where it comes from'', and a moderator will help.

See [[Template:License/doc|choosing a licence]] for every option.

Click '''Upload file''', and your picture is ready to use on the wiki.

{img('Adding images - file uploaded.png', 'The uploaded file')}

=== Adding an image to an infobox ===
Click the '''Edit''' button on the page.

Click the infobox, then click '''Edit''' in the popup.

{img('Adding images - infobox edit 01.png', 'Clicking the infobox')}

Find the '''Image''' field and type the name of the file you uploaded, without ''File:''. If the field isn't shown, add it with ''Add more information'' at the bottom.

{img('Adding images - infobox edit 02.png', 'The Image field')}

Click '''Apply changes''', then '''Save changes...''' at the top right to save the page. Until a picture is added, the infobox shows an "Image unavailable" placeholder.

For more than one picture (for example, a character's look in different versions of the server), use the ''Image 2'' fields and their labels: the infobox shows them as tabs.

== See also ==
* [[Template:License/doc|Choosing a licence]]
* [[Help:Editing/VisualEditor basics#Images]]
* [[Help:Editing/Source mode basics#Images]]
"""

# Small helper templates the guides use.
HATNOTE_CSS = """/* Template:Note/styles.css: notes and "Main article" lines (TemplateStyles). */
.rp-hatnote {
	margin: 0.4em 0 0.8em;
	padding-left: 1.6em;
	font-style: italic;
	opacity: 0.85;
}
.rp-box-note {
	margin: 0.6rem 0 0.8rem;
	padding: 10px 15px;
	border-left: 4px solid rgba( 59, 130, 246, 0.8 );
	border-radius: 8px;
	background: rgba( 59, 130, 246, 0.1 );
	font-size: 0.875rem;
	line-height: 1.4;
}
"""

TEMPLATES = [
    ('Template:Note/styles.css', 10, 'sanitized-css', 'text/css', HATNOTE_CSS),
    ('Template:Note', 10, 'wikitext', 'text/x-wiki',
     '<templatestyles src="Template:Note/styles.css" /><div class="rp-box-note">{{{1|}}}</div><noinclude>\n'
     'A note in a blue bar. Usage: <code><nowiki>{{Note|Your text}}</nowiki></code>\n\n'
     '{{Note|This guide is a work-in-progress.}}\n[[Category:Help templates]]</noinclude>'),
    ('Template:Main', 10, 'wikitext', 'text/x-wiki',
     '<templatestyles src="Template:Note/styles.css" /><div class="rp-hatnote">Main article{{#if:{{{2|}}}|s}}: '
     '[[{{{1}}}]]{{#if:{{{2|}}}|, [[{{{2}}}]]}}{{#if:{{{3|}}}|, [[{{{3}}}]]}}</div><noinclude>\n'
     'Points from a section to the page that covers it in full. Goes right under the heading. '
     'Usage: <code><nowiki>{{Main|Page name}}</nowiki></code> (up to three pages).\n[[Category:Help templates]]</noinclude>'),
    ('Template:See also', 10, 'wikitext', 'text/x-wiki',
     '<templatestyles src="Template:Note/styles.css" /><div class="rp-hatnote">See also: '
     '[[{{{1}}}]]{{#if:{{{2|}}}|, [[{{{2}}}]]}}{{#if:{{{3|}}}|, [[{{{3}}}]]}}</div><noinclude>\n'
     'Points to related pages. Goes right under a heading. '
     'Usage: <code><nowiki>{{See also|Page name}}</nowiki></code> (up to three pages).\n[[Category:Help templates]]</noinclude>'),
    ('Template:Tl', 10, 'wikitext', 'text/x-wiki',
     '<code><nowiki>{{</nowiki>[[Template:{{{1}}}|{{{1}}}]]<nowiki>}}</nowiki></code><noinclude>\n'
     'Shows a template\'s name as code, linked to the template: <code><nowiki>{{tl|Infobox character}}</nowiki></code> '
     'gives {{tl|Infobox character}}. Used on help pages.\n[[Category:Help templates]]</noinclude>'),
]


def pages():
    out = [
        ('Help:Editing', 12, 'wikitext', 'text/x-wiki',
         page('Portal page to beginner editing guides', EDITING, cat=False) + '[[Category:Help]]'),
        ('Help:Editing/Your first edit', 12, 'wikitext', 'text/x-wiki',
         page('Step-by-step process to your first edit with VisualEditor', YOUR_FIRST_EDIT)),
        ('Help:Editing/VisualEditor basics', 12, 'wikitext', 'text/x-wiki',
         page('Step-by-step process on VisualEditor basics', VE_BASICS)),
        ('Help:Editing/VisualEditor advanced', 12, 'wikitext', 'text/x-wiki',
         page('Step-by-step process on advanced visual editing', VE_ADVANCED)),
        ('Help:Editing/Source mode basics', 12, 'wikitext', 'text/x-wiki',
         page('Introduction to the basics of source editing', SOURCE_BASICS)),
        ('Help:Editing/Cheat sheet', 12, 'wikitext', 'text/x-wiki',
         page('Cheat sheet for source editing', CHEAT_SHEET)),
        ('Help:Editing/Advanced editing', 12, 'wikitext', 'text/x-wiki',
         page('Making more complicated edits with source editing', ADVANCED_EDITING)),
        ('Help:Editing/Citations', 12, 'wikitext', 'text/x-wiki',
         page('Step-by-step process to citing sources', CITATIONS)),
        ('Help:Editing/Adding images', 12, 'wikitext', 'text/x-wiki',
         page('Step-by-step process on adding images to the wiki', ADDING_IMAGES)),
        # The old help page names, so the buttons on Help:Contents go somewhere
        ('Help:Getting Started', 12, 'wikitext', 'text/x-wiki', '#REDIRECT [[Help:Editing/Your first edit]]'),
        ('Help:Images', 12, 'wikitext', 'text/x-wiki', '#REDIRECT [[Help:Editing/Adding images]]'),
        ('Category:Editing guides', 14, 'wikitext', 'text/x-wiki',
         'Step-by-step guides to editing the wiki. Start at [[Help:Editing]].\n\n[[Category:Help]]'),
    ]
    return out + TEMPLATES
