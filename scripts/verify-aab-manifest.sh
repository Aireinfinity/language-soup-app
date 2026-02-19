#!/usr/bin/env bash
# Verify the built AAB does NOT declare READ_MEDIA_IMAGES or READ_MEDIA_VIDEO
# (Google Play Photo and Video Permissions policy).
# Usage: ./scripts/verify-aab-manifest.sh path/to/your.app.aab
# Requires: bundletool (install from https://github.com/google/bundletool/releases)

set -e
AAB="${1:?Usage: $0 path/to/app.aab}"

if ! command -v bundletool >/dev/null 2>&1; then
  echo "bundletool not found. Install from https://github.com/google/bundletool/releases"
  echo "Or use: brew install bundletool (if available)"
  exit 1
fi

echo "Dumping merged manifest from: $AAB"
MANIFEST=$(mktemp)
bundletool dump manifest --bundle "$AAB" > "$MANIFEST"

if grep -q "READ_MEDIA_IMAGES\|READ_MEDIA_VIDEO" "$MANIFEST"; then
  echo "FAIL: AAB still contains READ_MEDIA_IMAGES or READ_MEDIA_VIDEO. Do not submit."
  grep "READ_MEDIA" "$MANIFEST" || true
  rm -f "$MANIFEST"
  exit 1
fi

echo "OK: No READ_MEDIA_IMAGES or READ_MEDIA_VIDEO in merged manifest. Safe to submit."
rm -f "$MANIFEST"
exit 0
