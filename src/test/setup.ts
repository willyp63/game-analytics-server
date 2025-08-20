import { MongoMemoryServer } from "mongodb-memory-server";

// Global setup for tests
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";
});

// Global teardown for tests
afterAll(async () => {
  // Clean up any global resources
});

// Increase timeout for MongoDB operations
jest.setTimeout(30000);
