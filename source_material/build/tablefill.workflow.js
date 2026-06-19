export const meta = {
  name: 'magus-tablefill',
  description: 'Fill <!-- TABLE --> placeholders in MAGUS page Markdown by reading native-res strips with Sonnet',
  phases: [{ title: 'Tables', detail: 'slice native-res strips, read stat tables, replace placeholders' }],
}

// Page indices whose md still holds <!-- TABLE --> placeholders.
// args may arrive as an array OR a JSON-encoded string; fall back to a hardcoded list.
let pages = args
if (typeof pages === 'string') {
  try { pages = JSON.parse(pages) } catch (e) { pages = null }
}
if (!Array.isArray(pages) || !pages.length) {
  pages = [47, 54, 62, 76, 83, 96, 97, 198, 214, 283, 312, 352, 370, 392, 477]
}
const pad = (n) => String(n).padStart(3, '0')
const DIR = '/Users/me/Projects/magus/source_material/build'

const tablePrompt = (p) => `Page ${p} of the MAGUS rulebook has one or more "<!-- TABLE: ... -->" placeholders in its Markdown that must be replaced with real tables. Do EXACTLY this:
1. Get dimensions: run \`magick identify -format '%w %h' ${DIR}/deskewed/p-${p}.png\`.
2. Slice the page into 4 OVERLAPPING full-width native-resolution horizontal bands (keeps text un-downsampled). For W x H, band height bh = H/4 + 60; for i in 0..3:
   \`magick ${DIR}/deskewed/p-${p}.png -crop \${W}x\${bh}+0+\$((i*(H/4)-30)) +repage ${DIR}/strips/p-${p}-b\${i}.png\` (clamp negative Y to 0).
3. Read ALL four band PNGs. For each placeholder, transcribe the corresponding stat table into clean Markdown: every column header, every row, exact numbers. Each weapon/spell/item = its own row (never merge two). Preserve footnote markers (*,**,***) and footnote lines. Hungarian diacritics exact. Bands overlap — dedupe rows. Illegible cell -> [?]. Sebzés (e.g. 2k6+2) and igen/nem columns MUST be exact.
4. IMPORTANT: if a placeholder turns out NOT to mark a real grid/table (just inline numbers or a short list), replace it with the correct plain Markdown (list or sentence) from what you see — do NOT invent a table.
5. Read ${DIR}/md/p-${p}.md and replace every "<!-- TABLE: ... -->" line with the correct content in reading order. Write the result back to ${DIR}/md/p-${p}.md. Leave all other prose untouched.
Return one line: "p-${p} | tables=<n> | unsure=<[?] count>".`

phase('Tables')
const results = await pipeline(
  pages,
  (idx) => agent(tablePrompt(pad(idx)), { label: `tables:p-${pad(idx)}`, phase: 'Tables', model: 'sonnet' }),
)
return { processed: results.filter(Boolean).length }
