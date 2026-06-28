// *.md files are imported as raw source strings (see config-overrides.js → asset/source).
declare module "*.md" {
  const content: string;
  export default content;
}
