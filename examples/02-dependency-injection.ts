/**
 * Example 2: Dependency Injection
 *
 * This example demonstrates:
 * - Services depending on other services
 * - Resolving nested dependencies
 * - Constructor injection pattern
 */

import { Container } from '../src/index';

// Define services
class Config {
  get apiUrl() {
    return 'https://api.example.com';
  }

  get apiKey() {
    return 'secret-key-123';
  }
}

class HttpClient {
  constructor(private config: Config) {}

  async get(path: string) {
    console.log(`GET ${this.config.apiUrl}${path}`);
    console.log(`Authorization: Bearer ${this.config.apiKey}`);
    return { status: 200, data: {} };
  }
}

class UserRepository {
  constructor(private http: HttpClient) {}

  async getUser(id: number) {
    console.log(`UserRepository: Fetching user ${id}`);
    return this.http.get(`/users/${id}`);
  }

  async getAllUsers() {
    console.log('UserRepository: Fetching all users');
    return this.http.get('/users');
  }
}

class UserService {
  constructor(private userRepo: UserRepository) {}

  async getUserProfile(id: number) {
    console.log(`UserService: Getting profile for user ${id}`);
    const user = await this.userRepo.getUser(id);
    // Process user data
    return user;
  }
}

// Setup container
const container = new Container();

// Register dependencies (order doesn't matter!)
container.singleton('config', () => new Config());
container.singleton('http', (c) => new HttpClient(c.resolve('config')));
container.singleton('userRepo', (c) => new UserRepository(c.resolve('http')));
container.bind('userService', (c) => new UserService(c.resolve('userRepo')));

// Usage
console.log('=== Dependency Injection Chain ===\n');

const userService = container.resolve<UserService>('userService');
userService.getUserProfile(123);

console.log('\n=== All dependencies are automatically resolved ===');
console.log('UserService -> UserRepository -> HttpClient -> Config');
