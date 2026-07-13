#!/usr/bin/env bash
# Package the Aspirely extension into a loadable/uploadable zip.
#
# This is NOT a build step — the extension is plain MV3 (no bundler, no transpile).
# It just zips the static files, excluding dev/packaging cruft. The unpacked folder
# is equally installable via chrome://extensions → Load unpacked.
#
# Usage:  cd extension && ./package.sh          → dist/aspirely-extension-<version>.zip
# Windows (PowerShell, no bash):
#   Compress-Archive -Path (Get-ChildItem -Exclude dist,package.sh,*.md) -DestinationPath dist\aspirely-extension.zip
set -euo pipefail
cd "$(dirname "$0")"

VERSION="$(node -e "process.stdout.write(require('./manifest.json').version)")"
OUT="dist/aspirely-extension-${VERSION}.zip"
mkdir -p dist
rm -f "$OUT"

# Everything the extension needs at runtime, nothing else.
zip -r -X "$OUT" \
  manifest.json config.js background.js content.js content.css \
  popup.html popup.js tokensync.js \
  adapters lib icons \
  -x '*/.DS_Store' >/dev/null

echo "Packaged → $OUT"
