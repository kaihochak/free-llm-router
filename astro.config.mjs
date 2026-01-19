// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://free-llm-router.pages.dev',
	output: 'server',
	adapter: cloudflare(),
	integrations: [
		react(),
		sitemap({
			customPages: [
				'https://free-llm-router.pages.dev/',
				'https://free-llm-router.pages.dev/docs',
			],
		}),
	],
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['shiki'],
		},
	},
});
