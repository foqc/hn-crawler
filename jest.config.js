/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // `cookie` (used by Fastify's app.inject) ships ESM only, which Jest cannot require on
    // Node < 24.9, so it is compiled to CommonJS for tests. Node itself loads it fine at runtime.
    '/node_modules/cookie/.+\\.js$': ['ts-jest', { tsconfig: { allowJs: true } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!cookie/)'],
};
