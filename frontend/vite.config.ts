import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiKey = process.env.ATIE_API_KEY?.trim();

const proxyConfig = {
  "/api": {
    target: "http://localhost:8080",
    changeOrigin: true,
    headers: apiKey ? { "X-ATIE-API-Key": apiKey } : undefined,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: proxyConfig,
  },
  preview: {
    port: 4173,
    proxy: proxyConfig,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "recharts-vendor": ["recharts"],
        },
      },
    },
  },
});
