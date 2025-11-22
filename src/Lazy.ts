/**
 * Lazy wrapper for deferred initialization
 *
 * @module Lazy
 */

/**
 * Lazy wrapper for deferred initialization
 * Delays the creation of an instance until it's actually accessed
 *
 * @template T The type of the lazy value
 *
 * @example
 * ```typescript
 * const lazy = new Lazy(() => new ExpensiveService());
 * console.log(lazy.isInitialized); // false
 * const service = lazy.value; // NOW it's created
 * console.log(lazy.isInitialized); // true
 * ```
 */
export class Lazy<T> {
  private _value?: T;
  private _initialized = false;

  constructor(private factory: () => T) {}

  /**
   * Get the lazy value, initializing it if necessary
   */
  get value(): T {
    if (!this._initialized) {
      this._value = this.factory();
      this._initialized = true;
    }
    return this._value!;
  }

  /**
   * Check if the lazy value has been initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }
}
