import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter({
				// GitHub Pages SPA: generate index.html and use 404.html as the fallback for deep links
				fallback: '404.html'
			}),
			prerender: {
				// Generate the root route as index.html alongside the SPA 404 fallback
				entries: ['/']
			}
	}
};

export default config;
