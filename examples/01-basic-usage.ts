/**
 * Example 1: Basic Usage - Transient and Singleton Bindings
 *
 * This example demonstrates:
 * - Creating a container
 * - Registering transient bindings
 * - Registering singleton bindings
 * - Resolving services
 */

import { Container } from '../src/index';

// Simple service classes
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

class Database {
  private connectionId: string;

  constructor() {
    this.connectionId = Math.random().toString(36).substring(7);
    console.log(`Database connection created: ${this.connectionId}`);
  }

  query(sql: string) {
    console.log(`[DB ${this.connectionId}] Executing: ${sql}`);
  }
}

// Create container
const container = new Container();

// Register transient binding - new instance each time
container.bind('logger', () => new Logger());

// Register singleton binding - single instance shared
container.singleton('database', () => new Database());

// Usage
console.log('=== Transient Binding (Logger) ===');
const logger1 = container.resolve<Logger>('logger');
const logger2 = container.resolve<Logger>('logger');
console.log('logger1 === logger2:', logger1 === logger2); // false - different instances

logger1.log('Hello from logger1');
logger2.log('Hello from logger2');

console.log('\n=== Singleton Binding (Database) ===');
const db1 = container.resolve<Database>('database');
const db2 = container.resolve<Database>('database');
console.log('db1 === db2:', db1 === db2); // true - same instance

db1.query('SELECT * FROM users');
db2.query('SELECT * FROM posts'); // Same connection ID
