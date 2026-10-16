/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // No tests exist yet in the setup commit; later commits add them.
  passWithNoTests: true,
};
