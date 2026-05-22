# HexBlock Roadmap

This document tracks planned features. It is not a commitment or a timeline.
Items move to the changelog when they ship.

---

## v1.2

**Per-device blocklist groups**
Different devices get different rules. Block social media for the kids'
devices, allow it on your own. Assign devices to groups from the dashboard.

**Scheduled blocking**
Block categories on a schedule — social media off between 9am and 3pm on
weekdays, for example. Built on the existing scheduler infrastructure.

**DNS over HTTPS upstream**
Currently HexBlock forwards queries to a plain DNS upstream. DoH support
encrypts the upstream leg so your ISP cannot see which names you resolve
even after HexBlock filters them.

**Safe search enforcement**
Force safe search on Google, Bing, YouTube, and DuckDuckGo by returning
the safe search CNAME records instead of the real ones.

**TOTP two-factor authentication**
TOTP is partially implemented. This release completes the setup flow —
QR code generation, verification on login, and backup codes.

---

## v1.3

**HexBlock Shield extension — stable release**
Firefox submission. Compiled EasyList and EasyPrivacy rule sets bundled
with the extension. Chrome Web Store listing is already live.

**Mobile companion app**
iOS and Android app for managing the WireGuard connection and viewing
dashboard stats. Built with a lightweight webview over the existing dashboard.

**Query log export**
Export the query log as CSV or JSON for analysis in external tools.

---

## v1.4

**Multi-user support**
Additional accounts with read-only access for household members to view
their own device stats without access to configuration.

**Self-hosted SponsorBlock mirror**
Optional Docker container that runs a local SponsorBlock database. The Shield
extension can point at it so sponsor segment data never leaves your network.

**Automatic blocklist discovery**
Scan community sources (filterlists.com, GitHub topics) and suggest new
lists based on the categories you already have enabled.

---

## Backlog (unscheduled)

- Grafana/Prometheus metrics endpoint
- LDAP/SSO authentication for enterprise deployments
- Tailscale integration for remote access without Cloudflare Tunnel
- Browser extension for Safari (requires iOS App Store submission)
- ARM64 Docker image for Raspberry Pi 5

---

## Won't do

- Cloud-hosted version — HexBlock is self-hosted by design
- Monetisation of any kind — HexBlock and HexBlock Shield are free and open source
- Automatic firmware updates that run without user confirmation
