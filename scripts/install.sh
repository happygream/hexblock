#!/usr/bin/env bash
# HexBlock installer
# Installs Docker if needed, clones the repo, then hands off to setup.sh
#
# Usage: curl -fsSL https://hexblock.co.uk/install.sh | sudo bash
# Or:    sudo bash install.sh

set -euo pipefail

REPO="https://github.com/happygream/hexblock"
INSTALL_DIR="/opt/hexblock"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}${*}${NC}"; }
success() { echo -e "${GREEN}${*}${NC}"; }
error()   { echo -e "${RED}${*}${NC}"; }
die()     { error "Error: ${*}"; exit 1; }

echo ""
echo -e "${BOLD}HexBlock — Installer${NC}"
echo "--------------------"
echo ""

[[ "$EUID" -eq 0 ]] || die "Please run as root: sudo bash install.sh"

# ── Install Docker if missing ─────────────────────────────────
if ! command -v docker &>/dev/null; then
    info "Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    success "Docker installed."
fi

if ! docker compose version &>/dev/null; then
    die "Docker Compose v2 is required but could not be found after Docker install. Install it manually and re-run."
fi

# ── Clone or update ───────────────────────────────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Updating existing clone..."
    cd "$INSTALL_DIR" && git pull --ff-only
else
    info "Cloning HexBlock to $INSTALL_DIR..."
    git clone "$REPO" "$INSTALL_DIR"
fi

# ── Hand off to setup.sh ──────────────────────────────────────
echo ""
info "Running setup..."
exec bash "$INSTALL_DIR/scripts/setup.sh"
