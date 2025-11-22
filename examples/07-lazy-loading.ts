/**
 * Example 7: Lazy Loading
 *
 * This example demonstrates:
 * - Lazy bindings for deferred initialization
 * - Performance benefits of lazy loading
 * - When to use lazy vs eager initialization
 */

import { Container, Lazy } from '../src/index';

// Heavy service that's expensive to initialize
class HeavyMLModel {
  private model: number[];

  constructor() {
    console.log('[ML Model] Loading heavy model... (simulating delay)');
    // Simulate expensive initialization
    this.model = new Array(1000000).fill(0).map(() => Math.random());
    console.log('[ML Model] Model loaded! Size:', this.model.length);
  }

  predict(input: number[]): number {
    console.log('[ML Model] Running prediction...');
    return input.reduce((a, b) => a + b, 0) / input.length;
  }
}

// Service that uses heavy dependency
class PredictionService {
  constructor(private mlModel: Lazy<HeavyMLModel>) {
    console.log('[PredictionService] Created (model not loaded yet)');
  }

  async predictIfNeeded(condition: boolean, input: number[]) {
    if (condition) {
      console.log('[PredictionService] Condition met, loading model...');
      // Model is only loaded when .value is accessed
      const result = this.mlModel.value.predict(input);
      console.log('[PredictionService] Prediction result:', result);
      return result;
    } else {
      console.log('[PredictionService] Condition not met, skipping prediction');
      return null;
    }
  }
}

// Setup container
const container = new Container();

// Register heavy model as lazy singleton
container.lazy('mlModel', () => new HeavyMLModel());

// Register service that depends on lazy model
container.bind(
  'predictionService',
  (c) => new PredictionService(c.resolve<Lazy<HeavyMLModel>>('mlModel'))
);

// Usage
console.log('=== Lazy Loading Demo ===\n');

console.log('--- Scenario 1: Creating service (model not loaded) ---');
const service1 = container.resolve<PredictionService>('predictionService');
console.log('Service created, but ML model not loaded yet!\n');

console.log('--- Scenario 2: Using service WITHOUT prediction ---');
await service1.predictIfNeeded(false, [1, 2, 3]);
console.log('Model still not loaded because condition was false!\n');

console.log('--- Scenario 3: Using service WITH prediction ---');
await service1.predictIfNeeded(true, [10, 20, 30]);
console.log('NOW the model is loaded!\n');

console.log('--- Scenario 4: Using model again (already loaded) ---');
await service1.predictIfNeeded(true, [5, 10, 15]);
console.log('Model was already loaded, no delay!\n');

console.log('--- Scenario 5: Creating another service ---');
const service2 = container.resolve<PredictionService>('predictionService');
await service2.predictIfNeeded(true, [100, 200]);
console.log('Same lazy instance, model already loaded!\n');

console.log('=== Benefits of Lazy Loading ===');
console.log('1. Faster startup time');
console.log('2. Reduced memory usage if feature not used');
console.log('3. Conditional loading based on runtime conditions');
console.log('4. Shared lazy instance across multiple consumers');
