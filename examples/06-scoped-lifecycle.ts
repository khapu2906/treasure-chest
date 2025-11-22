/**
 * Example 6: Scoped Lifecycle
 *
 * This example demonstrates:
 * - Scoped bindings (instance per scope)
 * - Creating and managing scopes
 * - Disposal of scoped resources
 * - Use cases: per-request services in web applications
 */

import { Container } from '../src/index';

// Simulated database connection
class DbConnection {
  private connectionId: string;
  private isOpen = true;

  constructor() {
    this.connectionId = Math.random().toString(36).substring(7);
    console.log(`[DB] Connection ${this.connectionId} opened`);
  }

  query(sql: string) {
    if (!this.isOpen) {
      throw new Error('Connection is closed');
    }
    console.log(`[DB ${this.connectionId}] Query: ${sql}`);
    return { results: [] };
  }

  close() {
    this.isOpen = false;
    console.log(`[DB] Connection ${this.connectionId} closed`);
  }
}

// Request class simulating HTTP request
class HttpRequest {
  constructor(
    public path: string,
    private db: DbConnection
  ) {
    console.log(`[Request] Processing ${path}`);
  }

  async handle() {
    this.db.query(`SELECT * FROM logs WHERE path = '${this.path}'`);
    return `Response for ${this.path}`;
  }
}

// Setup container
const container = new Container();

// Register scoped database connection with disposal
container.scoped(
  'dbConnection',
  () => new DbConnection(),
  function (this: DbConnection) {
    this.close();
  }
);

// Register request handler
container.bind(
  'request',
  (c) => new HttpRequest('/api/users', c.resolve('dbConnection'))
);

// Simulate request handling with scopes
console.log('=== Scoped Lifecycle Demo ===\n');

async function handleRequest(path: string) {
  console.log(`--- Handling request: ${path} ---`);

  // Create a new scope for this request
  const scope = container.createScope();

  try {
    // All scoped services within this scope share the same instance
    const req1 = container.resolve<HttpRequest>('request');
    const req2 = container.resolve<HttpRequest>('request');

    console.log('Same DB connection?', req1 === req2); // Not same request, but same DB connection within scope

    await req1.handle();
  } finally {
    // Dispose scope and cleanup resources
    await scope.dispose();
    console.log('Scope disposed\n');
  }
}

// Handle multiple requests
(async () => {
  await handleRequest('/api/users');
  await handleRequest('/api/posts');
  await handleRequest('/api/comments');

  console.log('=== Each request got its own DB connection ===');
  console.log('=== Connections were properly cleaned up ===');
})();
