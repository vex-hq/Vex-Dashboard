import eslintConfigApps from '@kit/eslint-config/apps.js';
import eslintConfigBase from '@kit/eslint-config/base.js';

export default [
  {
    ignores: ['venv/**', 'content/**', '.next/**', 'node_modules/**'],
  },
  ...eslintConfigBase,
  ...eslintConfigApps,
];
