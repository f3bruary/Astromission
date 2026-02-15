// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	// Static output for deployment to Transmission web directory
	output: "static",
	// Use relative paths for assets so it works when served from any directory
	build: {
		format: 'file',
		assets: '_astro',
		assetsPrefix: './'
	}
});
