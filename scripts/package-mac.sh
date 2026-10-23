#!/bin/bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$project_dir"
app="dist/Banking Studio.app"
mkdir -p "$HOME/Library/Application Support/Banking Studio Demo/brand"
for weight in 300 400 700; do
  if [[ -f ".local/brand/$weight.woff2" ]]; then
    cp ".local/brand/$weight.woff2" "$HOME/Library/Application Support/Banking Studio Demo/brand/$weight.woff2"
  fi
done
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp target/release/banking-studio "$app/Contents/Resources/banking-studio"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleExecutable</key><string>Banking Studio</string><key>CFBundleIdentifier</key><string>local.finalfrontier.banking-studio-demo</string><key>CFBundleName</key><string>Banking Studio</string><key>CFBundleVersion</key><string>0.2.0</string><key>LSUIElement</key><true/></dict></plist>
PLIST
cat > "$app/Contents/MacOS/Banking Studio" <<'LAUNCHER'
#!/bin/bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export BANKING_STUDIO_LOCAL_AGENT=1
export BANKING_STUDIO_EXTERNAL_CONNECTIONS=0
export BANKING_STUDIO_DATA_DIR="$HOME/Library/Application Support/Banking Studio Demo"
export BANKING_STUDIO_BRAND_DIR="$BANKING_STUDIO_DATA_DIR/brand"
mkdir -p "$BANKING_STUDIO_DATA_DIR"
if /usr/bin/curl --silent --fail http://localhost:4173/api/bootstrap >/dev/null; then
  /usr/bin/open http://localhost:4173
  exit 0
fi
contents="$(cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$BANKING_STUDIO_DATA_DIR"
exec "$contents/Resources/banking-studio" --open >> studio.log 2>&1
LAUNCHER
chmod +x "$app/Contents/MacOS/Banking Studio" "$app/Contents/Resources/banking-studio"
echo "Created $app (local unsigned Apple Silicon launcher; opens your browser)."
