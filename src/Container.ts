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
  ServiceKey,
} from './types';
import { Lazy } from './Lazy';
import { Scope } from './Scope';
import {
  Graph,
  type GraphEdge,
  type GraphNode,
} from './Graph';

/**
 * A matched binding paired with the container that actually declared it.
 * Needed so singleton instances are cached on the declaring (owning)
 * container instead of whichever container happened to call resolve().
 */
interface BindingEntry {
  binding: Binding;
  owner: Container;
}

/**
 * Two-level map keyed by (service key, optional context key).
 *
 * Keys are compared by identity, never by their string form, so two
 * distinct Symbols with the same description (`Symbol('x')` twice) or a
 * string key that looks like a Symbol (`'Symbol(x)'`) never collide.
 */
class KeyContextMap<V> {
  private readonly map = new Map<ServiceKey, Map<ServiceKey | undefined, V>>();

  get(key: ServiceKey, context?: ServiceKey): V | undefined {
    return this.map.get(key)?.get(context);
  }

  has(key: ServiceKey, context?: ServiceKey): boolean {
    return this.map.get(key)?.has(context) ?? false;
  }

  set(key: ServiceKey, context: ServiceKey | undefined, value: V): void {
    let inner = this.map.get(key);
    if (!inner) {
      inner = new Map();
      this.map.set(key, inner);
    }
    inner.set(context, value);
  }

  clear(): void {
    this.map.clear();
  }
}

/** Graph node data before service keys are turned into display labels */
interface RawGraphNode extends Omit<GraphNode, 'key' | 'context' | 'aliasOf'> {
  key: ServiceKey;
  context?: ServiceKey;
  aliasOf?: ServiceKey;
}

/** Graph edge data before service keys are turned into display labels */
interface RawGraphEdge {
  from: ServiceKey;
  to: ServiceKey;
}

interface RawGraphSnapshot {
  nodes: RawGraphNode[];
  edges: RawGraphEdge[];
}

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
  private bindings = new Map<ServiceKey, Binding[]>();

  /** Cache for singleton instances, keyed by (service key, binding context) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instances = new KeyContextMap<any>();

  /** Cache for lazy singleton wrappers */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private lazyInstances = new Map<ServiceKey, Lazy<any>>();

  /** Mapping of aliases to original keys */
  private aliases = new Map<ServiceKey, ServiceKey>();

  /** Cache for resolved bindings - performance optimization */
  private bindingCache = new KeyContextMap<BindingEntry>();

  /** Current resolution context for contextual binding */
  private currentContext?: ServiceKey;

  /** Parent container for hierarchy */
  private parent?: Container;

  /** Composed containers for composition pattern */
  private composedContainers: Container[] = [];

  /** Current active scope */
  private currentScope?: Scope;

  /** Resolution stack for circular dependency detection */
  private resolutionStack: ServiceKey[] = [];

  /** Dependency edges observed while resolving: consumerKey -> Set of dependency keys */
  private dependencyEdges = new Map<ServiceKey, Set<ServiceKey>>();

  /**
   * Create a new container
   * @param parent Optional parent container for hierarchy
   */
  constructor(parent?: Container) {
    this.parent = parent;
  }

  /**
   * Record that `from` depends on `to`, for later inspection via graph()
   * @private
   */
  private _recordEdge(from: ServiceKey, to: ServiceKey): void {
    if (from === to) return;

    const deps = this.dependencyEdges.get(from) ?? new Set<ServiceKey>();
    deps.add(to);
    this.dependencyEdges.set(from, deps);
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
  bind<T>(key: ServiceKey, factory: FactoryFn<T>, condition?: ConditionFn) {
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
  singleton<T>(
    key: ServiceKey,
    factory: FactoryFn<T>,
    condition?: ConditionFn
  ) {
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
  scoped<T>(key: ServiceKey, factory: FactoryFn<T>, dispose?: DisposeFn) {
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
    key: ServiceKey,
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
  alias(aliasKey: ServiceKey, originalKey: ServiceKey) {
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
  private findBinding(
    key: ServiceKey,
    context?: ServiceKey
  ): Binding | undefined {
    return this.findBindingEntry(key, context)?.binding;
  }

  /**
   * Find the appropriate binding for a given key and context, along with
   * the container that actually declared it (the "owner"). Searches in
   * current container and parent containers. Uses cached result when
   * possible for performance.
   *
   * @private
   * @param key The service key to find
   * @param context Optional context for contextual binding
   * @returns The matching binding paired with its owning container, or undefined
   */
  private findBindingEntry(
    key: ServiceKey,
    context?: ServiceKey
  ): BindingEntry | undefined {
    const realKey = this.aliases.get(key) || key;

    // Check cache first
    if (this.bindingCache.has(realKey, context)) {
      return this.bindingCache.get(realKey, context);
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

      if (match) {
        const entry: BindingEntry = { binding: match, owner: this };

        // Cache the result only if no conditions (conditions are dynamic)
        if (!match.condition) {
          this.bindingCache.set(realKey, context, entry);
        }

        return entry;
      }
    }

    // Try parent container
    if (this.parent) {
      return this.parent.findBindingEntry(key, context);
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
  resolve<T>(key: ServiceKey, context?: ServiceKey): T {
    const realKey = this.aliases.get(key) || key;

    // Circular dependency detection
    if (this.resolutionStack.includes(realKey)) {
      const chain = [...this.resolutionStack, realKey]
        .map((k) => k.toString())
        .join(' -> ');
      throw new Error(`Circular dependency detected: ${chain}`);
    }

    // Record dependency edge: whatever is currently resolving depends on this key
    if (this.resolutionStack.length > 0) {
      const consumer = this.resolutionStack[this.resolutionStack.length - 1];
      this._recordEdge(consumer, realKey);
    }

    const prevContext = this.currentContext;
    this.currentContext = context || key;

    const entry = this.findBindingEntry(key, this.currentContext);

    if (!entry) {
      throw new Error(`No binding found for key: ${realKey.toString()}`);
    }

    const { binding, owner } = entry;

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
          // Cached on the owning container so the instance is truly
          // shared across every child that inherits the binding.
          return owner.resolveSingleton(binding, realKey);
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
  private resolveSingleton<T>(binding: Binding<T>, cacheKey: ServiceKey): T {
    // Singletons can be contextual, so instances are keyed by (key, context).
    if (this.instances.has(cacheKey, binding.context)) {
      return this.instances.get(cacheKey, binding.context);
    }

    const instance = binding.factory(this);
    this.instances.set(cacheKey, binding.context, instance);
    return instance;
  }

  /**
   * Resolve a scoped instance
   * @private
   */
  private resolveScoped<T>(binding: Binding<T>, key: ServiceKey): T {
    if (!this.currentScope) {
      throw new Error(
        `No active scope for scoped binding: ${key.toString()}. Call createScope() first.`
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
  private resolveLazy<T>(binding: Binding<T>, cacheKey: ServiceKey): Lazy<T> {
    const cached = this.lazyInstances.get(cacheKey);
    if (cached) {
      return cached;
    }

    const lazy = new Lazy(() => binding.factory(this));

    if (binding.lifecycle === 'singleton') {
      this.lazyInstances.set(cacheKey, lazy);
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
  when(context: ServiceKey) {
    return {
      needs: (depKey: ServiceKey) => ({
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
  has(key: ServiceKey): boolean {
    // We check both the main bindings and aliases
    if (this.bindings.has(key) || this.aliases.has(key)) {
      return true;
    }
    // Check parent if it exists
    if (this.parent && this.parent.has(key)) {
      return true;
    }
    // A simple findBinding is not enough as it might not check aliases correctly
    // across the hierarchy. A more robust check is needed.
    try {
      return this.findBinding(key) !== undefined;
    } catch {
      return false;
    }
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
  keys(): ServiceKey[] {
    const ownKeys = Array.from(this.bindings.keys());
    const parentKeys = this.parent ? this.parent.keys() : [];
    return [...new Set([...ownKeys, ...parentKeys])];
  }

  /**
   * Collect this container's bindings (own, inherited from a parent, and
   * inherited from composed containers), plus the dependency edges observed
   * so far. Keys are kept as real ServiceKeys here; graph() turns them into
   * unique display labels afterwards.
   *
   * @private
   * @param seen Keys already captured by a more specific (closer) container
   */
  private inspect(seen: Set<ServiceKey> = new Set()): RawGraphSnapshot {
    const nodes: RawGraphNode[] = [];

    for (const [key, bindingList] of this.bindings) {
      if (seen.has(key)) continue;
      seen.add(key);

      for (const binding of bindingList) {
        nodes.push({
          key,
          lifecycle: binding.lifecycle,
          lazy: !!binding.lazy,
          context: binding.context,
          inherited: false,
          resolved:
            this.instances.has(key, binding.context) ||
            this.lazyInstances.has(key),
        });
      }
    }

    for (const [aliasKey, originalKey] of this.aliases) {
      if (seen.has(aliasKey)) continue;
      seen.add(aliasKey);

      const target = this.findBinding(aliasKey);
      nodes.push({
        key: aliasKey,
        lifecycle: target?.lifecycle ?? 'transient',
        lazy: !!target?.lazy,
        aliasOf: originalKey,
        inherited: false,
        resolved: false,
      });
    }

    const edges: RawGraphEdge[] = [];
    for (const [from, tos] of this.dependencyEdges) {
      for (const to of tos) {
        edges.push({ from, to });
      }
    }

    const ancestors = [
      ...(this.parent ? [this.parent] : []),
      ...this.composedContainers,
    ];

    for (const ancestor of ancestors) {
      const snapshot = ancestor.inspect(seen);
      for (const node of snapshot.nodes) {
        nodes.push({ ...node, inherited: true });
      }
      edges.push(...snapshot.edges);
    }

    return { nodes, edges };
  }

  /**
   * Assign every distinct service key a unique, human-readable label.
   *
   * String keys always keep their own value as label. Other keys use
   * `toString()`; when that is already taken by a different key (e.g. two
   * `Symbol('db')`s, or `Symbol('db')` next to the string `'Symbol(db)'`),
   * a `#2`, `#3`, ... suffix is appended so graph nodes never merge.
   *
   * @private
   */
  private static labelKeys(keys: Iterable<ServiceKey>): Map<ServiceKey, string> {
    const all = [...new Set(keys)];
    const labels = new Map<ServiceKey, string>();
    const used = new Set<string>();

    for (const key of all) {
      if (typeof key === 'string') {
        labels.set(key, key);
        used.add(key);
      }
    }

    for (const key of all) {
      if (typeof key === 'string') continue;
      const base = key.toString();
      let label = base;
      for (let n = 2; used.has(label); n++) {
        label = `${base}#${n}`;
      }
      labels.set(key, label);
      used.add(label);
    }

    return labels;
  }

  /**
   * Build a filterable dependency graph of this container's bindings and
   * the dependency edges observed while resolving them.
   *
   * @returns A Graph snapshot you can filter/inspect
   *
   * @example
   * ```typescript
   * const graph = container.graph();
   * const singletons = graph.getNodes({ lifecycle: 'singleton' });
   * const deps = graph.dependenciesOf('userService');
   * ```
   */
  graph(): Graph {
    const raw = this.inspect();

    const keys: ServiceKey[] = [];
    for (const node of raw.nodes) {
      keys.push(node.key);
      if (node.context !== undefined) keys.push(node.context);
      if (node.aliasOf !== undefined) keys.push(node.aliasOf);
    }
    for (const edge of raw.edges) {
      keys.push(edge.from, edge.to);
    }

    const labels = Container.labelKeys(keys);
    const label = (key: ServiceKey) => labels.get(key) as string;

    const nodes: GraphNode[] = raw.nodes.map((node) => {
      const out: GraphNode = {
        key: label(node.key),
        lifecycle: node.lifecycle,
        lazy: node.lazy,
        inherited: node.inherited,
        resolved: node.resolved,
      };
      // Preserve the node shape graph() has always produced: binding nodes
      // carry `context` (possibly undefined), alias nodes carry `aliasOf`.
      if ('context' in node) {
        out.context =
          node.context !== undefined ? label(node.context) : undefined;
      }
      if (node.aliasOf !== undefined) out.aliasOf = label(node.aliasOf);
      return out;
    });

    const edges: GraphEdge[] = raw.edges.map((edge) => ({
      from: label(edge.from),
      to: label(edge.to),
    }));

    return new Graph({ nodes, edges }, labels);
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
    this.lazyInstances.clear();
    this.aliases.clear();
    this.bindingCache.clear();
    this.dependencyEdges.clear();
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
    const allKeys = new Set<ServiceKey>();
    containers.forEach((container) => {
      container.keys().forEach((key) => allKeys.add(key));
    });

    // Bind proxy resolvers
    for (const key of allKeys) {
      composed.bind(key, (c) =>
        c.resolveFromComposition(key, c.currentContext)
      );
    }

    return composed;
  }

  /**
   * Resolve a service from composed containers
   * @private
   */
  private resolveFromComposition<T>(key: ServiceKey, context?: ServiceKey): T {
    let foundDefaultResolution: { container: Container; result: T } | undefined;

    for (const container of this.composedContainers) {
      // Temporarily use `findBinding` to inspect without full resolution
      // This is a workaround due to `resolve` not returning binding metadata.
      const binding = (container as any)['findBinding'](key, context);

      if (binding) {
        if (binding.context === context) {
          // Found a perfect contextual match, this takes highest priority.
          return container.resolve(key, context);
        } else if (
          !binding.context &&
          !binding.condition &&
          !foundDefaultResolution
        ) {
          // This is a non-contextual, non-conditional default binding. Store the first one as fallback.
          // Only store if we haven't found any default yet.
          foundDefaultResolution = {
            container: container,
            result: container.resolve(key, undefined), // Resolve default from this container (without context)
          };
        }
      }
    }

    if (foundDefaultResolution) {
      return foundDefaultResolution.result;
    }

    throw new Error(`No binding found for key: ${key.toString()}`);
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
