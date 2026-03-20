#!/bin/bash
# Generate env.js from .env file
ENV_FILE="$(dirname "$0")/.env"
OUT_FILE="$(dirname "$0")/env.js"

echo "// Auto-generated from .env — do not edit directly" > "$OUT_FILE"
echo "window.ENV = {" >> "$OUT_FILE"

while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  echo "  $key: \"$value\"," >> "$OUT_FILE"
done < "$ENV_FILE"

echo "};" >> "$OUT_FILE"
