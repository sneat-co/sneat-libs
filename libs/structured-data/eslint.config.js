const baseConfig = require('../../eslint.config.js');
const { sneatLibConfig } = require('../../eslint.lib.config.js');

module.exports = [
  { ignores: ['**/libs/structured-data/src/assets/web-tree-sitter.js'] },
  ...baseConfig,
  ...sneatLibConfig(__dirname),
];
