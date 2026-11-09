const baseConfig = require('../../eslint.config.js');
const { sneatLibConfig } = require('../../eslint.lib.config.js');

module.exports = [
  { ignores: ['src/assets/web-tree-sitter.js'] },
  ...baseConfig,
  ...sneatLibConfig(__dirname),
];
