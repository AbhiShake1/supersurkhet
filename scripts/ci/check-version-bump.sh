#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <path-to-package.json>" >&2
  exit 2
fi

PACKAGE_JSON_PATH="$1"

if [[ ! -f "$PACKAGE_JSON_PATH" ]]; then
  echo "Package file not found: $PACKAGE_JSON_PATH" >&2
  exit 2
fi

current_version="$(node -p "require('./${PACKAGE_JSON_PATH}').version")"

if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  echo "version_changed=true"
  echo "current_version=$current_version"
  echo "previous_version="
  exit 0
fi

if ! git cat-file -e "HEAD^:${PACKAGE_JSON_PATH}" 2>/dev/null; then
  echo "version_changed=true"
  echo "current_version=$current_version"
  echo "previous_version="
  exit 0
fi

previous_version="$(git show "HEAD^:${PACKAGE_JSON_PATH}" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")"

if [[ "$current_version" == "$previous_version" ]]; then
  echo "version_changed=false"
else
  echo "version_changed=true"
fi

echo "current_version=$current_version"
echo "previous_version=$previous_version"
