/**
 * Comparison: Singleton Container vs Composition
 *
 * This example demonstrates the difference between:
 * 1. Traditional singleton container approach
 * 2. New composition approach
 */

import { Container } from '../src/Container';

// =============================================
// APPROACH 1: Singleton Container (Traditional)
// =============================================

class GlobalContainer {
  private static instance: Container;

  static getInstance(): Container {
    if (!GlobalContainer.instance) {
      GlobalContainer.instance = new Container();

      // Register ALL services in one place
      const c = GlobalContainer.instance;

      // Infrastructure
      c.singleton('database', () => ({ connected: true }));
      c.singleton('cache', () => ({ hits: 0 }));

      // Business Logic
      c.singleton('userService', (container: any) => ({
        getUser: (id: number) => {
          const db = container.resolve('database');
          const cache = container.resolve('cache');
          console.log('UserService: Getting user', id);
          return { id, name: 'John', db: db.connected, cache: cache.hits };
        },
      }));

      // Presentation
      c.singleton('userController', (container: any) => ({
        getUser: (req: any, res: any) => {
          const userService = container.resolve('userService');
          const user = userService.getUser(req.params.id);
          res.json(user);
        },
      }));
    }

    return GlobalContainer.instance;
  }
}

// =============================================
// APPROACH 2: Composition (Modular)
// =============================================

class InfrastructureModule {
  static create(): Container {
    const container = new Container();
    container.singleton('database', () => ({ connected: true }));
    container.singleton('cache', () => ({ hits: 0 }));
    return container;
  }
}

class BusinessLogicModule {
  static create(): Container {
    const container = new Container();
    container.singleton('userService', () => ({
      getUser: (id: number) => {
        console.log('UserService: Getting user', id);
        return { id, name: 'John' };
      },
    }));
    return container;
  }
}

class PresentationModule {
  static create(): Container {
    const container = new Container();
    container.singleton('userController', () => ({
      getUser: (req: any, res: any) => {
        console.log('UserController: Handling request');
        res.json({ id: req.params.id, name: 'John' });
      },
    }));
    return container;
  }
}

// =============================================
// DEMO: So sánh hai approaches
// =============================================

function demoSingletonApproach() {
  console.log('🔸 SINGLETON CONTAINER APPROACH:');
  console.log('================================');

  const container = GlobalContainer.getInstance();

  console.log('Available services:', container.keys());
  console.log();

  // Simulate HTTP request
  console.log('--- HTTP Request ---');
  const controller = container.resolve('userController') as any;
  controller.getUser(
    { params: { id: 1 } },
    {
      json: (data: any) => console.log('Response:', data),
    }
  );

  console.log('✅ All services in one container');
  console.log('❌ Tight coupling between modules');
  console.log('❌ Hard to test individual modules');
  console.log('❌ Monolithic registration');
  console.log();
}

function demoCompositionApproach() {
  console.log('🔹 COMPOSITION APPROACH:');
  console.log('========================');

  // Create separate modules
  const infra = InfrastructureModule.create();
  const business = BusinessLogicModule.create();
  const presentation = PresentationModule.create();

  console.log('Infrastructure services:', infra.keys());
  console.log('Business Logic services:', business.keys());
  console.log('Presentation services:', presentation.keys());
  console.log();

  // Compose them together
  const app = Container.compose([infra, business, presentation]);

  console.log('Composed app services:', app.keys());
  console.log();

  // Simulate HTTP request
  console.log('--- HTTP Request ---');
  const controller = app.resolve('userController') as any;
  controller.getUser(
    { params: { id: 1 } },
    {
      json: (data: any) => console.log('Response:', data),
    }
  );

  console.log('✅ Clean separation of concerns');
  console.log('✅ Easy to test individual modules');
  console.log('✅ Modular and reusable');
  console.log('✅ Flexible composition');
  console.log();
}

function demoFlexibility() {
  console.log('🎯 COMPOSITION FLEXIBILITY:');
  console.log('===========================');

  const infra = InfrastructureModule.create();
  const business = BusinessLogicModule.create();
  const presentation = PresentationModule.create();

  // Different compositions for different needs
  const webApp = Container.compose([infra, business, presentation]);
  console.log('Web App services:', webApp.keys());

  const apiOnly = Container.compose([infra, business]);
  console.log('API Only services:', apiOnly.keys());

  const adminApp = Container.compose([infra, business]); // Could add admin module
  console.log('Admin App services:', adminApp.keys());

  console.log('✅ Mix and match modules as needed');
  console.log('✅ Different apps can share common modules');
  console.log('✅ Easy to add/remove features');
  console.log();
}

function demo() {
  console.log('🚀 Singleton Container vs Composition\n');

  demoSingletonApproach();
  demoCompositionApproach();
  demoFlexibility();

  console.log('💡 CONCLUSION:');
  console.log('==============');
  console.log('Composition provides better architecture:');
  console.log('- Separation of concerns');
  console.log('- Testability');
  console.log('- Reusability');
  console.log('- Flexibility');
  console.log();
  console.log('Use singleton containers for simple apps.');
  console.log('Use composition for complex, modular applications.');
}

if (require.main === module) {
  demo();
}

export {
  GlobalContainer,
  InfrastructureModule,
  BusinessLogicModule,
  PresentationModule,
};
