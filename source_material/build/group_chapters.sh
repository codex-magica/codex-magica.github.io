#!/bin/bash
# Groups per-page Markdown (build/md/p-NNN.md) into per-chapter files (build/chapters/).
# Chapter boundaries are the chapter-opener pages; names are cleaned (chapter-art OCR is garbled).
set -uo pipefail
cd "$(dirname "$0")/.."
OUT=build/chapters
mkdir -p "$OUT"
rm -f "$OUT"/*.md

# "startPage|filename|Clean Title"  (chapter runs until the next start page)
chapters=(
  "0|00-elolap-es-impresszum|Előlap és impresszum"
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
  "116|14-tuzvarazslok|Tűzvarázslók (Újvarázslók)"
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
  "354|26-magasmagia|Magasmágia (Elemi mágia, Asztrálmágia, Mentálmágia, Nekromancia stb.)"
  "394|27-dragakomagia|Drágakőmágia"
  "401|28-kalandmesterek-konyve|II. Kalandmesterek Könyve"
  "402|29-kalandok-kontinense|Kalandok Kontinense"
  "458|30-istenek-es-egi-hatalmak|Istenek és égi hatalmak"
  "472|31-bestiarium|Bestiárium"
  "496|32-varazstargyak|Varázstárgyak"
)

n=${#chapters[@]}
for ((i=0; i<n; i++)); do
  IFS='|' read -r start fname title <<< "${chapters[$i]}"
  if (( i+1 < n )); then IFS='|' read -r nstart _ _ <<< "${chapters[$((i+1))]}"; else nstart=514; fi
  out="$OUT/$fname.md"
  printf '# %s\n\n' "$title" > "$out"
  for ((p=start; p<nstart; p++)); do
    f=build/md/$(printf p-%03d "$p").md
    [ -f "$f" ] || continue
    printf '<!-- page %d (pdf sheet %d) -->\n\n' "$p" "$((p+1))" >> "$out"
    cat "$f" >> "$out"
    printf '\n\n' >> "$out"
  done
  words=$(wc -w < "$out" | tr -d ' ')
  printf '%-40s pages %3d-%-3d  words=%s\n' "$fname.md" "$start" "$((nstart-1))" "$words"
done
echo "---"
echo "chapters written: $(ls "$OUT"/*.md | wc -l | tr -d ' ')  total words: $(cat "$OUT"/*.md | wc -w | tr -d ' ')"
