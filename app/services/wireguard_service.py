"""
HexBlock WireGuard service.
Handles server config generation, peer creation, and QR code output.
"""

import base64
import io
import logging
import os
import subprocess
from pathlib import Path

import aiosqlite
import qrcode

from config import settings

logger = logging.getLogger("hexblock.wireguard")

WG_DIR = Path(settings.wg_config_dir)


class WireGuardService:

    @staticmethod
    def _wg(*args) -> str:
        result = subprocess.run(
            ["wg"] + list(args),
            capture_output=True, text=True, timeout=10,
        )
        return result.stdout.strip()

    @staticmethod
    def generate_keypair() -> tuple[str, str]:
        """Returns (private_key, public_key)."""
        private = WireGuardService._wg("genkey")
        public  = subprocess.run(
            ["wg", "pubkey"],
            input=private, capture_output=True, text=True,
        ).stdout.strip()
        return private, public

    @staticmethod
    async def ensure_server_config():
        """Generate server config if it does not already exist."""
        conf_path = WG_DIR / "wg0.conf"
        if conf_path.exists():
            return

        private_key, public_key = WireGuardService.generate_keypair()

        async with aiosqlite.connect(settings.db_path) as db:
            await db.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('wg_server_public_key', ?)",
                (public_key,),
            )
            await db.commit()

        conf = f"""[Interface]
PrivateKey = {private_key}
Address = {settings.wg_subnet.replace('0/24', '1/24')}
ListenPort = {settings.wg_port}
DNS = 172.20.0.2

PostUp   = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
"""
        conf_path.parent.mkdir(parents=True, exist_ok=True)
        conf_path.write_text(conf)
        logger.info("WireGuard server config generated")

    @staticmethod
    async def add_peer(device_name: str) -> dict:
        """
        Generate a new WireGuard peer config for a device.
        Returns peer config dict including QR code as base64 PNG.
        """
        private_key, public_key = WireGuardService.generate_keypair()

        # Assign next available IP in the subnet
        async with aiosqlite.connect(settings.db_path) as db:
            cur = await db.execute(
                "SELECT COUNT(*) FROM devices WHERE wg_public_key IS NOT NULL"
            )
            row    = await cur.fetchone()
            offset = (row[0] or 0) + 2  # server is .1, clients start at .2

            cur2 = await db.execute(
                "SELECT value FROM settings WHERE key = 'wg_server_public_key'"
            )
            srv_row    = await cur2.fetchone()
            server_pub = srv_row[0] if srv_row else ""

            cur3 = await db.execute(
                "SELECT value FROM settings WHERE key = 'hostname'"
            )
            host_row = await cur3.fetchone()
            hostname  = host_row[0] if host_row else "hexblock.local"

        subnet_base = settings.wg_subnet.rsplit(".", 1)[0]
        peer_ip     = f"{subnet_base}.{offset}/32"

        peer_conf = f"""[Interface]
PrivateKey = {private_key}
Address = {peer_ip}
DNS        = {subnet_base}.1

[Peer]
PublicKey = {server_pub}
Endpoint = {hostname}:{settings.wg_port}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
"""
        # Generate QR code
        qr  = qrcode.QRCode(box_size=6, border=2)
        qr.add_data(peer_conf)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()

        # Append peer to server config
        pub_fragment = f"""
[Peer]
# {device_name}
PublicKey = {public_key}
AllowedIPs = {peer_ip.replace('/32', '/32')}
"""
        conf_path = WG_DIR / "wg0.conf"
        if conf_path.exists():
            with open(conf_path, "a") as f:
                f.write(pub_fragment)

        return {
            "config":     peer_conf,
            "public_key": public_key,
            "assigned_ip": peer_ip.split("/")[0],
            "qr_b64":     qr_b64,
        }

    @staticmethod
    async def remove_peer(public_key: str) -> bool:
        """
        Remove a WireGuard peer by public key.
        Removes from the running interface and from wg0.conf.
        Returns True on success.
        """
        if not public_key:
            return False

        # Remove from running WireGuard interface
        try:
            subprocess.run(
                ["wg", "set", settings.wg_interface, "peer", public_key, "remove"],
                capture_output=True, timeout=10, check=True,
            )
        except subprocess.CalledProcessError as e:
            logger.warning("Failed to remove peer from interface: %s", e)

        # Remove peer block from wg0.conf
        conf_path = WG_DIR / "wg0.conf"
        if conf_path.exists():
            lines  = conf_path.read_text().splitlines(keepends=True)
            output = []
            skip   = False
            for line in lines:
                if line.strip() == "[Peer]":
                    # Peek ahead to see if this block contains our key
                    skip = False
                    output.append(line)
                    continue
                if skip:
                    continue
                if "PublicKey" in line and public_key in line:
                    # Remove the [Peer] line we just added and skip until next section
                    output = [l for l in output if l.strip() != "[Peer]"]
                    skip = True
                    continue
                if line.strip().startswith("[") and line.strip() != "[Peer]":
                    skip = False
                output.append(line)
            conf_path.write_text("".join(output))
            logger.info("Peer %s...%s removed from wg0.conf",
                        public_key[:8], public_key[-8:])

        return True

    @staticmethod
    async def get_status() -> dict:
        """Return basic WireGuard interface status."""
        try:
            output = WireGuardService._wg("show", settings.wg_interface)
            return {"running": bool(output), "raw": output}
        except Exception:
            return {"running": False, "raw": ""}
