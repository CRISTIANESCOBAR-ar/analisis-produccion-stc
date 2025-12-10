#!/usr/bin/env node
const path = require('path');
const { ESLint } = require('eslint');

(async function main(){
  try {
    const target = process.argv[2];
    if (!target) {
      console.error('Usage: node run-eslint-fix-file.cjs <file>');
      process.exit(2);
    }

    const eslint = new ESLint({
      cwd: process.cwd(),
      fix: true,
      useEslintrc: false,
      overrideConfig: {
        parser: 'vue-eslint-parser',
        parserOptions: { parser: 'espree', ecmaVersion: 2021, sourceType: 'module' },
        env: { browser: true, node: true, es2021: true },
        plugins: ['vue'],
        extends: ['plugin:vue/vue3-recommended'],
        rules: { 'no-console': 'off', 'no-debugger': 'off' }
      },
      resolvePluginsRelativeTo: path.resolve(process.cwd(), 'node_modules')
    });

    const results = await eslint.lintFiles([target]);
    await ESLint.outputFixes(results);

    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    if (resultText) console.log(resultText);

    const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warningCount, 0);
    console.log(`\nESLint after fix: ${errorCount} errors, ${warningCount} warnings.`);
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Error running ESLint fix for file:', err);
    process.exit(2);
  }
})();
