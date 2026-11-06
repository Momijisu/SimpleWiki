-- Module:Infobox
-- The engine behind {{Infobox character}}, {{Infobox organization}} and
-- {{Infobox event}}. Each template calls one function here; the fields,
-- sections, badges, categories and short descriptions are all defined in
-- TYPES below, so a layout change happens in one place.

local p = {}
local plain -- defined under Helpers; used by the short descriptions

-- ===================================================================
-- Settings you may want to change
-- ===================================================================

-- The `version` field: category name and how it is shown. %s is the version.
local VERSION_CATEGORY = "Let's RP %s"
local VERSION_LABEL = "Let's RP %s"

-- Pages with a missing or unknown value in a checked field go here, so they
-- can be found and fixed. Only articles are categorised, never templates.
local ERROR_CATEGORY = 'Pages with infobox problems'

-- How many portraits an infobox takes: image, image2 … image5.
local MAX_IMAGES = 5

-- Width the pictures are sent at (the infobox scales them to fit).
local IMAGE_WIDTH = '400px'

-- Shown when an infobox has no picture. Upload it once as File:Image unavailable.png;
-- until it exists, infoboxes without a picture simply show none. Set to nil to turn off.
local PLACEHOLDER_IMAGE = 'Image unavailable.png'

-- ===================================================================
-- The three infoboxes
-- ===================================================================
-- badges:   checked fields shown as coloured pills under the title, each a
--           link to its category. values maps what people type (lower case)
--           to how it shows; category gives the category for a value.
--           free = true accepts any value (values are then only suggestions,
--           listed in `suggest`); default fills the badge in when it's empty.
-- link:     on a field, plain names typed into it become links:
--           "Big Rig Customs" -> [[Big Rig Customs]]. Lists split on commas.
-- kicker:   the small line above the title.
-- sections: groups of rows. The first has no title and is always open;
--           the rest fold. `when` hides a whole section unless it's true.

local TYPES = {}

TYPES.character = {
	kind = 'Character',
	badges = {
		{ field = 'status', required = true,
			values = { active = 'Active', inactive = 'Inactive', deceased = 'Deceased' },
			category = function (label) return label .. ' characters' end },
		{ field = 'focus', required = true,
			values = { civilian = 'Civilian', criminal = 'Criminal', ['public sector'] = 'Public Sector' },
			category = function (label) return label .. ' characters' end },
	},
	sections = {
		{ fields = {
			{ 'full_name', 'Full name' },
			{ 'nicknames', 'Nicknames' },
			{ 'date_of_birth', 'Date of birth' },
			{ 'gender', 'Gender' },
			{ 'nationality', 'Nationality' },
		} },
		{ title = 'Life', fields = {
			{ 'occupation', 'Occupation' },
			{ 'employer', 'Employer', link = true },
			{ 'affiliation', 'Affiliation', link = true },
			{ 'rank', 'Rank' },
			{ 'residence', 'Residence' },
			{ 'phone', 'Phone number' },
		} },
		{ title = 'Relationships', fields = {
			{ 'family', 'Family', link = true },
			{ 'partner', 'Partner', link = true },
		} },
		{ title = 'Death', when = function (v) return v.status == 'deceased' end, fields = {
			{ 'died', 'Died' },
			{ 'cause_of_death', 'Cause of death' },
			{ 'killed_by', 'Killed by', link = true },
		} },
		{ title = 'Meta', fields = {
			{ 'played_by', 'Played by' },
			{ 'first_seen', 'First seen' },
			{ 'last_seen', 'Last seen' },
			{ 'version', 'Server version', version = true },
		} },
	},
	categories = function (v)
		local c = { 'Characters' }
		if v.status then table.insert(c, v.statusLabel .. ' characters') end
		if v.focus then table.insert(c, v.focusLabel .. ' characters') end
		return c
	end,
	shortdesc = function (v)
		-- e.g. "Criminal character", "Deceased civilian character"
		local focus = v.focusLabel and (v.focusLabel .. ' character') or 'Character'
		if v.status and v.status ~= 'active' then
			return v.statusLabel .. ' ' .. mw.ustring.lower(focus)
		end
		return focus
	end,
	-- An inactive character shows when they were last seen, under the badges.
	note = function (v, args)
		if v.status == 'inactive' and args.last_seen then
			return 'Last seen ' .. args.last_seen
		end
	end,
}

-- Organisation types: suggested in the editor, but any type can be typed in.
-- Known types get a tidy category name and a default focus.
local ORG_TYPES = {
	gang = { 'Gang', 'Gangs', 'criminal' },
	business = { 'Business', 'Businesses', 'civilian' },
	police = { 'Police', 'Police', 'public sector' },
	ems = { 'EMS', 'EMS', 'public sector' },
	government = { 'Government', 'Government', 'public sector' },
	['emergency services'] = { 'Emergency Services', 'Emergency Services', 'public sector' },
}
local ORG_ALIASES = { emergency = 'emergency services', ['emergency service'] = 'emergency services',
	['emergency medical services'] = 'ems', ['lspd'] = 'police', gangs = 'gang' }

TYPES.organization = {
	kind = function (v, args)
		-- "Gang", or "Motorcycle club · Gang" when a subtype is given
		if args.subtype and v.typeLabel then return args.subtype .. ' · ' .. v.typeLabel end
		return args.subtype or v.typeLabel or 'Organization'
	end,
	badges = {
		{ field = 'type', required = true, hidden = true, free = true,
			suggest = { 'Gang', 'Business', 'Police', 'EMS', 'Government' },
			values = (function ()
				local t = {}
				for k, d in pairs(ORG_TYPES) do t[k] = d[1] end
				for k, target in pairs(ORG_ALIASES) do t[k] = ORG_TYPES[target][1] end
				return t
			end)() },
		{ field = 'focus',
			values = { civilian = 'Civilian', criminal = 'Criminal', ['public sector'] = 'Public Sector' },
			default = function (v)
				local d = v.type and ORG_TYPES[v.type]
				return d and d[3]
			end,
			category = function (label) return label .. ' organizations' end },
		{ field = 'status',
			values = { active = 'Active', inactive = 'Inactive', defunct = 'Defunct' },
			category = function (label) return label .. ' organizations' end },
	},
	-- Sections show when any of their fields is filled in.
	sections = {
		{ fields = {
			{ 'leader', 'Leader', link = true },
			{ 'deputy', 'Second in command', link = true },
			{ 'founded', 'Founded' },
			{ 'founder', 'Founder', link = true },
			{ 'defunct', 'Defunct' },
			{ 'headquarters', 'Headquarters' },
			{ 'members', 'Members' },
			{ 'ranks', 'Ranks' },
		} },
		{ title = 'Territory & activity', fields = {
			{ 'territory', 'Territory' },
			{ 'colours', 'Colours' },
			{ 'activities', 'Activities' },
			{ 'fronts', 'Fronts', link = true },
		} },
		{ title = 'Business', fields = {
			{ 'industry', 'Industry' },
			{ 'services', 'Products & services' },
			{ 'owner', 'Owner', link = true },
			{ 'location', 'Location' },
			{ 'hours', 'Opening hours' },
			{ 'phone', 'Phone number' },
		} },
		{ title = 'Public service', fields = {
			{ 'jurisdiction', 'Jurisdiction' },
			{ 'divisions', 'Divisions' },
		} },
		{ title = 'Relations', fields = {
			{ 'parent', 'Part of', link = true },
			{ 'subgroups', 'Chapters & branches', link = true },
			{ 'allies', 'Allies', link = true },
			{ 'rivals', 'Rivals', link = true },
			{ 'predecessor', 'Predecessor', link = true },
			{ 'successor', 'Successor', link = true },
		} },
		{ title = 'Meta', fields = {
			{ 'first_seen', 'First seen' },
			{ 'last_seen', 'Last seen' },
			{ 'version', 'Server version', version = true },
		} },
	},
	categories = function (v)
		local c = { 'Organizations' }
		if v.type then
			local d = ORG_TYPES[v.type]
			table.insert(c, d and d[2] or (v.typeLabel .. ' organizations'))
		end
		if v.focus then table.insert(c, v.focusLabel .. ' organizations') end
		if v.status then table.insert(c, v.statusLabel .. ' organizations') end
		return c
	end,
	shortdesc = function (v, args)
		local what = args.subtype or v.typeLabel or 'Organization'
		if v.status == 'defunct' then return 'Former ' .. mw.ustring.lower(what) end
		return what
	end,
}

TYPES.event = {
	kind = function (v) return v.typeLabel or 'Event' end,
	badges = {
		{ field = 'type', required = true,
			values = { heist = 'Heist', ['gang war'] = 'Gang war', shooting = 'Shooting', trial = 'Trial',
				election = 'Election', ['community event'] = 'Community event',
				['official server event'] = 'Official server event', official = 'Official server event',
				other = 'Other' },
			category = function (label)
				local plural = { ['Gang war'] = 'Gang wars', ['Community event'] = 'Community events',
					['Official server event'] = 'Official server events', Other = 'Other events' }
				return plural[label] or (label .. 's')
			end },
	},
	sections = {
		{ fields = {
			{ 'date', 'Date' },
			{ 'end_date', 'Ended' },
			{ 'location', 'Location' },
			{ 'organised_by', 'Organised by', link = true },
		} },
		{ title = 'Who', fields = {
			{ 'participants', 'Participants', link = true },
			{ 'factions', 'Factions involved', link = true },
		} },
		{ title = 'Outcome', fields = {
			{ 'outcome', 'Outcome' },
			{ 'casualties', 'Casualties' },
			{ 'arrests', 'Arrests' },
		} },
		{ title = 'Timeline', fields = {
			{ 'previous', 'Previous event', link = true },
			{ 'next', 'Next event', link = true },
		} },
		{ title = 'Meta', fields = {
			{ 'media', 'Clips & media' },
			{ 'version', 'Server version', version = true },
		} },
	},
	categories = function (v)
		local plural = {
			heist = 'Heists', ['gang war'] = 'Gang wars', shooting = 'Shootings', trial = 'Trials',
			election = 'Elections', ['community event'] = 'Community events',
			['official server event'] = 'Official server events', other = 'Other events',
		}
		local c = { 'Events' }
		if v.type then table.insert(c, plural[v.type]) end
		return c
	end,
	shortdesc = function (v, args)
		local what = v.typeLabel or 'Event'
		if args.date then return what .. ' on ' .. plain(args.date) end
		return what
	end,
}

-- ===================================================================
-- Helpers
-- ===================================================================

local function clean(s)
	if s == nil then return nil end
	s = mw.text.trim(s)
	if s == '' then return nil end
	return s
end

-- Text without wiki markup, for the short description.
plain = function (s)
	s = s or ''
	s = s:gsub('%[%[[^%]|]-|([^%]]-)%]%]', '%1')      -- [[Target|label]] -> label
	s = s:gsub('%[%[([^%]]-)%]%]', '%1')              -- [[Target]] -> Target
	s = s:gsub('%[https?://%S+%s+([^%]]-)%]', '%1')   -- [url label] -> label
	s = s:gsub("'''?", '')
	s = s:gsub('<[^>]->', '')
	return mw.text.trim(s)
end

-- Canonical value for a checked field: the key (lower case) and its label.
-- Returns nil, nil, typed when it isn't one of the allowed values.
local function pick(badge, typed)
	if not typed then return nil, nil, nil end
	local key = mw.ustring.lower(plain(typed))
	local label = badge.values[key]
	if not label then
		if badge.free and key ~= '' then
			-- Any value is fine: show it as typed, with a capital first letter.
			local shown = plain(typed)
			return key, mw.ustring.upper(mw.ustring.sub(shown, 1, 1)) .. mw.ustring.sub(shown, 2), nil
		end
		return nil, nil, typed
	end
	-- Aliases ("emergency") share a label; the key is always the label in lower case.
	return mw.ustring.lower(label), label, nil
end

local function cssKey(s)
	return (mw.ustring.lower(s):gsub('[^%w]+', '-'))
end

-- Words that mean "nobody / not known" and should never become links.
local NO_LINK = {
	unknown = true, none = true, ['n/a'] = true, na = true, various = true, nobody = true,
	['no one'] = true, tbd = true, tba = true, unemployed = true, independent = true,
	['self-employed'] = true, self = true, ['?'] = true, ['-'] = true, ['–'] = true, ['—'] = true,
}

-- Turn plain names into links: "Big Rig Customs" -> [[Big Rig Customs]].
-- Lists split on commas, semicolons and lines; "Rosa Ramirez (mother)" keeps
-- its note outside the link. Anything already containing markup is left as typed.
local function autolink(value)
	if value:find('[%[%]{}<>|]') or value:find("''", 1, true) then return value end
	local lines = {}
	for line in mw.text.gsplit(value, '\n') do
		local bullet, rest = line:match('^([%*#:]*%s*)(.*)$')
		local items = {}
		for item in mw.text.gsplit(rest, '[,;]') do
			item = mw.text.trim(item)
			if item ~= '' then
				local name, note = item:match('^(.-)%s*(%b())$')
				if not name or name == '' then name, note = item, nil end
				local skip = NO_LINK[mw.ustring.lower(name)] or name:match('^[%d%s%p]+$')
					or not mw.title.new(name)
				local linked = skip and name or ('[[' .. name .. ']]')
				table.insert(items, note and (linked .. ' ' .. note) or linked)
			end
		end
		table.insert(lines, bullet .. table.concat(items, ', '))
	end
	return table.concat(lines, '\n')
end

-- A value that starts with a list needs a newline to render as a list.
local function block(s)
	if s:match('^[%*#:;]') then return '\n' .. s .. '\n' end
	return s
end

local function fileLink(name, caption, class)
	if name:match('^%[%[') then return name end
	name = name:gsub('^[Ff]ile:', ''):gsub('^[Ii]mage:', '')
	return string.format('[[File:%s|%s|alt=%s%s]]', name, IMAGE_WIDTH, caption or '', class and ('|class=' .. class) or '')
end

-- Is the placeholder uploaded? (Checked once per page.)
local function placeholderExists()
	if not PLACEHOLDER_IMAGE then return false end
	local t = mw.title.new(PLACEHOLDER_IMAGE, 'File')
	return t ~= nil and t.file ~= nil and t.file.exists
end

-- ===================================================================
-- Building the infobox
-- ===================================================================

local function render(frame, typeName)
	local def = TYPES[typeName]
	local args = {}
	for k, v in pairs(frame:getParent().args) do args[k] = clean(v) end

	local title = mw.title.getCurrentTitle()
	local isArticle = title.namespace == 0
	local name = args.name or title.text

	-- Read the checked fields.
	local v = {}
	local problems = {}
	for _, badge in ipairs(def.badges) do
		local typed = args[badge.field]
		if not typed and badge.default then typed = badge.default(v, args) end
		local key, label, bad = pick(badge, typed)
		v[badge.field] = key
		v[badge.field .. 'Label'] = label
		if bad then
			table.insert(problems, string.format('“%s” isn’t a known %s', bad, badge.field))
		elseif badge.required and not key then
			table.insert(problems, string.format('%s is missing', badge.field))
		end
	end

	local box = mw.html.create('div'):addClass('rp-infobox'):addClass('rp-infobox--' .. typeName)
	for _, badge in ipairs(def.badges) do
		if v[badge.field] then box:addClass('rp-' .. badge.field .. '--' .. cssKey(v[badge.field])) end
	end

	-- Pictures: one, or several as tabs.
	local images = {}
	for i = 1, MAX_IMAGES do
		local suffix = i == 1 and '' or tostring(i)
		local file = args['image' .. suffix]
		if file then
			table.insert(images, {
				file = file,
				label = args['image' .. suffix .. '_label'] or (i == 1 and 'Main' or ('Image ' .. i)),
				caption = args['caption' .. suffix],
			})
		end
	end
	if #images == 0 and placeholderExists() then
		-- No picture given: the placeholder, kept out of search thumbnails (notpageimage).
		box:tag('div'):addClass('rp-ib-image'):addClass('rp-ib-placeholder')
			:wikitext(string.format('[[File:%s|%s|alt=No image|link=|class=notpageimage]]', PLACEHOLDER_IMAGE, IMAGE_WIDTH))
	elseif #images == 1 then
		local fig = box:tag('div'):addClass('rp-ib-image')
		fig:wikitext(fileLink(images[1].file, images[1].caption))
		if images[1].caption then fig:tag('div'):addClass('rp-ib-caption'):wikitext(images[1].caption) end
	elseif #images > 1 then
		local tabs = {}
		for _, img in ipairs(images) do
			local content = fileLink(img.file, img.caption)
			if img.caption then content = content .. '<div class="rp-ib-caption">' .. img.caption .. '</div>' end
			table.insert(tabs, '|-|' .. img.label:gsub('=', '') .. '=' .. content)
		end
		box:tag('div'):addClass('rp-ib-image'):addClass('rp-ib-tabs')
			:wikitext(frame:extensionTag('tabber', table.concat(tabs, '\n')))
	end

	-- Heading: kind, name, badges.
	local head = box:tag('div'):addClass('rp-ib-head')
	local kind = type(def.kind) == 'function' and def.kind(v, args) or def.kind
	head:tag('div'):addClass('rp-ib-kind'):wikitext(kind)
	head:tag('div'):addClass('rp-ib-title'):wikitext(name)
	local pills = {}
	for _, badge in ipairs(def.badges) do
		if v[badge.field] and not badge.hidden then
			local label = v[badge.field .. 'Label']
			-- Each badge links to its category, e.g. "Criminal" -> Category:Criminal characters.
			local text = badge.category and string.format('[[:Category:%s|%s]]', badge.category(label), label) or label
			table.insert(pills, { badge.field, v[badge.field], text })
		end
	end
	if #pills > 0 then
		local row = head:tag('div'):addClass('rp-ib-badges')
		for _, b in ipairs(pills) do
			row:tag('span'):addClass('rp-badge'):addClass('rp-badge--' .. cssKey(b[2])):wikitext(b[3])
		end
	end
	local note = def.note and def.note(v, args)
	if note then head:tag('div'):addClass('rp-ib-note'):wikitext(note) end

	-- Sections of rows.
	for i, section in ipairs(def.sections) do
		if not section.when or section.when(v) then
			local rows = {}
			for _, f in ipairs(section.fields) do
				local value = args[f[1]]
				if value then
					if f.version then value = string.format(VERSION_LABEL, value) end
					if f.link then value = autolink(value) end
					table.insert(rows, { f[2], value })
				end
			end
			if #rows > 0 then
				local sec = box:tag('div'):addClass('rp-ib-section')
				local body = sec
				if section.title then
					sec:addClass('mw-collapsible')
					sec:tag('div'):addClass('rp-ib-section-title'):addClass('mw-collapsible-toggle'):wikitext(section.title)
					body = sec:tag('div'):addClass('mw-collapsible-content')
				end
				for _, r in ipairs(rows) do
					local row = body:tag('div'):addClass('rp-ib-row')
					row:tag('div'):addClass('rp-ib-label'):wikitext(r[1])
					row:tag('div'):addClass('rp-ib-value'):wikitext(block(r[2]))
				end
			end
		end
	end

	-- Problems show in the box itself, so whoever sees them can fix them.
	if #problems > 0 then
		local warn = box:tag('div'):addClass('rp-ib-problems')
		warn:wikitext('Infobox: ' .. table.concat(problems, '; ') .. '. See the template’s page for the allowed values.')
	end

	local out = { frame:extensionTag('templatestyles', '', { src = 'Template:Infobox/styles.css' }), tostring(box) }

	-- Short description: the grey line under the page title.
	local desc = args.shortdesc or def.shortdesc(v, args)
	if args.version and not args.shortdesc then desc = desc .. ' in ' .. string.format(VERSION_LABEL, args.version) end
	if isArticle and desc and desc ~= '' then
		table.insert(out, frame:preprocess('{{SHORTDESC:' .. plain(desc) .. '}}'))
	end

	-- Categories, on articles only.
	if isArticle then
		local cats = def.categories(v, args)
		if args.version then table.insert(cats, string.format(VERSION_CATEGORY, args.version)) end
		if #problems > 0 then table.insert(cats, ERROR_CATEGORY) end
		for _, c in ipairs(cats) do table.insert(out, '[[Category:' .. c .. ']]') end
	end

	return table.concat(out)
end

function p.character(frame) return render(frame, 'character') end
function p.organization(frame) return render(frame, 'organization') end
function p.event(frame) return render(frame, 'event') end

-- For the documentation pages: the allowed values of a checked field,
-- e.g. {{#invoke:Infobox|values|character|status}}.
function p.values(frame)
	local def = TYPES[frame.args[1]]
	if not def then return '' end
	for _, badge in ipairs(def.badges) do
		if badge.field == frame.args[2] then
			if badge.suggest then return table.concat(badge.suggest, ' · ') end
			local seen, list = {}, {}
			for _, label in pairs(badge.values) do
				if not seen[label] then seen[label] = true; table.insert(list, label) end
			end
			table.sort(list)
			return table.concat(list, ' · ')
		end
	end
	return ''
end

return p
