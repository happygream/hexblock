# HexBlock

A self-hosted network privacy gateway. Blocks ads, trackers, and malware
at the DNS level across every device on your network — no client software
required. Includes a WireGuard VPN so all traffic is encrypted end-to-end
even when you are away from home.

**HexBlock is free and open source. There is no cloud component, no account
required, and no telemetry.**

---

## What it does

DNS filtering intercepts name resolution requests from every device on your
network. When a device attempts to contact a domain on a blocklist — an ad
server, a tracker, a known phishing domain — HexBlock returns NXDOMAIN
instead of the real address. The request never leaves your network.

WireGuard VPN encrypts all traffic from connected devices and routes it
through your HexBlock server. This means DNS filtering applies even when
devices are not on your home network, and all traffic is encrypted in transit.

Neither feature requires installing anything on your devices beyond pointing
DNS at the server, or scanning a QR code to join the VPN.

---

## Requirements

- Linux host — Ubuntu 22.04 or 24.04 recommended. Raspberry Pi OS works.
  Minimum 1 GB RAM, 8 GB disk.
- Docker and Docker Compose v2
- Port 53 available on the host (see note below)
- Port 51820 UDP open if you want to use the WireGuard VPN

---

## Install

Clone the repository and run the setup script:

```bash
git clone https://github.com/happygream/hexblock /opt/hexblock
cd /opt/hexblock
sudo bash scripts/setup.sh
```

Or use the one-line installer which handles Docker installation as well:

```bash
curl -fsSL https://hexblock.co.uk/install.sh | sudo bash
```

The setup script is interactive. It will ask you to choose a deployment mode
and then write all required configuration files.

**Deployment modes available:**

| Mode | Description |
|---|---|
| HTTP only | No proxy, accessible on your local network at port 8080 |
| Nginx | You manage Nginx and SSL certificates |
| Caddy | Caddy fetches SSL certificates automatically |
| Traefik | Docker-native reverse proxy with Let's Encrypt |
| Cloudflare Tunnel | No open inbound ports, SSL at Cloudflare's edge |

The script writes a `.env` file, a `docker-compose.override.yml` specific to
your chosen deployment mode, and any proxy configuration files needed. It can
be re-run at any time to reconfigure.

After setup, open the dashboard URL shown at the end of the script to complete
first-run account creation.

---

## Port 53 on Ubuntu

Ubuntu 22.04 and later run `systemd-resolved` which binds port 53 by default.
HexBlock needs that port for its DNS server. The install script will offer to
disable `systemd-resolved` for you. To do it manually:

```bash
sudo systemctl disable --now systemd-resolved
sudo rm /etc/resolv.conf
echo 'nameserver 1.1.1.1' | sudo tee /etc/resolv.conf
echo 'nameserver 1.0.0.1' | sudo tee -a /etc/resolv.conf
```

---

## Pointing devices at HexBlock

**DNS only (no VPN)**

Set the DNS server on each device or on your router to the IP address of
your HexBlock server. Any device using that DNS server will have its queries
filtered automatically. No software installation required.

**WireGuard VPN**

Go to the VPN page in the dashboard, enter a device name, and scan the
generated QR code with the WireGuard app on your device. All traffic from
that device will route through HexBlock and be encrypted in transit.

WireGuard is available for Android, iOS, Windows, macOS, and Linux.

---

## Reverse proxy

HexBlock can run behind Nginx, Caddy, Traefik, or a Cloudflare Tunnel.
Configuration examples and setup instructions are in the `proxy/` directory.

The relevant `.env` settings:

| Setting | Description |
|---|---|
| `TRUST_PROXY=1` | Trust `X-Forwarded-For` from any upstream proxy |
| `TRUST_CLOUDFLARE=1` | Trust `CF-Connecting-IP` only from verified Cloudflare IP ranges |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames |
| `ROOT_PATH` | Sub-path prefix if not serving at the domain root |

Do not set both `TRUST_PROXY` and `TRUST_CLOUDFLARE`. Use one or the other.

For Cloudflare Tunnel specifically, see [`proxy/cloudflare-tunnel.md`](proxy/cloudflare-tunnel.md).

---

## Blocklists

HexBlock ships with six preset blocklist categories that can be enabled during
setup or at any time from the dashboard. You can also add any blocklist by URL
or by uploading a file directly.

Supported formats:
- Hosts file format (`0.0.0.0 domain.com` or `127.0.0.1 domain.com`)
- Plain domain lists, one domain per line
- Any format used by Pi-hole or AdGuard Home

Preset sources used by default:
- [StevenBlack Hosts](https://github.com/StevenBlack/hosts) — ads
- [OISD Basic](https://oisd.nl) — trackers
- [Phishing Army](https://phishing.army) — malware and phishing

Blocklists are updated automatically at 3am daily. You can trigger a manual
sync from the dashboard at any time.

---

## Custom rules

Any domain can be individually allowed or blocked from the Custom Rules page.
Custom rules take precedence over all blocklists.

---

## Security

**Authentication**

- Single admin account created during first-run setup
- Passwords hashed with Argon2id
- Session tokens are random 48-byte URL-safe strings with configurable expiry
- Brute-force lockout after 5 failed attempts per IP, configurable duration
- Optional TOTP two-factor authentication

**Transport**

- Set `TRUST_CLOUDFLARE=1` or `TRUST_PROXY=1` only if you are actually running
  behind the corresponding proxy. Enabling either without a proxy in place allows
  IP spoofing via forged headers.
- When `TRUST_CLOUDFLARE=1`, HexBlock validates that `CF-Connecting-IP` headers
  only arrive from Cloudflare's published IP ranges.
- Set `ALLOWED_HOSTS` to your specific domain to prevent host header injection.

**Container hardening**

The application container runs as a non-root user. The `docker-compose.yml`
sets `no-new-privileges: true` on each container.

**Reporting security issues**

If you find a vulnerability, please open a GitHub issue marked as Security
or contact the maintainer directly before disclosing publicly.

---

## Updating

```bash
sudo bash /opt/hexblock/scripts/update.sh
```

This pulls the latest code and rebuilds the application container. The DNS
and WireGuard containers are left running during an update. Your data,
blocklists, and configuration are stored in `/opt/hexblock/data` which is
never modified by an update.

---

## Project structure

```
hexblock/
  app/
    hexblock.py          Application entrypoint
    config.py            Settings loaded from environment
    database.py          SQLite schema and connection
    routers/
      auth.py            Onboarding, login, logout
      api.py             REST API used by the dashboard frontend
      deps.py            Shared auth dependency
      dashboard.py       Dashboard page
      blocklists.py      Blocklists page
      devices.py         Devices page
      vpn.py             VPN page
      rules.py           Custom rules page
      security.py        Security page
      settings.py        Settings page
    services/
      auth_service.py    Password hashing, sessions, TOTP, lockout
      blocklist_service.py  Fetch, parse, apply blocklists to dnsmasq
      wireguard_service.py  Key generation, peer config, QR codes
      scheduler.py       Daily blocklist update scheduler
    models/
      schemas.py         Pydantic request/response validation
    static/
      css/hexblock.css
      js/dashboard.js
      js/hexblock.js
      js/i18n.js          Internationalisation — 10 languages, ~90 keys each
    templates/
      base.html
      onboard.html
      login.html
      dashboard.html
  dns/
    Dockerfile
    dnsmasq.conf         Base DNS configuration
  wireguard/             WireGuard config (generated on first run, not in git)
  proxy/
    nginx.conf           Nginx reverse proxy configuration
    Caddyfile            Caddy reverse proxy configuration
    traefik.yml          Traefik reverse proxy configuration
    cloudflare-tunnel.md Cloudflare Tunnel setup guide
  scripts/
    install.sh           First-run installer
    update.sh            Safe update script
  data/                  Persistent data — not in git
    db/                  hexblock.db (SQLite)
    blocklists/          Per-list domain files
    logs/                Application logs
  docker-compose.yml
  .env.example
```

---

## Stack

| Component | Technology |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Database | SQLite with WAL mode |
| DNS engine | dnsmasq |
| VPN | WireGuard |
| Packaging | Docker Compose |
| Frontend | Vanilla JS |
| i18n | Custom JS i18n system |

---

## Languages

The dashboard is available in 10 languages. The language is auto-detected
from the browser on first visit and can be changed in Settings.

| Code | Language |
|---|---|
| `en` | English |
| `fr` | Français |
| `de` | Deutsch |
| `es` | Español |
| `it` | Italiano |
| `pt` | Português |
| `nl` | Nederlands |
| `pl` | Polski |
| `ja` | 日本語 |
| `zh` | 中文 |

Language preference is saved per-user in the database and syncs across
devices. The login and onboarding pages use browser language detection.

To add a new language, add a translation object to `app/static/js/i18n.js`
following the existing structure and add the locale code to the `SUPPORTED`
array at the top of the file. All ~90 keys must be present — missing keys
fall back to English.

---

## HexBlock Shield

HexBlock Shield is a browser extension that complements the gateway.
It handles the things DNS filtering cannot — YouTube pre-roll and mid-roll
ads (which are served from the same domains as video content), cosmetic ad
placeholders, and in-video sponsor segments via the
[SponsorBlock](https://sponsor.ajay.app) API.

The extension can connect to your HexBlock gateway to pull blocklist updates
from your own server rather than a third-party CDN, and reports block events
back to the dashboard.

It also works standalone without a gateway, in the same way as uBlock Origin.

The extension repository is at `github.com/happygream/hexblock-shield`.

---

## Contributing

Pull requests are welcome. Please open an issue first for anything beyond
small fixes so the change can be discussed before implementation.

The codebase follows standard Python conventions. Run the test suite with
`pytest` before submitting. There are no linting exceptions — the CI will
reject anything that does not pass `ruff` and `mypy`.

---

## License

MIT. See `LICENSE`.
