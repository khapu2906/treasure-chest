/**
 * Example 4: Contextual Binding
 *
 * This example demonstrates:
 * - Different implementations based on context
 * - Using when().needs().give() syntax
 * - Real-world scenario with different cache strategies
 */

import { Container } from '../src/index';

// Cache interface
interface Cache {
  get(key: string): any;
  set(key: string, value: any): void;
}

// Different cache implementations
class RedisCache implements Cache {
  get(key: string) {
    console.log(`[RedisCache] Getting key: ${key} from Redis`);
    return `redis-value-${key}`;
  }

  set(key: string, value: any) {
    console.log(`[RedisCache] Setting ${key} = ${value} in Redis`);
  }
}

class MemoryCache implements Cache {
  private store = new Map<string, any>();

  get(key: string) {
    console.log(`[MemoryCache] Getting key: ${key} from memory`);
    return this.store.get(key);
  }

  set(key: string, value: any) {
    console.log(`[MemoryCache] Setting ${key} = ${value} in memory`);
    this.store.set(key, value);
  }
}

// Services that use cache differently
class UserService {
  constructor(private cache: Cache) {}

  getUser(id: number) {
    console.log('UserService: Getting user');
    return this.cache.get(`user:${id}`);
  }
}

class SessionService {
  constructor(private cache: Cache) {}

  getSession(id: string) {
    console.log('SessionService: Getting session');
    return this.cache.get(`session:${id}`);
  }
}

class AnalyticsService {
  constructor(private cache: Cache) {}

  getStats(metric: string) {
    console.log('AnalyticsService: Getting stats');
    return this.cache.get(`stats:${metric}`);
  }
}

// Setup container
const container = new Container();

// UserService needs Redis for persistent user data
container
  .when('UserService')
  .needs('cache')
  .give(() => new RedisCache());

// SessionService needs Redis for persistent sessions
container
  .when('SessionService')
  .needs('cache')
  .give(() => new RedisCache());

// AnalyticsService can use in-memory cache (temporary stats)
container
  .when('AnalyticsService')
  .needs('cache')
  .give(() => new MemoryCache());

// Register services
container.bind('UserService', (c) => new UserService(c.resolve('cache')));
container.bind('SessionService', (c) => new SessionService(c.resolve('cache')));
container.bind(
  'AnalyticsService',
  (c) => new AnalyticsService(c.resolve('cache'))
);

// Usage
console.log('=== Contextual Binding Demo ===\n');

console.log('--- UserService uses RedisCache ---');
const userService = container.resolve<UserService>('UserService');
userService.getUser(123);

console.log('\n--- SessionService uses RedisCache ---');
const sessionService = container.resolve<SessionService>('SessionService');
sessionService.getSession('abc-123');

console.log('\n--- AnalyticsService uses MemoryCache ---');
const analyticsService =
  container.resolve<AnalyticsService>('AnalyticsService');
analyticsService.getStats('page_views');

console.log('\n=== Each service got the right cache implementation! ===');
