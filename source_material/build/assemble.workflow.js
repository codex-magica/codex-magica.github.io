export const meta = {
  name: 'magus-assemble',
  description: 'Assemble scanned MAGUS rulebook pages into Markdown (tesseract prose + native-res strip-read tables)',
  phases: [
    { title: 'Assemble', detail: 'classify + tesseract-grounded prose + flag tables' },
    { title: 'Tables', detail: 'slice table pages into native-res strips and read stat tables' },
  ],
}

// args: array of page indices to process. Defaults to all 514.
const pages = (Array.isArray(args) && args.length) ? args : Array.from({ length: 514 }, (_, i) => i)
const pad = (n) => String(n).padStart(3, '0')
const DIR = 'source_material/build'  // relative to the repo root (the workflow's cwd)

const ASSEMBLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['page', 'klass', 'hasTables', 'words'],
  properties: {
    page: { type: 'string' },
    klass: { type: 'string', enum: ['ART_ONLY', 'TOC', 'PROSE', 'TABLE', 'FAINT', 'BLANK'] },
    hasTables: { type: 'boolean' },
    words: { type: 'number' },
    sidebar: { type: 'string' },
    title: { type: 'string', description: 'chapter/section title if this page starts one, else empty' },
    notes: { type: 'string' },
  },
}

const assemblePrompt = (p) => `Read source_material/build/AGENT_INSTRUCTIONS.md and follow it to assemble page index ${p}.
Inputs: ${DIR}/deskewed/p-${p}.png (deskewed image) and ${DIR}/ocr/p-${p}.txt (tesseract prose ground-truth).
Write the assembled Markdown to ${DIR}/md/p-${p}.md.
PROSE WORDING MUST COME FROM THE TESSERACT TEXT — never transcribe dense prose from the image (it hallucinates).
For now, for any stat tables, leave a placeholder line "<!-- TABLE: <short caption> -->" where each table belongs; a later step reads them at high resolution.
If the page is a near-empty illustration -> klass ART_ONLY. If it is faint/low-contrast and largely unreadable -> klass FAINT (still write what tesseract got, mark unreadable spots [?]).
Set hasTables=true if any stat table/grid is present.
Return the structured object.`

const tablePrompt = (p) => `Page ${p} of the MAGUS rulebook contains one or more stat tables. Do EXACTLY this:
1. Get dimensions: run \`magick identify -format '%w %h' ${DIR}/deskewed/p-${p}.png\`.
2. Slice the page into 4 OVERLAPPING full-width native-resolution horizontal bands (this keeps text un-downsampled). For W x H, band height = H/4 + 60; for i in 0..3 crop:
   \`magick ${DIR}/deskewed/p-${p}.png -crop \${W}x\${bh}+0+\$((i*(H/4)-30)) +repage ${DIR}/strips/p-${p}-b\${i}.png\` (clamp negative Y to 0).
3. Read ALL four band PNGs. Transcribe every stat table to clean Markdown: every column header, every row, exact numbers. Each weapon/spell = its own row (never merge two). Preserve footnote markers (*,**,***) and footnote lines. Hungarian diacritics exact. Bands overlap — dedupe rows. Illegible cell -> [?]. Sebzés (e.g. 2k6+2) and igen/nem columns MUST be exact.
4. Read the current ${DIR}/md/p-${p}.md and REPLACE each "<!-- TABLE: ... -->" placeholder with the correct Markdown table in reading order. Write the result back to ${DIR}/md/p-${p}.md.
Return a one-line summary: page, number of tables, any [?] cells.`

phase('Assemble')
const results = await pipeline(
  pages,
  // Stage 1 (prose/classify) on HAIKU — cheap. Words come from tesseract; image only for structure.
  (idx) => agent(assemblePrompt(pad(idx)), { label: `assemble:p-${pad(idx)}`, phase: 'Assemble', schema: ASSEMBLE_SCHEMA, model: 'haiku', effort: 'low' }),
  // Stage 2 (tables) on SONNET — accuracy-critical, native-res strips.
  (res, idx) => {
    if (res && res.hasTables) {
      return agent(tablePrompt(pad(idx)), { label: `tables:p-${pad(idx)}`, phase: 'Tables', model: 'sonnet' }).then(() => res)
    }
    return res
  },
)

const ok = results.filter(Boolean)
const byClass = {}
for (const r of ok) byClass[r.klass] = (byClass[r.klass] || 0) + 1
const titles = ok.filter((r) => r.title && r.title.trim()).map((r) => ({ page: r.page, title: r.title }))
return { processed: ok.length, byClass, chapterStarts: titles }
