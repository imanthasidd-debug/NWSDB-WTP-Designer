// ESLint (flat config) – catches mistakes such as undefined names, unused code and unreachable branches.
// npm run lint
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'release/**', 'node_modules/**', 'src/core/ratebook.data.js', 'src/core/ratebook2026.data.js', 'src/ui/icons.gen.js', 'src/ui/logo.js'] },
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.browser, __APP_VERSION__: 'readonly' } },
  },
  { files: ['src/engine/worker.js'], languageOptions: { globals: { ...globals.worker } } },
  {
    files: ['electron/**/*.js', 'test/**/*.cjs', 'scripts/**/*.cjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: { ...globals.node } },
  },
  // Playwright tests: the callbacks passed to page.evaluate() run in the browser
  { files: ['test/**/*.cjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    files: ['**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
  },
  {
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true, varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],
      // initial values that every branch then overwrites are kept for readability
      'no-useless-assignment': 'off',
    },
  },
];
