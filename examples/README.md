# Treasure Chest Examples

This directory contains practical examples demonstrating the features of Treasure Chest dependency injection container.

## Running Examples

Each example is a standalone TypeScript file that can be run with `ts-node`:

```bash
# Install ts-node if you haven't already
npm install -g ts-node

# Run any example
ts-node examples/01-basic-usage.ts
```

Or compile and run:

```bash
# Compile the example
tsc examples/01-basic-usage.ts --esModuleInterop --resolveJsonModule

# Run the compiled JavaScript
node examples/01-basic-usage.js
```

## Examples Overview

### 1. Basic Usage (`01-basic-usage.ts`)

- Creating a container
- Transient bindings (new instance each time)
- Singleton bindings (shared instance)
- Resolving services

**Concepts**: `bind()`, `singleton()`, `resolve()`

### 2. Dependency Injection (`02-dependency-injection.ts`)

- Services depending on other services
- Nested dependency resolution
- Constructor injection pattern
- Real-world service architecture

**Concepts**: Dependency chains, automatic resolution

### 3. Conditional Binding (`03-conditional-binding.ts`)

- Multiple bindings for the same key
- Condition functions to select bindings
- Environment-based configuration
- Different implementations based on runtime conditions

**Concepts**: `bind()` with conditions, environment-driven DI

### 4. Contextual Binding (`04-contextual-binding.ts`)

- Different implementations based on calling context
- Fluent API for contextual bindings
- Real-world caching strategies
- Service-specific dependencies

**Concepts**: `when().needs().give()`, context-aware resolution

### 5. Alias (`05-alias.ts`)

- Creating multiple names for the same binding
- Interface-based naming conventions
- Naming flexibility and convenience

**Concepts**: `alias()`, naming patterns

### 6. Scoped Lifecycle (`06-scoped-lifecycle.ts`)

- Scoped bindings (instance per scope)
- Creating and managing scopes
- Resource disposal and cleanup
- Per-request services in web applications

**Concepts**: `scoped()`, `createScope()`, `dispose()`

### 7. Lazy Loading (`07-lazy-loading.ts`)

- Lazy bindings for deferred initialization
- Performance benefits of lazy loading
- Conditional loading based on runtime
- `Lazy<T>` wrapper usage

**Concepts**: `lazy()`, performance optimization

### 8. Child Containers (`08-child-containers.ts`)

- Creating child containers with hierarchy
- Inheritance from parent containers
- Overriding parent bindings
- Multi-tenant and plugin systems

**Concepts**: `createChild()`, container hierarchy

### 9. Circular Dependency Detection (`09-circular-dependency.ts`)

- How circular dependencies are detected
- Error messages with dependency chains
- Refactoring patterns to avoid circulars
- Best practices

**Concepts**: Circular detection, dependency design

## Learning Path

If you're new to Treasure Chest, we recommend following the examples in order:

**Basic Features:**

1. Start with **01-basic-usage** to understand the fundamentals
2. Move to **02-dependency-injection** to see real-world patterns
3. Explore **03-conditional-binding** for environment-based configuration
4. Learn **04-contextual-binding** for advanced scenarios
5. Check **05-alias** for naming convenience

**Advanced Features:** 6. Try **06-scoped-lifecycle** for per-request services 7. Learn **07-lazy-loading** for performance optimization 8. Explore **08-child-containers** for multi-tenant apps 9. Study **09-circular-dependency** to avoid design issues

## Real-World Use Cases

These examples are simplified for learning purposes, but they demonstrate patterns used in production applications:

- **Microservices**: Different database connections per service
- **Testing**: Mock implementations in test environment
- **Multi-tenancy**: Different configurations per tenant
- **Feature Flags**: Enable/disable features at runtime
- **A/B Testing**: Different implementations for different user groups

## Need Help?

- Check the main [README.md](../README.md) for API documentation
- Read the [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup
- Open an issue on [GitHub](https://github.com/khapu2906/treasure-chest/issues)

Happy coding!
