module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/tests/**/*.test.ts"], // only run tests in tests folder
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.build.json" }],
  },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"], // centralized beforeAll/afterAll
};
