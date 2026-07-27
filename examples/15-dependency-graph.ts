/**
 * Example 15: Dependency Graph Inspection
 *
 * This example demonstrates:
 * - Building a filterable snapshot of a container's bindings with graph()
 * - Filtering nodes by lifecycle, resolved state, and key pattern
 * - Walking dependency relationships (dependenciesOf / dependentsOf)
 * - Finding entry points (roots) and leaf dependencies (leaves)
 * - Exporting UI-ready nested trees (toTree / forest)
 * - Exporting a plain JSON snapshot or Graphviz DOT source
 */

import { Container } from '../src/index';

class Database {
  query(sql: string) {
    return { sql, rows: [] };
  }
}

class UserRepository {
  constructor(private db: Database) {}

  findUser(id: number) {
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

class UserService {
  constructor(
    private repo: UserRepository,
    private logger: Logger
  ) {}

  getUser(id: number) {
    this.logger.log(`Fetching user ${id}`);
    return this.repo.findUser(id);
  }
}

console.log('=== Dependency Graph Demo ===\n');

const container = new Container();

container.singleton('db', () => new Database());
container.singleton('logger', () => new Logger());
container.singleton('userRepo', (c) => new UserRepository(c.resolve('db')));
container.bind(
  'userService',
  (c) => new UserService(c.resolve('userRepo'), c.resolve('logger'))
);
// Never resolved - useful to show up as "unresolved" in the graph
container.singleton('unusedCache', () => new Map());

// Edges are only recorded once something is actually resolved
const userService = container.resolve<UserService>('userService');
userService.getUser(1);

const graph = container.graph();

console.log('--- All nodes ---');
for (const node of graph.getNodes()) {
  console.log(
    `${node.key} (${node.lifecycle}${node.lazy ? ', lazy' : ''}) resolved=${node.resolved}`
  );
}

console.log('\n--- Filter: singletons only ---');
console.log(graph.getNodes({ lifecycle: 'singleton' }).map((n) => n.key));

console.log('\n--- Filter: resolved instances only ---');
console.log(graph.getNodes({ resolved: true }).map((n) => n.key));

console.log('\n--- Filter: keys matching /Repo|Service/ ---');
console.log(graph.getNodes({ key: /Repo|Service/ }).map((n) => n.key));

console.log('\n--- Dependencies of userService ---');
console.log(graph.dependenciesOf('userService').map((n) => n.key));

console.log('\n--- Who depends on db? ---');
console.log(graph.dependentsOf('db').map((n) => n.key));

console.log('\n--- Roots (nothing depends on them) ---');
console.log(graph.roots().map((n) => n.key));

console.log('\n--- Leaves (no dependencies of their own) ---');
console.log(graph.leaves().map((n) => n.key));

console.log('\n--- Nested tree from userService (UI-ready) ---');
console.log(JSON.stringify(graph.toTree('userService'), null, 2));

console.log('\n--- Forest: a tree per root, whole graph at once ---');
console.log(graph.forest().map((tree) => tree.key)); // e.g. ['userService', 'unusedCache']

console.log('\n--- Graphviz DOT export ---');
console.log(graph.toDot());
