# DiscordLogin

Log in to the Let's RP Wiki with Discord, for members of the Let's RP Discord server.
A plugin for [PluggableAuth](https://www.mediawiki.org/wiki/Extension:PluggableAuth)
(7.0 or newer, which needs no Composer packages). Requires MediaWiki 1.42 or newer;
tested on 1.46 with PluggableAuth 7.5.

* **Members only, checked at every login.** Anyone who has left or been kicked from the
  server can't log in again. People who haven't accepted the server's rules yet are told so.
* **Accounts are linked to the Discord account ID**, not a name. A new account is named after
  the person's unique Discord username (`tony_r` becomes `Tony r`; if that's taken, `Tony r 2`).
  Admins can rename accounts (Special:RenameUser); the link to Discord stays.
* **Discord roles become wiki groups**, updated at every login (added and removed).
* **Discord is the only login on the login page.** The password form is hidden, but still
  works for admins at `Special:UserLogin?local=1`.

## 1. Make a Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and
   click **New Application** (e.g. "Let's RP Wiki").
2. Under **OAuth2**, copy the **Client ID**, then **Reset Secret** and copy the **Client Secret**.
   Keep the secret private: it only goes in `LocalSettings.php`.
3. Still under **OAuth2 → Redirects**, add the wiki's login page address, exactly:
   `https://YOUR-WIKI/index.php?title=Special:PluggableAuthLogin`
   (with short URLs, `https://YOUR-WIKI/wiki/Special:PluggableAuthLogin`).
4. Turn on **Developer Mode** in Discord (User Settings, Advanced). Right-click the server icon,
   **Copy Server ID**: that's the guild ID. Right-click a role in Server Settings, Roles,
   **Copy Role ID** for each role you want to map.

No bot is needed: the wiki only asks Discord about the person logging in (scopes `identify`
and `guilds.members.read`).

## 2. Install

1. Upload [PluggableAuth](https://github.com/wikimedia/mediawiki-extensions-PluggableAuth)
   (7.x) to `extensions/PluggableAuth/` and this folder to `extensions/DiscordLogin/`
   (the `tests/` folder can be left out).
2. Add to `LocalSettings.php`:

```php
wfLoadExtension( 'PluggableAuth' );
wfLoadExtension( 'DiscordLogin' );

// Keep password login (for admins, at Special:UserLogin?local=1)
$wgPluggableAuth_EnableLocalLogin = true;
// Accounts are only made through Discord
$wgGroupPermissions['*']['createaccount'] = false;
$wgGroupPermissions['*']['autocreateaccount'] = true;

$wgPluggableAuth_Config['Discord'] = [
	'plugin' => 'DiscordLogin',
	'buttonLabelMessage' => 'discordlogin-loginbutton',
	'data' => [
		'clientId' => '123456789012345678',
		'clientSecret' => 'the-client-secret',
		'guildId' => '123456789012345678',     // the Let's RP server
	],
	// Discord role IDs -> wiki groups, updated at every login
	'groupsyncs' => [
		[
			'type' => 'mapped',
			'map' => [
				'sysop' => [ 'discord_roles' => [ '111111111111111111' ] ],  // e.g. Wiki Admin
				// 'moderator' => [ 'discord_roles' => [ '222222222222222222', '333333333333333333' ] ],
			],
		],
	],
];
```

3. Run the database update: `/mw-config/index.php` in a browser, or
   `php maintenance/run.php update`. (DiscordLogin adds no tables; PluggableAuth may.)

A group listed in the map is **removed** from people whose Discord roles no longer match, at
their next login. Groups not in the map (like the bureaucrats you set by hand) are left alone.
To only ever add a group, list it in `'addOnlyGroups' => [ 'group' ]` next to `'map'`.

## Settings

| Setting | Default | |
|---|---|---|
| `$wgDiscordLoginLocalParam` | `'1'` | `Special:UserLogin?local=<this>` shows the password form. Set it to something only admins know, or `''` to always show it. |
| `data.apiBase`, `data.authorizeUrl` | Discord's | For testing against a stand-in (see `tests/mock-discord/`). |

## How it works

1. **Log in with Discord** goes to Discord, which asks the person to allow the wiki to see
   their account and their membership of servers.
2. Discord sends them back to `Special:PluggableAuthLogin` with a one-time code, which the
   wiki swaps for a token, then asks Discord for their account and their membership of the
   server (including their roles).
3. Not a member: refused. Otherwise the wiki account linked to their Discord ID is logged in
   (or made, for a first login), and their groups are updated from their roles.

The Discord ID is stored as the hidden user option `discordlogin-id`.

## Testing without Discord

`tests/mock-discord/` is a stand-in for Discord's sign-in page and API, with four test people
(a member with the "Wiki Mod" role 900, a plain member, a non-member, and a member who
hasn't accepted the rules). Put it in the wiki's web folder and set:

```php
'data' => [
	'clientId' => 'test-client', 'clientSecret' => 'test-secret', 'guildId' => '555',
	'apiBase' => 'http://localhost/mock-discord/api.php',
	'authorizeUrl' => 'http://localhost:8080/mock-discord/authorize.php',
],
'groupsyncs' => [ [ 'type' => 'mapped', 'map' => [ 'sysop' => [ 'discord_roles' => [ '900' ] ] ] ] ],
```

Never put the stand-in on a public wiki.
