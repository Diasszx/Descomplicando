import baseConfig from '@fono/eslint-config/base';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'fs', message: 'Código em shared deve ser agnóstico de plataforma.' },
            { name: 'path', message: 'Código em shared deve ser agnóstico de plataforma.' },
            { name: 'react', message: 'Código em shared não deve depender de React.' },
            { name: 'react-native', message: 'Código em shared não deve depender de React Native.' },
          ],
          patterns: [
            {
              group: ['node:*', '@nestjs/**', '@prisma/**', '**/apps/**'],
              message: 'Código em shared deve ser agnóstico de plataforma (sem Node/Nest/Prisma/Apps).',
            },
          ],
        },
      ],
    },
  },
];
