-- Module:Main page
-- Draws the front page from the settings in Module:Main page/config.json.
-- The Main Page itself only contains:  {{#invoke:Main page|render}}
-- To change what's on the front page, edit the settings, not this module.

local p = {}

local CONFIG_PAGE = 'Module:Main page/config.json'
local STYLES = 'Template:Main page/styles.css'
local PLACEHOLDER_IMAGE = 'Image unavailable.png' -- same as the infoboxes

-- ===================================================================
-- Helpers
-- ===================================================================

local lang = mw.language.getContentLanguage()

-- Settings come from mw.loadJsonData, whose lists don't support # (length):
-- count them with ipairs instead.
local function count(list)
	local n = 0
	if list then for _ in ipairs(list) do n = n + 1 end end
	return n
end

local function fileExists(name)
	if not name or name == '' then return false end
	local t = mw.title.new(name, 'File')
	return t ~= nil and t.file ~= nil and t.file.exists
end

local function cleanFile(name)
	return name and mw.text.trim((name:gsub('^[Ff]ile:', ''):gsub('^[Ii]mage:', ''))) or nil
end

-- Remove {{templates}}, even nested ones.
local function stripTemplates(s)
	local out, depth, i = {}, 0, 1
	while i <= #s do
		local two = s:sub(i, i + 1)
		if two == '{{' then depth = depth + 1; i = i + 2
		elseif two == '}}' and depth > 0 then depth = depth - 1; i = i + 2
		else
			if depth == 0 then table.insert(out, s:sub(i, i)) end
			i = i + 1
		end
	end
	return table.concat(out)
end

-- The first paragraph of an article as plain text, cut to about `max` characters.
local function excerpt(content, max)
	local s = stripTemplates(content)
	s = s:gsub('<!%-%-.-%-%->', '')
	s = s:gsub('<ref[^>]-/>', ''):gsub('<ref.-</ref>', '')
	s = s:gsub('%[%[[Ff]ile:[^%]]-%]%]', ''):gsub('%[%[[Ii]mage:[^%]]-%]%]', ''):gsub('%[%[[Cc]ategory:[^%]]-%]%]', '')
	s = s:gsub('<[^>]->', '')
	for para in (s .. '\n\n'):gmatch('(.-)\n%s*\n') do
		local text = mw.text.trim(para)
		if text ~= '' and not text:match('^=') and not text:match('^[{|!]') and not text:match('^__') then
			text = text:gsub('%[%[[^%]|]-|([^%]]-)%]%]', '%1'):gsub('%[%[([^%]]-)%]%]', '%1')
			text = text:gsub('%[https?://%S+%s+([^%]]-)%]', '%1'):gsub("'''?", ''):gsub('%s+', ' ')
			text = mw.text.trim(text)
			if mw.ustring.len(text) > max then
				text = mw.ustring.sub(text, 1, max):gsub('%s+%S*$', '') .. '…'
			end
			return text
		end
	end
	return nil
end

-- The picture from an article's infobox ("| image = …").
local function infoboxImage(content)
	local name = content:match('|%s*image%s*=%s*([^|\n}]+)')
	name = name and mw.text.trim(name)
	if name == '' then return nil end
	return name
end

local function problem(text)
	return mw.html.create('div'):addClass('mp-problem'):wikitext('Main page settings: ' .. text)
end

-- ===================================================================
-- Parts of the page
-- ===================================================================

local function hero(cfg)
	local box = mw.html.create('div'):addClass('mp-hero')

	if cfg.background and fileExists(cfg.background) then
		box:tag('div'):addClass('mp-hero-bg')
			:wikitext(string.format('[[File:%s|1600px|link=|alt=]]', cleanFile(cfg.background)))
	end

	local inner = box:tag('div'):addClass('mp-hero-inner')

	if cfg.stats ~= false then
		local stats = inner:tag('div'):addClass('mp-stats')
		for _, s in ipairs({
			{ mw.site.stats.articles, 'articles' },
			{ mw.site.stats.files, 'files' },
			{ mw.site.stats.users, 'members' },
			{ mw.site.stats.edits, 'edits' },
		}) do
			local item = stats:tag('span'):addClass('mp-stat')
			item:tag('b'):wikitext(lang:formatNum(s[1]))
			item:wikitext(' ' .. s[2])
		end
	end

	local logo = cleanFile(cfg.logo)
	if logo and logo ~= '' then
		if fileExists(logo) then
			inner:tag('div'):addClass('mp-logo'):wikitext(string.format('[[File:%s|180px|link=|alt=%s]]', logo, cfg.title or ''))
		else
			inner:node(problem(string.format('the logo file “%s” doesn’t exist. Upload it with exactly that name, or change "logo" to the name of a file you have.', logo)))
		end
	end

	if cfg.title then inner:tag('div'):addClass('mp-title'):wikitext(cfg.title) end
	if cfg.subtitle then inner:tag('div'):addClass('mp-subtitle'):wikitext(cfg.subtitle) end

	-- Clicking this opens Citizen's own search popup.
	local search = cfg.search or {}
	if search.show ~= false then
		local bar = inner:tag('div')
			:addClass('mp-search'):addClass('citizen-search-trigger')
			:attr('role', 'button'):attr('tabindex', '0')
		bar:tag('span'):addClass('mp-search-icon')
		bar:tag('span'):addClass('mp-search-text'):wikitext(search.text or 'Search the wiki')
		if search.shortcutHint ~= false then
			bar:tag('span'):addClass('mp-search-hint'):wikitext('Press <kbd>/</kbd>')
		end
		-- Quick searches under the bar, e.g. "Characters" → search prefilled with that word.
		if count(search.suggestions) > 0 then
			local chips = inner:tag('div'):addClass('mp-chips')
			for _, s in ipairs(search.suggestions) do
				chips:tag('span'):addClass('mp-chip'):addClass('citizen-search-trigger')
					:attr('role', 'button'):attr('tabindex', '0')
					:attr('data-citizen-search-prefill', s.prefill or s.label)
					:wikitext(s.label)
			end
		end
	end
	return box
end

-- The directory buttons: one {{Directory card}} each, the same cards as on the
-- directory pages. Settings per button: label, category (links there and shows
-- its count), link (a page to go to instead), image, description (instead of
-- the count), showCount: false.
local function directories(frame, cfg)
	if count(cfg.directories) == 0 then return nil end
	local row = mw.html.create('div'):addClass('mp-directories')
	for _, d in ipairs(cfg.directories) do
		local link = d.link
		if not link and not d.category then link = d.label end
		row:wikitext(frame:expandTemplate{ title = 'Directory card', args = {
			label = d.label,
			category = d.category,
			link = link,
			image = cleanFile(d.image),
			description = d.description,
			count = (d.showCount == false) and 'no' or nil,
		} })
	end
	return row
end

local function card(title, cls)
	local c = mw.html.create('div'):addClass('mp-card')
	if cls then c:addClass(cls) end
	if title then c:tag('div'):addClass('mp-card-title'):wikitext(title) end
	return c
end

-- ===================================================================
-- Cards: each has a "type" in the settings
-- ===================================================================

local CARDS = {}

-- Today's featured article: one page, or a list that changes every day.
CARDS.featured = function (frame, f)
	local n = count(f.pages)
	if n == 0 then
		-- Nothing chosen yet: keep the space, and say how to fill it.
		local c = card(nil, 'mp-featured')
		local body = c:tag('div'):addClass('mp-featured-body')
		body:tag('div'):addClass('mp-kicker'):wikitext(f.label or 'Featured')
		body:tag('div'):addClass('mp-featured-text'):wikitext(f.emptyText or
			'No featured article yet. Add page names to <code>"pages"</code> in [[Module:Main page/config.json]].')
		return c
	end
	local day = math.floor(os.time() / 86400)
	local pick = f.pages[(day % n) + 1]
	if type(pick) == 'string' then pick = { page = pick } end

	local title = mw.title.new(pick.page or '')
	if not title or not title.exists then
		return problem(string.format('the featured page “%s” doesn’t exist.', tostring(pick.page)))
	end
	local content = title:getContent() or ''
	local image = cleanFile(pick.image) or cleanFile(infoboxImage(content))
	if not fileExists(image) then image = fileExists(PLACEHOLDER_IMAGE) and PLACEHOLDER_IMAGE or nil end
	local text = pick.text or excerpt(content, f.excerptLength or 220)

	local c = card(nil, 'mp-featured')
	if image then
		local fig = c:tag('div'):addClass('mp-featured-image')
		fig:wikitext(string.format('[[File:%s|700px|link=%s|alt=%s]]', image, title.fullText, title.text))
		-- Kicker and title over the bottom of the picture
		local over = fig:tag('div'):addClass('mp-featured-over')
		over:tag('div'):addClass('mp-featured-kicker'):wikitext(f.label or 'Featured')
		over:tag('div'):addClass('mp-featured-title'):wikitext(string.format('[[%s|%s]]', title.fullText, pick.label or title.text))
	end
	local body = c:tag('div'):addClass('mp-featured-body')
	if not image then
		body:tag('div'):addClass('mp-kicker'):wikitext(f.label or 'Featured')
		body:tag('div'):addClass('mp-featured-title'):wikitext(string.format('[[%s|%s]]', title.fullText, pick.label or title.text))
	end
	if text then body:tag('div'):addClass('mp-featured-text'):wikitext(text) end
	body:tag('div'):addClass('mp-more'):wikitext(string.format('[[%s|%s]]', title.fullText, f.moreText or 'Read more'))
	return c
end

-- "Start editing": a short invitation, a link, and the wiki's numbers.
CARDS.startEditing = function (frame, s)
	local c = card(nil, 'mp-start')
	local head = c:tag('div'):addClass('mp-card-title'):addClass('mp-start-title')
	if s.link then
		head:wikitext(string.format('[[%s|%s]]', s.link, s.title or 'Start editing'))
	else
		head:wikitext(s.title or 'Start editing')
	end
	if s.text then c:tag('div'):addClass('mp-start-text'):wikitext(s.text) end
	local stats = s.stats or { 'articles', 'edits' }
	local labels = { articles = 'Articles', edits = 'Edits', files = 'Files', users = 'Members', activeUsers = 'Active members' }
	local row = c:tag('div'):addClass('mp-start-stats')
	for _, key in ipairs(stats) do
		if labels[key] and mw.site.stats[key] then
			local stat = row:tag('div'):addClass('mp-start-stat')
			stat:tag('div'):addClass('mp-start-number'):wikitext(lang:formatNum(mw.site.stats[key]))
			stat:tag('div'):addClass('mp-start-label'):wikitext(labels[key])
		end
	end
	return c
end

-- A column of link buttons: wiki pages ("page") or websites ("url").
-- A link with no address yet shows greyed out, so the list can be filled in later.
CARDS.links = function (frame, l)
	if count(l.links) == 0 then return nil end
	local c = card(l.title, 'mp-links')
	local list = c:tag('div'):addClass('mp-link-list')
	for _, link in ipairs(l.links) do
		local item = list:tag('div'):addClass('mp-link')
		if link.page and link.page ~= '' then
			item:wikitext(string.format('[[%s|%s]]', link.page, link.label or link.page))
		elseif link.url and link.url:match('^https?://') then
			item:addClass('mp-link--external'):wikitext(string.format('[%s %s]', link.url, link.label or link.url))
		else
			item:addClass('mp-link--empty'):attr('title', 'No address set yet'):wikitext(link.label or '')
		end
	end
	return c
end

CARDS.recentChanges = function (frame, rc)
	local opts = { 'limit=' .. (rc.limit or 8), 'days=' .. (rc.days or 30) }
	if rc.hideBots ~= false then table.insert(opts, 'hidebots') end
	if rc.hideMinor then table.insert(opts, 'hideminor') end
	if rc.hideLogs ~= false then table.insert(opts, 'hidelog') end
	if rc.namespace ~= nil then table.insert(opts, 'namespace=' .. rc.namespace) end
	local c = card(rc.title or 'Recent changes', 'mp-rc')
	c:tag('div'):addClass('mp-rc-list'):wikitext(frame:preprocess('{{Special:RecentChanges/' .. table.concat(opts, ',') .. '}}'))
	c:tag('div'):addClass('mp-more'):wikitext('[[Special:RecentChanges|' .. (rc.moreText or 'All recent changes') .. ']]')
	return c
end

-- Any wikitext: rules, the latest update, an announcement…
CARDS.text = function (frame, t)
	if not t.text or t.text == '' then return nil end
	local c = card(t.title, 'mp-text')
	c:tag('div'):addClass('mp-text-body'):wikitext('\n' .. t.text .. '\n')
	return c
end

local function intro(cfg)
	local i = cfg.intro
	if not i or not i.text or i.text == '' then return nil end
	local c = card(i.title, 'mp-intro')
	c:tag('div'):addClass('mp-intro-text'):wikitext('\n' .. i.text .. '\n')
	return c
end

-- ===================================================================

function p.render(frame)
	local ok, cfg = pcall(mw.loadJsonData, CONFIG_PAGE)
	local out = { frame:extensionTag('templatestyles', '', { src = STYLES }) }
	if not ok then
		table.insert(out, tostring(problem('couldn’t read [[' .. CONFIG_PAGE .. ']]. Check it exists and is valid JSON.')))
		return table.concat(out)
	end

	local page = mw.html.create('div'):addClass('mp')
	page:node(hero(cfg))
	local dirs = directories(frame, cfg)
	if dirs then page:node(dirs) end
	local i = intro(cfg)
	if i then page:node(i) end

	-- The cards, in up to three columns as listed in the settings.
	local columns = page:tag('div'):addClass('mp-columns')
	for _, col in ipairs(cfg.columns or {}) do
		local column = columns:tag('div'):addClass('mp-column')
		for _, c in ipairs(col) do
			local make = CARDS[c.type or '']
			if not make then
				column:node(problem(string.format('unknown card type “%s”.', tostring(c.type))))
			elseif c.show ~= false then
				local built = make(frame, c)
				if built then column:node(built) end
			end
		end
	end

	table.insert(out, tostring(page))
	return table.concat(out)
end

return p
