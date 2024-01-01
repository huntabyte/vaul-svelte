import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// jest like globals
		globals: true,
		environment: 'jsdom',
		// in-source testing
		includeSource: ['src/**/*.{js,ts,svelte}'],
		coverage: {
			exclude: ['setupTest.ts']
		},
		alias: [{ find: /^svelte$/, replacement: 'svelte/internal' }]
	},
	assetsInclude: ['**/*.md'],
	server: {
		fs: {
			strict: false
		}
	}
});
