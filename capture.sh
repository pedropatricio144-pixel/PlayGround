#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
CAPTURE_URL="${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
CAPTURE_DIR="${CAPTURE_DIR:?Set CAPTURE_DIR to an evidence directory outside the project}"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"

/usr/bin/time -p node -e 'const u=new URL(process.argv[1]);if(!["http:","https:"].includes(u.protocol))process.exit(1)' "$CAPTURE_URL"
case "$CAPTURE_DIR/" in
  "$PROJECT_DIR/"*) echo 'CAPTURE_DIR must be outside the project directory.' >&2; exit 1 ;;
esac
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
CAPTURE_URL="$CAPTURE_URL" \
CAPTURE_DIR="$CAPTURE_DIR" \
CAPTURE_READY_SELECTOR='#deploy-btn' \
CAPTURE_START_SELECTOR='#deploy-btn' \
CAPTURE_STRICT=1 \
/usr/bin/time -p node "$RUNTIME_DIR/scripts/default-capture.mjs"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-desktop.png"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-mobile.png"
