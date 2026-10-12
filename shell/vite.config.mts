import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const PORT = 4300;

export default defineConfig({
  server: {
    port: PORT,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  preview: { port: PORT, strictPort: true },
  build: { target: "chrome89" },
  resolve: {
    alias: {
      "@erp/shared-ui": path.join(rootDir, "libs/shared/ui/src/index.ts"),
      "@erp/shared-api": path.join(rootDir, "libs/shared/api/src/index.ts"),
      "@erp/shared-auth": path.join(
        rootDir,
        "libs/shared/authlib/src/index.ts",
      ),
    },
  },
  plugins: [
    federation({
      name: "shell",
      // No build-time `remotes:` block - the consumer registers them at
      // runtime in src/mf.ts at module load time.
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
    react(),
  ],
});
