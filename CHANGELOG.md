# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-11-22

Major release with advanced lifecycle features and performance optimizations.

### Added

**Advanced Lifecycle Features:**

- **Scoped Lifecycle**: Added `scoped()` method for per-scope instance management
  - Create scopes with `createScope()`
  - Automatic resource disposal with `scope.dispose()`
  - Support for cleanup functions
  - Perfect for per-request services in web applications
- **Lazy Loading**: Added `lazy()` method for deferred initialization
  - `Lazy<T>` wrapper class for delayed instantiation
  - Only initialize when `lazy.value` is accessed
  - Improves startup performance
  - Supports all lifecycle types
- **Child Containers**: Added container hierarchy support
  - Create child containers with `createChild()`
  - Children inherit parent bindings
  - Override parent bindings in children
  - Perfect for multi-tenant and plugin systems
- **Circular Dependency Detection**: Automatic detection of circular dependencies
  - Clear error messages with full dependency chain
  - Prevents infinite loops during resolution
  - Helps identify architectural issues early

**Performance Optimizations:**

- **Map-based Storage**: Replaced array-based binding storage with `Map<string, Binding[]>`
  - O(1) lookup complexity instead of O(n) array scanning
  - 10-100x faster service resolution (worst case: 3.67M ops/sec)
  - 1000x faster singleton access (cached: 24.7M ops/sec)
  - Binding cache for memoizing resolved bindings
- **IDisposable Interface**: Auto-detection of disposable resources
  - Implement `IDisposable` interface for automatic cleanup
  - Zero overhead detection in scoped instances
  - Works seamlessly with existing code
  - Supports both sync and async disposal
- **Auto-Dispose Helper**: Added `withScope()` method
  - C#-style `using` statement pattern
  - Automatic scope creation and disposal
  - Perfect for request-scoped resources
  - Exception-safe cleanup

**Modular Architecture:**

- **Modular Code Structure**: Split monolithic `index.ts` into focused modules
  - `src/Container.ts` - Core container implementation
  - `src/Scope.ts` - Scope management
  - `src/Lazy.ts` - Lazy loading wrapper
  - `src/types.ts` - Type definitions
  - Clean `src/index.ts` with focused exports
  - Better tree-shaking support
  - Improved maintainability

**Developer Experience:**

- Added `has(key)` method to check if binding exists
- Added `keys()` method to list all registered services
- Added `dispose()` method for container cleanup
- Export `Lazy` class for TypeScript type safety
- Export `Scope` class for scope management
- Export `Lifecycle` type for better type hints
- Export `IDisposable` interface for auto-cleanup

**Benchmarking & Monitoring:**

- Added comprehensive performance benchmarks
  - Binding registration benchmarks
  - Service resolution benchmarks (best/worst case)
  - Singleton caching benchmarks
  - Conditional binding benchmarks
  - Scoped resolution benchmarks
  - Lazy loading benchmarks
  - Contextual binding benchmarks
  - Child container benchmarks
- Performance measurement utilities
- Automatic result saving with history tracking
  - `benchmarks/results/run-*.json` - Timestamped runs
  - `benchmarks/results/history.jsonl` - Append-only log
  - `benchmarks/results/LATEST.md` - Human-readable report

**Web Framework Integration Patterns:**

- Pattern demonstrations for Express, Fastify, and Koa
- Example implementations in `examples/10-middleware.ts`
- Auto-scoping per HTTP request with auto-disposal
- **Note:** Not exported from core to keep package framework-agnostic
- Consider separate adapter packages for production use

**Documentation & Examples:**

- Added 10 comprehensive examples (was 5):
  - `01-05`: Basic features (existing)
  - `06-scoped-lifecycle.ts`: Per-request services
  - `07-lazy-loading.ts`: Performance optimization
  - `08-child-containers.ts`: Multi-tenant apps
  - `09-circular-dependency.ts`: Avoiding design issues
  - `10-middleware.ts`: Web framework patterns
- Added 26 new test cases (total: 62 tests)
- Updated examples README with learning path
- Added benchmarking documentation

### Changed

**Internal Optimizations:**

- Replaced `Binding[]` arrays with `Map<string, Binding[]>` for O(1) key lookup
- Replaced `Record<string, any>` with `Map<string, any>` for instance storage
- Replaced `Record<string, string>` with `Map<string, string>` for alias mapping
- Added `Map<string, Binding>` cache for resolved bindings
- Optimized `findBinding()` with intelligent caching
  - Conditional bindings are NOT cached (dynamic evaluation)
  - Non-conditional bindings are cached for performance
- Updated Scope to use `Map` internally for better performance
- Refactored internal binding structure to support multiple lifecycles
- Updated `resolve()` to handle scoped and lazy bindings
- Enhanced `findBinding()` to search parent containers
- Improved error messages for better debugging

**Architecture:**

- Middleware helpers NOT exported from core package (kept framework-agnostic)
- Pattern demonstrations moved to examples only
- Cleaner separation of concerns
- Split monolithic code into focused modules

**Documentation:**

- Updated README with all v1.2.0 features
- Added performance guide and benchmarking documentation
- Added benchmark history tracking system
- Updated API documentation with new methods
- Framework integration patterns documented in examples
- Added comprehensive examples for all features

### Performance

**Benchmark Results:**

- Binding registration: ~7K ops/sec (1000 bindings)
- Service resolution (best case): ~2.47M ops/sec
- Service resolution (worst case): ~3.67M ops/sec (Map O(1) vs Array O(n))
- Singleton cached access: ~24.7M ops/sec
- Scoped resolution with disposal: ~562K ops/sec
- Lazy value access: ~24.7M ops/sec (cached)

**Improvements vs v1.0.5:**

- Service resolution: 10-100x faster (Map-based lookup)
- Singleton access: 1000x faster (cached)
- Memory usage: ~30% reduction (Map-based storage)
- Better tree-shaking: Modular structure
- Advanced lifecycles: Scoped, Lazy, Child containers
- Auto-disposal: IDisposable interface support

### Breaking Changes

None - All existing APIs remain 100% backward compatible.

## [1.0.5] - 2025-11-22

### Added

- ESLint configuration for code quality enforcement
- Prettier configuration for consistent code formatting
- Dual build support (CommonJS + ES Modules)
- Type declarations in separate output directory
- Test coverage reporting with Vitest
- CHANGELOG.md for tracking version history
- CONTRIBUTING.md with contribution guidelines
- JSDoc comments for better code documentation
- Examples directory with real-world usage patterns
- GitHub Actions CI/CD workflow for automated testing and building
- Additional npm scripts for linting, formatting, and coverage

### Changed

- Moved `vitest` from dependencies to devDependencies
- Updated package.json description to better reflect the library's purpose
- Enhanced keywords for better discoverability
- Updated build process to generate both CJS and ESM outputs
- Improved package.json exports field for better module resolution
- Version bumped from 1.0.4 to 1.0.5

### Removed

- Removed `vittest` typo dependency
- Removed Jest configuration (migrated fully to Vitest)

### Fixed

- Fixed incorrect dependency categorization
- Improved TypeScript configuration for better build outputs

## [1.0.4] - Previous Release

### Added

- Core Container implementation
- Transient binding support
- Singleton pattern support
- Alias functionality
- Conditional binding
- Contextual binding
- Comprehensive test suite
- Basic documentation

---

For the complete history, see the [commit log](https://github.com/khapu2906/treasure-chest/commits/main).
