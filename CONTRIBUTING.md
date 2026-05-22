# Contributing to HexBlock

Pull requests are welcome. Please read this before opening one.

## Before you start

Open an issue first for anything beyond small fixes — a typo, a broken
link, a one-line bug. For anything larger, discuss it in an issue before
writing code. This prevents wasted effort on changes that will not be merged.

## Development setup

```bash
git clone https://github.com/happygream/hexblock
cd hexblock

# Copy the example env
cp .env.example .env

# Edit .env and set a SECRET_KEY (any random string works for dev)
# Set HEXBLOCK_ENV=development

# Start in development mode
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

The app reloads automatically when Python files change in development mode.

## Running tests

```bash
cd app
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

There is no CI configured yet. Tests must pass locally before a PR is opened.

## Code style

- Python: `ruff` for linting, `black` for formatting
- Shell scripts: `shellcheck` for linting
- No type: ignore comments without an explanation

Run before committing:

```bash
ruff check app/
black app/
shellcheck scripts/*.sh
```

## Adding or updating translations

Translation strings live in `app/static/js/i18n.js`. The file contains a
`TRANSLATIONS` object with one entry per supported language.

To add a new language:

1. Add a new entry to `TRANSLATIONS` using an existing language as a template
2. Translate all ~90 keys — do not leave any as English unless the term has
   no translation (e.g. WireGuard, dnsmasq)
3. Add the locale code to the `SUPPORTED` array near the top of the file
4. Add the language name to `LANGUAGE_NAMES`

To fix an incorrect translation, edit the relevant string in the correct
language object in `TRANSLATIONS`. Missing keys fall back to English
automatically so a partial translation will not break the UI.

Technical terms that should not be translated: WireGuard, dnsmasq, Docker,
TOTP, DNS, VPN, HTTPS, SHA-256, QR code.

## Pull request checklist

- [ ] Changes are limited to the scope described in the linked issue
- [ ] Tests cover the changed code where applicable
- [ ] `ruff`, `black`, and `shellcheck` pass
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`
- [ ] No `.env` file or secrets in the diff

## Commit messages

Plain English. Capitalised first word. No full stop at the end.

Good: `Fix dnsmasq reload failing when blocklist dir is empty`
Bad:  `fixed bug`, `WIP`, `various fixes`

## Security issues

Do not open a public issue for security vulnerabilities.
See `SECURITY.md` for the disclosure process.
