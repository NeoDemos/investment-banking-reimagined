#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export BANKING_STUDIO_LOCAL_AGENT=1
export BANKING_STUDIO_EXTERNAL_CONNECTIONS=0
project_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$project_dir"
if [[ ! -x target/release/banking-studio ]]; then
  echo "Build the local app first: cargo build --release"
  read -r -p "Press Enter to close."
  exit 1
fi
if curl --silent --fail http://localhost:4173/api/bootstrap >/dev/null; then
  open http://localhost:4173
  exit 0
fi
exec ./target/release/banking-studio --open
