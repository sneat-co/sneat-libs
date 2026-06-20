const { FlatCompat } = require('@eslint/eslintrc');
const nxEslintPlugin = require('@nx/eslint-plugin');
const eslintPluginJson = require('eslint-plugin-json');
const pluginTemplatePlugin = require('@angular-eslint/eslint-plugin-template');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    plugins: {
      '@nx': nxEslintPlugin,
      json: eslintPluginJson,
      template: pluginTemplatePlugin,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // Extension library-architecture convention (spec/features/extension-library-architecture).
      // Tier matrix: contract < shared < internal; foundation is the floor everything may use.
      // The load-bearing rule is `type:shared` must NEVER depend on `type:internal`.
      // Transitional allowances (scope:app, ext:calendarius) cover pre-existing couplings
      // from contactus into the app layer and the not-yet-reshaped calendarius extension;
      // remove them as those are migrated to the contract/shared/internal convention.
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'type:contract',
              onlyDependOnLibsWithTags: ['type:contract', 'scope:foundation'],
            },
            {
              sourceTag: 'type:shared',
              onlyDependOnLibsWithTags: [
                'type:contract',
                'type:shared',
                'scope:foundation',
                // transitional — until app/calendarius expose contracts:
                'scope:app',
                'ext:calendarius',
              ],
            },
            {
              sourceTag: 'type:internal',
              onlyDependOnLibsWithTags: [
                'type:contract',
                'type:shared',
                'type:internal',
                'scope:foundation',
                // transitional — until app/calendarius expose contracts:
                'scope:app',
                'ext:calendarius',
              ],
            },
            // Foundation, app, and not-yet-migrated extension sources: permissive.
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  ...compat.config({ extends: ['plugin:@nx/typescript'] }).map((config) =>
    Object.assign(config, {
      files: [`**/*.ts`, `**/*.tsx`, `**/*.cts`, `**/*.mts`],
      rules: { ...config.rules },
    }),
  ),
  ...compat.config({ extends: ['plugin:@nx/javascript'] }).map((config) =>
    Object.assign(config, {
      files: [`**/*.js`, `**/*.jsx`, `**/*.cjs`, `**/*.mjs`],
      rules: { ...config.rules },
    }),
  ),
  {
    ignores: ['node_modules', '**/vitest.config.*.timestamp*'],
  },
  {
    files: [
      '**/eslint.config.*',
      '**/.eslintrc.*',
      '**/test-setup.ts',
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
];
