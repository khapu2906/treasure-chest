/**
 * Composition Pattern Example
 *
 * This example demonstrates how to use Container.compose() to combine
 * services from different domains without inheritance.
 */

import { Container } from '../src/Container';

// Domain-specific containers
class InfrastructureContainer {
  static create(): Container {
    const container = new Container();

    container.singleton('database', () => ({
      connect: () => console.log('Connected to database'),
      query: (sql: string) => ({ rows: [{ id: 1, name: 'John' }] }),
    }));

    container.singleton('cache', () => ({
      get: (key: string) => console.log(`Cache get: ${key}`),
      set: (key: string, value: any) => console.log(`Cache set: ${key}`),
    }));

    return container;
  }
}

class BusinessLogicContainer {
  static create(): Container {
    const container = new Container();

    container.singleton('userService', () => ({
      getUser: (id: number) => {
        console.log(`Getting user ${id} from business logic`);
        return { id, name: 'John Doe', email: 'john@example.com' };
      },
    }));

    container.bind('orderService', () => ({
      createOrder: (userId: number, amount: number) => {
        console.log(`Creating order for user ${userId}, amount: ${amount}`);
        return { id: Math.random(), userId, amount };
      },
    }));

    container.bind('orderService', (c: any) => ({
      createOrder: (userId: number, amount: number) => {
        const db = c.resolve('database');
        console.log(`Creating order for user ${userId}, amount: ${amount}`);
        return { id: Math.random(), userId, amount };
      },
    }));

    return container;
  }
}

class PresentationContainer {
  static create(): Container {
    const container = new Container();

    container.singleton('userController', () => ({
      getUser: (req: any, res: any) => {
        console.log(
          `User controller handling request for user ${req.params.id}`
        );
        res.json({ id: req.params.id, name: 'John Doe' });
      },
    }));

    container.bind('orderController', () => ({
      createOrder: (req: any, res: any) => {
        console.log(`Order controller creating order`);
        res.json({
          id: Math.random(),
          userId: req.body.userId,
          amount: req.body.amount,
        });
      },
    }));

    container.bind('orderController', (c: any) => ({
      createOrder: (req: any, res: any) => {
        const orderService = c.resolve('orderService');
        const order = orderService.createOrder(
          req.body.userId,
          req.body.amount
        );
        res.json(order);
      },
    }));

    return container;
  }
}

function demoComposition() {
  console.log('🚀 Composition Pattern Demo\n');

  // Create domain-specific containers
  const infra = InfrastructureContainer.create();
  const business = BusinessLogicContainer.create();
  const presentation = PresentationContainer.create();

  console.log('📦 Created separate domain containers:');
  console.log('- Infrastructure:', infra.keys());
  console.log('- Business Logic:', business.keys());
  console.log('- Presentation:', presentation.keys());
  console.log();

  // Compose them together
  const app = Container.compose([infra, business, presentation]);

  console.log('🎯 Composed Application Container:');
  console.log('Available services:', app.keys());
  console.log();

  // Use the composed container
  console.log('🔄 Using composed services:');

  const userController = app.resolve('userController') as any;
  const orderController = app.resolve('orderController') as any;

  // Simulate HTTP requests
  console.log('\n--- User Request ---');
  userController.getUser(
    { params: { id: 1 } },
    {
      json: (data: any) => console.log('Response:', data),
    }
  );

  console.log('\n--- Order Request ---');
  orderController.createOrder(
    {
      body: { userId: 1, amount: 99.99 },
    },
    {
      json: (data: any) => console.log('Response:', data),
    }
  );

  console.log('\n✅ Composition allows clean separation of concerns!');
  console.log(
    'Each domain can be developed, tested, and maintained independently.'
  );
}

if (require.main === module) {
  demoComposition();
}

export {
  InfrastructureContainer,
  BusinessLogicContainer,
  PresentationContainer,
};
