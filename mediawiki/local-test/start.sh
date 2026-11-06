#!/bin/bash
# Runs when the test wiki starts: installs it the first time, then (every time)
# imports the latest dist/*.xml files, uploads the pictures and adds example pages.
set -e
cd /var/www/html
run() { php maintenance/run.php "$@"; }

if [ ! -f /data/LocalSettings.php ]; then
	echo "== First start: installing MediaWiki (this takes a minute)"
	run install --dbtype=sqlite --dbpath=/data --dbname=wiki \
		--server="http://localhost:${PORT:-8080}" --scriptpath="" --lang=en \
		--pass="${ADMIN_PASSWORD:-LocalTestPass123}" --skins=Citizen \
		--confpath=/data "Let's RP Wiki (local test)" Admin
	cat /setup/extra-settings.php >> /data/LocalSettings.php
	chown -R www-data:www-data /data
	FRESH=1
fi
# MediaWiki reads LocalSettings.php from its own folder. A small real file there
# loads the actual settings, which live with the database in /data. (Not a
# symbolic link: on some Docker Desktop setups the web server can't follow it.)
rm -f LocalSettings.php
echo "<?php require '/data/LocalSettings.php';" > LocalSettings.php
chown www-data:www-data LocalSettings.php
# The site logo (see extra-settings.php)
cp "/import/test-images/Lets RP Wiki logo.png" lrp-logo.png && chmod 644 lrp-logo.png
run update --quick > /dev/null

echo "== Importing the files in dist/"
for f in /import/dist/infoboxes.xml /import/dist/mainpage.xml /import/dist/licenses.xml /import/dist/help.xml /import/dist/guides.xml; do
	if [ -f "$f" ]; then
		run importDump --username-prefix=tpl "$f" > /dev/null 2>&1 && echo "   $(basename "$f"): imported" || echo "   $(basename "$f"): FAILED"
	fi
done

# A new install makes its own Main Page, newer than the import files, so MediaWiki
# keeps it. Now the front page module exists, point the Main Page at it.
if [ -n "$FRESH" ]; then
	echo '{{#invoke:Main page|render}}' | run edit --summary "Front page" --user Admin "Main Page" > /dev/null
fi
# Test only: feature two of the example pages, so the featured card shows.
# (Every start: each import brings back the empty list from the XML.)
run getText "Module:Main page/config.json" \
	| sed 's/"pages": \[\]/"pages": ["Southside Saints", "Tony Ramirez"]/' \
	| run edit --summary "Test: featured articles" --user Admin "Module:Main page/config.json" > /dev/null

echo "== Uploading pictures"
run importImages --user=Admin --skip-dupes /import/files > /dev/null 2>&1 || true
run importImages --user=Admin --skip-dupes /import/files/guides > /dev/null 2>&1 || true
run importImages --user=Admin --skip-dupes /import/test-images > /dev/null 2>&1 || true

echo "== Adding example pages (only ones that don't exist yet)"
for f in /import/test-pages/*.wiki; do
	title=$(basename "$f" .wiki | tr '_' ' ')
	if ! run getText "$title" > /dev/null 2>&1; then
		run edit --summary "Example page" --user Admin "$title" < "$f" > /dev/null
		echo "   $title"
	fi
done

# Finish MediaWiki's queued background work (category counts, links), which a
# real wiki does gradually as people browse.
run runJobs > /dev/null 2>&1 || true
run rebuildrecentchanges > /dev/null 2>&1 || true
run initSiteStats --update > /dev/null 2>&1 || true
chown -R www-data:www-data /data /var/www/html/images

echo
echo "== Ready: http://localhost:${PORT:-8080}   (sign in as Admin / ${ADMIN_PASSWORD:-LocalTestPass123})"
exec apache2-foreground
