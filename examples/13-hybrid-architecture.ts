/**
 * Hybrid Approach: Global Container + Child Containers
 *
 * This example demonstrates how to combine:
 * 1. A global container for shared services
 * 2. Child containers for feature-specific services
 * 3. Composition for cross-cutting concerns
 */

import { Container } from '../src/Container';

// =============================================
// GLOBAL CONTAINER: Shared Infrastructure
// =============================================

class GlobalContainer {
  private static instance: Container;

  static getInstance(): Container {
    if (!GlobalContainer.instance) {
      GlobalContainer.instance = new Container();

      // Shared infrastructure services
      const c = GlobalContainer.instance;
      c.singleton('database', () => ({
        connect: () => console.log('🔌 Connected to database'),
        query: (sql: string) => ({ rows: [{ id: 1, name: 'John' }] }),
      }));
      c.singleton('cache', () => ({
        get: (key: string) => console.log(`📦 Cache get: ${key}`),
        set: (key: string) => console.log(`💾 Cache set: ${key}`),
      }));
      c.singleton('logger', () => ({
        info: (msg: string) => console.log(`📝 ${msg}`),
        error: (msg: string) => console.error(`❌ ${msg}`),
      }));
    }

    return GlobalContainer.instance;
  }
}

// =============================================
// FEATURE MODULES: Feature-specific services
// =============================================

class UserModule {
  static create(baseContainer: Container): Container {
    const container = baseContainer.createChild();

    container.singleton('userRepository', (c: any) => ({
      findById: (id: number) => {
        const db = c.resolve('database');
        const cache = c.resolve('cache');
        const logger = c.resolve('logger');

        logger.info(`Finding user ${id}`);
        cache.get(`user:${id}`);
        return db.query(`SELECT * FROM users WHERE id = ${id}`).rows[0];
      },
    }));

    container.singleton('userService', (c: any) => ({
      getUser: (id: number) => {
        const repo = c.resolve('userRepository');
        return repo.findById(id);
      },
    }));

    return container;
  }
}

class ProductModule {
  static create(baseContainer: Container): Container {
    const container = baseContainer.createChild();

    container.singleton('productRepository', (c: any) => ({
      findById: (id: number) => {
        const db = c.resolve('database');
        const cache = c.resolve('cache');
        const logger = c.resolve('logger');

        logger.info(`Finding product ${id}`);
        cache.get(`product:${id}`);
        return db.query(`SELECT * FROM products WHERE id = ${id}`).rows[0];
      },
    }));

    container.singleton('productService', (c: any) => ({
      getProduct: (id: number) => {
        const repo = c.resolve('productRepository');
        return repo.findById(id);
      },
    }));

    return container;
  }
}

// =============================================
// CROSS-CUTTING CONCERNS: Authentication, etc.
// =============================================

class AuthModule {
  static create(): Container {
    const container = new Container();

    container.singleton('authService', () => ({
      authenticate: (token: string) => {
        console.log(`🔐 Authenticating token: ${token}`);
        return { userId: 1, valid: true };
      },
    }));

    container.singleton('jwtService', () => ({
      verify: (token: string) => ({ userId: 1, exp: Date.now() + 3600000 }),
    }));

    return container;
  }
}

// =============================================
// APPLICATION ASSEMBLY
// =============================================

function createWebApplication(): Container {
  // Start with global infrastructure
  const global = GlobalContainer.getInstance();

  // Create feature modules
  const userModule = UserModule.create(global);
  const productModule = ProductModule.create(global);

  // Create cross-cutting concerns
  const authModule = AuthModule.create();

  // Compose everything together
  const app = Container.compose([
    global,
    userModule,
    productModule,
    authModule,
  ]);

  return app;
}

function createApiApplication(): Container {
  // API only needs infrastructure + business logic
  const global = GlobalContainer.getInstance();
  const userModule = UserModule.create(global);
  const productModule = ProductModule.create(global);
  const authModule = AuthModule.create();

  // No UI components for API
  return Container.compose([global, userModule, productModule, authModule]);
}

function createAdminApplication(): Container {
  // Admin might need additional admin-specific modules
  const global = GlobalContainer.getInstance();
  const userModule = UserModule.create(global);
  const productModule = ProductModule.create(global);
  const authModule = AuthModule.create();

  // Could add admin-specific modules here
  // const adminModule = AdminModule.create(global);

  return Container.compose([global, userModule, productModule, authModule]);
}

// =============================================
// DEMO: Hybrid Architecture
// =============================================

function demoHybridArchitecture() {
  console.log('🚀 HYBRID ARCHITECTURE: Global + Child + Composition\n');

  console.log('🏗️  BUILDING APPLICATIONS:\n');

  const webApp = createWebApplication();
  console.log('Web App services:', webApp.keys().length, 'total');
  console.log('- Infrastructure:', ['database', 'cache', 'logger']);
  console.log('- User features:', ['userRepository', 'userService']);
  console.log('- Product features:', ['productRepository', 'productService']);
  console.log('- Auth:', ['authService', 'jwtService']);
  console.log();

  const apiApp = createApiApplication();
  console.log('API App services:', apiApp.keys().length, 'total');
  console.log('(Same as web app but no UI components)');
  console.log();

  const adminApp = createAdminApplication();
  console.log('Admin App services:', adminApp.keys().length, 'total');
  console.log('(Could have additional admin features)');
  console.log();

  console.log('🎯 TESTING SERVICES:\n');

  // Test user service
  console.log('--- User Service ---');
  const userService = webApp.resolve('userService') as any;
  const user = userService.getUser(1);
  console.log('User result:', user);
  console.log();

  // Test product service
  console.log('--- Product Service ---');
  const productService = webApp.resolve('productService') as any;
  const product = productService.getProduct(1);
  console.log('Product result:', product);
  console.log();

  // Test auth service
  console.log('--- Auth Service ---');
  const authService = webApp.resolve('authService') as any;
  const auth = authService.authenticate('token123');
  console.log('Auth result:', auth);
  console.log();

  console.log('✅ HYBRID BENEFITS:');
  console.log('===================');
  console.log('✅ Global container: Shared infrastructure');
  console.log('✅ Child containers: Feature isolation');
  console.log('✅ Composition: Flexible assembly');
  console.log('✅ Inheritance: Access to parent services');
  console.log('✅ Modularity: Easy to test and maintain');
  console.log('✅ Scalability: Add features without affecting others');
  console.log();

  console.log('📊 ARCHITECTURE COMPARISON:');
  console.log('===========================');
  console.log('🐣 Singleton Container: Simple but monolithic');
  console.log('🔹 Composition Only: Flexible but no shared state');
  console.log('🎯 Hybrid Approach: Best of both worlds!');
}

if (require.main === module) {
  demoHybridArchitecture();
}

export {
  GlobalContainer,
  UserModule,
  ProductModule,
  AuthModule,
  createWebApplication,
  createApiApplication,
  createAdminApplication,
};
