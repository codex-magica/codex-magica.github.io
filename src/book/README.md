# src/book (local only)

The full _M.A.G.U.S. Új Törvénykönyv_ text is **not distributed** with this repository.

This folder is where the PDF pipeline (`source_material/build/`, see
[`docs/pdf-pipeline.md`](../../docs/pdf-pipeline.md)) writes the per-chapter Markdown when you run it on
your own copy of the book. It is useful for checking the rules data against the book. Everything in it
except this README is gitignored, and **the app does not read it**: the compendium comes entirely from the
structured data in `src/data/` and `src/model/`.
