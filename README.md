# Treasure Chest

A simple and powerful TypeScript dependency injection container.

## Installation

```bash
npm install @khapu2906/treasure-chest
```

## Basic Usage

```typescript
import { Container } from '@khapu2906/treasure-chest';

const container = new Container();

// Register a service
container.bind('logger', () => ({
  log: (message: string) => console.log(`[LOG] ${message}`)
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

container.bind('storage', () => ({ type: 'local' }), () => env === 'development');
container.bind('storage', () => ({ type: 's3' }), () => env === 'production');

const storage = container.resolve('storage'); // { type: 's3' }
```

### 5. Contextual Binding
Register different implementations for different contexts:

```typescript
container.when('UserService').needs('repository').give(() => new UserRepository());
container.when('AdminService').needs('repository').give(() => new AdminRepository());

const userRepo = container.resolve('repository', 'UserService'); // UserRepository
const adminRepo = container.resolve('repository', 'AdminService'); // AdminRepository
```

## API Reference

### Container Class

#### `bind<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn)`
Register a transient service.

#### `singleton<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn)`
Register a singleton service.

#### `alias(aliasKey: string, originalKey: string)`
Create an alias for a service.

#### `resolve<T>(key: string, context?: string): T`
Resolve a service from the container.

#### `when(context: string)`
Start a contextual binding chain.

#### `reset()`
Clear all bindings and instances (useful for testing).

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
container.singleton('userService', (c) => new UserService(c.resolve('userRepo')));

// Contextual binding
container.when('AdminService').needs('userRepo').give((c) => ({
  ...c.resolve('userRepo'),
  adminAccess: true
}));

// Usage
const userService = container.resolve<UserService>('userService');
console.log(userService.getUser(1)); // { id: 1, name: 'John Doe' }
```

## Testing

```bash
npm test
```

## Build

```bash
npm run build
```

## License

MIT</content>
<filePath>/Users/daikhanhphung/K-Doc/Projects/Packages/@khapu2906/treasure-chest/README.md