import path from "node:path";
import url from "node:url";
import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess({
		style: {
			css: {
				postcss: path.join(__dirname, "postcss.config.cjs"),
			},
		},
	}),

	kit: {
		adapter: adapter(),
	},
};

export default config;
