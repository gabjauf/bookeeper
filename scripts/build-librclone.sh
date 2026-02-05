#!/bin/bash
set -e

RCLONE_VERSION="v1.69.2"
RCLONE_SRC="/tmp/rclone-src"
OUTPUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/native"

mkdir -p "$OUTPUT_DIR"

# Clone rclone if not already present or if version changed
if [ -d "$RCLONE_SRC" ]; then
  CURRENT_TAG=$(cd "$RCLONE_SRC" && git describe --tags 2>/dev/null || echo "unknown")
  if [ "$CURRENT_TAG" != "$RCLONE_VERSION" ]; then
    echo "Removing stale rclone source (was $CURRENT_TAG, need $RCLONE_VERSION)..."
    rm -rf "$RCLONE_SRC"
  fi
fi

if [ ! -d "$RCLONE_SRC" ]; then
  echo "Cloning rclone $RCLONE_VERSION..."
  git clone --depth 1 --branch "$RCLONE_VERSION" \
    https://github.com/rclone/rclone.git "$RCLONE_SRC"
fi

cd "$RCLONE_SRC"

case "$(uname -s)" in
  Darwin)
    EXT="dylib"
    ;;
  Linux)
    EXT="so"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    EXT="dll"
    ;;
  *)
    echo "Unsupported platform: $(uname -s)"
    exit 1
    ;;
esac

OUTPUT_FILE="$OUTPUT_DIR/librclone.$EXT"

echo "Building librclone.$EXT for $(uname -s) $(uname -m)..."
go build --buildmode=c-shared \
  -o "$OUTPUT_FILE" \
  github.com/rclone/rclone/librclone

# Remove the generated header (we have our own types in rclone-bridge.ts)
rm -f "$OUTPUT_DIR/librclone.h"

echo "Built: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
