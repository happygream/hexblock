# Changelog

All notable changes to HexBlock are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
