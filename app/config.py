"""
HexBlock configuration.
All settings are loaded from environment variables or a .env file.
Never hardcode secrets in this file.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):

    # Runtime environment
    env: str = Field("production", alias="HEXBLOCK_ENV")

    # Data paths (mapped as Docker volumes)
    db_path: str       = Field("/data/db/hexblock.db", alias="DB_PATH")
    blocklist_dir: str = Field("/data/blocklists",     alias="BLOCKLIST_DIR")
    log_dir: str       = Field("/data/logs",           alias="LOG_DIR")

    # Application
    app_host: str        = Field("0.0.0.0", alias="APP_HOST")
    app_port: int        = Field(8080,       alias="APP_PORT")
    secret_key: str      = Field("",         alias="SECRET_KEY")
    session_lifetime: int = Field(3600,      alias="SESSION_LIFETIME")

    # Reverse proxy
    # TRUST_PROXY=1  — trust X-Forwarded-* from any upstream proxy
    # TRUST_CLOUDFLARE=1 — trust CF-Connecting-IP only from Cloudflare IP ranges
    trust_proxy: bool      = Field(False, alias="TRUST_PROXY")
    trust_cloudflare: bool = Field(False, alias="TRUST_CLOUDFLARE")

    # Allowed hostnames — comma-separated list or * for any
    # Set to your domain when running behind a reverse proxy
    # Example: hexblock.example.com,hexblock.local
    allowed_hosts: str = Field("*", alias="ALLOWED_HOSTS")

    # Sub-path prefix for serving under a path rather than domain root
    # Example: ROOT_PATH=/hexblock
    # Leave blank for root deployments
    root_path: str = Field("", alias="ROOT_PATH")

    # DNS
    dnsmasq_hosts_file: str = Field(
        "/etc/dnsmasq.d/hexblock.hosts", alias="DNSMASQ_HOSTS_FILE"
    )
    dnsmasq_reload_cmd: str = Field(
        "docker exec hexblock-dns killall -HUP dnsmasq", alias="DNSMASQ_RELOAD_CMD"
    )

    # WireGuard
    wg_config_dir: str = Field("/etc/wireguard", alias="WG_CONFIG_DIR")
    wg_interface: str  = Field("wg0",            alias="WG_INTERFACE")
    wg_port: int       = Field(51820,            alias="WG_PORT")
    wg_subnet: str     = Field("10.13.13.0/24",  alias="WG_SUBNET")

    # Security
    max_login_attempts: int = Field(5,   alias="MAX_LOGIN_ATTEMPTS")
    lockout_seconds: int    = Field(300, alias="LOCKOUT_SECONDS")

    # Scheduler
    auto_update_hour: int = Field(3, alias="AUTO_UPDATE_HOUR")

    model_config = {
        "env_file": ".env",
        "populate_by_name": True,
    }


settings = Settings()
