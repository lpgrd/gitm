# gitm Test Suite

## Structure

```
test/
├── unit/               # Unit tests
│   ├── utils/         # Utility function tests
│   ├── commands/      # Command tests
│   └── lib/           # Library tests
├── integration/       # Integration tests
├── fixtures/          # Test fixtures and mock data
├── helpers/           # Test utilities and helpers
└── setup.ts          # Global test setup
```

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test path/to/test.ts

# Run with coverage
bun test --coverage
```

## Writing Tests

### Unit Tests

Unit tests should:
- Test individual functions in isolation
- Mock external dependencies
- Be fast and deterministic
- Cover edge cases

Example:
```typescript
import { describe, it, expect, jest } from 'bun:test';
import { myFunction } from '@/utils/myUtil';

describe('myFunction', () => {
  it('should handle normal cases', () => {
    expect(myFunction('input')).toBe('expected output');
  });
  
  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
  });
});
```

### Integration Tests

Integration tests should:
- Test multiple components working together
- Use real file system operations when needed
- Test the CLI commands end-to-end
- Clean up after themselves

### Test Helpers

Common test utilities are available in `test/helpers/index.ts`:
- `createMockAccount()` - Create mock GitAccount objects
- `mockConfig()` - Mock the config module
- `mockConsole()` - Capture console output
- `getTempPath()` - Generate temporary paths for testing

## Coverage

We aim for high test coverage:
- Utilities: 90%+
- Commands: 80%+
- Overall: 85%+

View coverage reports:
```bash
bun test --coverage
# Coverage report will be displayed in terminal
```