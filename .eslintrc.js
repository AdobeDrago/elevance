module.exports = {
  root: true,
  extends: 'airbnb-base',
  env: {
    browser: true,
    es2022: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
  },
  overrides: [{
    files: ['tools/*.mjs'],
    env: { node: true, es2022: true, browser: false },
    rules: {
      'import/extensions': ['error', { js: 'always', mjs: 'always' }],
      'import/no-unresolved': ['error', { ignore: ['^node:'] }],
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
      'no-await-in-loop': 'off', // Directory requests and PDF pages must be serial.
      'no-console': 'off', // Build commands report their outcome.
      'no-continue': 'off', // Skip excluded records during serial traversal.
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  }, {
    files: ['tools/*test*.mjs'],
    rules: {
      'max-len': ['error', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true }],
    },
  }],
  rules: {
    'import/extensions': ['error', { js: 'always' }], // require js file extensions in imports
    'linebreak-style': ['error', 'unix'], // enforce unix linebreaks
    'no-param-reassign': [2, { props: false }], // allow modifying properties of param
    'import/no-cycle': 0, // Allow modules to use each other
  },
};
