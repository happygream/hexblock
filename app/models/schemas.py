"""
HexBlock Pydantic schemas — request/response validation.
"""

from pydantic import BaseModel, field_validator
from typing import Optional
import re


# ── Auth ─────────────────────────────────────────────────────

class OnboardRequest(BaseModel):
    username:        str
    password:        str
    confirm_password: str
    hostname:        str = "hexblock.local"
    upstream_dns:    str = "1.1.1.1"
    timezone:        str = "Europe/London"
    vpn_mode:        str = "auto"

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError("Username may only contain letters, numbers, hyphens and underscores")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters")
        return v


# ── Blocklists ────────────────────────────────────────────────

class BlocklistCreate(BaseModel):
    name:       str
    category:   str
    source_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("category")
    @classmethod
    def category_valid(cls, v):
        valid = {"Ads", "Trackers", "Malware", "Social", "Telemetry", "Adult", "Custom"}
        if v not in valid:
            raise ValueError(f"Category must be one of: {', '.join(valid)}")
        return v


class BlocklistResponse(BaseModel):
    id:           int
    name:         str
    category:     str
    source_url:   Optional[str]
    source_type:  str
    domain_count: int
    enabled:      bool
    last_updated: Optional[str]
    created_at:   str


# ── Rules ─────────────────────────────────────────────────────

class RuleCreate(BaseModel):
    domain:    str
    rule_type: str
    note:      Optional[str] = None

    @field_validator("domain")
    @classmethod
    def domain_valid(cls, v):
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}$', v):
            raise ValueError("Invalid domain format")
        return v

    @field_validator("rule_type")
    @classmethod
    def type_valid(cls, v):
        if v not in ("allow", "deny"):
            raise ValueError("rule_type must be 'allow' or 'deny'")
        return v


# ── Devices ───────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    name:       str
    ip_address: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Device name is required")
        return v.strip()


# ── Settings ──────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    hostname:        Optional[str] = None
    upstream_dns:    Optional[str] = None
    timezone:        Optional[str] = None
    auto_update:     Optional[bool] = None
    log_queries:     Optional[bool] = None
    log_retention_days: Optional[int] = None
    safe_search:     Optional[bool] = None
    dns_over_https:  Optional[bool] = None
    session_timeout: Optional[int] = None


# ── Stats ─────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    queries_today:  int
    blocked_today:  int
    block_rate:     float
    devices_online: int
    devices_total:  int
    vpn_uptime:     str
    top_blocked:    list
