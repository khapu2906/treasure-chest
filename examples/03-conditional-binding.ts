/**
 * Example 3: Conditional Binding
 *
 * This example demonstrates:
 * - Registering multiple bindings for the same key
 * - Using conditions to select the right binding
 * - Environment-based configuration
 */

import { Container } from '../src/index';

// Define different logger implementations
class ConsoleLogger {
  log(message: string) {
    console.log(`[CONSOLE] ${message}`);
  }
}

class FileLogger {
  log(message: string) {
    console.log(`[FILE] Writing to app.log: ${message}`);
  }
}

class RemoteLogger {
  log(message: string) {
    console.log(`[REMOTE] Sending to logging service: ${message}`);
  }
}

// Simulate environment variables
const env = {
  NODE_ENV: 'production', // Try changing to 'development' or 'test'
  REMOTE_LOGGING: true, // Try changing to false
};

// Setup container with conditional bindings
const container = new Container();

// Development environment - use console logger
container.bind(
  'logger',
  () => new ConsoleLogger(),
  () => env.NODE_ENV === 'development'
);

// Test environment - use file logger
container.bind(
  'logger',
  () => new FileLogger(),
  () => env.NODE_ENV === 'test'
);

// Production with remote logging enabled
container.bind(
  'logger',
  () => new RemoteLogger(),
  () => env.NODE_ENV === 'production' && env.REMOTE_LOGGING === true
);

// Production fallback - use file logger
container.bind(
  'logger',
  () => new FileLogger(),
  () => env.NODE_ENV === 'production' && env.REMOTE_LOGGING === false
);

// Usage
console.log(`=== Environment: ${env.NODE_ENV} ===`);
console.log(`=== Remote Logging: ${env.REMOTE_LOGGING} ===\n`);

const logger = container.resolve<ConsoleLogger | FileLogger | RemoteLogger>(
  'logger'
);
logger.log('Application started');
logger.log('Processing user request');
logger.log('Application shutdown');

console.log('\n=== The correct logger was automatically selected! ===');
