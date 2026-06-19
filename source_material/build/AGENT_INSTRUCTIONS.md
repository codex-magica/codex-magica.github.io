# Page assembly instructions (MAGUS PDF → Markdown)

You assemble ONE page of a Hungarian M.A.G.U.S. (Új Törvénykönyv) rulebook into clean Markdown.
You will be told the page index NNN (zero-padded, e.g. 014).

## Inputs
- Deskewed page image: `/Users/me/Projects/magus/source_material/build/deskewed/p-NNN.png`
- Tesseract OCR prose (GROUND TRUTH for wording): `/Users/me/Projects/magus/source_material/build/ocr/p-NNN.txt`

## Output
- Write final Markdown to `/Users/me/Projects/magus/source_material/build/md/p-NNN.md`

## Core principle — DIVISION OF LABOR (do not violate)
- **PROSE wording comes from the tesseract text, NOT from your reading of the image.** The scan is too low-res for you to read dense prose reliably — if you transcribe prose from the image you WILL hallucinate. Trust tesseract for the words.
- **You use the IMAGE only for:** layout/heading structure, reading order, spotting italic/flavour passages, locating tables, and reading TABLE cells/numbers (tesseract cannot read tables — you can, from a crop).

## Steps

1. Read the tesseract text file and the deskewed image. Get dimensions:
   `magick identify -format '%w %h' <deskewed png>`

2. **Classify the page:**
   - `ART_ONLY` — a full-page illustration whose only text is a chapter title (tesseract file is nearly empty). Output just a single `# <Chapter Title>` (read the title from the image) and an HTML comment `<!-- full-page illustration -->`. Done.
   - `TOC` — a table of contents. Reproduce as a Markdown list preserving entries and page numbers.
   - `PROSE` — body text, possibly with headings and flavour quotes.
   - `TABLE` — contains one or more stat tables (plus possibly prose).

3. **PROSE assembly (from tesseract text):**
   - Keep the wording from tesseract verbatim. Fix only: hyphenation across line breaks (`Tapasz-\ntalati` → `Tapasztalati`), and obvious join of wrapped lines into paragraphs.
   - **Drop border junk:** short garbage tokens/lines from the ornamental frame and the rotated chapter label (e.g. a stray `Pszi`, `los`, `ny`, single letters at line ends). Use the image to tell real text from frame noise.
   - **Reading order:** pages are usually TWO columns. Ensure the output is full left column (top→bottom) then full right column. Tesseract usually preserves this, but verify against the image and fix if interleaved.
   - **Headings:** chapter/major titles → `##`; sub-sections → `###`. Discipline/spell stat lines (`Típus:`, `Ψp:`, `A meditáció ideje:`, `Időtartam:`, `ME:`) → keep as bold-label lines, one per line.
   - **Flavour/quote passages** (italic in the original, often set apart) → Markdown blockquote in italics: `> *...*`.

4. **TABLES (use the image, not tesseract):**
   - For each table visible in the image, compute its bounding box as pixel coordinates (fractions of W×H, add ~15px padding) and crop it from the deskewed PNG:
     `magick <deskewed png> -crop WxH+X+Y +repage /Users/me/Projects/magus/source_material/build/crops/p-NNN-tK.png`
   - Read the crop and transcribe to a clean Markdown table: EVERY column header, EVERY row, exact numbers. Keep empty cells empty. Preserve footnote markers (`*`,`**`,`***`) and transcribe the footnote lines below the table.
   - If the crop is still unclear, re-crop tighter/larger. If a cell is genuinely illegible, use `[?]`.
   - Place each table in its correct position in the reading flow, replacing the garbled tesseract table lines.

5. **Sidebar:** if a rotated chapter label is in the margin, put it once at the very top as `<!-- sidebar: <label> -->`.

6. Write the assembled Markdown to the output path.

## Return (your final message = data, not prose)
Return a compact line: `p-NNN | class=<TYPE> | words=<n> | tables=<n> | unsure=<count of [?]> | notes=<short>`
