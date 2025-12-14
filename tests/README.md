# Testing Setup for Smart Village Platform

## Overview

This project now includes a comprehensive testing structure using Jest for unit and integration testing.

## Test Structure

```
tests/
├── setup.js                     # Global test setup and teardown
├── helpers.js                   # Test utility functions
├── basic.test.js                # Basic functionality tests
├── unit/
│   └── models.test.js           # Unit tests for Mongoose models
└── integration/
    ├── app.test.js              # Integration tests for main app
    ├── auth.test.js             # Integration tests for authentication
    └── database.test.js         # Database integration tests
```

## Available Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (reruns on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Categories

### 1. Unit Tests (`tests/unit/`)
- **models.test.js**: Tests Mongoose model validation, schemas, and basic operations
  - Villager model validation and constraints
  - News model enum validation and defaults
  - Affair model vote counting and status management

### 2. Integration Tests (`tests/integration/`)
- **app.test.js**: Tests the main Express application
  - Health check endpoints
  - Security middleware (Helmet, CORS, Rate limiting)
  - Error handling and 404 responses
  
- **auth.test.js**: Tests authentication endpoints
  - User login with valid/invalid credentials
  - User registration and validation
  - JWT token generation and validation
  
- **database.test.js**: Tests database operations
  - CRUD operations for all models
  - Complex queries and aggregations
  - Database connection and cleanup

### 3. Basic Tests (`tests/basic.test.js`)
- Environment setup validation
- Basic JavaScript and async operation tests
- Chinese text handling validation

## Database Testing

The test suite uses MongoDB Memory Server for isolated database testing:
- **Automatic setup**: Creates in-memory MongoDB instance for each test run
- **Clean state**: Database is cleared between tests to ensure isolation
- **Fallback support**: Falls back to local test database if Memory Server is unavailable

## Test Utilities

### TestHelpers (`tests/helpers.js`)
Provides utility functions for common test operations:
- `createAuthToken(userId, role)`: Generate JWT tokens for authenticated requests
- `createTestUser(overrides)`: Create test user data
- `createTestAnnouncement(overrides)`: Create test announcement data
- `createTestServiceRequest(overrides)`: Create test service request data
- `clearDatabase()`: Clear all database collections
- `wait(ms)`: Utility for async operation delays

## Running Tests

### Prerequisites
1. Node.js (>=20.17.0)
2. npm dependencies installed: `npm install`
3. Optional: MongoDB running locally (for fallback testing)

### Install Additional Test Dependencies
```bash
npm install mongodb-memory-server --save-dev
```

### Run Tests
```bash
# Run all tests once
npm test

# Run tests with detailed output
npm test -- --verbose

# Run only unit tests
npm test -- tests/unit

# Run only integration tests
npm test -- tests/integration

# Run specific test file
npm test -- tests/unit/models.test.js

# Run tests matching pattern
npm test -- --testNamePattern="login"
```

### Coverage Reports
```bash
npm run test:coverage
```

This generates a coverage report showing:
- Line coverage percentage
- Function coverage percentage
- Branch coverage percentage
- Statement coverage percentage

Coverage reports are saved to the `coverage/` directory.

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Environment**: Node.js
- **Test Files**: `**/*.test.js` and `**/*.spec.js`
- **Setup Files**: Runs `tests/setup.js` before all tests
- **Coverage**: Excludes config files and main app entry point
- **Timeout**: 10 seconds per test (configurable for database operations)

### Environment Variables
Tests automatically set:
- `NODE_ENV=test`
- `JWT_SECRET=test-secret-key`
- `PORT=0` (random available port)

## Writing New Tests

### Unit Test Example
```javascript
const { Villager } = require('../../src/models');

describe('New Feature', () => {
  test('should do something', async () => {
    const data = { /* test data */ };
    const result = await someFunction(data);
    expect(result).toBe(expectedValue);
  });
});
```

### Integration Test Example
```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('API Endpoint', () => {
  test('should return expected response', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'success'
    });
  });
});
```

## Common Test Patterns

### Authentication Testing
```javascript
const token = TestHelpers.createAuthToken(userId, 'admin');
const response = await request(app)
  .get('/api/protected-route')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

### Database Testing
```javascript
beforeEach(async () => {
  await TestHelpers.clearDatabase();
});

test('should save to database', async () => {
  const model = new SomeModel(data);
  const saved = await model.save();
  expect(saved._id).toBeDefined();
});
```

## Troubleshooting

### Common Issues

1. **MongoDB Memory Server Issues**
   - Ensure sufficient memory available
   - Check Node.js version compatibility
   - Use fallback local database if needed

2. **Test Timeout Issues**
   - Increase timeout in jest.config.js
   - Ensure proper async/await usage
   - Check for hanging database connections

3. **Port Conflicts**
   - Tests use random ports by default
   - Ensure no hardcoded port usage in test code

4. **Chinese Text Issues**
   - Ensure proper UTF-8 encoding
   - Test files are saved with correct encoding

### Debugging Tests
```bash
# Run tests with debug output
npm test -- --verbose --no-coverage

# Run single test file with debugging
node --inspect-brk node_modules/.bin/jest tests/unit/models.test.js --runInBand
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on others
2. **Clear Data**: Always clean up test data between tests
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
5. **Mock External Dependencies**: Mock external services and APIs
6. **Test Edge Cases**: Include tests for error conditions and edge cases

## CI/CD Integration

The test setup is ready for CI/CD integration:
- Tests run in Node.js environment
- No external dependencies required (uses in-memory database)
- Returns proper exit codes for CI systems
- Generates coverage reports for quality gates

Example GitHub Actions workflow:
```yaml
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm run test:coverage
```