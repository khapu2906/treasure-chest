/**
 * Example 9: Circular Dependency Detection
 *
 * This example demonstrates:
 * - How circular dependencies are detected
 * - Error messages with dependency chain
 * - How to refactor to avoid circular dependencies
 */

import { Container } from '../src/index';

console.log('=== Circular Dependency Detection Demo ===\n');

// Example 1: Direct Circular Dependency
console.log('--- Example 1: Direct Circular Dependency (A -> B -> A) ---');
const container1 = new Container();

container1.bind('ServiceA', (c) => {
  console.log('Creating ServiceA...');
  const b = c.resolve('ServiceB'); // ServiceA depends on ServiceB
  return { name: 'A', dependency: b };
});

container1.bind('ServiceB', (c) => {
  console.log('Creating ServiceB...');
  const a = c.resolve('ServiceA'); // ServiceB depends on ServiceA = CIRCULAR!
  return { name: 'B', dependency: a };
});

try {
  container1.resolve('ServiceA');
} catch (error) {
  console.error('Error caught:', (error as Error).message);
  console.log();
}

// Example 2: Indirect Circular Dependency
console.log('--- Example 2: Indirect Circular (A -> B -> C -> A) ---');
const container2 = new Container();

container2.bind('ServiceA', (c) => {
  console.log('Creating ServiceA...');
  const b = c.resolve('ServiceB');
  return { name: 'A', dependency: b };
});

container2.bind('ServiceB', (c) => {
  console.log('Creating ServiceB...');
  const serviceC = c.resolve('ServiceC');
  return { name: 'B', dependency: serviceC };
});

container2.bind('ServiceC', (c) => {
  console.log('Creating ServiceC...');
  const serviceA = c.resolve('ServiceA'); // Back to A = CIRCULAR!
  return { name: 'C', dependency: serviceA };
});

try {
  container2.resolve('ServiceA');
} catch (error) {
  console.error('Error caught:', (error as Error).message);
  console.log();
}

// Example 3: Valid Dependency Chain (No Circular)
console.log('--- Example 3: Valid Dependency Chain (A -> B -> C) ---');
const container3 = new Container();

container3.bind('ServiceA', (c) => {
  console.log('Creating ServiceA...');
  const b = c.resolve('ServiceB');
  return { name: 'A', dependency: b };
});

container3.bind('ServiceB', (c) => {
  console.log('Creating ServiceB...');
  const serviceC = c.resolve('ServiceC');
  return { name: 'B', dependency: serviceC };
});

container3.bind('ServiceC', () => {
  console.log('Creating ServiceC...');
  return { name: 'C', dependency: null }; // No further dependencies
});

try {
  const result = container3.resolve('ServiceA');
  console.log('Success! Resolved:', result.name);
  console.log();
} catch (error) {
  console.error('Error:', (error as Error).message);
}

// Example 4: Refactoring to Avoid Circular Dependencies
console.log('--- Example 4: Refactoring Solution ---');
console.log('Instead of A depending on B and B depending on A,');
console.log('introduce a third service C that both A and B depend on:\n');

const container4 = new Container();

// Shared dependency
container4.singleton('SharedService', () => {
  console.log('Creating SharedService...');
  return { data: 'shared' };
});

// Both services depend on shared, but not on each other
container4.bind('ServiceA', (c) => {
  console.log('Creating ServiceA...');
  const shared = c.resolve('SharedService');
  return { name: 'A', shared };
});

container4.bind('ServiceB', (c) => {
  console.log('Creating ServiceB...');
  const shared = c.resolve('SharedService');
  return { name: 'B', shared };
});

try {
  const a = container4.resolve('ServiceA');
  const b = container4.resolve('ServiceB');
  console.log('Success! Both services resolved');
  console.log('ServiceA:', a.name, 'uses', a.shared.data);
  console.log('ServiceB:', b.name, 'uses', b.shared.data);
  console.log();
} catch (error) {
  console.error('Error:', (error as Error).message);
}

console.log('=== Best Practices to Avoid Circular Dependencies ===');
console.log('1. Use Dependency Inversion Principle (depend on abstractions)');
console.log('2. Extract shared logic into a third service');
console.log('3. Use events/observers instead of direct dependencies');
console.log('4. Consider using lazy loading for optional dependencies');
console.log('5. Review your architecture if you have circular deps');
