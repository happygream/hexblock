#!/usr/bin/env bash
# HexBlock update script
# Pulls latest code and rebuilds the app container.
# DNS and WireGuard containers stay running throughout.
# Your data and .env are never touched.

set -euo pipefail

INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$INSTALL_DIR/docker-compose.yml"
COMPOSE_OVERRIDE="$INSTALL_DIR/docker-compose.override.yml"

[[ "$EUID" -eq 0 ]] || { echo "Please run as root: sudo bash scripts/update.sh"; exit 1; }

echo "HexBlock — updating..."

cd "$INSTALL_DIR"

git pull --ff-only

# Determine compose command based on whether override exists
if [[ -f "$COMPOSE_OVERRIDE" ]]; then
    COMPOSE_CMD="docker compose -f $COMPOSE_FILE -f $COMPOSE_OVERRIDE"
else
    COMPOSE_CMD="docker compose -f $COMPOSE_FILE"
fi

# Rebuild app container only
$COMPOSE_CMD build hexblock

# Restart app only — dns and wireguard keep running
$COMPOSE_CMD up -d --no-deps hexblock

echo ""
echo "Update complete."
$COMPOSE_CMD ps
