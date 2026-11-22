// *.md files are imported as raw source strings (see config-overrides.js → asset/source).
declare module "*.md" {
  const content: string;
  export default content;
}

// webpack's require.context — used to pick up the optional, locally provided rulebook chapters
// (src/book/, not distributed with the repo) without failing the build when they're absent.
interface NodeRequire {
  context(directory: string, useSubdirectories?: boolean, regExp?: RegExp): {
    keys(): string[];
    (id: string): unknown;
  };
}
