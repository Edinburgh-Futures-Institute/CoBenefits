import { defineConfig } from 'vite'
import {sveltekit} from "@sveltejs/kit/vite";

const buildTimestampPlugin = () => {
  return {
    name: 'build-timestamp',
    generateBundle() {
      const timestamp = new Date().toISOString();
      this.emitFile({
        type: 'asset',
        fileName: 'build-timestamp.json',
        source: JSON.stringify({ timestamp })
      });
    },
    transform(code, id) {
      if (id.includes('globals.js')) {
        const timestamp = new Date().toLocaleDateString();
        return code.replace('__BUILD_TIMESTAMP__', `"${timestamp}"`);
      }
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [sveltekit(), buildTimestampPlugin()],
  define: {
    // BUILD_DATE: JSON.stringify(new Date().toISOString())
    BUILD_DATE: new Date()
  },
  build: {
    target: "esnext",
  },
})