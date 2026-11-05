# SimpleWiki

**A wiki for your roleplay community.** It runs on your own server. Anyone with an account can write, and admins and moderators keep it in order.

It's built for GTA and RDR roleplay servers. Characters, gangs, businesses, police, medical services and server events each get a ready-made template with an infobox. Each version of your server gets its own namespace, with its own look. Use one for the current city, another for the old one, and another for the Wild West server.

![A character article in the Los Santos theme](docs/screenshots/gta-article.jpg)

## Features

**Write**
- Articles from templates: **Character, Gang, Business, Law enforcement, Medical, Organization, Server event, Location, Vehicle, Horse** and a plain **Page**
- Each template has an infobox (portrait, sections, fields) and starter text, so new articles aren't a blank page
- Markdown with a toolbar and a live side-by-side preview. Paste or drop pictures straight into the text.
- `[[Links]]` between articles, with suggestions as you type. A link to an article nobody has written yet shows in red; click it to write that article.
- Out-of-character boxes (`> [!ooc]`), rumours, warnings and folded spoilers
- A table of contents, "What links here", and a **Wanted articles** list of red links waiting to be written

**Namespaces**
- One wiki, several worlds. For example, `gta` (the current city), `gta3` (the last one) and `rdr` (the Wild West server).
- Each namespace has its own articles, theme, main page, recent changes and search
- Link across namespaces with `[[gta3:Tony Ramirez]]`
- **Archive** an old version (readable, but only moderators can edit it) or **hide** a new one while you set it up

**Themes**
- **Los Santos (GTA):** night-time city, neon pink and sunset orange, condensed capitals
- **Frontier (RDR):** parchment, ink and oxblood, with wanted-poster infoboxes
- **Classic:** plain and quiet, and follows the device's light or dark setting
- Every namespace has a theme, so the old GTA city and the RDR server each look like themselves. Readers can override the theme for themselves.
- All themes share one layout, so adding a theme only means picking colours and fonts

**Moderate**
- Roles: **user**, **moderator** and **admin**. The first account to sign up becomes the admin.
- Sign-ups can be open to anyone, need a moderator's approval, or be closed (admins create accounts). The wiki can be public or for members only.
- Full history of every article, with diffs and one-click restore of any version
- Protect an article so only moderators (or admins) can edit it
- Delete and restore articles. Nothing is lost; deleted articles are hidden from everyone but moderators.
- Hide a single bad revision, such as one with personal info or abuse, from everyone but moderators
- Readers report problems; moderators work through the report queue
- Ban and unban accounts with a reason, and keep a moderation log of every action
- Admins edit the templates (fields, sections, starter text, which themes offer them) from the browser

**Share**
- Every article has its own address, like `/w/gta/tony-ramirez`
- Pasting a link into Discord shows a preview with the article's title, picture and opening lines

| | |
|---|---|
| ![Frontier theme](docs/screenshots/rdr-article.jpg) | ![The front page with three namespaces](docs/screenshots/portal.jpg) |
| ![The editor, with the infobox fields beside the text](docs/screenshots/editor.jpg) | ![Comparing two versions of an article](docs/screenshots/diff.jpg) |

## Running it

You need **Node.js 22.13 or newer**, and nothing else: there are no packages to install and nothing to build. The database is SQLite and is built into Node.

```sh
git clone https://github.com/Momijisu/SimpleWiki.git
cd SimpleWiki
npm start
```

Open http://localhost:8080 and **create the first account straight away: it becomes the admin.** Then go to **Admin** to name your wiki, set up your namespaces and choose who can sign up.

To look around first, fill an empty wiki with example articles (a GTA city, an archived old city and an RDR town):

```sh
DATA_DIR=./demo-data npm run demo
DATA_DIR=./demo-data npm start
```

### With Docker

```sh
docker compose up -d
```

Edit `docker-compose.yml` first: set `PUBLIC_URL` to your wiki's address.

### On a real server

Put it behind a reverse proxy that adds HTTPS (Caddy, nginx or Cloudflare) and set `TRUST_PROXY=1`. [docs/DEPLOY.md](docs/DEPLOY.md) has a step-by-step guide, with configs for Caddy, nginx and systemd.

### Settings

| Variable | Default | |
|---|---|---|
| `PORT` | `8080` | Port to listen on |
| `HOST` | `0.0.0.0` | Address to listen on (`127.0.0.1` when behind a proxy on the same machine) |
| `DATA_DIR` | `./data` | Where the database and uploaded pictures live: **back this up** |
| `TRUST_PROXY` | off | Set to `1` behind a reverse proxy, so rate limits see real visitor addresses and cookies are marked secure |
| `PUBLIC_URL` | (from the request) | Your wiki's address, for link previews |
| `COOKIE_SECURE` | auto | `1` forces secure cookies; `0` turns them off |

Everything else, such as the wiki's name, sign-ups, read access, namespaces and templates, is set in the browser under **Admin**.

### Backups

Everything lives in `DATA_DIR`: `wiki.db` and the `uploads` folder. This command makes a safe copy while the wiki is running:

```sh
DATA_DIR=./data npm run backup -- /path/to/backups
```

## Writing

| Type this | To get |
|---|---|
| `[[Tony Ramirez]]` | a link to an article (red if it doesn't exist yet) |
| `[[Tony Ramirez\|Tony]]` | a link with different text |
| `[[gta3:Tony Ramirez]]` | a link into another namespace |
| `## Background` | a section; three or more make a table of contents |
| `> [!ooc]` | an out-of-character box; also `note`, `warning`, `rumor` and `secret` (folded) |
| `![](picture-url)` | a picture. Paste or drop one into the editor to upload it. |
| `\| a \| b \|` | a table, as in GitHub Markdown |

An article called **Main page** becomes its namespace's front page.

## Extending it

- **More namespaces:** go to Admin → Namespaces → *Add a namespace*. Give it a short name (`gta5`), a name, a tagline and a theme.
- **More templates:** go to Admin → Templates → *Add a template*. Set its infobox sections as `Section: Field, Field, Field`, its starter text, and which themes offer it.
- **A new theme:** copy a block in [public/css/themes.css](public/css/themes.css), change the colours and fonts, and add its name to `THEMES` in [server/api.js](server/api.js).

## Development

```sh
npm run dev    # restarts when server files change
npm test       # API tests: accounts, permissions, moderation, links, uploads
```

| Folder | What's there |
|---|---|
| `server/` | The HTTP server (`index.js`), the JSON API (`api.js`), the database (`db.js`), sign-in (`auth.js`), the starter templates |
| `public/` | The app: plain ES modules, no build step. `js/views/` has one file per kind of page; `css/themes.css` holds the themes. |
| `tools/` | Demo content and backups |

### Security notes

- Passwords are hashed with scrypt. The session cookie is HttpOnly and SameSite, and only a hash of it is stored.
- Every change needs a custom request header, which blocks cross-site request forgery. A strict Content-Security-Policy is sent on every response.
- Markdown is cleaned with DOMPurify before it's shown. Uploads must really be PNG, JPEG, GIF or WebP, are renamed at random, and are served with `nosniff`.
- Sign-in, sign-up, editing, uploads and reports are rate-limited.

## License

MIT, see [LICENSE](LICENSE). Bundled fonts are under the SIL Open Font License: Oswald, Barlow, Rye and Alegreya (see `public/fonts`). Icons come from [Phosphor](https://phosphoricons.com) (MIT). The bundled libraries are [marked](https://marked.js.org) (MIT) and [DOMPurify](https://github.com/cure53/DOMPurify) (Apache 2.0 / MPL 2.0).

The themes are inspired by the general mood of crime-city and Wild West games. SimpleWiki isn't affiliated with or endorsed by Rockstar Games, and uses none of their artwork, fonts or logos.
