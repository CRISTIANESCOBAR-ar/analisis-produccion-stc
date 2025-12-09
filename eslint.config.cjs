const vuePlugin = require('eslint-plugin-vue');

module.exports = [
  // Ignored paths (flat config uses `ignores` property)
  {
    ignores: ['node_modules/**', 'dist/**', 'public/**', 'database/**', '*.log']
  },
  // Use plugin's recommended Vue 3 config if available
  (vuePlugin && vuePlugin.configs && vuePlugin.configs['vue3-recommended']) || {},
  // Project-specific overrides
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    }
  }
];
