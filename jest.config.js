module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(@vinejs|.*\\.mjs$))"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  preset: "ts-jest",
  testEnvironmentOptions: {
    node: {
      extensions: [".ts", ".js"],
    },
  },
};
