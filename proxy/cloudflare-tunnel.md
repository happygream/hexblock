# HexBlock — Cloudflare Tunnel setup

Cloudflare Tunnel lets you expose HexBlock to the internet without opening
any inbound ports on your server. The `cloudflared` daemon on your server
creates an outbound connection to Cloudflare's edge. All traffic arrives
through that tunnel.

## How it differs from a traditional reverse proxy

With Nginx or Caddy you open ports 80 and 443 on your firewall and terminate
TLS on the server. With Cloudflare Tunnel:

- No inbound ports need to be open on your server or router
- TLS is terminated at Cloudflare's edge
- Traffic arrives at `cloudflared` already decrypted
- The real client IP arrives in the `CF-Connecting-IP` header
- The scheme arrives in the `CF-Visitor` header

HexBlock validates that `CF-Connecting-IP` headers only come from Cloudflare's
published IP ranges before trusting them. This prevents header spoofing from
non-Cloudflare sources.

## Prerequisites

- A Cloudflare account (free tier works)
- A domain managed by Cloudflare DNS
- HexBlock running and healthy on your server

## Step 1 — Install cloudflared

Ubuntu / Debian:

```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
    https://pkg.cloudflare.com/cloudflared any main" \
    | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update && sudo apt install cloudflared
```

## Step 2 — Authenticate cloudflared

```bash
cloudflared tunnel login
```

This opens a browser window. Select the domain you want to use.
A certificate is saved to `~/.cloudflared/cert.pem`.

## Step 3 — Create a tunnel

```bash
cloudflared tunnel create hexblock
```

Note the tunnel UUID printed in the output. You will use it in the config.

## Step 4 — Create the cloudflared config

```bash
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: YOUR-TUNNEL-UUID
credentials-file: /root/.cloudflared/YOUR-TUNNEL-UUID.json

ingress:
  - hostname: hexblock.example.com
    service: http://localhost:8080
  - service: http_status:404
EOF
```

Replace `YOUR-TUNNEL-UUID` with your actual tunnel UUID and
`hexblock.example.com` with your domain.

## Step 5 — Route DNS to the tunnel

```bash
cloudflared tunnel route dns hexblock hexblock.example.com
```

This creates a CNAME record in Cloudflare DNS pointing your subdomain
at the tunnel. No A record or IP address is exposed.

## Step 6 — Configure HexBlock

Add these lines to your `/opt/hexblock/.env`:

```
TRUST_CLOUDFLARE=1
ALLOWED_HOSTS=hexblock.example.com
```

`TRUST_CLOUDFLARE=1` tells HexBlock to fetch Cloudflare's published IP
ranges at startup and only trust `CF-Connecting-IP` headers from those
ranges. Any request claiming to carry that header from a non-Cloudflare
source will have it ignored.

Restart HexBlock after editing `.env`:

```bash
cd /opt/hexblock
docker compose restart hexblock
```

## Step 7 — Run cloudflared as a service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

## Verify

```bash
# Check cloudflared is running
systemctl status cloudflared

# Check HexBlock is reachable through the tunnel
curl -I https://hexblock.example.com/health
```

## Security notes

- Cloudflare's free tier provides DDoS protection and hides your server IP.
- Enable Cloudflare Access in the Cloudflare dashboard if you want an
  additional authentication layer in front of HexBlock (useful if HexBlock
  is accessible to the public internet rather than just your household).
- With TRUST_CLOUDFLARE=1, HexBlock re-fetches Cloudflare's IP ranges each
  time it starts. If the fetch fails, it falls back to a hardcoded list that
  is updated with each HexBlock release.
- Do not set both TRUST_PROXY=1 and TRUST_CLOUDFLARE=1. Use one or the other.
