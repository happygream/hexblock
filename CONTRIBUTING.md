# Contributing to HexBlock

Pull requests are welcome. Please read this before opening one.

## Before you start

Open an issue first for anything beyond small fixes — a typo, a broken
link, a one-line bug. For anything larger, discuss it in an issue before
writing code. This prevents wasted effort on changes that will not be merged.

## Development setup

```bash
git clone https://github.com/hexblock/hexblock
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
