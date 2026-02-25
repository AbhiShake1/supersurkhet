# @supersurkhet/cli

CLI for Supersurkhet plugin development.

## Commands

- `supersurkhet new <name>`: scaffold a new plugin project
- `supersurkhet types --config <file> --out <file>`: generate TS row types from schema docs
- `supersurkhet sync-up --config <file> [--store <file>]`: push local schema docs to file-backed relay store
- `supersurkhet sync-down --out <file> [--store <file>]`: pull latest schema docs from file-backed relay store
- `supersurkhet link --project <id> [--endpoint <url>]`: save local project connection metadata

## Install

```bash
npm i -D @supersurkhet/cli @supersurkhet/sdk
```

## Use

```bash
npx supersurkhet --help
```
