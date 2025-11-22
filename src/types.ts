/**
 * Type definitions for Treasure Chest DI Container
 *
 * @module types
 */

/**
 * Lifecycle type for service bindings
 */
export type Lifecycle = 'transient' | 'singleton' | 'scoped';

/**
 * Interface for disposable resources
 * Implement this interface to enable auto-cleanup
 *
 * @example
 * ```typescript
 * class DbConnection implements IDisposable {
 *   async dispose() {
 *     await this.close();
 *   }
 * }
 * ```
 */
export interface IDisposable {
  dispose(): void | Promise<void>;
}

/**
 * Disposal function for cleaning up resources
 */
export type DisposeFn = () => void | Promise<void>;

/**
 * Factory function type that creates instances of type T
 * @template T The type of instance to create
 * @param _c The container instance for resolving dependencies
 * @returns An instance of type T
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FactoryFn<T> = (_c: any) => T;

/**
 * Condition function type for conditional bindings
 * @param _c The container instance
 * @returns True if the binding should be used
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConditionFn = (_c: any) => boolean;

/**
 * Internal binding interface representing a service registration
 * @template T The type of service being bound
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Binding<T = any> {
  /** The service key identifier */
  key: string;
  /** Factory function to create the service instance */
  factory: FactoryFn<T>;
  /** Lifecycle type: transient, singleton, or scoped */
  lifecycle: Lifecycle;
  /** Optional condition for conditional binding */
  condition?: ConditionFn;
  /** Optional context for contextual binding */
  context?: string;
  /** Whether this is a lazy binding */
  lazy?: boolean;
  /** Optional disposal function */
  dispose?: DisposeFn;
}
