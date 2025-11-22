/**
 * Treasure Chest - A lightweight TypeScript dependency injection container
 *
 * @module treasure-chest
 * @author Kent Phung
 * @license DIB
 *
 * Features:
 *  - Transient, Singleton, and Scoped bindings
 *  - Conditional binding based on runtime conditions
 *  - Contextual binding for different implementations per context
 *  - Alias support for service keys
 *  - Nested dependency resolution
 *  - Lazy loading with deferred initialization
 *  - Child containers with hierarchy
 *  - Circular dependency detection
 *  - High-performance Map-based storage (v1.2.0)
 *  - Auto-dispose for IDisposable instances (v1.2.0)
 *  - Modular architecture (v1.2.0)
 *
 * @example
 * ```typescript
 * import { Container } from '@khapu2906/treasure-chest';
 *
 * const container = new Container();
 * container.bind('logger', () => new Logger());
 * const logger = container.resolve('logger');
 * ```
 */

// Export main classes
export { Container } from './Container';
export { Lazy } from './Lazy';
export { Scope } from './Scope';

// Export types
export type { Lifecycle, IDisposable, DisposeFn } from './types';
