/**
 * Example 5: Alias
 *
 * This example demonstrates:
 * - Creating aliases for service keys
 * - Using multiple names for the same binding
 * - Interface-based naming conventions
 */

import { Container } from '../src/index';

// Define services
class PostgreSQLDatabase {
  query(sql: string) {
    console.log(`[PostgreSQL] Executing: ${sql}`);
  }
}

class UserRepositoryImpl {
  constructor(private db: PostgreSQLDatabase) {}

  findById(id: number) {
    console.log(`Finding user by ID: ${id}`);
    this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

// Setup container
const container = new Container();

// Register with full name
container.singleton('PostgreSQLDatabase', () => new PostgreSQLDatabase());

// Create convenient aliases
container.alias('Database', 'PostgreSQLDatabase');
container.alias('DB', 'PostgreSQLDatabase');
container.alias('db', 'PostgreSQLDatabase');

// Register repository
container.singleton(
  'UserRepositoryImplementation',
  (c) => new UserRepositoryImpl(c.resolve('Database'))
);

// Create aliases for repository
container.alias('UserRepository', 'UserRepositoryImplementation');
container.alias('UserRepo', 'UserRepositoryImplementation');
container.alias('users', 'UserRepositoryImplementation');

// Usage - all these resolve to the same instances
console.log('=== Using Different Aliases ===\n');

console.log('--- Resolving Database ---');
const db1 = container.resolve<PostgreSQLDatabase>('PostgreSQLDatabase');
const db2 = container.resolve<PostgreSQLDatabase>('Database');
const db3 = container.resolve<PostgreSQLDatabase>('DB');
const db4 = container.resolve<PostgreSQLDatabase>('db');

console.log('All database aliases point to same instance:');
console.log('  PostgreSQLDatabase === Database:', db1 === db2);
console.log('  Database === DB:', db2 === db3);
console.log('  DB === db:', db3 === db4);

console.log('\n--- Resolving UserRepository ---');
const repo1 = container.resolve<UserRepositoryImpl>(
  'UserRepositoryImplementation'
);
const repo2 = container.resolve<UserRepositoryImpl>('UserRepository');
const repo3 = container.resolve<UserRepositoryImpl>('UserRepo');
const repo4 = container.resolve<UserRepositoryImpl>('users');

console.log('\nAll repository aliases point to same instance:');
console.log(
  '  UserRepositoryImplementation === UserRepository:',
  repo1 === repo2
);
console.log('  UserRepository === UserRepo:', repo2 === repo3);
console.log('  UserRepo === users:', repo3 === repo4);

console.log('\n--- Using the repository ---');
repo1.findById(123);

console.log('\n=== Aliases provide naming flexibility! ===');
