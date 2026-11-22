#!/bin/bash
# Builds the app-ready chapters in src/book/ (gitignored, not distributed) from the per-page
# Markdown in source_material/build/md. The app reads two of them, 01-bevezeto.md and
# 02-karakteralkotas.md (see src/book/README.md).
#
# Note: proofreading fixes made directly in src/book are not written back to the per-page files,
# so re-running this overwrites them. Back up src/book first.
#
# - drops front matter (cover/title/impresszum/foreword) and back matter
#   (character sheet, maps, TOC, bookstore ad)
# - skips trivial art/blank pages (their title is redundant with the chapter H1)
# - de-dupes consecutive identical headings (removes the "title twice" pattern)
set -uo pipefail
cd "$(dirname "$0")/../.."
SRC=source_material/build/md
OUT=src/book
mkdir -p "$OUT"
rm -f "$OUT"/[0-9]*.md  # chapters only; keeps src/book/README.md

# Pages to exclude entirely (front + back matter). 0-4 also covered by dropping ch.00.
is_excluded() { local p=$1; { (( p>=0 && p<=4 )) || (( p>=503 && p<=513 )); }; }

# "startPage|filename|Clean Title"  (chapter runs until the next start page)
chapters=(
  "5|01-bevezeto|Bevezető"
  "12|02-karakteralkotas|Karakteralkotás"
  "34|03-klanok-rendek-iskolak|Klánok, Rendek, Iskolák"
  "36|04-harcosok|Harcosok"
  "44|05-lovagok|Lovagok"
  "52|06-fejvadaszok|Fejvadászok"
  "60|07-tolvajok|A Tolvajok"
  "66|08-bardok|Bárdok"
  "74|09-harcmuveszek|Harcművészek"
  "82|10-papok|Papok"
  "94|11-paplovagok|Paplovagok"
  "104|12-boszorkanyok|Boszorkányok"
  "110|13-boszorkanymesterek|Boszorkánymesterek"
  "116|14-tuzvarazslok|Tűzvarázslók"
  "122|15-varazslo|Varázsló"
  "130|16-kepzettsegek|Képzettségek"
  "166|17-harcrendszer|Harcrendszer"
  "176|18-pszichologia|Pszichológia (Pszi)"
  "190|19-penz-felszereles|Pénz, felszerelés"
  "235|20-magiarendszer|Mágiarendszer"
  "240|21-bardmagia|Bárdmágia"
  "254|22-szakralis-magia|Szakrális Mágia"
  "286|23-boszorkanymagia|Boszorkánymágia"
  "314|24-boszorkanymesteri-magia|Boszorkánymesteri Mágia"
  "338|25-tuzmagia|Tűzmágia"
  "354|26-magasmagia|Magasmágia"
  "394|27-dragakomagia|Drágakőmágia"
  "402|28-kalandok-kontinense|Kalandok Kontinense"
  "458|29-istenek-es-egi-hatalmak|Istenek és égi hatalmak"
  "472|30-bestiarium|Bestiárium"
  "496|31-varazstargyak|Varázstárgyak"
)

# count body words (strip headings, html comments, blank lines)
bodywords() { sed -E 's/<!--.*-->//g; /^#/d; /^>/d' "$1" | tr -s ' \t\n' ' ' | wc -w | tr -d ' '; }

n=${#chapters[@]}
for ((i=0; i<n; i++)); do
  IFS='|' read -r start fname title <<< "${chapters[$i]}"
  if (( i+1 < n )); then IFS='|' read -r nstart _ _ <<< "${chapters[$((i+1))]}"; else nstart=514; fi
  out="$OUT/${fname}.md"
  { printf '# %s\n\n' "$title"; } > "$out"
  for ((p=start; p<nstart; p++)); do
    is_excluded "$p" && continue
    f=$SRC/$(printf p-%03d "$p").md
    [ -f "$f" ] || continue
    # skip trivial (art/blank/title-only) pages — their title duplicates the chapter H1
    [ "$(bodywords "$f")" -lt 8 ] && continue
    printf '<!-- page %d -->\n\n' "$p" >> "$out"
    cat "$f" >> "$out"
    printf '\n\n' >> "$out"
  done
  # Heading cleanup: drop title/consecutive duplicate headings; turn long colon-ended
  # "sentence headings" (skill-list lead-ins) into bold; demote stray extra H1 -> H2.
  awk '
    function norm(s){ s=tolower(s); gsub(/[^a-z0-9á-ű]/,"",s); return s }
    NR==1 { title=norm($0); print; next }
    /^#{1,6} /{
      h=norm($0)
      if (h!="" && h==title) next      # repeat of the chapter title
      if (h!="" && h==prevh) next      # consecutive duplicate heading
      prevh=h
      htext=$0; sub(/^#{1,6} /,"",htext)
      if (htext ~ /.{40,}:[ \t]*$/) { sub(/[ \t]+$/,"",htext); print "**" htext "**"; next }  # lead-in -> bold
      if ($0 ~ /^# /) { line=$0; sub(/^# /,"## ",line); print line; next }                     # stray H1 -> H2
      print; next
    }
    { if ($0!="") prevh=""; print }
  ' "$out" > "$out.tmp" && mv "$out.tmp" "$out"
  printf '%-34s pages %3d-%-3d  words=%s\n' "$fname.md" "$start" "$((nstart-1))" "$(wc -w < "$out" | tr -d ' ')"
done
echo "---"
echo "chapters: $(ls "$OUT"/*.md | wc -l | tr -d ' ')  total words: $(cat "$OUT"/*.md | wc -w | tr -d ' ')"
