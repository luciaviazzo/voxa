import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    collectCoverageFrom: ["app/**/*.ts", "lib/**/*.ts", "services/**/*.ts", "!**/*.test.ts"],
    coverageThreshold: { global: { statements: 100, branches: 100, functions: 100, lines: 100 } },
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
    },
};

export default config;
