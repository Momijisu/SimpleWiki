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

-- ===================================================================
-- The three infoboxes
-- ===================================================================
-- badges:   checked fields shown as coloured pills under the title.
--           values maps what people type (lower case) to how it shows.
-- kicker:   the small line above the title.
-- sections: groups of rows. The first has no title and is always open;
--           the rest fold. `when` hides a whole section unless it's true.

local TYPES = {}

TYPES.character = {
	kind = 'Character',
	badges = {
		{ field = 'status', required = true,
			values = { active = 'Active', inactive = 'Inactive', deceased = 'Deceased' } },
		{ field = 'focus', required = true,
			values = { civilian = 'Civilian', criminal = 'Criminal', ['public sector'] = 'Public Sector' } },
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
			{ 'employer', 'Employer' },
			{ 'affiliation', 'Affiliation' },
			{ 'rank', 'Rank' },
			{ 'residence', 'Residence' },
			{ 'phone', 'Phone number' },
		} },
		{ title = 'Relationships', fields = {
			{ 'family', 'Family' },
			{ 'partner', 'Partner' },
		} },
		{ title = 'Death', when = function (v) return v.status == 'deceased' end, fields = {
			{ 'died', 'Died' },
			{ 'cause_of_death', 'Cause of death' },
			{ 'killed_by', 'Killed by' },
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

TYPES.organization = {
	kind = function (v, args)
		-- "Gang", or "Police · Emergency Services" when a subtype is given
		if args.subtype and v.typeLabel then return args.subtype .. ' · ' .. v.typeLabel end
		return args.subtype or v.typeLabel or 'Organization'
	end,
	badges = {
		{ field = 'type', required = true, hidden = true,
			values = { gang = 'Gang', business = 'Business', ['emergency services'] = 'Emergency Services',
				emergency = 'Emergency Services', ['emergency service'] = 'Emergency Services' } },
		{ field = 'status',
			values = { active = 'Active', inactive = 'Inactive', defunct = 'Defunct' } },
	},
	sections = {
		{ fields = {
			{ 'leader', 'Leader' },
			{ 'founded', 'Founded' },
			{ 'founder', 'Founder' },
			{ 'defunct', 'Defunct' },
			{ 'headquarters', 'Headquarters' },
			{ 'members', 'Members' },
		} },
		{ title = 'Gang', when = function (v) return v.type == 'gang' end, fields = {
			{ 'territory', 'Territory' },
			{ 'colours', 'Colours' },
			{ 'activities', 'Activities' },
		} },
		{ title = 'Business', when = function (v) return v.type == 'business' end, fields = {
			{ 'industry', 'Industry' },
			{ 'services', 'Products & services' },
			{ 'owner', 'Owner' },
			{ 'location', 'Location' },
			{ 'hours', 'Opening hours' },
			{ 'phone', 'Phone number' },
		} },
		{ title = 'Emergency Services', when = function (v) return v.type == 'emergency services' end, fields = {
			{ 'jurisdiction', 'Jurisdiction' },
			{ 'divisions', 'Divisions' },
			{ 'ranks', 'Ranks' },
		} },
		{ title = 'Relations', fields = {
			{ 'allies', 'Allies' },
			{ 'rivals', 'Rivals' },
			{ 'predecessor', 'Predecessor' },
			{ 'successor', 'Successor' },
		} },
		{ title = 'Meta', fields = {
			{ 'first_seen', 'First seen' },
			{ 'last_seen', 'Last seen' },
			{ 'version', 'Server version', version = true },
		} },
	},
	categories = function (v)
		local plural = { gang = 'Gangs', business = 'Businesses', ['emergency services'] = 'Emergency Services' }
		local c = { 'Organizations' }
		if v.type then table.insert(c, plural[v.type]) end
		if v.status == 'inactive' then table.insert(c, 'Inactive organizations') end
		if v.status == 'defunct' then table.insert(c, 'Defunct organizations') end
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
				other = 'Other' } },
	},
	sections = {
		{ fields = {
			{ 'date', 'Date' },
			{ 'end_date', 'Ended' },
			{ 'location', 'Location' },
			{ 'organised_by', 'Organised by' },
		} },
		{ title = 'Who', fields = {
			{ 'participants', 'Participants' },
			{ 'factions', 'Factions involved' },
		} },
		{ title = 'Outcome', fields = {
			{ 'outcome', 'Outcome' },
			{ 'casualties', 'Casualties' },
			{ 'arrests', 'Arrests' },
		} },
		{ title = 'Timeline', fields = {
			{ 'previous', 'Previous event' },
			{ 'next', 'Next event' },
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
		if args.date then return what .. ', ' .. plain(args.date) end
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
	if not label then return nil, nil, typed end
	-- Aliases ("emergency") share a label; the key is always the label in lower case.
	return mw.ustring.lower(label), label, nil
end

local function cssKey(s)
	return (mw.ustring.lower(s):gsub('[^%w]+', '-'))
end

-- A value that starts with a list needs a newline to render as a list.
local function block(s)
	if s:match('^[%*#:;]') then return '\n' .. s .. '\n' end
	return s
end

local function fileLink(name, caption)
	if name:match('^%[%[') then return name end
	name = name:gsub('^[Ff]ile:', ''):gsub('^[Ii]mage:', '')
	return string.format('[[File:%s|%s|alt=%s]]', name, IMAGE_WIDTH, caption or '')
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
		local key, label, bad = pick(badge, args[badge.field])
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
	if #images == 1 then
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
			table.insert(pills, { badge.field, v[badge.field], v[badge.field .. 'Label'] })
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
