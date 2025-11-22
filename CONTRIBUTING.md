# Contributing to Treasure Chest

Thank you for your interest in contributing to Treasure Chest! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

Please be respectful and considerate in all interactions. We aim to maintain a welcoming and inclusive community.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/treasure-chest.git
   cd treasure-chest
   ```

## Development Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run tests to ensure everything is working:

   ```bash
   npm test
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Making Changes

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

2. Make your changes following our [coding standards](#coding-standards)

3. Add tests for your changes in the `tests/` directory

4. Ensure all tests pass:

   ```bash
   npm test
   ```

5. Run linting and formatting:
   ```bash
   npm run lint:fix
   npm run format
   ```

## Submitting Changes

1. Commit your changes with a descriptive commit message:

   ```bash
   git add .
   git commit -m "feat: add new feature" # or "fix: resolve bug"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for adding or updating tests
   - `refactor:` for code refactoring
   - `chore:` for maintenance tasks

2. Push to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

3. Create a Pull Request on GitHub:
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure CI checks pass

## Coding Standards

- **TypeScript**: All code must be written in TypeScript with proper type annotations
- **Linting**: Code must pass ESLint checks (`npm run lint`)
- **Formatting**: Code must be formatted with Prettier (`npm run format`)
- **Documentation**: Add JSDoc comments for public APIs
- **Tests**: Maintain or improve test coverage

### Code Style

- Use meaningful variable and function names
- Keep functions small and focused
- Avoid deep nesting
- Use early returns to reduce complexity
- Prefer `const` over `let`, never use `var`
- Add comments for complex logic

## Testing

- Write tests for all new features and bug fixes
- Tests are written using Vitest
- Test files should be placed in the `tests/` directory
- Aim for high code coverage

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Structure

```typescript
describe('FeatureName', () => {
  it('should do something specific', () => {
    // Arrange
    const container = new Container();

    // Act
    container.bind('key', () => 'value');

    // Assert
    expect(container.resolve('key')).toBe('value');
  });
});
```

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Update the CHANGELOG.md following the existing format
3. The PR will be merged once it has been reviewed and approved
4. Ensure your PR passes all CI checks

## Questions?

If you have questions, feel free to:

- Open an issue on GitHub
- Reach out to the maintainer: Kent Phung

Thank you for contributing to Treasure Chest!
