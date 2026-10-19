import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fono/web', '@fono/api', '@fono/mobile', '**/apps/**'],
              message: 'Import direto entre apps é proibido. Compartilhe código apenas via packages/shared.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '.turbo/**',
      'coverage/**',
      '.expo/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
    ],
  },
);
