import { defineConfig } from "vite";
export default defineConfig({
  root: "frontend",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4173",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (req) =>
            req.setHeader("origin", "http://localhost:4173"),
          );
        },
      },
    },
  },
  build: { outDir: "../public/react", emptyOutDir: true, cssCodeSplit: false },
});
