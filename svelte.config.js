import { vismarkConfig } from 'vismark/config';
import { mdsvex } from 'mdsvex';  // main compiler

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// plugins:
import remarkFootnotes from 'remark-footnotes';
import math from 'remark-math'
import rehype_katex from 'rehype-katex';
import { katex_blocks, correct_hast_tree } from './node_modules/vismark/dist/plugins/maths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const default_layout_path = join(__dirname, './node_modules/vismark/dist/styles/default_layout.svelte');

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
    // preprocess: [vitePreprocess()],
    extensions: ['.svelte','.vismd'],
    preprocess: [
        vitePreprocess(),
        mdsvex({
            extensions: ['.vismd'],
            remarkPlugins: [remarkFootnotes, math, katex_blocks],
            rehypePlugins: [correct_hast_tree, rehype_katex],
            layout: {
            _: default_layout_path
            },
            // ...mdsvexOptions 
        })
    ],
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
