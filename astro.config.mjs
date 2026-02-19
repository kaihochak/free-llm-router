// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { siteConfig } from './src/lib/seo.ts';

// https://astro.build/config
export default defineConfig({
	site: siteConfig.url,
	output: 'server',
	adapter: cloudflare(),
	integrations: [
		react(),
		sitemap({
			filter: (page) => !page.includes('/login') && !page.includes('/dashboard'),
		}),
	],
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			exclude: ['shiki'],
			force: true,
		},
	},
});
