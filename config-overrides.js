const { override, addWebpackAlias } = require('customize-cra');
const path = require('path');

// Import *.md files as raw source strings (webpack 5 asset/source). Inserted at the front of CRA's
// `oneOf` so it wins over the catch-all file-loader (which would otherwise return a URL).
const addMarkdownRawRule = () => (config) => {
  const oneOfRule = config.module.rules.find((r) => Array.isArray(r.oneOf));
  if (oneOfRule) oneOfRule.oneOf.unshift({ test: /\.md$/, type: 'asset/source' });
  return config;
};

module.exports = override(
  // Existing configuration for alias
  addWebpackAlias({
    ['@']: path.resolve(__dirname, 'src'),
  }),
  addMarkdownRawRule(),
);
