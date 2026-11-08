#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT
BUILD_DIR="$PROJECT_DIR/dist"
WEB_METADATA_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

/usr/bin/time -p npm ci --no-audit --no-fund
/usr/bin/time -p mkdir -p "$BUILD_DIR" "$WEB_METADATA_DIR"
/usr/bin/time -p cp index.html game.js style.css server.js "$BUILD_DIR/"
WEB_METADATA_DIR="$WEB_METADATA_DIR" /usr/bin/time -p node -e 'const fs=require("node:fs");const path=require("node:path");const project=process.cwd();const output={project,directory:path.resolve(project,"dist")};fs.writeFileSync(path.join(process.env.WEB_METADATA_DIR,"deployment-output.json"),JSON.stringify(output)+"\n")'
/usr/bin/time -p node --check "$BUILD_DIR/server.js"
exec /usr/bin/time -p node "$BUILD_DIR/server.js"
