# Putting SimpleWiki on a server

This guide assumes a small Linux server (any $5 VPS is plenty) and a domain name pointing at it, say `wiki.example.com`.

## 1. Install Node.js 22

On Debian or Ubuntu:

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
node --version   # must be 22.13 or newer
```

## 2. Get SimpleWiki

```sh
sudo useradd --system --create-home --home-dir /opt/simplewiki simplewiki
sudo -u simplewiki git clone https://github.com/Momijisu/SimpleWiki.git /opt/simplewiki/app
```

## 3. Run it as a service

Create `/etc/systemd/system/simplewiki.service`:

```ini
[Unit]
Description=SimpleWiki
After=network.target

[Service]
User=simplewiki
WorkingDirectory=/opt/simplewiki/app
Environment=PORT=8080 HOST=127.0.0.1 DATA_DIR=/opt/simplewiki/data TRUST_PROXY=1 PUBLIC_URL=https://wiki.example.com
# For "Sign in with Discord" (see the README), keep the secret out of this file:
EnvironmentFile=-/opt/simplewiki/discord.env
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now simplewiki
```

To use Discord sign-in, put the settings in `/opt/simplewiki/discord.env`, readable only by root and the service (`chmod 600`):

```
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=your-secret
DISCORD_GUILD_ID=987654321098765432
DISCORD_MOD_ROLE_IDS=111111111111111111
```

Then add `https://wiki.example.com/auth/discord/callback` as a redirect in the Discord Developer Portal.

## 4. Add HTTPS with a reverse proxy

**Caddy** is the easiest choice, because it gets the certificate by itself. Put this in `/etc/caddy/Caddyfile`:

```
wiki.example.com {
    reverse_proxy 127.0.0.1:8080
    request_body {
        max_size 10MB
    }
}
```

**Or nginx**, with a certificate from certbot:

```nginx
server {
    server_name wiki.example.com;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    listen 443 ssl; # certbot fills in the rest
}
```

Keep `TRUST_PROXY=1` only when a proxy really sits in front. Without a proxy, visitors could fake their address in the `X-Forwarded-For` header.

## 5. Claim the admin account

Open https://wiki.example.com and **sign up straight away**, with a password or with Discord: the first account becomes the admin. Then go to **Admin**:

- **Site:** the wiki's name, the welcome text, who can sign up, and who can read
- **Namespaces:** one for each version of your server
- **Templates:** adjust the starter templates to fit your server

To make someone a moderator, go to **Moderation → People** and change their role.

## 6. Back it up

Everything is in `DATA_DIR`. Add a nightly backup to the simplewiki user's crontab:

```
15 4 * * * cd /opt/simplewiki/app && DATA_DIR=/opt/simplewiki/data node --disable-warning=ExperimentalWarning tools/backup.js /opt/simplewiki/backups
```

Copy `/opt/simplewiki/backups` off the server from time to time. To restore, stop the service, copy a `wiki-….db` back to `DATA_DIR/wiki.db` and the `uploads` folder back to `DATA_DIR/uploads`, then start the service again.

## Updating

```sh
cd /opt/simplewiki/app && sudo -u simplewiki git pull && sudo systemctl restart simplewiki
```

The database is upgraded automatically when the server starts.
