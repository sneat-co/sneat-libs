const baseConfig = require('../../eslint.config.js');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: '@ionic/angular', message: 'Use focused Ionic public entry points.' }] },
      ],
    },
  },
];
