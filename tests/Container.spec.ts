import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../src';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  // ========================================
  // 1. BIND - TRANSIENT
  // ========================================
  describe('bind (transient)', () => {
    it('should create new instance on each resolve', () => {
      container.bind('service', () => ({ id: Math.random() }));

      const instance1 = container.resolve('service');
      const instance2 = container.resolve('service');

      expect(instance1).not.toBe(instance2);
    });

    it('should call factory function on each resolve', () => {
      let callCount = 0;
      container.bind('service', () => {
        callCount++;
        return { count: callCount };
      });

      container.resolve('service');
      container.resolve('service');
      container.resolve('service');

      expect(callCount).toBe(3);
    });

    it('should pass container instance to factory', () => {
      container.bind('dep', () => ({ name: 'dependency' }));
      container.bind('service', (c) => ({
        dep: c.resolve('dep'),
      }));

      const service = container.resolve<any>('service');
      expect(service.dep.name).toBe('dependency');
    });
  });

  // ========================================
  // 2. SINGLETON
  // ========================================
  describe('singleton', () => {
    it('should return same instance on multiple resolves', () => {
      container.singleton('cache', () => ({ id: Math.random() }));

      const instance1 = container.resolve('cache');
      const instance2 = container.resolve('cache');

      expect(instance1).toBe(instance2);
    });

    it('should call factory only once', () => {
      let callCount = 0;
      container.singleton('service', () => {
        callCount++;
        return { count: callCount };
      });

      container.resolve('service');
      container.resolve('service');
      container.resolve('service');

      expect(callCount).toBe(1);
    });

    it('should cache instance correctly', () => {
      container.singleton('counter', () => ({ value: 0 }));

      const counter1 = container.resolve<any>('counter');
      counter1.value = 42;

      const counter2 = container.resolve<any>('counter');
      expect(counter2.value).toBe(42);
    });
  });

  // ========================================
  // 3. ALIAS
  // ========================================
  describe('alias', () => {
    it('should resolve to same instance via alias', () => {
      container.singleton('logger', () => ({ name: 'ConsoleLogger' }));
      container.alias('appLogger', 'logger');

      const logger = container.resolve('logger');
      const appLogger = container.resolve('appLogger');

      expect(logger).toBe(appLogger);
    });

    it('should support multiple aliases for same key', () => {
      container.singleton('db', () => ({ conn: 'database' }));
      container.alias('database', 'db');
      container.alias('connection', 'db');

      const db = container.resolve('db');
      const database = container.resolve('database');
      const connection = container.resolve('connection');

      expect(db).toBe(database);
      expect(database).toBe(connection);
    });

    it('should throw error if original key not bound', () => {
      container.alias('alias', 'nonexistent');

      expect(() => container.resolve('alias')).toThrow(
        'No binding found for key: nonexistent'
      );
    });
  });

  // ========================================
  // 4. CONDITIONAL BINDING
  // ========================================
  describe('conditional binding', () => {
    it('should resolve based on condition', () => {
      let env = 'development';

      container.bind(
        'storage',
        () => ({ type: 'local' }),
        () => env === 'development'
      );

      container.bind(
        'storage',
        () => ({ type: 's3' }),
        () => env === 'production'
      );

      const devStorage = container.resolve<any>('storage');
      expect(devStorage.type).toBe('local');

      env = 'production';
      const prodStorage = container.resolve<any>('storage');
      expect(prodStorage.type).toBe('s3');
    });

    it('should fallback to first binding if no condition matches', () => {
      container.bind('service', () => ({ type: 'default' }));
      container.bind(
        'service',
        () => ({ type: 'conditional' }),
        () => false
      );

      const service = container.resolve<any>('service');
      expect(service.type).toBe('default');
    });

    it('should pass container to condition function', () => {
      container.singleton('config', () => ({ debug: true }));
      container.bind(
        'logger',
        () => ({ level: 'debug' }),
        (c) => c.resolve<any>('config').debug === true
      );

      const logger = container.resolve<any>('logger');
      expect(logger.level).toBe('debug');
    });

    it('should work with singleton + condition', () => {
      let callCount = 0;
      container.singleton(
        'service',
        () => {
          callCount++;
          return { count: callCount };
        },
        () => true
      );

      container.resolve('service');
      container.resolve('service');

      expect(callCount).toBe(1);
    });
  });

  // ========================================
  // 5. CONTEXTUAL BINDING
  // ========================================
  describe('contextual binding (when/needs/give)', () => {
    it('should resolve different implementations based on context', () => {
      class UserRepo {
        getType() {
          return 'UserRepo';
        }
      }
      class AdminRepo {
        getType() {
          return 'AdminRepo';
        }
      }

      container.when('UserService').needs('repo').give(() => new UserRepo());
      container.when('AdminService').needs('repo').give(() => new AdminRepo());

      const userRepo = container.resolve<any>('repo', 'UserService');
      const adminRepo = container.resolve<any>('repo', 'AdminService');

      expect(userRepo.getType()).toBe('UserRepo');
      expect(adminRepo.getType()).toBe('AdminRepo');
    });

    it('should support nested contextual dependencies', () => {
      container.singleton('db', () => ({ name: 'database' }));

      container
        .when('UserService')
        .needs('repo')
        .give((c) => ({
          db: c.resolve('db'),
          type: 'user',
        }));

      container
        .when('AdminService')
        .needs('repo')
        .give((c) => ({
          db: c.resolve('db'),
          type: 'admin',
        }));

      const userRepo = container.resolve<any>('repo', 'UserService');
      const adminRepo = container.resolve<any>('repo', 'AdminService');

      expect(userRepo.type).toBe('user');
      expect(adminRepo.type).toBe('admin');
      expect(userRepo.db).toBe(adminRepo.db); // Same DB singleton
    });

    it('should fallback to non-contextual binding if context not found', () => {
      container.bind('mailer', () => ({ type: 'console' }));
      container
        .when('PaymentService')
        .needs('mailer')
        .give(() => ({ type: 'ses' }));

      const defaultMailer = container.resolve<any>('mailer');
      const paymentMailer = container.resolve<any>('mailer', 'PaymentService');
      const otherMailer = container.resolve<any>('mailer', 'OtherService');

      expect(defaultMailer.type).toBe('console');
      expect(paymentMailer.type).toBe('ses');
      expect(otherMailer.type).toBe('console');
    });

    it('should support multiple contextual bindings for same key', () => {
      container.when('Service1').needs('dep').give(() => ({ id: 1 }));
      container.when('Service2').needs('dep').give(() => ({ id: 2 }));
      container.when('Service3').needs('dep').give(() => ({ id: 3 }));

      expect(container.resolve<any>('dep', 'Service1').id).toBe(1);
      expect(container.resolve<any>('dep', 'Service2').id).toBe(2);
      expect(container.resolve<any>('dep', 'Service3').id).toBe(3);
    });

    it('should cache contextual singletons separately', () => {
      let userRepoCount = 0;
      let adminRepoCount = 0;

      container
        .when('UserService')
        .needs('repo')
        .give(() => ({ id: ++userRepoCount }));

      container
        .when('AdminService')
        .needs('repo')
        .give(() => ({ id: ++adminRepoCount }));

      // Make them singletons by using singleton binding
      container.singleton('userService', (c) => ({
        repo: c.resolve('repo', 'UserService'),
      }));

      container.singleton('adminService', (c) => ({
        repo: c.resolve('repo', 'AdminService'),
      }));

      const user1 = container.resolve<any>('userService');
      const user2 = container.resolve<any>('userService');
      const admin1 = container.resolve<any>('adminService');
      const admin2 = container.resolve<any>('adminService');

      expect(user1).toBe(user2);
      expect(admin1).toBe(admin2);
      expect(user1.repo).not.toBe(admin1.repo);
    });
  });

  // ========================================
  // 6. CONTEXTUAL + CONDITIONAL
  // ========================================
  describe('contextual + conditional binding', () => {
    it('should prioritize context + condition match', () => {
      let env = 'production';

      container.bind('logger', () => ({ type: 'console' }));

      container
        .when('PaymentService')
        .needs('logger')
        .give(() => ({ type: 'ses' }));

      // This should NOT be used even though condition is true
      container.bind(
        'logger',
        () => ({ type: 'file' }),
        () => env === 'production'
      );

      const paymentLogger = container.resolve<any>('logger', 'PaymentService');
      expect(paymentLogger.type).toBe('ses');
    });
  });

  // ========================================
  // 7. RESET
  // ========================================
  describe('reset', () => {
    it('should clear all bindings', () => {
      container.bind('service1', () => ({}));
      container.singleton('service2', () => ({}));
      container.alias('alias', 'service1');

      container.reset();

      expect(() => container.resolve('service1')).toThrow();
      expect(() => container.resolve('service2')).toThrow();
      expect(() => container.resolve('alias')).toThrow();
    });

    it('should clear all cached instances', () => {
      container.singleton('cache', () => ({ id: Math.random() }));
      const instance1 = container.resolve<any>('cache');

      container.reset();
      container.singleton('cache', () => ({ id: Math.random() }));
      const instance2 = container.resolve<any>('cache');

      expect(instance1.id).not.toBe(instance2.id);
    });

    it('should clear aliases', () => {
      container.singleton('logger', () => ({}));
      container.alias('appLogger', 'logger');

      container.reset();

      expect(() => container.resolve('appLogger')).toThrow();
    });

    it('should reset current context', () => {
      container.when('Service').needs('dep').give(() => ({}));
      container.resolve('dep', 'Service');

      container.reset();

      // Current context should be cleared
      expect(container['currentContext']).toBeUndefined();
    });
  });

  // ========================================
  // 8. ERROR HANDLING
  // ========================================
  describe('error handling', () => {
    it('should throw error when resolving unbound key', () => {
      expect(() => container.resolve('nonexistent')).toThrow(
        'No binding found for key: nonexistent'
      );
    });

    it('should throw error with correct key name', () => {
      expect(() => container.resolve('myService')).toThrow(
        'No binding found for key: myService'
      );
    });

    it('should handle factory errors gracefully', () => {
      container.bind('service', () => {
        throw new Error('Factory failed');
      });

      expect(() => container.resolve('service')).toThrow('Factory failed');
    });
  });

  // ========================================
  // 9. COMPLEX SCENARIOS
  // ========================================
  describe('complex scenarios', () => {
    it('should handle deep dependency chains', () => {
      container.singleton('db', () => ({ name: 'database' }));
      container.singleton('repo', (c) => ({ db: c.resolve('db') }));
      container.singleton('service', (c) => ({ repo: c.resolve('repo') }));
      container.singleton('controller', (c) => ({
        service: c.resolve('service'),
      }));

      const controller = container.resolve<any>('controller');
      expect(controller.service.repo.db.name).toBe('database');
    });

    it('should handle circular dependency detection implicitly', () => {
      // This will cause stack overflow, but that's expected behavior
      // Real DI containers often detect this, but this simple one doesn't
      container.bind('a', (c) => ({ b: c.resolve('b') }));
      container.bind('b', (c) => ({ a: c.resolve('a') }));

      expect(() => container.resolve('a')).toThrow();
    });

    it('should support mixed binding types', () => {
      container.bind('transient', () => ({ type: 'transient' }));
      container.singleton('singleton', () => ({ type: 'singleton' }));
      container.alias('aliased', 'singleton');

      container
        .when('Service')
        .needs('contextual')
        .give(() => ({ type: 'contextual' }));

      expect(container.resolve<any>('transient').type).toBe('transient');
      expect(container.resolve<any>('singleton').type).toBe('singleton');
      expect(container.resolve<any>('aliased').type).toBe('singleton');
      expect(container.resolve<any>('contextual', 'Service').type).toBe(
        'contextual'
      );
    });

    it('should handle real-world service architecture', () => {
      class Database {
        query() {
          return 'query result';
        }
      }
      class UserRepository {
        constructor(public db: Database) { }
      }
      class AdminRepository {
        constructor(public db: Database) { }
      }
      class UserService {
        constructor(public repo: UserRepository) { }
      }
      class AdminService {
        constructor(public repo: AdminRepository) { }
      }

      container.singleton('db', () => new Database());

      container
        .when('UserService')
        .needs('repo')
        .give((c) => new UserRepository(c.resolve('db')));

      container
        .when('AdminService')
        .needs('repo')
        .give((c) => new AdminRepository(c.resolve('db')));

      container.singleton(
        'userService',
        (c) => new UserService(c.resolve('repo', 'UserService'))
      );

      container.singleton(
        'adminService',
        (c) => new AdminService(c.resolve('repo', 'AdminService'))
      );

      const userService = container.resolve<UserService>('userService');
      const adminService = container.resolve<AdminService>('adminService');

      expect(userService.repo).toBeInstanceOf(UserRepository);
      expect(adminService.repo).toBeInstanceOf(AdminRepository);
      expect(userService.repo.db.query()).toBe('query result');
      expect(userService.repo.db).toBe(adminService.repo.db); // Same DB
    });
  });

  // ========================================
  // 10. EDGE CASES
  // ========================================
  describe('edge cases', () => {
    it('should handle empty string as key', () => {
      container.bind('', () => ({ empty: true }));
      const result = container.resolve<any>('');
      expect(result.empty).toBe(true);
    });

    it('should handle special characters in keys', () => {
      container.bind('service:v1', () => ({ version: 1 }));
      container.bind('service@admin', () => ({ role: 'admin' }));

      expect(container.resolve<any>('service:v1').version).toBe(1);
      expect(container.resolve<any>('service@admin').role).toBe('admin');
    });

    it('should handle undefined context', () => {
      container.bind('service', () => ({ type: 'default' }));
      const result = container.resolve<any>('service', undefined);
      expect(result.type).toBe('default');
    });

    it('should handle null values from factory', () => {
      container.bind('nullable', () => null);
      expect(container.resolve('nullable')).toBeNull();
    });

    it('should handle primitive values from factory', () => {
      container.bind('number', () => 42);
      container.bind('string', () => 'hello');
      container.bind('boolean', () => true);

      expect(container.resolve('number')).toBe(42);
      expect(container.resolve('string')).toBe('hello');
      expect(container.resolve('boolean')).toBe(true);
    });

    it('should maintain instance type after resolve', () => {
      class MyService {
        getName() {
          return 'MyService';
        }
      }
      container.singleton('myService', () => new MyService());

      const service = container.resolve<MyService>('myService');
      expect(service).toBeInstanceOf(MyService);
      expect(service.getName()).toBe('MyService');
    });
  });
});