import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
			adapter: adapter({
				// GitHub Pages SPA: generate index.html and use 404.html as the fallback for deep links
				fallback: '404.html'
			}),
			prerender: {
				// Generate the root route as index.html alongside the SPA 404 fallback
				entries: ['/'],
				handleUnseenRoutes: 'ignore'
			}
	}
};

export default config;
