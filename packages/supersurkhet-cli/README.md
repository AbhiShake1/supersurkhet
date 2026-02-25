# @supersurkhet/cli

CLI for Supersurkhet plugin development.

## Commands

- `supersurkhet new <name>`: scaffold a new plugin project
- `supersurkhet types --config <file> --out <file>`: generate TS row types from schema docs
- `supersurkhet link --project <id> --endpoint <url> --token <token>`: connect local dir to remote project
- `supersurkhet token issue --name <name>`: issue a new CLI token for the current user/project
- `supersurkhet token list`: list CLI tokens for the current user/project
- `supersurkhet token rotate --token-id <id> [--name <name>]`: rotate an existing CLI token
- `supersurkhet token revoke --token-id <id>`: revoke an existing CLI token
- `supersurkhet sync-up --config <file>`: push schema docs to the linked remote project
- `supersurkhet sync-down --config <file> --out <file>`: pull latest schema docs from the linked remote project

## Install

```bash
npm i -D @supersurkhet/cli @supersurkhet/sdk
```

## Auth

Token resolution order:

1. `--token`
2. `SUPERSURKHET_TOKEN` env var
3. `~/.supersurkhet/credentials.json` (saved by `link`)

## Use

```bash
npx supersurkhet --help
```
