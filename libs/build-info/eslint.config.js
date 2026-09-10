const baseConfig = require('../../eslint.config.js');
const { sneatLibConfig } = require('../../eslint.lib.config.js');

module.exports = [
  ...baseConfig,
  ...sneatLibConfig(__dirname),
  {
    // The published bin is plain ESM Node, deliberately dependency-free —
    // it isn't part of the Angular/browser surface eslint.config.js targets.
    files: ['bin/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
];
