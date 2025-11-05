/**
 * Treasure Chest Service Container in TypeScript
 * Supports:
 *  - bind / singleton
 *  - conditional binding
 *  - contextual binding
 *  - alias
 *  - resolve
 */

type FactoryFn<T> = (c: Container) => T;
type ConditionFn = (c: Container) => boolean;

interface Binding<T = any> {
  key: string;
  factory: FactoryFn<T>;
  singleton: boolean;
  condition?: ConditionFn;
  context?: string;
}

export class Container {
  private bindings: Binding[] = [];
  private instances: Record<string, any> = {};
  private aliases: Record<string, string> = {};
  private currentContext?: string;

  /**
   * Bind a dependency (default: transient)
   */
  bind<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn) {
    this.bindings.push({ key, factory, singleton: false, condition });
  }

  /**
   * Bind a dependency as singleton (only one instance created)
   */
  singleton<T>(key: string, factory: FactoryFn<T>, condition?: ConditionFn) {
    this.bindings.push({ key, factory, singleton: true, condition });
  }

  /**
   * Add an alias for an existing key
   */
  alias(aliasKey: string, originalKey: string) {
    this.aliases[aliasKey] = originalKey;
  }

  /**
   * Internal: find correct binding based on key + condition + context
   */
  private findBinding(key: string, context?: string): Binding {
    const realKey = this.aliases[key] || key;
    const bindings = this.bindings.filter((b) => b.key === realKey);

    if (bindings.length === 0) {
      throw new Error(`No binding found for key: ${realKey}`);
    }

    // Priority:
    // 1. Binding with context and condition true
    // 2. Binding without context but condition true
    // 3. Binding default first
    const match =
      bindings.find(
        (b) => b.context === context && (!b.condition || b.condition(this)),
      ) ||
      bindings.find((b) => !b.context && (!b.condition || b.condition(this))) ||
      bindings[0];

    return match;
  }

  /**
   * Resolve an instance from the container
   */
  resolve<T>(key: string, context?: string): T {
    const prevContext = this.currentContext;
    this.currentContext = context || key;

    // Get real key (resolve alias)
    const realKey = this.aliases[key] || key;

    const binding = this.findBinding(key, this.currentContext);

    // Create unique cache key for contextual singletons
    const cacheKey = binding.context
      ? `${realKey}::${binding.context}`
      : realKey;

    // Return existing singleton instance
    if (binding.singleton && this.instances[cacheKey]) {
      this.currentContext = prevContext;
      return this.instances[cacheKey];
    }

    const instance = binding.factory(this);

    if (binding.singleton) {
      this.instances[cacheKey] = instance;
    }

    this.currentContext = prevContext;
    return instance;
  }

  /**
   * Contextual binding:
   * Example:
   *   container.when('UserService').needs('UserRepo').give(...)
   */
  when(context: string) {
    return {
      needs: (depKey: string) => ({
        give: (factory: FactoryFn<any>) => {
          this.bindings.push({
            key: depKey,
            factory,
            singleton: false,
            context,
          });
        },
      }),
    };
  }

  /**
   * Clear all bindings and instances (useful for testing)
   */
  reset() {
    this.bindings = [];
    this.instances = {};
    this.aliases = {};
    this.currentContext = undefined;
  }
}

// Global container instance
export const container = new Container();