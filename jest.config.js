module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  testMatch: ["**/src/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.build.json" }],
  },

  // ✅ This runs in the SAME process as tests
  setupFilesAfterEnv: ["<rootDir>/src/tests/jest.setup.ts"],

  // testTimeout: 30000,
};
