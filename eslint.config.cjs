const vuePlugin = require('eslint-plugin-vue');
const securityPlugin = require('eslint-plugin-security');

module.exports = [
  // Ignored paths
  {
    ignores: ['node_modules/**', 'dist/**', 'public/**', 'database/**', '*.log']
  },
  // Security for Node.js/API files
  {
    files: ['scripts/**/*.{js,cjs}', 'src/**/*.js'],
    plugins: {
      security: securityPlugin
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly'
      }
    },
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'warn',
      'security/detect-new-buffer': 'error',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'no-console': 'off'
    }
  },
  // Vue files
  {
    files: ['src/**/*.vue'],
    plugins: {
      vue: vuePlugin
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parser: require('vue-eslint-parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
      }
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
    }
  }
];
