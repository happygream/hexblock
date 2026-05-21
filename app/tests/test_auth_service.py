"""
Unit tests for AuthService — password hashing and validation.
These run without Docker or database access.
"""

import pytest
from passlib.context import CryptContext

# Test the hashing scheme directly without needing the full service
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,
    argon2__time_cost=3,
    argon2__parallelism=2,
)


class TestPasswordHashing:

    def test_hash_is_not_plaintext(self):
        h = pwd_context.hash("correcthorsebatterystaple")
        assert h != "correcthorsebatterystaple"

    def test_verify_correct_password(self):
        h = pwd_context.hash("correcthorsebatterystaple")
        assert pwd_context.verify("correcthorsebatterystaple", h)

    def test_verify_wrong_password(self):
        h = pwd_context.hash("correcthorsebatterystaple")
        assert not pwd_context.verify("wrongpassword", h)

    def test_two_hashes_of_same_password_differ(self):
        # Argon2 uses a random salt — same input produces different hashes
        h1 = pwd_context.hash("samepassword")
        h2 = pwd_context.hash("samepassword")
        assert h1 != h2

    def test_hash_starts_with_argon2(self):
        h = pwd_context.hash("anypassword")
        assert h.startswith("$argon2")

    def test_empty_password_hashes(self):
        # Empty strings should hash — validation happens at the API layer
        h = pwd_context.hash("")
        assert pwd_context.verify("", h)
