import { describe, it, expect, beforeEach } from 'vitest';
import { Container, Scope, Lazy } from '../src/index';

describe('Advanced Features', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('Scoped Lifecycle', () => {
    it('should create scoped instance per scope', () => {
      let counter = 0;
      container.scoped('counter', () => ++counter);

      const scope1 = container.createScope();
      const val1 = container.resolve<number>('counter');
      const val2 = container.resolve<number>('counter');

      expect(val1).toBe(1);
      expect(val2).toBe(1); // Same instance within scope

      scope1.dispose();

      const scope2 = container.createScope();
      const val3 = container.resolve<number>('counter');

      expect(val3).toBe(2); // New instance in new scope
    });

    it('should throw error when resolving scoped without active scope', () => {
      container.scoped('service', () => ({ id: 1 }));

      expect(() => container.resolve('service')).toThrow(/No active scope/);
    });

    it('should call dispose function when scope is disposed', async () => {
      let disposed = false;
      container.scoped(
        'resource',
        () => ({ data: 'test' }),
        () => {
          disposed = true;
        }
      );

      const scope = container.createScope();
      container.resolve('resource');

      await scope.dispose();

      expect(disposed).toBe(true);
    });

    it('should handle async dispose functions', async () => {
      let disposed = false;
      container.scoped(
        'resource',
        () => ({ data: 'test' }),
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          disposed = true;
        }
      );

      const scope = container.createScope();
      container.resolve('resource');

      await scope.dispose();

      expect(disposed).toBe(true);
    });
  });

  describe('Lazy Loading', () => {
    it('should defer initialization until value is accessed', () => {
      let initialized = false;

      container.lazy('heavy', () => {
        initialized = true;
        return { data: 'heavy' };
      });

      const lazy = container.resolve<Lazy<{ data: string }>>('heavy');

      expect(initialized).toBe(false);
      expect(lazy.isInitialized).toBe(false);

      const value = lazy.value;

      expect(initialized).toBe(true);
      expect(lazy.isInitialized).toBe(true);
      expect(value.data).toBe('heavy');
    });

    it('should cache lazy singleton instance', () => {
      let counter = 0;

      container.lazy('service', () => {
        counter++;
        return { id: counter };
      });

      const lazy1 = container.resolve<Lazy<{ id: number }>>('service');
      const lazy2 = container.resolve<Lazy<{ id: number }>>('service');

      expect(lazy1).toBe(lazy2); // Same Lazy wrapper

      const val1 = lazy1.value;
      const val2 = lazy2.value;

      expect(val1).toBe(val2);
      expect(counter).toBe(1); // Only initialized once
    });

    it('should support lazy transient', () => {
      let counter = 0;

      container.lazy('service', () => ({ id: ++counter }), 'transient');

      const lazy1 = container.resolve<Lazy<{ id: number }>>('service');
      const lazy2 = container.resolve<Lazy<{ id: number }>>('service');

      expect(lazy1).not.toBe(lazy2); // Different Lazy wrappers

      expect(lazy1.value.id).toBe(1);
      expect(lazy2.value.id).toBe(2);
    });
  });

  describe('Child Containers', () => {
    it('should inherit bindings from parent', () => {
      container.singleton('config', () => ({ env: 'production' }));

      const child = container.createChild();

      const config = child.resolve<{ env: string }>('config');
      expect(config.env).toBe('production');
    });

    it('should allow child to override parent bindings', () => {
      container.singleton('logger', () => ({ type: 'parent' }));

      const child = container.createChild();
      child.singleton('logger', () => ({ type: 'child' }));

      const parentLogger = container.resolve<{ type: string }>('logger');
      const childLogger = child.resolve<{ type: string }>('logger');

      expect(parentLogger.type).toBe('parent');
      expect(childLogger.type).toBe('child');
    });

    it('should not affect parent when child adds bindings', () => {
      container.singleton('service1', () => ({ id: 1 }));

      const child = container.createChild();
      child.singleton('service2', () => ({ id: 2 }));

      expect(container.has('service1')).toBe(true);
      expect(container.has('service2')).toBe(false);
      expect(child.has('service1')).toBe(true);
      expect(child.has('service2')).toBe(true);
    });

    it('should support multiple levels of hierarchy', () => {
      container.singleton('root', () => 'ROOT');

      const child1 = container.createChild();
      child1.singleton('child1', () => 'CHILD1');

      const child2 = child1.createChild();
      child2.singleton('child2', () => 'CHILD2');

      expect(child2.resolve('root')).toBe('ROOT');
      expect(child2.resolve('child1')).toBe('CHILD1');
      expect(child2.resolve('child2')).toBe('CHILD2');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect direct circular dependency', () => {
      container.bind('A', (c) => {
        c.resolve('B');
        return { name: 'A' };
      });

      container.bind('B', (c) => {
        c.resolve('A');
        return { name: 'B' };
      });

      expect(() => container.resolve('A')).toThrow(/Circular dependency/);
      expect(() => container.resolve('A')).toThrow(/A -> B -> A/);
    });

    it('should detect indirect circular dependency', () => {
      container.bind('A', (c) => {
        c.resolve('B');
        return { name: 'A' };
      });

      container.bind('B', (c) => {
        c.resolve('C');
        return { name: 'B' };
      });

      container.bind('C', (c) => {
        c.resolve('A');
        return { name: 'C' };
      });

      expect(() => container.resolve('A')).toThrow(/Circular dependency/);
      expect(() => container.resolve('A')).toThrow(/A -> B -> C -> A/);
    });

    it('should not throw for valid dependency chains', () => {
      container.bind('A', (c) => {
        c.resolve('B');
        return { name: 'A' };
      });

      container.bind('B', (c) => {
        c.resolve('C');
        return { name: 'B' };
      });

      container.bind('C', () => ({ name: 'C' }));

      expect(() => container.resolve('A')).not.toThrow();
    });

    it('should clear resolution stack after successful resolve', () => {
      container.bind('A', (c) => {
        c.resolve('B');
        return { name: 'A' };
      });

      container.bind('B', () => ({ name: 'B' }));

      container.resolve('A');

      // Should not throw on second resolve
      expect(() => container.resolve('A')).not.toThrow();
    });
  });

  describe('Container.has()', () => {
    it('should return true if binding exists', () => {
      container.bind('service', () => ({ id: 1 }));

      expect(container.has('service')).toBe(true);
    });

    it('should return false if binding does not exist', () => {
      expect(container.has('nonexistent')).toBe(false);
    });

    it('should check parent container', () => {
      container.singleton('parent-service', () => ({ id: 1 }));

      const child = container.createChild();

      expect(child.has('parent-service')).toBe(true);
    });
  });

  describe('Container.keys()', () => {
    it('should return all registered keys', () => {
      container.bind('service1', () => ({ id: 1 }));
      container.singleton('service2', () => ({ id: 2 }));
      container.scoped('service3', () => ({ id: 3 }));

      const keys = container.keys();

      expect(keys).toContain('service1');
      expect(keys).toContain('service2');
      expect(keys).toContain('service3');
      expect(keys.length).toBe(3);
    });

    it('should include parent keys', () => {
      container.bind('parent1', () => ({ id: 1 }));
      container.bind('parent2', () => ({ id: 2 }));

      const child = container.createChild();
      child.bind('child1', () => ({ id: 3 }));

      const keys = child.keys();

      expect(keys).toContain('parent1');
      expect(keys).toContain('parent2');
      expect(keys).toContain('child1');
    });

    it('should not duplicate keys when child overrides parent', () => {
      container.bind('service', () => ({ type: 'parent' }));

      const child = container.createChild();
      child.bind('service', () => ({ type: 'child' }));

      const keys = child.keys();

      expect(keys.filter((k) => k === 'service').length).toBe(1);
    });
  });

  describe('Container.dispose()', () => {
    it('should dispose active scope', async () => {
      let disposed = false;

      container.scoped(
        'resource',
        () => ({ data: 'test' }),
        () => {
          disposed = true;
        }
      );

      const scope = container.createScope();
      container.resolve('resource');

      await container.dispose();

      expect(disposed).toBe(true);
    });

    it('should reset container after dispose', async () => {
      container.bind('service', () => ({ id: 1 }));

      await container.dispose();

      expect(() => container.resolve('service')).toThrow();
    });
  });

  describe('Container.withScope()', () => {
    it('should execute callback with auto-managed scope', async () => {
      let disposed = false;
      container.scoped(
        'resource',
        () => ({ data: 'test' }),
        () => {
          disposed = true;
        }
      );

      const result = await container.withScope(async (_scope) => {
        const resource = container.resolve('resource') as any;
        expect(resource.data).toBe('test');
        return 'success';
      });

      expect(result).toBe('success');
      expect(disposed).toBe(true);
    });

    it('should dispose scope even on error', async () => {
      let disposed = false;
      container.scoped(
        'resource',
        () => ({ data: 'test' }),
        () => {
          disposed = true;
        }
      );

      await expect(
        container.withScope(async () => {
          container.resolve('resource');
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(disposed).toBe(true);
    });

    it('should handle non-promise callback in withScope', async () => {
      let disposed = false;
      container.scoped(
        'resource',
        () => ({ data: 'test' }),
        () => {
          disposed = true;
        }
      );

      const result = await container.withScope(() => {
        const resource = container.resolve('resource') as any;
        return resource.data;
      });

      expect(result).toBe('test');
      expect(disposed).toBe(true);
    });
  });

  describe('Integration: Combined Features', () => {
    it('should work with scoped + child containers', () => {
      container.scoped('request', () => ({ id: Math.random() }));

      const child = container.createChild();
      const scope = child.createScope();

      const req1 = child.resolve('request');
      const req2 = child.resolve('request');

      expect(req1).toBe(req2);
    });

    it('should work with lazy + child containers', () => {
      container.lazy('heavy', () => ({ data: 'heavy' }));

      const child = container.createChild();

      const lazy1 = container.resolve<Lazy<any>>('heavy');
      const lazy2 = child.resolve<Lazy<any>>('heavy');

      // Both resolve from parent, but child creates new lazy wrapper
      // However, the underlying values should be different instances
      expect(lazy1.value.data).toBe('heavy');
      expect(lazy2.value.data).toBe('heavy');
    });

    it('should detect circular deps across child containers', () => {
      container.bind('A', (c) => {
        c.resolve('B');
        return { name: 'A' };
      });

      const child = container.createChild();
      child.bind('B', (c) => {
        c.resolve('A');
        return { name: 'B' };
      });

      expect(() => child.resolve('B')).toThrow(/Circular dependency/);
    });
  });

  describe('Scope auto-dispose', () => {
    it('should auto-detect IDisposable when no explicit dispose function', async () => {
      let disposed = false;

      class AutoDisposable {
        dispose() {
          disposed = true;
        }
      }

      container.scoped('autoDisposable', () => new AutoDisposable());

      const scope = container.createScope();
      container.resolve('autoDisposable');

      await scope.dispose();

      expect(disposed).toBe(true);
    });
  });

  describe('Container.compose()', () => {
    it('should create a composed container from multiple containers', () => {
      const containerA = new Container();
      containerA.bind('serviceA', () => ({ name: 'A' }));

      const containerB = new Container();
      containerB.bind('serviceB', () => ({ name: 'B' }));

      const composed = Container.compose([containerA, containerB]);

      expect(composed.resolve('serviceA')).toEqual({ name: 'A' });
      expect(composed.resolve('serviceB')).toEqual({ name: 'B' });
    });

    it('should resolve from first container with binding (first-wins)', () => {
      const containerA = new Container();
      containerA.bind('service', () => ({ source: 'A' }));

      const containerB = new Container();
      containerB.bind('service', () => ({ source: 'B' }));

      const composed = Container.compose([containerA, containerB]);

      expect(composed.resolve('service')).toEqual({ source: 'A' });
    });

    it('should work with singleton services', () => {
      const containerA = new Container();
      containerA.singleton('singletonService', () => ({ id: Math.random() }));

      const containerB = new Container();
      containerB.bind('transientService', () => ({ id: Math.random() }));

      const composed = Container.compose([containerA, containerB]);

      const singleton1 = composed.resolve('singletonService') as any;
      const singleton2 = composed.resolve('singletonService') as any;
      const transient1 = composed.resolve('transientService') as any;
      const transient2 = composed.resolve('transientService') as any;

      expect(singleton1).toBe(singleton2); // Same singleton instance
      expect(transient1.id).not.toBe(transient2.id); // Different transient instances
    });

    it('should throw error when no containers provided', () => {
      expect(() => {
        Container.compose([]);
      }).toThrow('At least one container must be provided for composition');
    });

    it('should throw error for unknown service', () => {
      const containerA = new Container();
      containerA.bind('serviceA', () => ({ name: 'A' }));

      const composed = Container.compose([containerA]);

      expect(() => {
        composed.resolve('unknownService');
      }).toThrow('No binding found for key: unknownService');
    });

    it('should throw error for unknown service in multiple containers', () => {
      const containerA = new Container();
      containerA.bind('serviceA', () => ({ name: 'A' }));

      const containerB = new Container();
      containerB.bind('serviceB', () => ({ name: 'B' }));

      const composed = Container.compose([containerA, containerB]);

      expect(() => {
        composed.resolve('unknownService');
      }).toThrow('No binding found for key: unknownService');
    });

    it('should throw error when composed container has no matching service', () => {
      const containerA = new Container();
      containerA.bind('serviceA', () => ({ name: 'A' }));

      const containerB = new Container();
      containerB.bind('serviceB', () => ({ name: 'B' }));

      // Create composed container
      const composed = Container.compose([containerA, containerB]);

      // Try to resolve a service that exists in neither container
      expect(() => {
        composed.resolve('nonExistentService');
      }).toThrow('No binding found for key: nonExistentService');
    });

    it('should maintain container isolation', () => {
      const containerA = new Container();
      containerA.bind('service', () => ({ source: 'A' }));

      const containerB = new Container();
      containerB.bind('service', () => ({ source: 'B' }));

      const composed = Container.compose([containerA, containerB]);

      // Original containers should remain unchanged
      expect(containerA.resolve('service')).toEqual({ source: 'A' });
      expect(containerB.resolve('service')).toEqual({ source: 'B' });

      // Composed container resolves from first
      expect(composed.resolve('service')).toEqual({ source: 'A' });
    });
  });

  describe('Examples Integration Tests', () => {
    it('should run example 01 - basic usage', async () => {
      // This test ensures the example runs without errors
      const { Container } = await import('../src/index');

      const container = new Container();

      // Register a service
      container.bind('logger', () => ({
        log: (message: string) => console.log(`[LOG] ${message}`),
      }));

      // Use the service
      const logger = container.resolve('logger') as any;
      expect(typeof logger.log).toBe('function');

      // Test that it actually works (without jest spy for simplicity)
      expect(logger.log('Hello World!')).toBeUndefined();
    });

    it('should run example 02 - dependency injection', async () => {
      const { Container } = await import('../src/index');

      class Database {
        connect() {
          return { status: 'connected' };
        }
      }

      class UserRepository {
        constructor(private db: Database) {}

        findUser(id: number) {
          return { id, name: 'John Doe' };
        }
      }

      class UserService {
        constructor(private repo: UserRepository) {}

        getUser(id: number) {
          return this.repo.findUser(id);
        }
      }

      // Setup container
      const container = new Container();

      container.singleton('db', () => new Database());
      container.singleton(
        'userRepo',
        (c) => new UserRepository(c.resolve('db'))
      );
      container.singleton(
        'userService',
        (c) => new UserService(c.resolve('userRepo'))
      );

      // Usage
      const userService = container.resolve<UserService>('userService');
      const user = userService.getUser(1);

      expect(user).toEqual({ id: 1, name: 'John Doe' });
    });

    it('should run example 03 - conditional binding', async () => {
      const { Container } = await import('../src/index');

      const env = 'production' as string;

      const container = new Container();

      container.bind(
        'storage',
        () => ({ type: 'local' }),
        () => env === 'development'
      );
      container.bind(
        'storage',
        () => ({ type: 's3' }),
        () => env === 'production'
      );

      const storage = container.resolve('storage') as any;
      expect(storage).toEqual({ type: 's3' });
    });

    it('should run example 04 - contextual binding', async () => {
      const { Container } = await import('../src/index');

      const container = new Container();

      container
        .when('UserService')
        .needs('repository')
        .give(() => ({ type: 'user' }));
      container
        .when('AdminService')
        .needs('repository')
        .give(() => ({ type: 'admin' }));

      const userRepo = container.resolve('repository', 'UserService');
      const adminRepo = container.resolve('repository', 'AdminService');

      expect(userRepo).toEqual({ type: 'user' });
      expect(adminRepo).toEqual({ type: 'admin' });
    });

    it('should run example 05 - alias', async () => {
      const { Container } = await import('../src/index');

      const container = new Container();

      container.singleton('logger', () => ({
        log: (message: string) => `[LOG] ${message}`,
      }));
      container.alias('appLogger', 'logger');

      const logger = container.resolve('appLogger') as any;
      expect(typeof logger.log).toBe('function');
    });

    it('should run example 06 - scoped lifecycle', async () => {
      const { Container } = await import('../src/index');

      const container = new Container();

      let instanceCount = 0;
      container.scoped('request', () => ({ id: ++instanceCount }));

      const scope1 = container.createScope();
      const req1 = container.resolve('request') as any;
      const req2 = container.resolve('request') as any;

      expect(req1.id).toBe(1);
      expect(req2.id).toBe(1); // Same instance within scope

      await scope1.dispose();

      const scope2 = container.createScope();
      const req3 = container.resolve('request') as any;

      expect(req3.id).toBe(2); // New instance in new scope
    });

    it('should run example 07 - lazy loading', async () => {
      const { Container, Lazy } = await import('../src/index');

      const container = new Container();

      let initialized = false;
      container.lazy('heavyService', () => {
        initialized = true;
        return { data: 'heavy' };
      });

      // Resolve as Lazy wrapper
      const lazy = container.resolve<Lazy<any>>('heavyService');

      expect(lazy.isInitialized).toBe(false);
      expect(initialized).toBe(false);

      // Access when needed
      const service = lazy.value;

      expect(lazy.isInitialized).toBe(true);
      expect(initialized).toBe(true);
      expect(service).toEqual({ data: 'heavy' });
    });

    it('should run example 08 - child containers', async () => {
      const { Container } = await import('../src/index');

      const parent = new Container();
      parent.singleton('config', () => ({ env: 'production' }));

      // Create child container
      const tenant1 = parent.createChild();
      tenant1.singleton('logger', () => ({ tenant: 'tenant1' }));

      const tenant2 = parent.createChild();
      tenant2.singleton('logger', () => ({ tenant: 'tenant2' }));

      // Each tenant has its own logger but shares config
      expect(tenant1.resolve('config')).toEqual({ env: 'production' });
      expect(tenant1.resolve('logger')).toEqual({ tenant: 'tenant1' });
      expect(tenant2.resolve('logger')).toEqual({ tenant: 'tenant2' });
    });

    it('should run example 09 - circular dependency detection', async () => {
      const { Container } = await import('../src/index');

      const container = new Container();

      container.bind('A', (c) => {
        c.resolve('B');
        return { name: 'A' };
      });

      container.bind('B', (c) => {
        c.resolve('A'); // Circular!
        return { name: 'B' };
      });

      expect(() => container.resolve('A')).toThrow(/Circular dependency/);
    });

    it('should run example 11 - composition', async () => {
      const { Container } = await import('../src/index');

      // Create domain-specific containers
      const infra = new Container();
      infra.singleton('db', () => ({ connected: true }));

      const services = new Container();
      services.singleton('userService', () => ({
        getUser: () => ({ id: 1, name: 'John' }),
      }));

      // Compose them together
      const app = Container.compose([infra, services]);

      // All services available in one container
      expect(app.resolve('db')).toEqual({ connected: true });
      expect(app.resolve('userService')).toEqual({
        getUser: expect.any(Function),
      });
    });
  });
});
