#!/usr/bin/env node
const path = require('path');
const { ESLint } = require('eslint');

(async function main(){
  try {
    const eslint = new ESLint({
      cwd: process.cwd(),
      useEslintrc: false,
      overrideConfig: {
        parser: 'vue-eslint-parser',
        parserOptions: {
          parser: 'espree',
          ecmaVersion: 2021,
          sourceType: 'module'
        },
        env: { browser: true, node: true, es2021: true },
        plugins: ['vue'],
        extends: ['plugin:vue/vue3-recommended'],
        rules: {
          'no-console': 'off',
          'no-debugger': 'off'
        }
      },
      resolvePluginsRelativeTo: path.resolve(process.cwd(), 'node_modules')
    });

    const results = await eslint.lintFiles(['src/**/*.{js,vue}']);

    // Filter messages to only errors (severity === 2)
    const errorResults = results
      .map(r => ({
        filePath: r.filePath,
        messages: r.messages.filter(m => m.severity === 2),
        errorCount: r.messages.filter(m => m.severity === 2).length,
        warningCount: 0,
      }))
      .filter(r => r.errorCount > 0);

    if (errorResults.length === 0) {
      console.log('No ESLint errors found.');
      process.exit(0);
    }

    // Pretty-print errors with file/line/col/rule
    for (const r of errorResults) {
      console.log('\n' + r.filePath.replace(process.cwd() + path.sep, ''));
      for (const m of r.messages) {
        console.log(`  ${m.line}:${m.column}  ${m.message}  ${m.ruleId || ''}`);
      }
    }

    process.exit(1);
  } catch (err) {
    console.error('Error running ESLint errors-only reporter:', err);
    process.exit(2);
  }
})();
