// vite.config.ts
import { defineConfig } from "file:///D:/FILEK/node_modules/vite/dist/node/index.js";
import react from "file:///D:/FILEK/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///D:/FILEK/node_modules/lovable-tagger/dist/index.js";
import compression from "file:///D:/FILEK/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_dirname = "D:\\FILEK";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "cross-origin"
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Brotli compression
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024
    }),
    // Gzip fallback
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024
    })
  ].filter(Boolean),
  resolve: {
    alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") }
  },
  // WASM support
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es"
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-motion": ["framer-motion"],
          "vendor-three": ["three"],
          "vendor-gsap": ["gsap"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-scroll-area"
          ],
          "vendor-icons": ["lucide-react"],
          "vendor-utils": ["clsx", "tailwind-merge", "class-variance-authority"]
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["@/workers/marketWorker"]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxGSUxFS1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcRklMRUtcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0ZJTEVLL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSAnbG92YWJsZS10YWdnZXInO1xuaW1wb3J0IGNvbXByZXNzaW9uIGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogJzo6JyxcbiAgICBwb3J0OiA4MDgwLFxuICAgIGhtcjogeyBvdmVybGF5OiBmYWxzZSB9LFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICAgJ3NhbWUtb3JpZ2luJyxcbiAgICAgICdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JzogJ3JlcXVpcmUtY29ycCcsXG4gICAgICAnQ3Jvc3MtT3JpZ2luLVJlc291cmNlLVBvbGljeSc6ICdjcm9zcy1vcmlnaW4nLFxuICAgIH0sXG4gIH0sXG5cbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgbW9kZSA9PT0gJ2RldmVsb3BtZW50JyAmJiBjb21wb25lbnRUYWdnZXIoKSxcblxuICAgIC8vIEJyb3RsaSBjb21wcmVzc2lvblxuICAgIGNvbXByZXNzaW9uKHtcbiAgICAgIGFsZ29yaXRobTogJ2Jyb3RsaUNvbXByZXNzJyxcbiAgICAgIGV4dDogJy5icicsXG4gICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgfSksXG5cbiAgICAvLyBHemlwIGZhbGxiYWNrXG4gICAgY29tcHJlc3Npb24oe1xuICAgICAgYWxnb3JpdGhtOiAnZ3ppcCcsXG4gICAgICBleHQ6ICcuZ3onLFxuICAgICAgdGhyZXNob2xkOiAxMDI0LFxuICAgIH0pLFxuICBdLmZpbHRlcihCb29sZWFuKSxcblxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHsgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSB9LFxuICB9LFxuXG4gIC8vIFdBU00gc3VwcG9ydFxuICBhc3NldHNJbmNsdWRlOiBbJyoqLyoud2FzbSddLFxuXG4gIHdvcmtlcjoge1xuICAgIGZvcm1hdDogJ2VzJyxcbiAgfSxcblxuICBidWlsZDoge1xuICAgIHRhcmdldDogJ2VzbmV4dCcsXG4gICAgbWluaWZ5OiAnZXNidWlsZCcsXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDYwMCxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3ZlbmRvci1yZWFjdCc6ICBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgJ3ZlbmRvci1xdWVyeSc6ICBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSddLFxuICAgICAgICAgICd2ZW5kb3ItbW90aW9uJzogWydmcmFtZXItbW90aW9uJ10sXG4gICAgICAgICAgJ3ZlbmRvci10aHJlZSc6ICBbJ3RocmVlJ10sXG4gICAgICAgICAgJ3ZlbmRvci1nc2FwJzogICBbJ2dzYXAnXSxcbiAgICAgICAgICAndmVuZG9yLXJhZGl4JzogW1xuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdG9vbHRpcCcsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1wb3BvdmVyJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2Nyb2xsLWFyZWEnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgJ3ZlbmRvci1pY29ucyc6ICBbJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICAgICd2ZW5kb3ItdXRpbHMnOiAgWydjbHN4JywgJ3RhaWx3aW5kLW1lcmdlJywgJ2NsYXNzLXZhcmlhbmNlLWF1dGhvcml0eSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnQC93b3JrZXJzL21hcmtldFdvcmtlciddLFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4TSxTQUFTLG9CQUFvQjtBQUMzTyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBQ2hDLE9BQU8saUJBQWlCO0FBSnhCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxPQUFPO0FBQUEsRUFDekMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sS0FBSyxFQUFFLFNBQVMsTUFBTTtBQUFBLElBQ3RCLFNBQVM7QUFBQSxNQUNQLDhCQUFnQztBQUFBLE1BQ2hDLGdDQUFnQztBQUFBLE1BQ2hDLGdDQUFnQztBQUFBLElBQ2xDO0FBQUEsRUFDRjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sU0FBUyxpQkFBaUIsZ0JBQWdCO0FBQUE7QUFBQSxJQUcxQyxZQUFZO0FBQUEsTUFDVixXQUFXO0FBQUEsTUFDWCxLQUFLO0FBQUEsTUFDTCxXQUFXO0FBQUEsSUFDYixDQUFDO0FBQUE7QUFBQSxJQUdELFlBQVk7QUFBQSxNQUNWLFdBQVc7QUFBQSxNQUNYLEtBQUs7QUFBQSxNQUNMLFdBQVc7QUFBQSxJQUNiLENBQUM7QUFBQSxFQUNILEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFFaEIsU0FBUztBQUFBLElBQ1AsT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU8sRUFBRTtBQUFBLEVBQ2pEO0FBQUE7QUFBQSxFQUdBLGVBQWUsQ0FBQyxXQUFXO0FBQUEsRUFFM0IsUUFBUTtBQUFBLElBQ04sUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUVBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFpQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUMxRCxnQkFBaUIsQ0FBQyx1QkFBdUI7QUFBQSxVQUN6QyxpQkFBaUIsQ0FBQyxlQUFlO0FBQUEsVUFDakMsZ0JBQWlCLENBQUMsT0FBTztBQUFBLFVBQ3pCLGVBQWlCLENBQUMsTUFBTTtBQUFBLFVBQ3hCLGdCQUFnQjtBQUFBLFlBQ2Q7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUEsVUFDQSxnQkFBaUIsQ0FBQyxjQUFjO0FBQUEsVUFDaEMsZ0JBQWlCLENBQUMsUUFBUSxrQkFBa0IsMEJBQTBCO0FBQUEsUUFDeEU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyx3QkFBd0I7QUFBQSxFQUNwQztBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
