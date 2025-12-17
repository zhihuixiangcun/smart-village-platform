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
    // 代码质量规则
    'no-console': 'warn',
    'no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    'prefer-const': 'error',
    'no-var': 'error',

    // 代码风格规则
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'es5'],

    // ES6+规则
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',

    // 安全规则
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // 错误处理
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',

    // 性能相关
    'no-loop-func': 'error',
    'no-inner-declarations': 'error',
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      rules: {
        'no-console': 'off',
      },
      env: {
        jest: true,
      },
    },
    {
      files: ['src/**/*.js', 'server/**/*.js'],
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
  ],
};