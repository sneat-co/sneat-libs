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
      // Set to 'warn' during the contactus migration; flipped to 'error' in Task 6.
      '@nx/enforce-module-boundaries': [
        'warn',
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: 'scope:foundation',
              onlyDependOnLibsWithTags: ['scope:foundation'],
            },
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
              ],
            },
            {
              sourceTag: 'type:internal',
              onlyDependOnLibsWithTags: [
                'type:contract',
                'type:shared',
                'type:internal',
                'scope:foundation',
              ],
            },
            // Apps and not-yet-migrated extension libs: permissive until reshaped.
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
