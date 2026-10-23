#!/bin/bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_dir"
npm ci
npm run build
if command -v cargo; then
  cargo build --release
else
  "$HOME/.cargo/bin/cargo" build --release
fi
