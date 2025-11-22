/**
 * Scope management for scoped instances
 *
 * @module Scope
 */

import type { DisposeFn, IDisposable } from './types';

/**
 * Scope class for managing scoped instances
 * A scope contains instances that live for a specific duration (e.g., per HTTP request)
 *
 * @example
 * ```typescript
 * const scope = container.createScope();
 * const conn = container.resolve('dbConnection'); // Scoped instance
 * await scope.dispose(); // Cleanup all scoped resources
 * ```
 */
export class Scope {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instances: Map<string, any> = new Map();
  private disposables: DisposeFn[] = [];

  /**
   * Get an instance from this scope
   * @param key The service key
   * @returns The instance or undefined
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(key: string): any {
    return this.instances.get(key);
  }

  /**
   * Set an instance in this scope with optional cleanup
   * Auto-detects IDisposable instances
   *
   * @param key The service key
   * @param value The instance to store
   * @param dispose Optional disposal function
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(key: string, value: any, dispose?: DisposeFn) {
    this.instances.set(key, value);

    // Auto-detect IDisposable
    if (!dispose && this.isDisposable(value)) {
      dispose = () => value.dispose();
    }

    if (dispose) {
      this.disposables.push(dispose);
    }
  }

  /**
   * Check if instance exists in scope
   * @param key The service key
   * @returns True if the instance exists
   */
  has(key: string): boolean {
    return this.instances.has(key);
  }

  /**
   * Check if value implements IDisposable interface
   * @private
   * @param value The value to check
   * @returns True if the value is disposable
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isDisposable(value: any): value is IDisposable {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === 'object' &&
      typeof value.dispose === 'function'
    );
  }

  /**
   * Dispose all instances in this scope
   * Calls all registered disposal functions and clears the scope
   *
   * @example
   * ```typescript
   * await scope.dispose();
   * ```
   */
  async dispose() {
    for (const disposeFn of this.disposables) {
      await disposeFn();
    }
    this.instances.clear();
    this.disposables = [];
  }
}
