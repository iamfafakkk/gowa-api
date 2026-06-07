import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const backendTarget = "http://localhost:3000";
const proxyRoutes = [
  "/app",
  "/chat",
  "/chatwoot",
  "/chats",
  "/devices",
  "/group",
  "/health",
  "/message",
  "/newsletter",
  "/send",
  "/statics",
  "/user",
  "/ws",
] as const;

export default defineConfig({
  plugins: [react()],
  build: {
    assetsDir: "console-assets",
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
  server: {
    proxy: Object.fromEntries(
      proxyRoutes.map((route) => [
        route,
        {
          target: backendTarget,
          changeOrigin: true,
          ws: route === "/ws",
        },
      ]),
    ),
  },
});
