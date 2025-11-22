/**
 * Example 8: Child Containers (Hierarchy)
 *
 * This example demonstrates:
 * - Creating child containers
 * - Inheritance from parent containers
 * - Overriding parent bindings
 * - Use cases: multi-tenant applications, plugin systems
 */

import { Container } from '../src/index';

// Shared configuration
class AppConfig {
  constructor(public appName: string) {
    console.log(`[Config] App: ${appName}`);
  }
}

// Logger interface
interface Logger {
  log(message: string): void;
}

// Different logger implementations
class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(`[CONSOLE] ${message}`);
  }
}

class PrefixedLogger implements Logger {
  constructor(private prefix: string) {}

  log(message: string) {
    console.log(`[${this.prefix}] ${message}`);
  }
}

// Service that uses logger
class UserService {
  constructor(
    private logger: Logger,
    private config: AppConfig
  ) {}

  createUser(name: string) {
    this.logger.log(`Creating user: ${name} in ${this.config.appName}`);
    return { id: Math.random(), name };
  }
}

// Setup parent container (global/shared services)
const parentContainer = new Container();

parentContainer.singleton('config', () => new AppConfig('MyApp'));
parentContainer.singleton('logger', () => new ConsoleLogger());

console.log('=== Child Containers Demo ===\n');

console.log('--- Parent Container ---');
const parentUserService = parentContainer.resolve(
  'userService',
  () =>
    new UserService(
      parentContainer.resolve('logger'),
      parentContainer.resolve('config')
    )
);

console.log('\n--- Tenant 1: Default Logger ---');
const tenant1Container = parentContainer.createChild();

// Tenant 1 uses parent's logger
tenant1Container.bind(
  'userService',
  (c) =>
    new UserService(c.resolve<Logger>('logger'), c.resolve<AppConfig>('config'))
);

const tenant1Service = tenant1Container.resolve<UserService>('userService');
tenant1Service.createUser('Alice');

console.log('\n--- Tenant 2: Custom Logger ---');
const tenant2Container = parentContainer.createChild();

// Tenant 2 overrides logger with custom one
tenant2Container.singleton('logger', () => new PrefixedLogger('TENANT-2'));

tenant2Container.bind(
  'userService',
  (c) =>
    new UserService(c.resolve<Logger>('logger'), c.resolve<AppConfig>('config'))
);

const tenant2Service = tenant2Container.resolve<UserService>('userService');
tenant2Service.createUser('Bob');

console.log('\n--- Tenant 3: Nested Child Container ---');
const tenant3Container = tenant2Container.createChild(); // Child of tenant2!

// Inherits from both parent and tenant2
tenant3Container.bind(
  'userService',
  (c) =>
    new UserService(c.resolve<Logger>('logger'), c.resolve<AppConfig>('config'))
);

const tenant3Service = tenant3Container.resolve<UserService>('userService');
tenant3Service.createUser('Charlie');

console.log('\n--- Plugin System Example ---');
const pluginContainer = parentContainer.createChild();

// Plugin adds its own services
pluginContainer.singleton('pluginFeature', () => ({
  name: 'AwesomeFeature',
  version: '1.0',
}));

console.log('Parent has pluginFeature?', parentContainer.has('pluginFeature')); // false
console.log('Plugin has pluginFeature?', pluginContainer.has('pluginFeature')); // true
console.log('Plugin has config (from parent)?', pluginContainer.has('config')); // true

console.log('\n=== Benefits of Child Containers ===');
console.log('1. Isolation: Each tenant/plugin has its own container');
console.log('2. Inheritance: Shared services from parent');
console.log('3. Override: Customize specific services per tenant');
console.log('4. Hierarchy: Multi-level container trees');
