// vite.config.ts
import { defineConfig } from "file:///Users/valentinedelsbrunner/Projects/CoBenefits/node_modules/vite/dist/node/index.js";
import { sveltekit } from "file:///Users/valentinedelsbrunner/Projects/CoBenefits/node_modules/@sveltejs/kit/src/exports/vite/index.js";
var buildTimestampPlugin = () => {
  return {
    name: "build-timestamp",
    generateBundle() {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      this.emitFile({
        type: "asset",
        fileName: "build-timestamp.json",
        source: JSON.stringify({ timestamp })
      });
    },
    transform(code, id) {
      if (id.includes("globals.js")) {
        const timestamp = (/* @__PURE__ */ new Date()).toLocaleDateString();
        return code.replace("__BUILD_TIMESTAMP__", `"${timestamp}"`);
      }
    }
  };
};
var vite_config_default = defineConfig({
  plugins: [sveltekit(), buildTimestampPlugin()],
  define: {
    // BUILD_DATE: JSON.stringify(new Date().toISOString())
    BUILD_DATE: /* @__PURE__ */ new Date()
  },
  build: {
    target: "esnext"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdmFsZW50aW5lZGVsc2JydW5uZXIvUHJvamVjdHMvQ29CZW5lZml0c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3ZhbGVudGluZWRlbHNicnVubmVyL1Byb2plY3RzL0NvQmVuZWZpdHMvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3ZhbGVudGluZWRlbHNicnVubmVyL1Byb2plY3RzL0NvQmVuZWZpdHMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHtzdmVsdGVraXR9IGZyb20gXCJAc3ZlbHRlanMva2l0L3ZpdGVcIjtcblxuY29uc3QgYnVpbGRUaW1lc3RhbXBQbHVnaW4gPSAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2J1aWxkLXRpbWVzdGFtcCcsXG4gICAgZ2VuZXJhdGVCdW5kbGUoKSB7XG4gICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgICB0aGlzLmVtaXRGaWxlKHtcbiAgICAgICAgdHlwZTogJ2Fzc2V0JyxcbiAgICAgICAgZmlsZU5hbWU6ICdidWlsZC10aW1lc3RhbXAuanNvbicsXG4gICAgICAgIHNvdXJjZTogSlNPTi5zdHJpbmdpZnkoeyB0aW1lc3RhbXAgfSlcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgdHJhbnNmb3JtKGNvZGUsIGlkKSB7XG4gICAgICBpZiAoaWQuaW5jbHVkZXMoJ2dsb2JhbHMuanMnKSkge1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xuICAgICAgICByZXR1cm4gY29kZS5yZXBsYWNlKCdfX0JVSUxEX1RJTUVTVEFNUF9fJywgYFwiJHt0aW1lc3RhbXB9XCJgKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59O1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3N2ZWx0ZWtpdCgpLCBidWlsZFRpbWVzdGFtcFBsdWdpbigpXSxcbiAgZGVmaW5lOiB7XG4gICAgLy8gQlVJTERfREFURTogSlNPTi5zdHJpbmdpZnkobmV3IERhdGUoKS50b0lTT1N0cmluZygpKVxuICAgIEJVSUxEX0RBVEU6IG5ldyBEYXRlKClcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6IFwiZXNuZXh0XCIsXG4gIH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1QsU0FBUyxvQkFBb0I7QUFDNVYsU0FBUSxpQkFBZ0I7QUFFeEIsSUFBTSx1QkFBdUIsTUFBTTtBQUNqQyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixpQkFBaUI7QUFDZixZQUFNLGFBQVksb0JBQUksS0FBSyxHQUFFLFlBQVk7QUFDekMsV0FBSyxTQUFTO0FBQUEsUUFDWixNQUFNO0FBQUEsUUFDTixVQUFVO0FBQUEsUUFDVixRQUFRLEtBQUssVUFBVSxFQUFFLFVBQVUsQ0FBQztBQUFBLE1BQ3RDLENBQUM7QUFBQSxJQUNIO0FBQUEsSUFDQSxVQUFVLE1BQU0sSUFBSTtBQUNsQixVQUFJLEdBQUcsU0FBUyxZQUFZLEdBQUc7QUFDN0IsY0FBTSxhQUFZLG9CQUFJLEtBQUssR0FBRSxtQkFBbUI7QUFDaEQsZUFBTyxLQUFLLFFBQVEsdUJBQXVCLElBQUksU0FBUyxHQUFHO0FBQUEsTUFDN0Q7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQztBQUFBLEVBQzdDLFFBQVE7QUFBQTtBQUFBLElBRU4sWUFBWSxvQkFBSSxLQUFLO0FBQUEsRUFDdkI7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxFQUNWO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
