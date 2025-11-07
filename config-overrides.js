const { override, addWebpackAlias } = require('customize-cra');
const path = require('path');

// // Function to add Workbox InjectManifest plugin
// const addInjectManifest = () => config => {
//   // Look for the existing GenerateSW plugin and replace it with InjectManifest
//   config.plugins = config.plugins.map(plugin => {
//     if (plugin.constructor.name === 'GenerateSW') {
//       return new InjectManifest({
//         swSrc: './src/service-worker.js',
//         swDest: 'service-worker.js',
//       });
//     }
//     return plugin;
//   });
//   return config;
// };

module.exports = override(
  // Existing configuration for alias
  addWebpackAlias({
    ['@']: path.resolve(__dirname, 'src'),
  }),

  // // Add the InjectManifest plugin
  // addInjectManifest()
);
