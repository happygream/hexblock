# Changelog

All notable changes to HexBlock are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] — 2026-05-29

### Added

- Real-time DNS query logging — log reader tails hexblock-dns container logs
  via Docker SDK and writes query and block events to the database
- Server-Sent Events (SSE) endpoint `/api/v1/stream` — dashboard live query
  log updates instantly without polling
- Device auto-discovery — devices are registered automatically from DNS query
  traffic with reverse DNS hostname resolution via the router
- In-memory event bus (`event_bus.py`) for thread-safe SSE publishing from
  the log reader background thread
- `docker` SDK dependency — used for container log tailing and dnsmasq reload

### Changed

- dnsmasq reload now uses Docker SDK `container.restart()` instead of
  `killall -HUP dnsmasq` — fixes reload on Ubuntu where killall path differs
- Blocklist format changed from `address=/domain/#` to `address=/domain/0.0.0.0`
  so blocked queries are logged by dnsmasq
- DNS health check updated to use `nslookup google.com` instead of
  `nslookup health.check` — eliminates false unhealthy status
- Dashboard live query log now uses SSE instead of polling — shows all
  traffic in real time
- Dashboard devices panel polls every 4 seconds for newly discovered devices
- Stats polling continues every 4 seconds for queries/blocked counters
- uvicorn reduced to 1 worker to prevent duplicate log reader threads
- Docker group GID 108 added to hexblock container for Docker socket access

### Fixed

- Health check queries from 127.0.0.1 filtered from query log
- Duplicate device entries prevented via `INSERT OR IGNORE` and unique index
- `renderTopBlocked` undefined error crashing dashboard on load
- Add Blocklist panel converted from fixed side column to slide-in drawer —
  layout no longer overflows at any viewport width
- Responsive CSS added for sidebar, content grid, and all pages at 700px
  and 420px breakpoints


## [1.1.0] — 2026-05-22

### Added

- Internationalisation — dashboard available in 10 languages: English,
  French, German, Spanish, Italian, Portuguese, Dutch, Polish, Japanese,
  and Chinese
- Language auto-detection from browser `Accept-Language` header on first visit
- Language picker in the dashboard topbar and in Settings
- Language preference saved per-user in the database — syncs across devices
- `data-i18n` attributes on all translatable elements — language switches
  without a page reload
- `language` field added to the settings API `PATCH /api/v1/settings`
- Login and onboarding pages respect browser language preference

### Changed

- `dashboard.js` — all hardcoded user-facing strings replaced with `_t()`
  calls via the i18n system
- `SettingsUpdate` schema — `language` field added (`Optional[str]`)
- `base.html` — `i18n.js` loaded before `dashboard.js`
- Sidebar nav labels wrapped in `<span data-i18n="...">` elements
- Language picker rendered into the topbar via `buildLanguagePicker()`

---

## [1.0.0] — 2026-05-20

Initial release.

### Added

- DNS-level ad and tracker blocking via dnsmasq
- Blocklist management — URL import, file upload (.txt and hosts format), preset lists
- Blocklist categories — Ads, Trackers, Malware, Social, Telemetry, Adult, Custom
- Automatic daily blocklist updates via background scheduler
- Custom per-domain allow and deny rules
- WireGuard VPN — automatic key generation, QR code device onboarding
- Single-user account with Argon2id password hashing
- Brute-force login protection with configurable lockout
- Optional TOTP two-factor authentication
- Session management with configurable timeout
- Live query log with per-device attribution
- Audit log for all admin actions
- Dashboard with live stats — queries, block rate, devices, VPN uptime
- Reverse proxy support — Nginx, Caddy, Traefik, Cloudflare Tunnel
- Interactive setup script covering all deployment modes
- Automatic static IP configuration for home network deployments
- Local hostname support via dnsmasq (e.g. hexblock.local)
- First-run onboarding wizard
- REST API for dashboard frontend and HexBlock Shield extension
- Extension event endpoint — Shield block events appear in query log
- Docker Compose deployment with three containers (app, dns, wireguard)
- install.sh and update.sh scripts
