module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest/setup.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.css$": "<rootDir>/jest/styleMock.js",
  },
  testPathIgnorePatterns: ["/node_modules/", "/jest/"],
  collectCoverageFrom: [
    "app/**/*.{ts,tsx}",
    "src/**/*.{ts,tsx}",
    "!**/*.test.{ts,tsx}",
    "!src/types/**",
  ],
  coverageThreshold: { global: { statements: 100, branches: 100, functions: 100, lines: 100 } },
};
