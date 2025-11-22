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
});
