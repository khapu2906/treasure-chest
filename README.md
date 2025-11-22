# Treasure Chest

[![npm version](https://badge.fury.io/js/@khapu2906%2Ftreasure-chest.svg)](https://www.npmjs.com/package/@khapu2906/treasure-chest)
[![CI](https://github.com/khapu2906/treasure-chest/actions/workflows/ci.yml/badge.svg)](https://github.com/khapu2906/treasure-chest/actions/workflows/ci.yml)
[![License: DIB](https://img.shields.io/badge/License-DIB-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

A lightweight and powerful TypeScript dependency injection container for managing service dependencies with support for transient, singleton, scoped, lazy, conditional, and contextual bindings.

## Features

### Core Features

- **Lightweight**: Zero runtime dependencies, minimal footprint
- **TypeScript First**: Full TypeScript support with complete type safety
- **Flexible Lifecycle**: Transient, singleton, and scoped bindings
- **Lazy Loading**: Deferred initialization for performance optimization
- **Container Hierarchy**: Child containers with inheritance
- **Nested Dependencies**: Automatic resolution of dependency chains
- **Circular Detection**: Automatic circular dependency detection
- **Conditional & Contextual**: Environment and context-aware bindings
- **Alias Support**: Multiple names for the same service

### Performance (v1.2.0)

- **Map-based Storage**: O(1) lookup complexity (10-100x faster)
- **Binding Cache**: Memoized results for non-conditional bindings
- **High-Speed Resolution**: 3.67M ops/sec (worst case), 24.7M ops/sec (cached)
- **Auto-Dispose**: IDisposable interface with zero overhead
- **Modular Architecture**: Better tree-shaking and code splitting

### Developer Experience

- **Intuitive API**: Fluent API with comprehensive JSDoc
- **Well Tested**: 62+ test cases with full coverage
- **Dual Module Support**: Both CommonJS and ES Modules (ESM)
- **Type Safe**: Full TypeScript declarations
- **Production Ready**: Battle-tested patterns
- **Modular Codebase**: Clean separation of concerns

## Installation

```bash
npm install @khapu2906/treasure-chest
```

## Quick Start

```typescript
import { Container } from '@khapu2906/treasure-chest';

const container = new Container();

// Register a service
container.bind('logger', () => ({
  log: (message: string) => console.log(`[LOG] ${message}`),
}));

// Use the service
const logger = container.resolve('logger');
logger.log('Hello World!');
```

## Key Features

### 1. Bind (Transient)

Creates a new instance on each resolve:

```typescript
container.bind('service', () => ({ id: Math.random() }));

const instance1 = container.resolve('service');
const instance2 = container.resolve('service');
console.log(instance1.id !== instance2.id); // true
```

### 2. Singleton

Creates only one instance:

```typescript
container.singleton('cache', () => ({ data: {} }));

const cache1 = container.resolve('cache');
const cache2 = container.resolve('cache');
console.log(cache1 === cache2); // true
```

### 3. Alias

Create aliases for services:

```typescript
container.singleton('logger', () => ({ log: console.log }));
container.alias('appLogger', 'logger');

const logger = container.resolve('appLogger'); // Same as 'logger'
```

### 4. Conditional Binding

Register services based on conditions:

```typescript
const env = 'production';

container.bind(
  'storage',
  () => ({ type: 'local' }),
  () => env === 'development'
);
container.bind(
  'storage',
  () => ({ type: 's3' }),
  () => env === 'production'
);

const storage = container.resolve('storage'); // { type: 's3' }
```

### 5. Contextual Binding

Register different implementations for different contexts:

```typescript
container
  .when('UserService')
  .needs('repository')
  .give(() => new UserRepository());
container
  .when('AdminService')
  .needs('repository')
  .give(() => new AdminRepository());

const userRepo = container.resolve('repository', 'UserService'); // UserRepository
const adminRepo = container.resolve('repository', 'AdminService'); // AdminRepository
```

### 6. Scoped Lifecycle (NEW in v1.2.0)

Per-scope instances with automatic cleanup:

```typescript
import { Container } from '@khapu2906/treasure-chest';

const container = new Container();

// Register scoped service with cleanup
container.scoped(
  'dbConnection',
  () => new DbConnection(),
  function () {
    this.close();
  } // Cleanup function
);

// Create a scope (e.g., per HTTP request)
const scope = container.createScope();

const conn1 = container.resolve('dbConnection');
const conn2 = container.resolve('dbConnection');
console.log(conn1 === conn2); // true - same instance within scope

// Cleanup when done
await scope.dispose(); // Calls cleanup functions
```

### 7. Lazy Loading (NEW in v1.2.0)

Defer expensive initialization:

```typescript
import { Container, Lazy } from '@khapu2906/treasure-chest';

const container = new Container();

// Register lazy service
container.lazy('heavyService', () => new HeavyMLModel());

// Resolve as Lazy wrapper
const lazy = container.resolve<Lazy<HeavyMLModel>>('heavyService');

console.log(lazy.isInitialized); // false - not loaded yet

// Access when needed
const model = lazy.value; // NOW it's initialized

console.log(lazy.isInitialized); // true
```

### 8. Child Containers (NEW in v1.2.0)

Container hierarchy for multi-tenant apps:

```typescript
const parent = new Container();
parent.singleton('config', () => new Config());

// Create child container
const tenant1 = parent.createChild();
tenant1.singleton('logger', () => new TenantLogger('tenant1'));

const tenant2 = parent.createChild();
tenant2.singleton('logger', () => new TenantLogger('tenant2'));

// Each tenant has its own logger but shares config
tenant1.resolve('config'); // From parent
tenant1.resolve('logger'); // From tenant1
```

### 9. Circular Dependency Detection (NEW in v1.2.0)

Automatic detection with clear error messages:

```typescript
container.bind('A', (c) => {
  const b = c.resolve('B');
  return { name: 'A', dep: b };
});

container.bind('B', (c) => {
  const a = c.resolve('A'); // Circular!
  return { name: 'B', dep: a };
});

try {
  container.resolve('A');
} catch (error) {
  console.log(error.message);
  // "Circular dependency detected: A -> B -> A"
}
```

### 10. IDisposable Interface & Auto-Dispose (NEW in v1.2.0)

Automatic cleanup detection with zero overhead:

```typescript
import { Container, IDisposable } from '@khapu2906/treasure-chest';

// Implement IDisposable for auto-cleanup
class DbConnection implements IDisposable {
  async connect() {
    console.log('Connected');
  }

  async dispose() {
    console.log('Disconnected');
  }
}

const container = new Container();

// Auto-detection: No need to pass dispose function!
container.scoped('db', () => new DbConnection());

// Using withScope() - C# using pattern
await container.withScope(async (scope) => {
  const db = container.resolve<DbConnection>('db');
  await db.connect();
  // Auto-disposed when scope exits
});
// Dispose called automatically here
```

### 11. Web Framework Integration Pattern

Pattern for automatic per-request scope management. See `examples/10-middleware.ts` for full implementation.

> **Note:** Middleware helpers are not exported from the core package to keep it framework-agnostic.
> For production use, consider creating separate adapter packages.

**Pattern Example:**

```typescript
import { Container } from '@khapu2906/treasure-chest';

const container = new Container();
container.scoped('db', () => new DbConnection());

// Express pattern
function expressScope(container: Container) {
  return (req, res, next) => {
    const scope = container.createScope();
    req.scope = scope;
    res.on('finish', () => scope.dispose());
    next();
  };
}

app.use(expressScope(container));
```

**Supported Patterns:**
- ✅ Express middleware
- ✅ Fastify hooks (onRequest/onResponse)
- ✅ Koa middleware

See [examples/10-middleware.ts](./examples/10-middleware.ts) for complete implementations.

## API Reference

### Container Class

#### Lifecycle Methods

**`bind<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn)`**

- Register a transient service (new instance each time)

**`singleton<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn)`**

- Register a singleton service (single instance shared)

**`scoped<T>(key: string, factory: FactoryFn<T>, dispose?: DisposeFn)` ⭐ NEW**

- Register a scoped service (instance per scope)
- Optional cleanup function called on dispose

**`lazy<T>(key: string, factory: FactoryFn<T>, lifecycle?: Lifecycle)` ⭐ NEW**

- Register a lazy service (deferred initialization)
- Returns `Lazy<T>` wrapper
- Default lifecycle: singleton

#### Resolution Methods

**`resolve<T>(key: string, context?: string): T`**

- Resolve a service from the container
- Supports circular dependency detection

**`has(key: string): boolean` ⭐ NEW**

- Check if a binding exists for a key

**`keys(): string[]` ⭐ NEW**

- Get all registered service keys

#### Contextual Binding

**`when(context: string).needs(key: string).give(factory: FactoryFn)`**

- Create context-specific bindings
- Fluent API for readability

**`alias(aliasKey: string, originalKey: string)`**

- Create an alias for a service

#### Container Hierarchy

**`createChild(): Container` ⭐ NEW**

- Create a child container that inherits from parent
- Children can override parent bindings

**`createScope(): Scope` ⭐ NEW**

- Create a new scope for scoped instances
- Returns a `Scope` object

**`withScope<T>(callback: (scope: Scope) => T | Promise<T>): Promise<T>` ⭐ NEW v1.2.0**

- Execute callback with auto-managed scope
- C#-style `using` statement pattern
- Automatic disposal even on errors
- Exception-safe cleanup

#### Cleanup

**`reset()`**

- Clear all bindings and instances

**`dispose(): Promise<void>` ⭐ NEW**

- Dispose container and all scoped instances
- Calls cleanup functions

### Exported Types

```typescript
import {
  Container,
  Lazy,
  Scope,
  Lifecycle,
  IDisposable,
  DisposeFn,
} from '@khapu2906/treasure-chest';

// Lifecycle: 'transient' | 'singleton' | 'scoped'
// Lazy<T>: Wrapper with .value and .isInitialized
// Scope: Scope management with .dispose()
// IDisposable: Interface for auto-cleanup detection ⭐ NEW v1.2.0
// DisposeFn: Type for cleanup functions
```

### Global Container

```typescript
import { Container } from '@khapu2906/treasure-chest';
const container = new Container();
// Use global container
container.bind('config', () => ({ env: 'production' }));
```

## Real-world Example

```typescript
import { Container } from '@khapu2906/treasure-chest';

class Database {
  connect() {
    return { status: 'connected' };
  }
}

class UserRepository {
  constructor(private db: Database) {}

  findUser(id: number) {
    return { id, name: 'John Doe' };
  }
}

class UserService {
  constructor(private repo: UserRepository) {}

  getUser(id: number) {
    return this.repo.findUser(id);
  }
}

// Setup container
const container = new Container();

container.singleton('db', () => new Database());
container.singleton('userRepo', (c) => new UserRepository(c.resolve('db')));
container.singleton(
  'userService',
  (c) => new UserService(c.resolve('userRepo'))
);

// Contextual binding
container
  .when('AdminService')
  .needs('userRepo')
  .give((c) => ({
    ...c.resolve('userRepo'),
    adminAccess: true,
  }));

// Usage
const userService = container.resolve<UserService>('userService');
console.log(userService.getUser(1)); // { id: 1, name: 'John Doe' }
```

## Examples

Check out the [examples](./examples) directory for comprehensive real-world usage patterns:

### Basic Features

1. **Basic Usage**: Transient and singleton bindings
2. **Dependency Injection**: Nested dependency resolution
3. **Conditional Binding**: Environment-based configuration
4. **Contextual Binding**: Context-aware service resolution
5. **Alias**: Multiple names for the same service

### Advanced Features (v1.2.0)

6. **Scoped Lifecycle**: Per-request services with cleanup
7. **Lazy Loading**: Performance optimization with deferred init
8. **Child Containers**: Multi-tenant and plugin systems
9. **Circular Dependency**: Detection and best practices

### Performance & Integration (v1.2.0) ⭐ NEW

10. **Web Framework Middleware**: Express, Fastify, Koa integration
    - Auto-scoping per HTTP request
    - IDisposable auto-detection
    - withScope() pattern demos

Each example includes detailed comments and runnable code.

## Development

### Install Dependencies

```bash
npm install
```

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

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

### Building

```bash
# Build for production (generates CJS, ESM, and type declarations)
npm run build

# Clean build artifacts
npm run clean
```

### Running Benchmarks ⭐ NEW v1.2.0

```bash
# Run performance benchmarks
npm run benchmark

# Results auto-saved to:
# - benchmarks/results/run-YYYY-MM-DD-HH-MM-SS.json (timestamped)
# - benchmarks/results/history.jsonl (append-only log)
# - benchmarks/results/LATEST.md (human-readable report)
```

See [benchmarks/README.md](./benchmarks/README.md) for detailed documentation on:
- Benchmark categories
- Result formats
- Comparing performance over time
- Expected performance metrics

### Running Examples

```bash
# Run a specific example
npm run example:01  # Basic usage
npm run example:02  # Dependency injection
npm run example:10  # Middleware (v1.2.0)

# Run all examples sequentially
npm run examples
```

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and development process.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a list of changes and version history.

## License

This project is licensed under the DIB License - see the [LICENSE](./LICENSE) file for details.

## Author

**Kent Phung**

- GitHub: [@khapu2906](https://github.com/khapu2906)
- Package: [@khapu2906/treasure-chest](https://www.npmjs.com/package/@khapu2906/treasure-chest)

## Support

If you encounter any issues or have questions:

- Open an issue on [GitHub Issues](https://github.com/khapu2906/treasure-chest/issues)
- Check the [examples](./examples) for usage patterns
- Read the [API Reference](#api-reference) above

---

Made with ❤️ by Kent Phung
