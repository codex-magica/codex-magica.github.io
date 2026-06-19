#!/bin/bash
# Prep stage for the MAGUS PDF -> Markdown pipeline.
# Deskews each page and runs Hungarian tesseract OCR to produce ground-truth prose.
# Vision agents consume these outputs later for layout + tables + merge.
#
# Usage:
#   prep.sh 1 2 14 199            # specific page indices (p-001, p-002, ...)
#   prep.sh --range 0 513         # inclusive range
# NOTE: intentionally NOT using `set -e`; one bad page must not abort the whole batch.
set -uo pipefail

ROOT="/Users/me/Projects/magus/source_material"
PAGES="$ROOT/pages"
OUT="$ROOT/build"
mkdir -p "$OUT/deskewed" "$OUT/ocr" "$OUT/md" "$OUT/crops"

# Build the list of indices
indices=()
if [ "${1:-}" = "--range" ]; then
  for ((i=$2; i<=$3; i++)); do indices+=("$i"); done
else
  indices=("$@")
fi

for idx in "${indices[@]}"; do
  p=$(printf "p-%03d" "$idx")
  src="$PAGES/$p.jpg"
  if [ ! -f "$src" ]; then echo "SKIP missing $src"; continue; fi
  desk="$OUT/deskewed/$p.png"
  # Skip if already prepped (lets us resume after an interruption).
  if [ -f "$OUT/ocr/$p.txt" ] && [ -f "$desk" ]; then echo "skip $p (done)"; continue; fi
  # 1) Orientation: some scanned pages are rotated 90/180/270. Detect with tesseract OSD.
  # OSD exits non-zero when unsure; tolerate it and default to 0.
  rot=$(tesseract "$src" - --psm 0 2>/dev/null | awk -F': ' '/Rotate:/{print $2}' || true)
  rot=${rot:-0}
  case "$rot" in ''|*[!0-9]*) rot=0 ;; esac
  # 2) Rotate upright, then deskew small residual tilt + mild grayscale normalize.
  if [ "$rot" != "0" ]; then
    magick "$src" -rotate "$rot" +repage -deskew 40% +repage -colorspace Gray -normalize "$desk"
    echo "  (p-$idx rotated ${rot}°)"
  else
    magick "$src" -deskew 40% +repage -colorspace Gray -normalize "$desk"
  fi
  # Tesseract Hungarian prose. psm 3 = full automatic page segmentation.
  tesseract "$desk" "$OUT/ocr/$p" -l hun --psm 3 >/dev/null 2>&1
  w=$(magick identify -format '%w' "$desk")
  h=$(magick identify -format '%h' "$desk")
  echo "prepped $p  (${w}x${h})"
done
