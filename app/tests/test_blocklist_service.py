"""
Unit tests for BlocklistService.parse_hosts_content.
These run without Docker, database, or network access.
"""

import pytest
from services.blocklist_service import BlocklistService


class TestParseHostsContent:

    def test_hosts_format_zero(self):
        text = "0.0.0.0 ads.example.com\n0.0.0.0 tracker.example.com\n"
        result = BlocklistService.parse_hosts_content(text)
        assert "ads.example.com" in result
        assert "tracker.example.com" in result

    def test_hosts_format_loopback(self):
        text = "127.0.0.1 ads.example.com\n"
        result = BlocklistService.parse_hosts_content(text)
        assert "ads.example.com" in result

    def test_plain_domain_list(self):
        text = "ads.example.com\ntracker.example.com\n"
        result = BlocklistService.parse_hosts_content(text)
        assert "ads.example.com" in result
        assert "tracker.example.com" in result

    def test_comments_ignored(self):
        text = "# This is a comment\n0.0.0.0 ads.example.com\n"
        result = BlocklistService.parse_hosts_content(text)
        assert len(result) == 1
        assert "ads.example.com" in result

    def test_blank_lines_ignored(self):
        text = "\n\nads.example.com\n\n"
        result = BlocklistService.parse_hosts_content(text)
        assert result == ["ads.example.com"]

    def test_localhost_excluded(self):
        text = "127.0.0.1 localhost\n0.0.0.0 localhost\n"
        result = BlocklistService.parse_hosts_content(text)
        assert "localhost" not in result

    def test_broadcasthost_excluded(self):
        text = "255.255.255.255 broadcasthost\n"
        result = BlocklistService.parse_hosts_content(text)
        assert "broadcasthost" not in result

    def test_deduplication(self):
        text = "ads.example.com\nads.example.com\n0.0.0.0 ads.example.com\n"
        result = BlocklistService.parse_hosts_content(text)
        assert result.count("ads.example.com") == 1

    def test_lowercased(self):
        text = "ADS.EXAMPLE.COM\n"
        result = BlocklistService.parse_hosts_content(text)
        assert "ads.example.com" in result
        assert "ADS.EXAMPLE.COM" not in result

    def test_invalid_lines_ignored(self):
        text = "not a domain\n!!invalid\n192.168.1.1\nads.example.com\n"
        result = BlocklistService.parse_hosts_content(text)
        assert result == ["ads.example.com"]

    def test_empty_input(self):
        assert BlocklistService.parse_hosts_content("") == []

    def test_mixed_format(self):
        text = (
            "# StevenBlack unified hosts\n"
            "127.0.0.1 localhost\n"
            "0.0.0.0 ads.doubleclick.net\n"
            "0.0.0.0 googleadservices.com\n"
            "plain-domain-list.example.com\n"
        )
        result = BlocklistService.parse_hosts_content(text)
        assert "ads.doubleclick.net" in result
        assert "googleadservices.com" in result
        assert "plain-domain-list.example.com" in result
        assert "localhost" not in result


class TestParseOrdering:

    def test_order_preserved(self):
        domains = ["aaa.example.com", "bbb.example.com", "ccc.example.com"]
        text = "\n".join(domains)
        result = BlocklistService.parse_hosts_content(text)
        assert result == domains
