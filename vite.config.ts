import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  test: {
    exclude: ["node_modules/**", "dist/**", ".output/**"],
  },
  plugins: [
    mode !== "test" && cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({ router: { routeTreeFileHeader: [] } }),
    react(),
    tailwindcss(),
  ].filter(Boolean),
  resolve: {
    tsconfigPaths: true,
  },
}));
