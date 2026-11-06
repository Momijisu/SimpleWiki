# Test the wiki setup on your own PC

A throwaway copy of the Let's RP wiki: MediaWiki 1.46.2, Citizen 3.25.1, TabberNeue 4.1.0,
ShortDescription 4.0.2 and the same built-in extensions. Each time it starts, it imports the latest
`../dist/infoboxes.xml` and `../dist/mainpage.xml` and adds a few example pages, so you can see the
infoboxes and the front page before importing anything into the real wiki.

You need **Docker Desktop** (https://www.docker.com/products/docker-desktop/), running.

## Start it

```
cd C:\Users\morga\SimpleWiki
git pull
cd mediawiki\local-test
docker compose up --build
```

The first start takes a few minutes (it downloads MediaWiki and installs it). When the window says
**`== Ready: http://localhost:8080`**, open http://localhost:8080. Sign in as **Admin** /
**LocalTestPass123** to edit.

## Stop, restart, start over

| | |
|---|---|
| Stop | `Ctrl+C` in that window (or `docker compose down`) |
| Start again (keeps your test edits) | `docker compose up` |
| After changing the templates or settings files | `docker compose up` again: it re-imports `../dist/*.xml` |
| Wipe it and start fresh | `docker compose down -v`, then `docker compose up --build` |

## Good to know

- Nothing here touches the real wiki.
- Port 8080 already in use? Change `"8080:80"` and `PORT` in `docker-compose.yml` (e.g. to 8081).
- Pages you edit in the test wiki aren't overwritten by the re-import. That's MediaWiki's rule that an
  import only replaces a page if it's newer than the page's last edit. To see the files as they are,
  wipe it and start fresh.
- `test-pages/` holds the example articles, and `images/` the stand-in logo and a picture for them.
