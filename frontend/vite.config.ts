import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiKey = process.env.ATIE_API_KEY?.trim();

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        headers: apiKey ? { "X-ATIE-API-Key": apiKey } : undefined,
      },
    },
  },
});
