# src/book (local only)

The full _M.A.G.U.S. Új Törvénykönyv_ text is **not distributed** with this repository.

The compendium has two optional tabs, **Bevezető** and **Karakteralkotás**, that render whole rulebook
chapters. If you have your own copy of the book, generate the chapters with the PDF pipeline
(`source_material/build/`, see [`docs/pdf-pipeline.md`](../../docs/pdf-pipeline.md)) or write them by
hand, and put them here as:

```text
src/book/01-bevezeto.md
src/book/02-karakteralkotas.md
```

They are picked up at build time (and are gitignored). Without them the app works the same, minus those
two tabs. Everything else in the compendium comes from the structured data in `src/data/`.
