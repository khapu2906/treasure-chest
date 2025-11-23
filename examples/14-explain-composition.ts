/**
 * Demo: Why composedContainers is needed
 */

import { Container } from '../src/Container';

function explainComposedContainers() {
  console.log('🔍 WHY composedContainers IS NEEDED:\n');

  // Create separate containers
  const infra = new Container();
  infra.bind('db', () => ({ connected: true }));

  const business = new Container();
  business.bind('userService', () => ({ getUser: () => 'John' }));

  console.log('1️⃣ Separate containers:');
  console.log('   Infra keys:', infra.keys());
  console.log('   Business keys:', business.keys());
  console.log();

  // Compose them
  console.log('2️⃣ When composing:');
  console.log('   Container.compose([infra, business])');
  console.log();

  const composed = Container.compose([infra, business]);

  console.log('3️⃣ Composed container internals:');
  console.log('   Keys:', composed.keys());
  console.log(
    '   (composedContainers is private - internal implementation detail)'
  );
  console.log('   But we know it stores references to [infra, business]');
  console.log();

  // When resolving
  console.log('4️⃣ When resolving "db":');
  console.log('   composed.resolve("db")');
  console.log('   → Calls resolveFromComposition("db")');
  console.log('   → Loops through composedContainers (private array)');
  console.log('   → Finds "db" in first composed container (infra)');
  console.log('   → Returns infra.resolve("db")');
  console.log('   Result:', composed.resolve('db'));
  console.log();

  console.log('5️⃣ When resolving "userService":');
  console.log('   composed.resolve("userService")');
  console.log('   → Calls resolveFromComposition("userService")');
  console.log('   → Loops through composedContainers');
  console.log('   → infra.has("userService") = false');
  console.log('   → business.has("userService") = true');
  console.log('   → Returns business.resolve("userService")');
  console.log('   Result:', composed.resolve('userService'));
  console.log();

  console.log('🎯 CONCLUSION:');
  console.log('==============');
  console.log('composedContainers lưu trữ reference đến các containers gốc');
  console.log(
    'để khi resolve, có thể tìm service trong tất cả containers đã compose.'
  );
  console.log('Đây là cách duy nhất để composition hoạt động!');
}

if (require.main === module) {
  explainComposedContainers();
}
