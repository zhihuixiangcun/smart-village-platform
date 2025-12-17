const path = require('path');

// Direct execution of Jest test runner
process.argv = [
  'node',
  path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js'),
  'tests/edge-cases/simple.test.js',
  '--config=jest.config.notifications.js',
  '--runInBand',
  '--forceExit',
  '--verbose'
];

require(path.join(__dirname, 'node_modules', 'jest', 'bin', 'jest.js'));