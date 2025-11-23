/**
 * Container class for dependency injection
 *
 * @module Container
 */

import type {
  Binding,
  ConditionFn,
  DisposeFn,
  FactoryFn,
  Lifecycle,
} from './types';
import { Lazy } from './Lazy';
import { Scope } from './Scope';

/**
 * Container class for dependency injection
 * Manages service bindings, instances, and resolution logic
 *
 * @example
 * ```typescript
 * const container = new Container();
 * container.bind('logger', () => new Logger());
 * const logger = container.resolve<Logger>('logger');
 * ```
 */
export class Container {
  /** Map-based storage for bindings - O(1) lookup */
  private bindings = new Map<string, Binding[]>();

  /** Cache for singleton instances */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instances = new Map<string, any>();

  /** Mapping of aliases to original keys */
  private aliases = new Map<string, string>();

  /** Cache for resolved bindings - performance optimization */
  private bindingCache = new Map<string, Binding>();

  /** Current resolution context for contextual binding */
  private currentContext?: string;

  /** Parent container for hierarchy */
  private parent?: Container;

  /** Composed containers for composition pattern */
  private composedContainers: Container[] = [];

  /** Current active scope */
  private currentScope?: Scope;

  /** Resolution stack for circular dependency detection */
  private resolutionStack: string[] = [];

  /**
   * Create a new container
   * @param parent Optional parent container for hierarchy
   */
  constructor(parent?: Container) {
    this.parent = parent;
  }

  /**
   * Register a transient binding (new instance on each resolve)
   *
   * @template T The type of service being bound
   * @param key The unique identifier for this service
   * @param factory Factory function that creates the service instance
   * @param condition Optional condition function for conditional binding
   *
   * @example
   * ```typescript
   * container.bind('database', (c) => new Database());
   * container.bind('cache', (c) => new Cache(), (c) => process.env.CACHE_ENABLED === 'true');
   * ```
   */
  bind<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn) {
    const existing = this.bindings.get(key) || [];
    existing.push({ key, factory, lifecycle: 'transient', condition });
    this.bindings.set(key, existing);
    this.bindingCache.clear(); // Invalidate cache
  }

  /**
   * Register a singleton binding (single instance shared across all resolves)
   *
   * @template T The type of service being bound
   * @param key The unique identifier for this service
   * @param factory Factory function that creates the service instance
   * @param condition Optional condition function for conditional binding
   *
   * @example
   * ```typescript
   * container.singleton('config', (c) => new Config());
   * ```
   */
  singleton<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn) {
    const existing = this.bindings.get(key) || [];
    existing.push({ key, factory, lifecycle: 'singleton', condition });
    this.bindings.set(key, existing);
    this.bindingCache.clear();
  }

  /**
   * Register a scoped binding (single instance per scope)
   *
   * @template T The type of service being bound
   * @param key The unique identifier for this service
   * @param factory Factory function that creates the service instance
   * @param dispose Optional disposal function for cleanup
   *
   * @example
   * ```typescript
   * container.scoped('dbConnection', (c) => new DbConnection(), () => {
   *   console.log('Closing connection');
   * });
   * ```
   */
  scoped<T>(key: string, factory: FactoryFn<T>, dispose?: DisposeFn) {
    const existing = this.bindings.get(key) || [];
    existing.push({ key, factory, lifecycle: 'scoped', dispose });
    this.bindings.set(key, existing);
    this.bindingCache.clear();
  }

  /**
   * Register a lazy binding (deferred initialization)
   *
   * @template T The type of service being bound
   * @param key The unique identifier for this service
   * @param factory Factory function that creates the service instance
   * @param lifecycle The lifecycle type (default: singleton)
   *
   * @example
   * ```typescript
   * container.lazy('heavyService', (c) => new HeavyService());
   * const lazy = container.resolve<Lazy<HeavyService>>('heavyService');
   * // Not initialized yet
   * const service = lazy.value; // Initialized now
   * ```
   */
  lazy<T>(
    key: string,
    factory: FactoryFn<T>,
    lifecycle: Lifecycle = 'singleton'
  ) {
    const existing = this.bindings.get(key) || [];
    existing.push({ key, factory, lifecycle, lazy: true });
    this.bindings.set(key, existing);
    this.bindingCache.clear();
  }

  /**
   * Create an alias for an existing service key
   *
   * @param aliasKey The new alias name
   * @param originalKey The original service key to alias
   *
   * @example
   * ```typescript
   * container.bind('UserRepository', () => new UserRepo());
   * container.alias('UserRepo', 'UserRepository');
   * // Both keys now resolve to the same binding
   * ```
   */
  alias(aliasKey: string, originalKey: string) {
    this.aliases.set(aliasKey, originalKey);
  }

  /**
   * Create a child container that inherits from this container
   *
   * @returns A new child container
   *
   * @example
   * ```typescript
   * const parent = new Container();
   * parent.singleton('config', () => new Config());
   *
   * const child = parent.createChild();
   * child.bind('logger', () => new Logger());
   *
   * // Child can resolve both parent and own bindings
   * const config = child.resolve('config'); // From parent
   * const logger = child.resolve('logger'); // From child
   * ```
   */
  createChild(): Container {
    return new Container(this);
  }

  /**
   * Create a new scope for scoped instances
   *
   * @returns A new scope
   *
   * @example
   * ```typescript
   * const scope = container.createScope();
   * container.scoped('request', () => new Request());
   *
   * const req1 = container.resolve('request'); // Same instance within scope
   * const req2 = container.resolve('request'); // Same as req1
   *
   * await scope.dispose(); // Clean up scoped instances
   * ```
   */
  createScope(): Scope {
    const scope = new Scope();
    this.currentScope = scope;
    return scope;
  }

  /**
   * Execute a callback with a temporary scope
   * Auto-disposes the scope when done (like C# using statement)
   *
   * @param callback Function to execute within the scope
   * @returns The result of the callback
   *
   * @example
   * ```typescript
   * await container.withScope(async (scope) => {
   *   const db = container.resolve('dbConnection');
   *   await db.query('...');
   *   // Auto-disposed when callback completes
   * });
   * ```
   */
  async withScope<T>(callback: (scope: Scope) => T | Promise<T>): Promise<T> {
    const scope = this.createScope();
    try {
      return await callback(scope);
    } finally {
      await scope.dispose();
    }
  }

  /**
   * Find the appropriate binding for a given key and context
   * Searches in current container and parent containers
   * Uses cached result when possible for performance
   *
   * @private
   * @param key The service key to find
   * @param context Optional context for contextual binding
   * @returns The matching binding or undefined
   */
  private findBinding(key: string, context?: string): Binding | undefined {
    const realKey = this.aliases.get(key) || key;
    const cacheKey = context ? `${realKey}::${context}` : realKey;

    // Check cache first
    if (this.bindingCache.has(cacheKey)) {
      return this.bindingCache.get(cacheKey);
    }

    // O(1) Map lookup instead of O(n) array filter
    const bindings = this.bindings.get(realKey);

    if (bindings && bindings.length > 0) {
      // Priority:
      // 1. Binding with context and condition true
      // 2. Binding without context but condition true
      // 3. Binding default first
      const match =
        bindings.find(
          (b) => b.context === context && (!b.condition || b.condition(this))
        ) ||
        bindings.find(
          (b) => !b.context && (!b.condition || b.condition(this))
        ) ||
        bindings[0];

      // Cache the result only if no conditions (conditions are dynamic)
      if (match && !match.condition) {
        this.bindingCache.set(cacheKey, match);
      }

      return match;
    }

    // Try parent container
    if (this.parent) {
      return this.parent.findBinding(key, context);
    }

    return undefined;
  }

  /**
   * Resolve a service instance from the container
   * Handles transient, singleton, scoped, and lazy bindings
   *
   * @template T The expected type of the resolved service
   * @param key The service key to resolve
   * @param context Optional context for contextual resolution
   * @returns The resolved service instance
   * @throws Error if no binding exists for the key
   * @throws Error if circular dependency is detected
   *
   * @example
   * ```typescript
   * const logger = container.resolve<Logger>('logger');
   * const userRepo = container.resolve('UserRepo', 'UserService');
   * ```
   */
  resolve<T>(key: string, context?: string): T {
    const realKey = this.aliases.get(key) || key;

    // Circular dependency detection
    if (this.resolutionStack.includes(realKey)) {
      const chain = [...this.resolutionStack, realKey].join(' -> ');
      throw new Error(`Circular dependency detected: ${chain}`);
    }

    const prevContext = this.currentContext;
    this.currentContext = context || key;

    const binding = this.findBinding(key, this.currentContext);

    if (!binding) {
      throw new Error(`No binding found for key: ${realKey}`);
    }

    // Add to resolution stack
    this.resolutionStack.push(realKey);

    try {
      // Handle lazy binding
      if (binding.lazy) {
        const instance = this.resolveLazy(binding, realKey);
        return instance as T;
      }

      // Handle different lifecycles
      switch (binding.lifecycle) {
        case 'singleton':
          return this.resolveSingleton(binding, realKey);
        case 'scoped':
          return this.resolveScoped(binding, realKey);
        case 'transient':
        default:
          return this.resolveTransient(binding);
      }
    } finally {
      // Remove from resolution stack
      this.resolutionStack.pop();
      this.currentContext = prevContext;
    }
  }

  /**
   * Resolve a transient instance
   * @private
   */
  private resolveTransient<T>(binding: Binding<T>): T {
    return binding.factory(this);
  }

  /**
   * Resolve a singleton instance
   * @private
   */
  private resolveSingleton<T>(binding: Binding<T>, cacheKey: string): T {
    const fullCacheKey = binding.context
      ? `${cacheKey}::${binding.context}`
      : cacheKey;

    if (this.instances.has(fullCacheKey)) {
      return this.instances.get(fullCacheKey);
    }

    const instance = binding.factory(this);
    this.instances.set(fullCacheKey, instance);
    return instance;
  }

  /**
   * Resolve a scoped instance
   * @private
   */
  private resolveScoped<T>(binding: Binding<T>, key: string): T {
    if (!this.currentScope) {
      throw new Error(
        `No active scope for scoped binding: ${key}. Call createScope() first.`
      );
    }

    if (this.currentScope.has(key)) {
      return this.currentScope.get(key);
    }

    const instance = binding.factory(this);
    this.currentScope.set(key, instance, binding.dispose);
    return instance;
  }

  /**
   * Resolve a lazy instance
   * @private
   */
  private resolveLazy<T>(binding: Binding<T>, cacheKey: string): Lazy<T> {
    const fullCacheKey = `lazy::${cacheKey}`;

    if (this.instances.has(fullCacheKey)) {
      return this.instances.get(fullCacheKey);
    }

    const lazy = new Lazy(() => binding.factory(this));

    if (binding.lifecycle === 'singleton') {
      this.instances.set(fullCacheKey, lazy);
    }

    return lazy;
  }

  /**
   * Create a contextual binding (different implementations based on context)
   * Provides a fluent API for defining context-specific dependencies
   *
   * @param context The context identifier (usually a service name)
   * @returns A fluent API object with needs() method
   *
   * @example
   * ```typescript
   * // UserService will receive MockUserRepo
   * container.when('UserService').needs('UserRepo').give(() => new MockUserRepo());
   *
   * // OrderService will receive RealUserRepo
   * container.when('OrderService').needs('UserRepo').give(() => new RealUserRepo());
   * ```
   */
  when(context: string) {
    return {
      needs: (depKey: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        give: (factory: FactoryFn<any>) => {
          const existing = this.bindings.get(depKey) || [];
          existing.push({
            key: depKey,
            factory,
            lifecycle: 'transient',
            context,
          });
          this.bindings.set(depKey, existing);
          this.bindingCache.clear();
        },
      }),
    };
  }

  /**
   * Check if a binding exists for a key
   *
   * @param key The service key to check
   * @returns True if binding exists
   *
   * @example
   * ```typescript
   * if (container.has('logger')) {
   *   const logger = container.resolve('logger');
   * }
   * ```
   */
  has(key: string): boolean {
    return this.findBinding(key) !== undefined;
  }

  /**
   * Get all registered service keys
   *
   * @returns Array of service keys
   *
   * @example
   * ```typescript
   * const keys = container.keys();
   * console.log('Registered services:', keys);
   * ```
   */
  keys(): string[] {
    const ownKeys = Array.from(this.bindings.keys());
    const parentKeys = this.parent ? this.parent.keys() : [];
    return [...new Set([...ownKeys, ...parentKeys])];
  }

  /**
   * Reset the container to its initial state
   * Clears all bindings, instances, aliases, and context
   * Useful for testing scenarios
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   container.reset();
   * });
   * ```
   */
  reset() {
    this.bindings.clear();
    this.instances.clear();
    this.aliases.clear();
    this.bindingCache.clear();
    this.currentContext = undefined;
    this.currentScope = undefined;
    this.resolutionStack = [];
  }

  /**
   * Compose multiple containers into a new container
   * This allows mixing services from different domains without inheritance
   *
   * @param containers Array of containers to compose
   * @returns New composed container
   */
  static compose(containers: Container[]): Container {
    const composed = new Container();

    // Validate containers
    if (!containers || containers.length === 0) {
      throw new Error(
        'At least one container must be provided for composition'
      );
    }

    // Store composed containers
    composed.composedContainers = [...containers];

    // Create proxy bindings for all keys from composed containers
    const allKeys = new Set<string>();
    containers.forEach((container) => {
      container.keys().forEach((key) => allKeys.add(key));
    });

    // Bind proxy resolvers
    for (const key of allKeys) {
      composed.bind(key, (c) => c.resolveFromComposition(key));
    }

    return composed;
  }

  /**
   * Resolve a service from composed containers
   * @private
   */
  private resolveFromComposition<T>(key: string): T {
    // Search through composed containers in order
    for (const container of this.composedContainers) {
      if (container.has(key)) {
        return container.resolve(key);
      }
    }

    throw new Error(`No binding found for key: ${key}`);
  }

  /**
   * Dispose the container and all its scoped instances
   */
  async dispose() {
    if (this.currentScope) {
      await this.currentScope.dispose();
    }
    this.reset();
  }
}
