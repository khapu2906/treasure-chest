/**
 * Middleware Integration Patterns
 *
 * This example demonstrates how to integrate Treasure Chest with web frameworks
 * for automatic per-request scope management and resource cleanup.
 *
 * NOTE: These are pattern demonstrations only. For production use,
 * consider creating separate adapter packages to keep the core library framework-agnostic.
 */

import { Container } from '../src/Container';

// Example service that needs per-request scoping
class DatabaseConnection {
  constructor(private connectionId: string) {}

  query(sql: string) {
    console.log(`[${this.connectionId}] Executing: ${sql}`);
    return { rows: [{ id: 1, name: 'John' }] };
  }

  close() {
    console.log(`[${this.connectionId}] Connection closed`);
  }
}

class RequestLogger {
  constructor(private requestId: string) {}

  log(message: string) {
    console.log(`[${this.requestId}] ${message}`);
  }
}

// =============================================================================
// EXPRESS MIDDLEWARE PATTERN
// =============================================================================

function createExpressMiddleware(container: Container) {
  return (req: any, res: any, next: () => void) => {
    // Create a new scope for this request
    const scope = container.createScope();

    // Store scope in request for access in route handlers
    req.scope = scope;

    // Clean up when response finishes
    res.on('finish', () => {
      scope.dispose();
    });

    next();
  };
}

function demoExpressPattern() {
  console.log('=== EXPRESS PATTERN ===');

  const container = new Container();

  // Register scoped services
  container.scoped('db', () => new DatabaseConnection(`req-${Math.random()}`));
  container.scoped('logger', () => new RequestLogger(`req-${Math.random()}`));

  // Simulate Express middleware
  const mockReq: any = { scope: null };
  const mockRes = {
    on: (event: string, callback: () => void) => {
      if (event === 'finish') {
        // Simulate response finish
        setTimeout(callback, 100);
      }
    },
  };

  const middleware = createExpressMiddleware(container);

  // Simulate middleware execution
  middleware(mockReq, mockRes, () => {
    console.log('Route handler executing...');

    // Access scoped services (scoped services are resolved from container, not scope directly)
    const db = container.resolve('db') as DatabaseConnection;
    const logger = container.resolve('logger') as RequestLogger;

    logger.log('Processing request');
    const result = db.query('SELECT * FROM users');

    console.log('Query result:', result);
  });
}

// =============================================================================
// FASTIFY HOOK PATTERN
// =============================================================================

function createFastifyHook(container: Container) {
  return {
    onRequest: (request: any, _reply: any, done: () => void) => {
      // Create scope on request
      request.scope = container.createScope();
      done();
    },
    onResponse: (request: any, _reply: any, done: () => void) => {
      // Clean up on response
      if (request.scope) {
        request.scope.dispose();
      }
      done();
    },
  };
}

function demoFastifyPattern() {
  console.log('\n=== FASTIFY PATTERN ===');

  const container = new Container();

  // Register scoped services
  container.scoped('db', () => new DatabaseConnection(`req-${Math.random()}`));
  container.scoped('logger', () => new RequestLogger(`req-${Math.random()}`));

  // Simulate Fastify hooks
  const mockRequest: any = { scope: null };

  const hooks = createFastifyHook(container);

  // Simulate onRequest hook
  hooks.onRequest(mockRequest, {}, () => {
    console.log('Fastify onRequest hook executed');

    // Route handler
    const db = container.resolve('db') as DatabaseConnection;
    const logger = container.resolve('logger') as RequestLogger;

    logger.log('Processing Fastify request');
    const result = db.query('SELECT * FROM products');

    console.log('Query result:', result);

    // Simulate onResponse hook
    setTimeout(() => {
      hooks.onResponse(mockRequest, {}, () => {
        console.log('Fastify onResponse hook executed');
      });
    }, 100);
  });
}

// =============================================================================
// KOA MIDDLEWARE PATTERN
// =============================================================================

function createKoaMiddleware(container: Container) {
  return async (ctx: any, next: () => Promise<void>) => {
    // Create scope for this request
    ctx.scope = container.createScope();

    try {
      // Execute next middleware/route handler
      await next();
    } finally {
      // Always clean up, even if errors occur
      ctx.scope.dispose();
    }
  };
}

function demoKoaPattern() {
  console.log('\n=== KOA PATTERN ===');

  const container = new Container();

  // Register scoped services
  container.scoped('db', () => new DatabaseConnection(`req-${Math.random()}`));
  container.scoped('logger', () => new RequestLogger(`req-${Math.random()}`));

  // Simulate Koa middleware
  const mockCtx: any = { scope: null };

  const middleware = createKoaMiddleware(container);

  // Simulate middleware execution
  middleware(mockCtx, async () => {
    console.log('Koa route handler executing...');

    // Access scoped services
    const db = container.resolve('db') as DatabaseConnection;
    const logger = container.resolve('logger') as RequestLogger;

    logger.log('Processing Koa request');
    const result = db.query('SELECT * FROM orders');

    console.log('Query result:', result);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 50));
  }).then(() => {
    console.log('Koa middleware completed');
  });
}

// =============================================================================
// ADVANCED: WITHSCOPE PATTERN (C# USING STATEMENT)
// =============================================================================

async function demoWithScopePattern() {
  console.log('\n=== WITHSCOPE PATTERN (C# using) ===');

  const container = new Container();

  // Register scoped services
  container.scoped(
    'db',
    () => new DatabaseConnection(`scope-${Math.random()}`)
  );
  container.scoped('logger', () => new RequestLogger(`scope-${Math.random()}`));

  // Use withScope() - automatic cleanup like C# using statement
  await container.withScope(async (_scope) => {
    console.log('Inside withScope - services are available');

    const db = container.resolve('db') as DatabaseConnection; // Resolves from current scope
    const logger = container.resolve('logger') as RequestLogger;

    logger.log('Processing with scoped services');
    const result = db.query('SELECT * FROM analytics');

    console.log('Query result:', result);

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log('Work completed - scope will auto-dispose');
  });

  console.log('Scope automatically disposed');
}

// =============================================================================
// RUN ALL DEMOS
// =============================================================================

async function main() {
  console.log('🚀 Treasure Chest Middleware Integration Patterns\n');

  demoExpressPattern();
  demoFastifyPattern();
  demoKoaPattern();
  await demoWithScopePattern();

  console.log('\n✨ All patterns demonstrated successfully!');
  console.log('\n📝 Note: These are pattern examples only.');
  console.log('For production use, create separate adapter packages:');
  console.log('- @khapu2906/treasure-chest-express');
  console.log('- @khapu2906/treasure-chest-fastify');
  console.log('- @khapu2906/treasure-chest-koa');
}

if (require.main === module) {
  main().catch(console.error);
}

export { createExpressMiddleware, createFastifyHook, createKoaMiddleware };
