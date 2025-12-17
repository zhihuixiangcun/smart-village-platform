module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // 开发环境更宽松的规则

    // 代码质量规则
    'no-console': 'warn',
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'prefer-const': 'warn',
    'no-var': 'warn',

    // 代码风格规则（仅警告）
    'indent': ['warn', 2],
    'linebreak-style': 'off', // Windows下关闭
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'es5'],

    // ES6+规则
    'arrow-spacing': 'warn',
    'no-duplicate-imports': 'warn',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',

    // 安全规则
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // 错误处理
    'no-throw-literal': 'warn',
    'prefer-promise-reject-errors': 'warn',

    // 性能相关
    'no-loop-func': 'warn',
    'no-inner-declarations': 'warn',
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        'no-console': 'off',
        'no-unused-vars': 'off',
      },
      env: {
        jest: true,
      },
    },
    {
      files: ['src/**/*.js'],
      rules: {
        'no-console': 'warn',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'scripts/setup.js',
    'scripts/dev-servers.js',
  ],
};