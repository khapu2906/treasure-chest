import { describe, expect, it } from 'vitest';
import { Container, Graph } from '../src/index';

describe('Container.graph()', () => {
  it('lists own bindings as nodes', () => {
    const container = new Container();
    container.bind('transientSvc', () => ({}));
    container.singleton('singletonSvc', () => ({}));
    container.scoped('scopedSvc', () => ({}));

    const graph = container.graph();
    const keys = graph.getNodes().map((n) => n.key);

    expect(keys).toContain('transientSvc');
    expect(keys).toContain('singletonSvc');
    expect(keys).toContain('scopedSvc');
  });

  it('marks parent bindings as inherited and own bindings as not', () => {
    const parent = new Container();
    parent.singleton('config', () => ({}));

    const child = parent.createChild();
    child.singleton('logger', () => ({}));

    const graph = child.graph();

    expect(graph.getNode('config')?.inherited).toBe(true);
    expect(graph.getNode('logger')?.inherited).toBe(false);
  });

  it('marks a singleton as resolved only after it has been resolved', () => {
    const container = new Container();
    container.singleton('config', () => ({}));

    expect(container.graph().getNode('config')?.resolved).toBe(false);

    container.resolve('config');

    expect(container.graph().getNode('config')?.resolved).toBe(true);
  });

  it('records dependency edges discovered while resolving', () => {
    const container = new Container();
    container.singleton('db', () => ({ name: 'db' }));
    container.singleton('repo', (c) => ({ db: c.resolve('db') }));
    container.singleton('service', (c) => ({ repo: c.resolve('repo') }));

    container.resolve('service');

    const graph = container.graph();

    expect(graph.getEdges({ from: 'service' })).toEqual([
      { from: 'service', to: 'repo' },
    ]);
    expect(graph.dependenciesOf('service').map((n) => n.key)).toEqual(['repo']);
    expect(graph.dependentsOf('repo').map((n) => n.key)).toEqual(['service']);
    expect(graph.dependentsOf('db').map((n) => n.key)).toEqual(['repo']);
  });

  it('filters nodes by lifecycle, resolved state, and key pattern', () => {
    const container = new Container();
    container.bind('userController', () => ({}));
    container.singleton('userService', () => ({}));
    container.singleton('userRepository', () => ({}));
    container.resolve('userRepository');

    const graph = container.graph();

    expect(
      graph
        .getNodes({ lifecycle: 'singleton' })
        .map((n) => n.key)
        .sort()
    ).toEqual(['userRepository', 'userService']);

    expect(graph.getNodes({ resolved: true }).map((n) => n.key)).toEqual([
      'userRepository',
    ]);

    expect(graph.getNodes({ key: /Repository$/ }).map((n) => n.key)).toEqual([
      'userRepository',
    ]);
  });

  it('identifies roots (nothing depends on them) and leaves (no dependencies)', () => {
    const container = new Container();
    container.singleton('db', () => ({}));
    container.singleton('repo', (c) => ({ db: c.resolve('db') }));
    container.singleton('service', (c) => ({ repo: c.resolve('repo') }));
    container.resolve('service');

    const graph = container.graph();

    expect(graph.roots().map((n) => n.key)).toEqual(['service']);
    expect(graph.leaves().map((n) => n.key)).toEqual(['db']);
  });

  it('exports nodes/edges as JSON and DOT', () => {
    const container = new Container();
    container.singleton('db', () => ({}));
    container.singleton('repo', (c) => ({ db: c.resolve('db') }));
    container.resolve('repo');

    const graph = container.graph();
    const json = graph.toJSON();

    expect(json.nodes.some((n) => n.key === 'db')).toBe(true);
    expect(json.edges).toEqual([{ from: 'repo', to: 'db' }]);

    const dot = graph.toDot();
    expect(dot).toContain('digraph Container {');
    expect(dot).toContain('"repo" -> "db";');
  });

  it('resets dependency edges when the container is reset', () => {
    const container = new Container();
    container.singleton('db', () => ({}));
    container.singleton('repo', (c) => ({ db: c.resolve('db') }));
    container.resolve('repo');

    expect(container.graph().getEdges().length).toBeGreaterThan(0);

    container.reset();

    expect(container.graph().getEdges()).toEqual([]);
  });

  describe('toTree() / forest()', () => {
    it('builds a nested tree from a root key', () => {
      const container = new Container();
      container.singleton('db', () => ({}));
      container.singleton('repo', (c) => ({ db: c.resolve('db') }));
      container.singleton('service', (c) => ({ repo: c.resolve('repo') }));
      container.resolve('service');

      const tree = container.graph().toTree('service');

      expect(tree).toEqual(
        expect.objectContaining({
          key: 'service',
          children: [
            expect.objectContaining({
              key: 'repo',
              children: [expect.objectContaining({ key: 'db', children: [] })],
            }),
          ],
        })
      );
    });

    it('returns undefined for a key that is not a known node', () => {
      const container = new Container();
      container.singleton('db', () => ({}));

      expect(container.graph().toTree('nonexistent')).toBeUndefined();
    });

    it('duplicates a node shared by multiple branches (diamond dependency)', () => {
      const container = new Container();
      container.singleton('db', () => ({}));
      container.singleton('repo', (c) => ({ db: c.resolve('db') }));
      container.singleton('logger', (c) => ({ db: c.resolve('db') }));
      container.singleton('service', (c) => ({
        repo: c.resolve('repo'),
        logger: c.resolve('logger'),
      }));
      container.resolve('service');

      const tree = container.graph().toTree('service')!;
      const childKeys = tree.children.map((c) => c.key).sort();

      expect(childKeys).toEqual(['logger', 'repo']);
      expect(tree.children.every((c) => c.children[0]?.key === 'db')).toBe(
        true
      );
    });

    it('builds a tree for every root via forest()', () => {
      const container = new Container();
      container.singleton('db', () => ({}));
      container.singleton('repo', (c) => ({ db: c.resolve('db') }));
      container.singleton('unusedSingleton', () => ({}));
      container.resolve('repo');

      const forest = container.graph().forest();
      const rootKeys = forest.map((t) => t.key).sort();

      expect(rootKeys).toEqual(['repo', 'unusedSingleton']);
    });

    it('marks a repeated ancestor as cyclic instead of recursing forever', () => {
      // Built directly against Graph (not via Container) because a real
      // circular resolve() is rejected before edges like this can exist -
      // this exercises the tree-building guard in isolation.
      const graph = new Graph({
        nodes: [
          {
            key: 'a',
            lifecycle: 'singleton',
            lazy: false,
            inherited: false,
            resolved: true,
          },
          {
            key: 'b',
            lifecycle: 'singleton',
            lazy: false,
            inherited: false,
            resolved: true,
          },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      });

      const tree = graph.toTree('a')!;

      expect(tree.key).toBe('a');
      expect(tree.children[0].key).toBe('b');
      expect(tree.children[0].children[0]).toEqual(
        expect.objectContaining({ key: 'a', cyclic: true, children: [] })
      );
    });
  });
});
