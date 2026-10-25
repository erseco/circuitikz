import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.{ts,mjs}'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reporter: ['text', 'json-summary'],
			thresholds: {
				perFile: true,
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100
			}
		}
	}
});
