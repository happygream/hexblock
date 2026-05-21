#!/usr/bin/env bash
# HexBlock interactive setup script
# Writes .env, docker-compose.override.yml, and proxy config files
# for your chosen deployment mode.
#
# Safe to re-run — prompts before overwriting existing config.
#
# Usage: sudo bash scripts/setup.sh

set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$INSTALL_DIR/data"
ENV_FILE="$INSTALL_DIR/.env"
COMPOSE_FILE="$INSTALL_DIR/docker-compose.yml"
COMPOSE_OVERRIDE="$INSTALL_DIR/docker-compose.override.yml"
PROXY_DIR="$INSTALL_DIR/proxy"

# ── Colours ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

info()    { echo -e "${CYAN}  ${*}${NC}"; }
success() { echo -e "${GREEN}  ${*}${NC}"; }
warn()    { echo -e "${YELLOW}  Warning: ${*}${NC}"; }
die()     { echo -e "${RED}  Error: ${*}${NC}"; exit 1; }
bold()    { echo -e "${BOLD}${*}${NC}"; }
dim()     { echo -e "${DIM}${*}${NC}"; }
divider() { echo -e "${DIM}  ────────────────────────────────────────────────${NC}"; }

# ── Prompt helpers ────────────────────────────────────────────

ask_yn() {
    # ask_yn "Question" [y|n]  — default y or n
    local prompt="$1" default="${2:-y}"
    local hint; [[ "$default" == "y" ]] && hint="[Y/n]" || hint="[y/N]"
    while true; do
        read -r -p "$(echo -e "  ${BOLD}${prompt}${NC} ${DIM}${hint}${NC} ")" ans
        [[ -z "$ans" ]] && ans="$default"
        case "$ans" in
            [Yy]*) return 0 ;;
            [Nn]*) return 1 ;;
            *) echo "  Please answer y or n." ;;
        esac
    done
}

ask() {
    # ask "Question" "default"  — echoes answer
    local prompt="$1" default="$2"
    local hint; [[ -n "$default" ]] && hint=" ${DIM}[${default}]${NC}"
    read -r -p "$(echo -e "  ${BOLD}${prompt}${NC}${hint}: ")" ans
    echo "${ans:-$default}"
}

pick() {
    # pick "Question" opt1 opt2 ...  — sets PICK_IDX (1-based) and PICK_RESULT
    local prompt="$1"; shift
    local opts=("$@")
    echo -e "  ${BOLD}${prompt}${NC}"
    for i in "${!opts[@]}"; do
        echo -e "    ${CYAN}$((i+1))${NC}  ${opts[$i]}"
    done
    while true; do
        read -r -p "$(echo -e "  ${DIM}Choice [1-${#opts[@]}]:${NC} ")" ans
        if [[ "$ans" =~ ^[0-9]+$ ]] && (( ans >= 1 && ans <= ${#opts[@]} )); then
            PICK_IDX=$ans
            PICK_RESULT="${opts[$((ans-1))]}"
            return
        fi
        echo "  Invalid choice. Enter a number between 1 and ${#opts[@]}."
    done
}

# ── Header ────────────────────────────────────────────────────
clear
echo ""
bold "  HexBlock — Interactive Setup"
divider
echo ""
dim "  Walks through configuration and writes all required files."
dim "  Re-running is safe — prompts before overwriting existing config."
echo ""

[[ "$EUID" -eq 0 ]] || die "Please run as root: sudo bash scripts/setup.sh"

# ── Dependency check ─────────────────────────────────────────
for cmd in docker curl openssl; do
    command -v "$cmd" &>/dev/null || die "$cmd is required but not installed."
done
docker compose version &>/dev/null || die "Docker Compose v2 is required."

# ── Existing config ───────────────────────────────────────────
if [[ -f "$ENV_FILE" ]]; then
    warn "Existing .env found."
    if ! ask_yn "Reconfigure? Existing values will be shown as defaults." "n"; then
        info "Keeping existing configuration."
        info "Run: docker compose -f docker-compose.yml -f docker-compose.override.yml up -d"
        exit 0
    fi
    set -a; source "$ENV_FILE" 2>/dev/null || true; set +a
    echo ""
fi

# ═════════════════════════════════════════════════════════════
# STEP 1 — Timezone
# ═════════════════════════════════════════════════════════════
echo ""
bold "  Step 1 of 5 — Timezone"
divider
TZ_VAL=$(ask "Timezone" "${TZ:-Europe/London}")

# ═════════════════════════════════════════════════════════════
# STEP 2 — DNS
# ═════════════════════════════════════════════════════════════
echo ""
bold "  Step 2 of 5 — DNS"
divider
echo ""
echo "  HexBlock runs a DNS server on port 53."
echo "  Devices on your network point their DNS at this server."
echo ""

# systemd-resolved check
if ss -tulpn 2>/dev/null | grep -q ':53 '; then
    if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
        warn "systemd-resolved is running and occupies port 53."
        echo ""
        if ask_yn "Disable systemd-resolved? Required for DNS filtering." "y"; then
            systemctl disable --now systemd-resolved
            rm -f /etc/resolv.conf
            { echo "nameserver 1.1.1.1"; echo "nameserver 1.0.0.1"; } > /etc/resolv.conf
            success "systemd-resolved disabled."
        else
            warn "DNS filtering will not work until port 53 is free."
        fi
    else
        warn "Port 53 is in use by another process."
        ss -tulpn | grep ':53 ' | head -3 || true
        warn "DNS filtering will not work until port 53 is free."
    fi
    echo ""
fi

echo ""
pick "Upstream DNS provider" \
    "Cloudflare  1.1.1.1  — fast, privacy-focused" \
    "Quad9       9.9.9.9  — blocks malware at DNS level" \
    "Google      8.8.8.8  — widely used" \
    "Custom"

case "$PICK_IDX" in
    1) UPSTREAM_DNS="1.1.1.1" ;;
    2) UPSTREAM_DNS="9.9.9.9" ;;
    3) UPSTREAM_DNS="8.8.8.8" ;;
    4) UPSTREAM_DNS=$(ask "DNS server IP" "${UPSTREAM_DNS:-1.1.1.1}") ;;
esac

# ═════════════════════════════════════════════════════════════
# STEP 3 — Deployment mode
# ═════════════════════════════════════════════════════════════
echo ""
bold "  Step 3 of 5 — Deployment mode"
divider
echo ""
echo "  Choose how HexBlock will be accessed."
echo ""
echo "  Local network (no domain)"
echo "    Home network only   Access via IP address or a local hostname"
echo "                        like hexblock.local. No domain name needed."
echo "                        No SSL. Suitable for home lab use."
echo ""
echo "  Reverse proxy (domain required)"
echo "    Traefik             Docker-native. HexBlock never binds a host port."
echo "    Caddy               Automatic SSL certificates."
echo "    Nginx               You manage SSL certificates."
echo ""
echo "  Cloudflare Tunnel (domain required, no open inbound ports)"
echo "    via Traefik         Recommended. outbound tunnel only."
echo "    via Nginx           Alternative if you already run Nginx."
echo ""

pick "Deployment mode" \
    "Home network only (no domain, no SSL)" \
    "Traefik (domain + SSL)" \
    "Caddy (domain + SSL)" \
    "Nginx (domain + SSL)" \
    "Cloudflare Tunnel via Traefik" \
    "Cloudflare Tunnel via Nginx"

PROXY_MODE="$PICK_RESULT"
PROXY_IDX="$PICK_IDX"
echo ""

# Collect mode-specific values
DOMAIN=""
EMAIL=""
TRUST_PROXY_VAL=0
TRUST_CF_VAL=0
ALLOWED_HOSTS_VAL="*"
LOCAL_HOSTNAME=""
SET_STATIC=false
LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "")
LAN_IFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}' | head -1 || echo "eth0")
LAN_GATEWAY=$(ip route | awk '/^default/{print $3}' | head -1 || echo "")
LAN_PREFIX=$(ip -o -f inet addr show "$LAN_IFACE" 2>/dev/null | awk '{print $4}' | cut -d/ -f2 | head -1 || echo "24")

case "$PROXY_IDX" in
    1)  # Home network only
        echo ""
        echo "  HexBlock will be accessible on your local network."
        echo "  No domain name or SSL certificate required."
        echo ""

        # Detect current LAN IP as a suggestion
        LAN_IP_DETECTED=$(hostname -I 2>/dev/null | awk '''{print $1}''' || echo "")
        echo "  Your server'''s current IP appears to be: ${LAN_IP_DETECTED}"
        echo ""
        warn "If your server gets its IP from DHCP this address may change."
        warn "Set a static IP or DHCP reservation in your router so the"
        warn "address stays the same. HexBlock'''s DNS records will break if it changes."
        echo ""

        LAN_IP=$(ask "Server IP address to bind to" "${LAN_IP_DETECTED}")

        # Optional local hostname
        echo ""
        echo "  You can give HexBlock a friendly local hostname like hexblock.local"
        echo "  so you type that instead of an IP address. This works by adding"
        echo "  a DNS record to HexBlock'''s own DNS server — every device that"
        echo "  uses HexBlock for DNS will resolve the name automatically."
        echo ""
        LOCAL_HOSTNAME=""
        if ask_yn "Add a local hostname (e.g. hexblock.local)?" "y"; then
            LOCAL_HOSTNAME=$(ask "Local hostname" "hexblock.local")
        fi

        echo ""
        warn "Traffic between your browser and HexBlock is unencrypted (HTTP)."
        warn "This is acceptable on a trusted home network."
        echo ""
        ;;
    2|3|4)  # Traefik / Caddy / Nginx
        DOMAIN=$(ask "Domain name" "${DOMAIN:-hexblock.example.com}")
        EMAIL=$(ask "Email for SSL certificate (Let's Encrypt)" "${EMAIL:-admin@example.com}")
        TRUST_PROXY_VAL=1
        ALLOWED_HOSTS_VAL="$DOMAIN"
        echo ""
        ;;
    5|6)  # Cloudflare Tunnel
        DOMAIN=$(ask "Domain name" "${DOMAIN:-hexblock.example.com}")
        # cloudflared -> Traefik/Nginx -> HexBlock
        # HexBlock sees requests from the internal proxy, not Cloudflare directly
        # so TRUST_PROXY=1 is correct here, not TRUST_CLOUDFLARE
        TRUST_PROXY_VAL=1
        TRUST_CF_VAL=0
        ALLOWED_HOSTS_VAL="$DOMAIN"
        echo ""
        info "Note: With Cloudflare Tunnel, TRUST_PROXY is set (not TRUST_CLOUDFLARE)"
        info "because requests arrive at HexBlock from the internal proxy, not Cloudflare."
        echo ""
        ;;
esac

# ═════════════════════════════════════════════════════════════
# STEP 4 — WireGuard
# ═════════════════════════════════════════════════════════════
echo ""
bold "  Step 4 of 5 — WireGuard VPN"
divider
echo ""
echo "  WireGuard encrypts all device traffic and routes it through HexBlock."
echo "  Port 51820 UDP must be reachable from outside for VPN clients."
echo ""

ENABLE_WG=false
WG_HOST=""
WG_PORT="51820"

if ask_yn "Enable WireGuard VPN?" "y"; then
    ENABLE_WG=true
    case "$PROXY_IDX" in
        1) WG_DEFAULT="$LAN_IP" ;;
        *) WG_DEFAULT="${DOMAIN:-$LAN_IP}" ;;
    esac
    WG_HOST=$(ask "Hostname or IP VPN clients will connect to" "$WG_DEFAULT")
    WG_PORT=$(ask "WireGuard UDP port" "51820")
    echo ""
    success "WireGuard will be configured on ${WG_HOST}:${WG_PORT}"
else
    info "WireGuard skipped. Re-run setup to enable it later."
fi

# ═════════════════════════════════════════════════════════════
# STEP 5 — Security
# ═════════════════════════════════════════════════════════════
echo ""
bold "  Step 5 of 5 — Security"
divider
echo ""
MAX_ATTEMPTS=$(ask "Max failed login attempts before lockout" "${MAX_LOGIN_ATTEMPTS:-5}")
LOCKOUT_MINS=$(ask "Lockout duration in minutes" "5")
SESSION_HOURS=$(ask "Session timeout in hours" "1")
LOCKOUT_SECS=$(( LOCKOUT_MINS * 60 ))
SESSION_SECS=$(( SESSION_HOURS * 3600 ))

# ═════════════════════════════════════════════════════════════
# Summary
# ═════════════════════════════════════════════════════════════
echo ""
echo ""
bold "  Configuration summary"
divider
echo ""
printf "  %-22s ${CYAN}%s${NC}\n" "Timezone"         "$TZ_VAL"
printf "  %-22s ${CYAN}%s${NC}\n" "Upstream DNS"     "$UPSTREAM_DNS"
printf "  %-22s ${CYAN}%s${NC}\n" "Deployment mode"  "$PROXY_MODE"
[[ -n "$DOMAIN" ]] && printf "  %-22s ${CYAN}%s${NC}\n" "Domain" "$DOMAIN"
[[ -n "$EMAIL"  ]] && printf "  %-22s ${CYAN}%s${NC}\n" "SSL email" "$EMAIL"

if [[ "$ENABLE_WG" == true ]]; then
    printf "  %-22s ${CYAN}%s${NC}\n" "WireGuard" "${WG_HOST}:${WG_PORT}"
else
    printf "  %-22s ${DIM}%s${NC}\n" "WireGuard" "disabled"
fi

printf "  %-22s ${CYAN}%s${NC}\n" "Login lockout"    "${MAX_ATTEMPTS} attempts, ${LOCKOUT_MINS}m"
printf "  %-22s ${CYAN}%s${NC}\n" "Session timeout"  "${SESSION_HOURS}h"
echo ""

if ! ask_yn "Write configuration and start HexBlock?" "y"; then
    info "Aborted. No files written."
    exit 0
fi
echo ""

# ═════════════════════════════════════════════════════════════
# Write .env
# ═════════════════════════════════════════════════════════════
info "Writing .env..."

# Preserve secret key if reconfiguring
SECRET_KEY=""
if [[ -f "$ENV_FILE" ]]; then
    SECRET_KEY=$(grep '^SECRET_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
fi
[[ -z "$SECRET_KEY" ]] && SECRET_KEY=$(openssl rand -hex 32)

cat > "$ENV_FILE" << ENV
# HexBlock — generated by setup.sh on $(date)
# Do not commit this file to version control.

HEXBLOCK_ENV=production
SECRET_KEY=${SECRET_KEY}

DB_PATH=/data/db/hexblock.db
BLOCKLIST_DIR=/data/blocklists
LOG_DIR=/data/logs

TRUST_PROXY=${TRUST_PROXY_VAL}
TRUST_CLOUDFLARE=${TRUST_CF_VAL}
ALLOWED_HOSTS=${ALLOWED_HOSTS_VAL}
ROOT_PATH=

DNSMASQ_HOSTS_FILE=/etc/dnsmasq.d/hexblock.hosts
DNSMASQ_RELOAD_CMD=killall -HUP dnsmasq
UPSTREAM_DNS=${UPSTREAM_DNS}

WG_INTERFACE=wg0
WG_PORT=${WG_PORT}
WG_SUBNET=10.13.13.0/24

MAX_LOGIN_ATTEMPTS=${MAX_ATTEMPTS}
LOCKOUT_SECONDS=${LOCKOUT_SECS}
SESSION_LIFETIME=${SESSION_SECS}

AUTO_UPDATE_HOUR=3
TZ=${TZ_VAL}
ENV

success ".env written."

# ═════════════════════════════════════════════════════════════
# Write docker-compose.override.yml
# ═════════════════════════════════════════════════════════════
info "Writing docker-compose.override.yml..."
mkdir -p "$PROXY_DIR"

# Helper — write WireGuard disabled profile if needed
_wg_disabled() {
    cat >> "$COMPOSE_OVERRIDE" << 'YAML'

  wireguard:
    profiles:
      - disabled
YAML
}

# ─────────────────────────────────────────────────────────────
# Helper — detect network manager and set static IP
# ─────────────────────────────────────────────────────────────
_set_static_ip() {
    local iface="$1"
    local ip="$2"
    local prefix="$3"
    local gateway="$4"

    # Detect which network manager is in use
    local nm_type="unknown"

    if systemctl is-active --quiet NetworkManager 2>/dev/null; then
        nm_type="networkmanager"
    elif systemctl is-active --quiet systemd-networkd 2>/dev/null; then
        nm_type="networkd"
    elif [[ -f /etc/dhcpcd.conf ]]; then
        nm_type="dhcpcd"
    fi

    info "Detected network manager: ${nm_type}"
    echo ""

    case "$nm_type" in

        networkmanager)
            # Get the connection name for this interface
            local conn
            conn=$(nmcli -t -f NAME,DEVICE con show --active 2>/dev/null                 | grep ":${iface}$" | cut -d: -f1 | head -1 || echo "")

            if [[ -z "$conn" ]]; then
                warn "Could not find NetworkManager connection for ${iface}."
                warn "Set the static IP manually with nmcli or the network settings."
                return 1
            fi

            info "NetworkManager connection: ${conn}"

            # Back up current connection settings
            local backup_file="$INSTALL_DIR/network-backup-$(date +%Y%m%d-%H%M%S).txt"
            nmcli con show "$conn" > "$backup_file" 2>/dev/null || true
            info "Current network settings backed up to: ${backup_file}"
            echo ""

            warn "About to set ${iface} to static ${ip}/${prefix} via ${gateway}"
            warn "If the connection drops, check ${backup_file} to restore."
            echo ""

            if ! ask_yn "Proceed?" "y"; then
                info "Skipped — no network changes made."
                return 0
            fi

            nmcli con mod "$conn"                 ipv4.method manual                 ipv4.addresses "${ip}/${prefix}"                 ipv4.gateway "$gateway"                 ipv4.dns "127.0.0.1"                 ipv4.dns-search ""

            nmcli con down "$conn" 2>/dev/null || true
            nmcli con up   "$conn" 2>/dev/null || true

            success "Static IP set via NetworkManager."
            ;;

        networkd)
            local netd_dir="/etc/systemd/network"
            local netd_file="${netd_dir}/10-hexblock-${iface}.network"

            # Back up any existing file for this interface
            if [[ -f "$netd_file" ]]; then
                cp "$netd_file" "${netd_file}.bak.$(date +%Y%m%d-%H%M%S)"
                info "Existing config backed up to ${netd_file}.bak.*"
            fi

            warn "About to write ${netd_file} setting ${iface} to static ${ip}/${prefix}"
            echo ""

            if ! ask_yn "Proceed?" "y"; then
                info "Skipped — no network changes made."
                return 0
            fi

            mkdir -p "$netd_dir"
            cat > "$netd_file" << NETD
[Match]
Name=${iface}

[Network]
Address=${ip}/${prefix}
Gateway=${gateway}
DNS=127.0.0.1
NETD

            systemctl restart systemd-networkd
            success "Static IP set via systemd-networkd."
            info "Config written to: ${netd_file}"
            ;;

        dhcpcd)
            local dhcpcd_conf="/etc/dhcpcd.conf"
            local backup="${dhcpcd_conf}.bak.$(date +%Y%m%d-%H%M%S)"

            cp "$dhcpcd_conf" "$backup"
            info "dhcpcd.conf backed up to: ${backup}"

            warn "About to append static IP config to ${dhcpcd_conf}"
            warn "Interface: ${iface}  IP: ${ip}/${prefix}  Gateway: ${gateway}"
            echo ""

            if ! ask_yn "Proceed?" "y"; then
                info "Skipped — no network changes made."
                return 0
            fi

            # Remove any existing static block for this interface
            python3 - "$dhcpcd_conf" "$iface" << 'PYSTRIP'
import sys, re
conf_path = sys.argv[1]
iface     = sys.argv[2]
with open(conf_path) as f:
    text = f.read()
# Remove existing interface block for this iface
pattern = rf"\ninterface {re.escape(iface)}[\s\S]*?(?=\ninterface |\Z)"
text = re.sub(pattern, "", text)
with open(conf_path, "w") as f:
    f.write(text.rstrip() + "\n")
PYSTRIP

            cat >> "$dhcpcd_conf" << DHCP

interface ${iface}
static ip_address=${ip}/${prefix}
static routers=${gateway}
static domain_name_servers=127.0.0.1
DHCP

            # Restart dhcpcd
            systemctl restart dhcpcd 2>/dev/null || service dhcpcd restart 2>/dev/null || true
            success "Static IP set via dhcpcd."
            info "Config written to: ${dhcpcd_conf}"
            ;;

        *)
            warn "Could not detect network manager (checked NetworkManager, systemd-networkd, dhcpcd)."
            warn "Set the static IP manually:"
            echo ""
            echo "  NetworkManager:  nmcli con mod <connection> ipv4.method manual"
            echo "                       ipv4.addresses \${ip}/\${prefix} ipv4.gateway \${gateway}"
            echo "  systemd-networkd: create /etc/systemd/network/10-hexblock.network"
            echo "  dhcpcd:          append to /etc/dhcpcd.conf"
            echo ""
            return 1
            ;;
    esac

    # Verify the IP is still reachable
    sleep 2
    if ip addr show "$iface" 2>/dev/null | grep -q "${ip}/"; then
        success "IP ${ip} confirmed on interface ${iface}."
    else
        warn "Could not confirm ${ip} on ${iface}. Check your network settings."
        warn "If you lost connectivity, restore from the backup file and reboot."
    fi
}

# ─────────────────────────────────────────────────────────────
# Helper — add a local hostname to dnsmasq
# ─────────────────────────────────────────────────────────────
_add_local_hostname() {
    local hostname="$1"
    local ip="$2"
    local conf_file="$INSTALL_DIR/dns/dnsmasq.d/local-hosts.conf"
    mkdir -p "$INSTALL_DIR/dns/dnsmasq.d"
    # Remove any existing entry for this hostname
    grep -v "address=/${hostname}/" "$conf_file" 2>/dev/null > "${conf_file}.tmp" || true
    mv "${conf_file}.tmp" "$conf_file" 2>/dev/null || true
    echo "address=/${hostname}/${ip}" >> "$conf_file"
    success "Local hostname ${hostname} -> ${ip} added to dnsmasq."
    info "Every device using HexBlock as its DNS server will resolve ${hostname}."
}

case "$PROXY_IDX" in

  1)  # Home network only
    cat > "$COMPOSE_OVERRIDE" << YAML
# Generated by setup.sh — mode: Home network only
# HexBlock is accessible on your LAN at http://${LAN_IP}:8080
# Bound to the specific LAN IP only — not 0.0.0.0
version: "3.9"
services:
  hexblock:
    ports:
      - "${LAN_IP}:8080:8080"
YAML
    [[ "$ENABLE_WG" == false ]] && _wg_disabled

    # Set static IP if the user agreed
    if [[ "$SET_STATIC" == true ]]; then
        echo ""
        info "Setting static IP..."
        _set_static_ip "$LAN_IFACE" "$LAN_IP" "$LAN_PREFIX" "$LAN_GATEWAY"
    fi

    # Add local hostname to dnsmasq if requested
    if [[ -n "$LOCAL_HOSTNAME" ]]; then
        _add_local_hostname "$LOCAL_HOSTNAME" "$LAN_IP"
    fi
    ;;

  2)  # Traefik — hexblock has no host port binding at all
    cat > "$COMPOSE_OVERRIDE" << 'YAML'
# Generated by setup.sh — mode: Traefik
# HexBlock binds no host ports. Traefik reaches it on the Docker network.
version: "3.9"
services:
  hexblock:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.hexblock.rule=Host(__BT____DOMAIN____BT__)"
      - "traefik.http.routers.hexblock.entrypoints=websecure"
      - "traefik.http.routers.hexblock.tls.certresolver=letsencrypt"
      - "traefik.http.services.hexblock.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.hexblock-sec.headers.stsSeconds=63072000"
      - "traefik.http.middlewares.hexblock-sec.headers.stsIncludeSubdomains=true"
      - "traefik.http.middlewares.hexblock-sec.headers.frameDeny=true"
      - "traefik.http.middlewares.hexblock-sec.headers.contentTypeNosniff=true"
      - "traefik.http.middlewares.hexblock-redir.redirectscheme.scheme=https"
      - "traefik.http.routers.hexblock-http.rule=Host(__BT____DOMAIN____BT__)"
      - "traefik.http.routers.hexblock-http.entrypoints=web"
      - "traefik.http.routers.hexblock-http.middlewares=hexblock-redir"
      - "traefik.http.routers.hexblock.middlewares=hexblock-sec,hexblock-ratelimit"
      - "traefik.http.middlewares.hexblock-ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.hexblock-ratelimit.ratelimit.burst=50"
      - "traefik.http.middlewares.hexblock-authlimit.ratelimit.average=10"
      - "traefik.http.middlewares.hexblock-authlimit.ratelimit.burst=5"
      - "traefik.http.routers.hexblock-login.rule=Host(__BT____DOMAIN____BT__) && PathPrefix(`/login`, `/onboard`)"
      - "traefik.http.routers.hexblock-login.entrypoints=websecure"
      - "traefik.http.routers.hexblock-login.tls.certresolver=letsencrypt"
      - "traefik.http.routers.hexblock-login.middlewares=hexblock-authlimit"
      - "traefik.http.routers.hexblock-login.service=hexblock"
    networks:
      - hexblock-net
      - traefik-net

  traefik:
    image: traefik:v3.0
    container_name: hexblock-traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    command:
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=__EMAIL__"
      - "--certificatesresolvers.letsencrypt.acme.storage=/certs/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=hexblock-net"
      - "--log.level=WARN"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/certs
    networks:
      - hexblock-net
      - traefik-net

volumes:
  traefik_certs:

networks:
  traefik-net:
    driver: bridge
YAML
    # Substitute domain and email into the generated file
    sed -i "s/__DOMAIN__/${DOMAIN}/g; s/__EMAIL__/${EMAIL}/g; s/__BT__/\`/g" "$COMPOSE_OVERRIDE"
    [[ "$ENABLE_WG" == false ]] && _wg_disabled
    ;;

  3)  # Caddy — hexblock has no host port binding
    cat > "$COMPOSE_OVERRIDE" << YAML
# Generated by setup.sh — mode: Caddy
# HexBlock binds no host ports. Caddy reaches it on the Docker network.
version: "3.9"
services:
  hexblock:
    networks:
      - hexblock-net

  caddy:
    image: caddy:2-alpine
    container_name: hexblock-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./proxy/Caddyfile.generated:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - hexblock-net
    depends_on:
      - hexblock

volumes:
  caddy_data:
  caddy_config:
YAML
    [[ "$ENABLE_WG" == false ]] && _wg_disabled

    # Write Caddyfile
    cat > "$PROXY_DIR/Caddyfile.generated" << CADDY
${DOMAIN} {
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy no-referrer
        -Server
    }
    reverse_proxy hexblock:8080 {
        header_up Host              {host}
        header_up X-Real-IP         {remote_host}
        header_up X-Forwarded-For   {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
CADDY
    success "proxy/Caddyfile.generated written."
    ;;

  4)  # Nginx — hexblock binds no host port; nginx runs on the host
    cat > "$COMPOSE_OVERRIDE" << YAML
# Generated by setup.sh — mode: Nginx
# HexBlock binds no host ports.
# Nginx runs on the host and proxies to 127.0.0.1:8080.
# A loopback port binding allows Nginx (on the host) to reach HexBlock.
version: "3.9"
services:
  hexblock:
    ports:
      - "127.0.0.1:8080:8080"
YAML
    [[ "$ENABLE_WG" == false ]] && _wg_disabled

    # Write Nginx config
    cat > "$PROXY_DIR/nginx.generated.conf" << NGINX
# HexBlock — generated Nginx config
# sudo cp proxy/nginx.generated.conf /etc/nginx/sites-available/hexblock
# sudo ln -s /etc/nginx/sites-available/hexblock /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx
#
# Get SSL first:
#   sudo apt install certbot python3-certbot-nginx
#   sudo certbot --nginx -d ${DOMAIN}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_buffering    off;
    }

    location ~ /\. { deny all; }
}
NGINX
    success "proxy/nginx.generated.conf written."
    echo ""
    warn "Nginx runs on the host — complete these steps after HexBlock starts:"
    echo ""
    echo "    sudo apt install nginx certbot python3-certbot-nginx"
    echo "    sudo certbot --nginx -d ${DOMAIN}"
    echo "    sudo cp proxy/nginx.generated.conf /etc/nginx/sites-available/hexblock"
    echo "    sudo ln -s /etc/nginx/sites-available/hexblock /etc/nginx/sites-enabled/"
    echo "    sudo nginx -t && sudo systemctl reload nginx"
    echo ""
    ;;

  5)  # Cloudflare Tunnel via Traefik
    # cloudflared (host) -> Traefik (container, 127.0.0.1:8080) -> hexblock (Docker network)
    # Traefik listens on 127.0.0.1 only — not reachable from the network
    cat > "$COMPOSE_OVERRIDE" << 'YAML'
# Generated by setup.sh — mode: Cloudflare Tunnel via Traefik
#
# Architecture:
#   cloudflared (host) -> 127.0.0.1:80 -> Traefik -> hexblock (Docker network)
#
# Traefik listens only on 127.0.0.1 — not exposed to the network.
# HexBlock has no host port binding at all.
# The only externally reachable port is the Cloudflare Tunnel outbound connection.
version: "3.9"
services:
  hexblock:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.hexblock.rule=Host(__BT____DOMAIN____BT__)"
      - "traefik.http.routers.hexblock.entrypoints=web"
      - "traefik.http.services.hexblock.loadbalancer.server.port=8080"
      - "traefik.http.middlewares.hexblock-sec.headers.frameDeny=true"
      - "traefik.http.middlewares.hexblock-sec.headers.contentTypeNosniff=true"
      - "traefik.http.routers.hexblock.middlewares=hexblock-sec"
    networks:
      - hexblock-net
      - traefik-net

  traefik:
    image: traefik:v3.0
    container_name: hexblock-traefik
    restart: unless-stopped
    ports:
      # Bind ONLY on loopback — cloudflared connects here, nothing else can
      - "127.0.0.1:80:80"
    command:
      - "--entrypoints.web.address=:80"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=hexblock-net"
      - "--log.level=WARN"
      # No HTTPS or cert resolver needed — Cloudflare terminates TLS
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - hexblock-net
      - traefik-net

networks:
  traefik-net:
    driver: bridge
YAML
    sed -i "s/__DOMAIN__/${DOMAIN}/g; s/__BT__/\`/g" "$COMPOSE_OVERRIDE"
    [[ "$ENABLE_WG" == false ]] && _wg_disabled
    _write_cf_instructions "traefik" "http://127.0.0.1:80"
    ;;

  6)  # Cloudflare Tunnel via Nginx
    cat > "$COMPOSE_OVERRIDE" << YAML
# Generated by setup.sh — mode: Cloudflare Tunnel via Nginx
#
# Architecture:
#   cloudflared (host) -> 127.0.0.1:8080 -> Nginx (host) -> hexblock (Docker 127.0.0.1:18080)
#
# HexBlock binds only on 127.0.0.1:18080 for Nginx on the host to reach it.
# Nginx listens on 127.0.0.1:8080 for cloudflared.
# Nothing is exposed to the network.
version: "3.9"
services:
  hexblock:
    ports:
      - "127.0.0.1:18080:8080"
YAML
    [[ "$ENABLE_WG" == false ]] && _wg_disabled

    cat > "$PROXY_DIR/nginx.generated.conf" << NGINX
# HexBlock — Nginx config for Cloudflare Tunnel
# Nginx listens on loopback only — cloudflared connects here.
# sudo cp proxy/nginx.generated.conf /etc/nginx/sites-available/hexblock
# sudo ln -s /etc/nginx/sites-available/hexblock /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx

server {
    listen 127.0.0.1:8080;
    server_name ${DOMAIN};

    # No SSL block — Cloudflare terminates TLS before it reaches here.
    # Add X-Forwarded headers so HexBlock gets the real client IP.
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass         http://127.0.0.1:18080;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_buffering    off;
    }

    location ~ /\. { deny all; }
}
NGINX
    success "proxy/nginx.generated.conf written."
    _write_cf_instructions "nginx" "http://127.0.0.1:8080"
    ;;
esac

success "docker-compose.override.yml written."

# ═════════════════════════════════════════════════════════════
# Cloudflare Tunnel instructions writer
# ═════════════════════════════════════════════════════════════

_write_cf_instructions() {
    local proxy_type="$1"
    local service_url="$2"

    cat > "$PROXY_DIR/cloudflare-tunnel.setup.md" << CF
# Cloudflare Tunnel setup for ${DOMAIN}

HexBlock is configured for Cloudflare Tunnel via ${proxy_type}.
Complete these steps after HexBlock is running.

## Architecture

    Internet -> Cloudflare edge (SSL) -> cloudflared (this server)
             -> ${proxy_type} -> HexBlock

Nothing is exposed to the network. The only outbound connection is from
cloudflared to Cloudflare's edge. No inbound ports need to be opened.

## 1. Install cloudflared

    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \\
        | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg

    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \\
        https://pkg.cloudflare.com/cloudflared any main" \\
        | sudo tee /etc/apt/sources.list.d/cloudflared.list

    sudo apt update && sudo apt install cloudflared

## 2. Authenticate

    cloudflared tunnel login

## 3. Create tunnel

    cloudflared tunnel create hexblock

## 4. Configure tunnel

Create ~/.cloudflared/config.yml — replace YOUR-TUNNEL-UUID:

    tunnel: YOUR-TUNNEL-UUID
    credentials-file: /root/.cloudflared/YOUR-TUNNEL-UUID.json

    ingress:
      - hostname: ${DOMAIN}
        service: ${service_url}
      - service: http_status:404

## 5. Route DNS

    cloudflared tunnel route dns hexblock ${DOMAIN}

## 6. Run as a service

    sudo cloudflared service install
    sudo systemctl enable --now cloudflared

## Verify

    curl -I https://${DOMAIN}/health

CF
    success "proxy/cloudflare-tunnel.setup.md written."
}

# ═════════════════════════════════════════════════════════════
# Update dnsmasq upstream
# ═════════════════════════════════════════════════════════════
DNSMASQ_CONF="$INSTALL_DIR/dns/dnsmasq.conf"
if [[ -f "$DNSMASQ_CONF" ]]; then
    info "Setting upstream DNS to ${UPSTREAM_DNS}..."
    sed -i "s|^server=.*|server=${UPSTREAM_DNS}|g" "$DNSMASQ_CONF"
    success "dnsmasq.conf updated."
fi

# ═════════════════════════════════════════════════════════════
# Data directories
# ═════════════════════════════════════════════════════════════
info "Creating data directories..."
mkdir -p "$DATA_DIR/db" "$DATA_DIR/blocklists" "$DATA_DIR/logs"
chown -R 1000:1000 "$DATA_DIR" 2>/dev/null || true

# ═════════════════════════════════════════════════════════════
# Build and start
# ═════════════════════════════════════════════════════════════
echo ""
divider
bold "  Starting HexBlock"
divider
echo ""

if ask_yn "Build and start now?" "y"; then
    info "Building containers..."
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_OVERRIDE" build --no-cache

    info "Starting containers..."
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_OVERRIDE" up -d

    echo -ne "${CYAN}  Waiting for HexBlock..."
    READY=0
    for i in $(seq 1 24); do
        if curl -sf http://127.0.0.1:8080/health >/dev/null 2>&1 || \
           curl -sf http://"${LAN_IP}":8080/health >/dev/null 2>&1; then
            READY=1; break
        fi
        echo -n "."; sleep 2
    done
    echo ""

    if [[ "$READY" -eq 0 ]]; then
        warn "Health check timed out. Check logs:"
        echo "    docker compose -f docker-compose.yml -f docker-compose.override.yml logs hexblock"
    else
        success "HexBlock is running."
    fi
else
    echo ""
    info "To start manually:"
    echo "    docker compose -f docker-compose.yml -f docker-compose.override.yml up -d"
fi

# ═════════════════════════════════════════════════════════════
# ═════════════════════════════════════════════════════════════
# Final output — numbered next steps specific to deployment mode
# ═════════════════════════════════════════════════════════════

# Detect LAN IP for display in all modes
_DISPLAY_IP="${LAN_IP:-$(hostname -I 2>/dev/null | awk '{print $1}')}"

echo ""
echo ""
divider
bold "  HexBlock is running — what to do next"
divider
echo ""

STEP=1

# ── Step: open the dashboard and complete setup wizard ───────
case "$PROXY_IDX" in
    1)
        echo -e "  ${BOLD}${STEP}.${NC} Open the dashboard and create your account"
        echo ""
        echo -e "     ${CYAN}http://${LAN_IP}:8080${NC}"
        if [[ -n "$LOCAL_HOSTNAME" ]]; then
            echo -e "     ${CYAN}http://${LOCAL_HOSTNAME}${NC}  ${DIM}(once DNS is pointed at this server)${NC}"
        fi
        ;;
    2|3)
        echo -e "  ${BOLD}${STEP}.${NC} Open the dashboard and create your account"
        echo ""
        echo -e "     ${CYAN}https://${DOMAIN}${NC}"
        dim "     SSL certificate will be obtained automatically on first visit."
        ;;
    4)
        echo -e "  ${BOLD}${STEP}.${NC} Finish the Nginx setup, then open the dashboard"
        echo ""
        echo "     Run these commands on this server:"
        echo ""
        echo -e "     ${DIM}sudo apt install nginx certbot python3-certbot-nginx${NC}"
        echo -e "     ${DIM}sudo certbot --nginx -d ${DOMAIN}${NC}"
        echo -e "     ${DIM}sudo cp proxy/nginx.generated.conf /etc/nginx/sites-available/hexblock${NC}"
        echo -e "     ${DIM}sudo ln -s /etc/nginx/sites-available/hexblock /etc/nginx/sites-enabled/${NC}"
        echo -e "     ${DIM}sudo nginx -t && sudo systemctl reload nginx${NC}"
        echo ""
        echo -e "     Then open: ${CYAN}https://${DOMAIN}${NC}"
        ;;
    5|6)
        echo -e "  ${BOLD}${STEP}.${NC} Configure the Cloudflare Tunnel, then open the dashboard"
        echo ""
        echo "     Full instructions have been written to:"
        echo -e "     ${CYAN}proxy/cloudflare-tunnel.setup.md${NC}"
        echo ""
        echo "     Short version:"
        echo -e "     ${DIM}sudo apt install cloudflared${NC}"
        echo -e "     ${DIM}cloudflared tunnel login${NC}"
        echo -e "     ${DIM}cloudflared tunnel create hexblock${NC}"
        echo -e "     ${DIM}# edit ~/.cloudflared/config.yml — see the instructions file${NC}"
        echo -e "     ${DIM}cloudflared tunnel route dns hexblock ${DOMAIN}${NC}"
        echo -e "     ${DIM}sudo cloudflared service install${NC}"
        echo -e "     ${DIM}sudo systemctl enable --now cloudflared${NC}"
        echo ""
        echo -e "     Then open: ${CYAN}https://${DOMAIN}${NC}"
        ;;
esac

echo ""
STEP=$(( STEP + 1 ))

# ── Step: static IP warning if not set ───────────────────────
if [[ "$PROXY_IDX" -eq 1 && "$SET_STATIC" == false ]]; then
    echo -e "  ${BOLD}${STEP}.${NC} Fix the server IP so it never changes"
    echo ""
    warn "     The server currently gets its IP from DHCP."
    warn "     If it changes, DNS filtering stops working for every device."
    echo ""
    echo "     Choose one of:"
    echo -e "     ${DIM}a) Log into your router and set a DHCP reservation for ${_DISPLAY_IP}${NC}"
    echo -e "     ${DIM}b) Re-run this script and choose to set a static IP${NC}"
    echo ""
    STEP=$(( STEP + 1 ))
fi

# ── Step: point devices at HexBlock for DNS ──────────────────
echo -e "  ${BOLD}${STEP}.${NC} Point your devices at HexBlock for DNS filtering"
echo ""
echo "     Every device needs to use this server as its DNS server."
echo "     The easiest way is to set it once in your router:"
echo ""
echo "     Log into your router admin panel and find DHCP settings."
echo -e "     Set the DNS server to: ${CYAN}${_DISPLAY_IP}${NC}"
echo "     Devices will pick it up automatically when they renew their lease,"
echo "     or you can reconnect them now to apply it immediately."
echo ""
echo "     Alternatively, set DNS manually on each device:"
echo -e "     ${DIM}iPhone/iPad:  Settings > Wi-Fi > your network > Configure DNS > Manual${NC}"
echo -e "     ${DIM}Android:      Settings > Network > Wi-Fi > your network > Advanced > DNS${NC}"
echo -e "     ${DIM}Windows:      Network Adapter Settings > IPv4 Properties > DNS${NC}"
echo -e "     ${DIM}macOS:        System Settings > Network > your network > DNS${NC}"
echo ""
STEP=$(( STEP + 1 ))

# ── Step: VPN setup ───────────────────────────────────────────
if [[ "$ENABLE_WG" == true ]]; then
    echo -e "  ${BOLD}${STEP}.${NC} Connect devices to the VPN  ${DIM}(optional — encrypts traffic away from home)${NC}"
    echo ""
    echo "     From the dashboard, go to VPN and add each device."
    echo "     Scan the QR code with the WireGuard app to connect."
    echo ""
    echo "     WireGuard app:"
    echo -e "     ${DIM}iOS / macOS:  https://apps.apple.com/app/wireguard/id1451685025${NC}"
    echo -e "     ${DIM}Android:      https://play.google.com/store/apps/details?id=com.wireguard.android${NC}"
    echo -e "     ${DIM}Windows:      https://download.wireguard.com/windows-client/${NC}"
    echo ""
    STEP=$(( STEP + 1 ))
fi

# ── Step: verify it is working ────────────────────────────────
echo -e "  ${BOLD}${STEP}.${NC} Verify DNS filtering is working"
echo ""
echo "     After pointing a device at HexBlock, visit:"
echo -e "     ${CYAN}https://ads-blocker.com/testing/${NC}"
echo "     or check the Query Log in the dashboard — blocked requests"
echo "     appear in red within seconds of browsing."
echo ""
STEP=$(( STEP + 1 ))

# ── Reference commands ────────────────────────────────────────
divider
bold "  Reference"
divider
echo ""
echo -e "  Server IP:   ${CYAN}${_DISPLAY_IP}${NC}"
[[ -n "$DOMAIN" ]] && echo -e "  Domain:      ${CYAN}${DOMAIN}${NC}"
[[ -n "$LOCAL_HOSTNAME" ]] && echo -e "  Local name:  ${CYAN}${LOCAL_HOSTNAME}${NC}"
echo ""
echo "  Logs:    docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f"
echo "  Stop:    docker compose -f docker-compose.yml -f docker-compose.override.yml down"
echo "  Update:  sudo bash scripts/update.sh"
echo "  Reconfigure: sudo bash scripts/setup.sh"
echo ""
