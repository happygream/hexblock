#!/bin/bash
# HexBlock update/restart script
# Always uses both compose files so the port binding is included

COMPOSE="sudo docker compose -f /opt/hexblock/docker-compose.yml -f /opt/hexblock/docker-compose.override.yml"

echo "Pulling latest images..."
$COMPOSE pull

echo "Restarting HexBlock..."
$COMPOSE up -d

echo "Done. HexBlock running at http://192.168.1.98:8080"
