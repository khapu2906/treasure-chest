/**
 * Dependency graph for inspecting and filtering container bindings
 *
 * @module Graph
 */

import type { Lifecycle, ServiceKey } from './types';

/** A single node in the dependency graph, representing one registered binding */
export interface GraphNode {
  /**
   * Unique, human-readable label of the service key. Usually `key.toString()`;
   * when two distinct keys share the same string form (e.g. two
   * `Symbol('db')`s), later ones get a `#2`, `#3`, ... suffix.
   */
  key: string;
  /** Lifecycle of the binding (transient, singleton, scoped) */
  lifecycle: Lifecycle;
  /** Whether this binding is registered as lazy */
  lazy: boolean;
  /** Context this binding is scoped to, if it's a contextual binding */
  context?: string;
  /** Original key this node is an alias for, if any */
  aliasOf?: string;
  /** Whether this binding comes from a parent or composed container */
  inherited: boolean;
  /** Whether an instance has already been created and cached */
  resolved: boolean;
}

/** A directed edge meaning `from` depends on `to` */
export interface GraphEdge {
  from: string;
  to: string;
}

/** Raw data used to build a Graph; produced by Container#graph() */
export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** A GraphNode nested with its dependencies, for tree-shaped UI rendering */
export interface GraphTreeNode extends GraphNode {
  children: GraphTreeNode[];
  /**
   * True if this key already appears higher up in the current branch.
   * Recursion stops here instead of looping forever - `children` will be empty.
   */
  cyclic?: boolean;
}

/** Criteria for filtering graph nodes */
export interface GraphNodeFilter {
  /** Only include nodes matching this lifecycle (or one of these) */
  lifecycle?: Lifecycle | Lifecycle[];
  /** Only include nodes whose instance has (or hasn't) been resolved */
  resolved?: boolean;
  /** Only include lazy (or non-lazy) bindings */
  lazy?: boolean;
  /** Only include inherited (or own) bindings */
  inherited?: boolean;
  /** Only include keys matching this substring or RegExp */
  key?: string | RegExp;
}

/**
 * Read-only, filterable view over a container's bindings and the
 * dependency edges discovered while resolving them.
 *
 * Edges are recorded as `resolve()` runs, so they only reflect
 * dependencies that have actually been resolved at least once - this is
 * a runtime graph, not a static analysis of factory source code.
 *
 * @example
 * ```typescript
 * const graph = container.graph();
 *
 * const singletons = graph.getNodes({ lifecycle: 'singleton' });
 * const unresolved = graph.getNodes({ resolved: false });
 * const deps = graph.dependenciesOf('userService');
 *
 * console.log(graph.toDot()); // paste into a Graphviz viewer
 * ```
 */
export class Graph {
  private readonly nodes: GraphNode[];
  private readonly edges: GraphEdge[];
  private readonly byPlainKey: Map<string, GraphNode>;
  private readonly keyLabels?: ReadonlyMap<ServiceKey, string>;

  /**
   * @param snapshot Nodes and edges, keyed by label
   * @param keyLabels Optional map from real service keys to their labels.
   *   Container#graph() passes this so lookups by a Symbol find that exact
   *   Symbol's node, even if another Symbol has the same description.
   */
  constructor(
    snapshot: GraphSnapshot,
    keyLabels?: ReadonlyMap<ServiceKey, string>
  ) {
    this.nodes = snapshot.nodes;
    this.edges = snapshot.edges;
    this.keyLabels = keyLabels;

    this.byPlainKey = new Map();
    for (const node of this.nodes) {
      if (!this.byPlainKey.has(node.key)) {
        this.byPlainKey.set(node.key, node);
      }
    }
  }

  /**
   * Turn a service key (or an already-known label) into its node label
   * @private
   */
  private toLabel(key: ServiceKey): string {
    return this.keyLabels?.get(key) ?? key.toString();
  }

  /**
   * Get all nodes, optionally filtered
   *
   * @example
   * ```typescript
   * graph.getNodes({ lifecycle: ['singleton', 'scoped'], resolved: true });
   * graph.getNodes({ key: /Repository$/ });
   * ```
   */
  getNodes(filter?: GraphNodeFilter): GraphNode[] {
    let result = this.nodes;

    if (!filter) {
      return [...result];
    }

    if (filter.lifecycle) {
      const lifecycles = Array.isArray(filter.lifecycle)
        ? filter.lifecycle
        : [filter.lifecycle];
      result = result.filter((n) => lifecycles.includes(n.lifecycle));
    }

    if (filter.resolved !== undefined) {
      result = result.filter((n) => n.resolved === filter.resolved);
    }

    if (filter.lazy !== undefined) {
      result = result.filter((n) => n.lazy === filter.lazy);
    }

    if (filter.inherited !== undefined) {
      result = result.filter((n) => n.inherited === filter.inherited);
    }

    if (filter.key !== undefined) {
      const matcher = filter.key;
      result = result.filter((n) =>
        matcher instanceof RegExp
          ? matcher.test(n.key)
          : n.key.includes(matcher)
      );
    }

    return [...result];
  }

  /**
   * Get a single (non-contextual) node by key
   */
  getNode(key: ServiceKey): GraphNode | undefined {
    return this.byPlainKey.get(this.toLabel(key));
  }

  /**
   * Get all edges, optionally filtered by source and/or target key
   */
  getEdges(filter?: { from?: ServiceKey; to?: ServiceKey }): GraphEdge[] {
    if (!filter) {
      return [...this.edges];
    }

    const from =
      filter.from !== undefined ? this.toLabel(filter.from) : undefined;
    const to = filter.to !== undefined ? this.toLabel(filter.to) : undefined;

    return this.edges.filter((e) => {
      if (from !== undefined && e.from !== from) return false;
      if (to !== undefined && e.to !== to) return false;
      return true;
    });
  }

  /**
   * Direct dependencies of a key - the services it needs
   */
  dependenciesOf(key: ServiceKey): GraphNode[] {
    return this.dependenciesOfLabel(this.toLabel(key));
  }

  /** @private */
  private dependenciesOfLabel(keyStr: string): GraphNode[] {
    return this.edges
      .filter((e) => e.from === keyStr)
      .map((e) => this.byPlainKey.get(e.to))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Direct dependents of a key - the services that need it
   */
  dependentsOf(key: ServiceKey): GraphNode[] {
    const keyStr = this.toLabel(key);
    return this.edges
      .filter((e) => e.to === keyStr)
      .map((e) => this.byPlainKey.get(e.from))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * Nodes that nothing else depends on (candidate entry points)
   */
  roots(): GraphNode[] {
    const dependedOn = new Set(this.edges.map((e) => e.to));
    return this.nodes.filter((n) => !dependedOn.has(n.key));
  }

  /**
   * Nodes with no recorded dependencies (leaves of the graph)
   */
  leaves(): GraphNode[] {
    const withDeps = new Set(this.edges.map((e) => e.from));
    return this.nodes.filter((n) => !withDeps.has(n.key));
  }

  /**
   * Build a nested tree starting at `key`, recursively expanding
   * dependencies into `children`. Handy for rendering a dependency tree in
   * a UI (e.g. a collapsible tree view).
   *
   * A node that reappears along the same branch (A depends on B, B depends
   * on A, recorded from two separate resolve() calls) is marked
   * `cyclic: true` instead of recursing forever - `children` stays empty
   * there. Nodes that appear in multiple, unrelated branches (e.g. two
   * services sharing the same `db` dependency) are duplicated as separate
   * tree nodes, which is expected for a tree view.
   *
   * @param key The root key to build the tree from
   * @returns The tree, or undefined if `key` isn't a known node
   *
   * @example
   * ```typescript
   * const tree = container.graph().toTree('service');
   * // { key: 'service', children: [{ key: 'repo', children: [{ key: 'db', children: [] }] }] }
   * ```
   */
  toTree(key: ServiceKey): GraphTreeNode | undefined {
    return this.toTreeByLabel(this.toLabel(key), new Set());
  }

  /**
   * Recursion works on labels directly (never back through toLabel), so a
   * label can't be re-mapped to a different key mid-walk.
   * @private
   */
  private toTreeByLabel(
    keyStr: string,
    _visited: Set<string>
  ): GraphTreeNode | undefined {
    const node = this.byPlainKey.get(keyStr);
    if (!node) return undefined;

    if (_visited.has(keyStr)) {
      return { ...node, children: [], cyclic: true };
    }

    const visited = new Set(_visited);
    visited.add(keyStr);

    const children = this.dependenciesOfLabel(keyStr)
      .map((dep) => this.toTreeByLabel(dep.key, visited))
      .filter((n): n is GraphTreeNode => n !== undefined);

    return { ...node, children };
  }

  /**
   * Build a tree for every root (nodes nothing else depends on), covering
   * the whole graph at once - ready to hand to a UI as-is.
   *
   * @example
   * ```typescript
   * const forest = container.graph().forest();
   * // [{ key: 'service', children: [...] }, { key: 'unusedSingleton', children: [] }]
   * ```
   */
  forest(): GraphTreeNode[] {
    return this.roots()
      .map((root) => this.toTreeByLabel(root.key, new Set()))
      .filter((n): n is GraphTreeNode => n !== undefined);
  }

  /**
   * Plain JSON-serializable snapshot of the graph
   */
  toJSON(): GraphSnapshot {
    return { nodes: [...this.nodes], edges: [...this.edges] };
  }

  /**
   * Export as Graphviz DOT source, for visualizing the graph
   */
  toDot(): string {
    const lines = ['digraph Container {'];

    for (const node of this.nodes) {
      const label = `${node.key}\\n(${node.lifecycle}${node.lazy ? ', lazy' : ''})`;
      lines.push(`  "${node.key}" [label="${label}"];`);
    }

    for (const edge of this.edges) {
      lines.push(`  "${edge.from}" -> "${edge.to}";`);
    }

    lines.push('}');
    return lines.join('\n');
  }
}
