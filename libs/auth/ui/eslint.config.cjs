const baseConfig = require('../../../eslint.config.js');
const { sneatLibConfig } = require('../../../eslint.lib.config.js');

const boundaryRule = baseConfig.find(
  (config) => config.rules?.['@nx/enforce-module-boundaries'],
).rules['@nx/enforce-module-boundaries'];

module.exports = [
  ...baseConfig,
  ...sneatLibConfig(__dirname),
  {
    files: ['**/auth-panel.component.ts', '**/auth-panel.component.spec.ts'],
    rules: {
      // ng-packagr requires package imports across primary/secondary entries.
      // Preserve the tier/buildability rules; permit only this public self-entry.
      '@nx/enforce-module-boundaries': [
        boundaryRule[0],
        {
          ...boundaryRule[1],
          allow: [...boundaryRule[1].allow, '@sneat/auth-ui/provider-buttons'],
        },
      ],
    },
  },
];
