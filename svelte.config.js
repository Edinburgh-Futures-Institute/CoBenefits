// import adapter from '@sveltejs/adapter-auto';
import {vitePreprocess} from '@sveltejs/vite-plugin-svelte'
import adapter from '@sveltejs/adapter-static';
// import {sveltePreprocess} from "svelte-preprocess";


// console.log(process.env.NODE_ENV)

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs#compile-time-svelte-preprocess
    // for more information about preprocessors
    // preprocess: [sveltePreprocess()],
    preprocess: [vitePreprocess()],
    kit: {
        // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://kit.svelte.dev/docs/adapters for more information about adapters.
        adapter: adapter({
            assets: "build",
            pages: "build"
        }),

        paths: {
            base: "",
        }
    },
}

export default config;
