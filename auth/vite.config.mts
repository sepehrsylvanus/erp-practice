import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Port deliberately avoids 5000 (macOS AirTunes binds it on 0.0.0.0, leading
// to silent EADDRINUSE on 127.0.0.1). Override `--port` only if 5000+ is free.
const PORT = 4301;

export default defineConfig({
  server: {
    port: PORT,
    strictPort: true,
    origin: `http://localhost:${PORT}`,
    host: "127.0.0.1",
    // Allow cross-origin fetches of mf-manifest.json + chunks from a consumer
    // running on a different port. Vite 8 narrows the default CORS allowlist
    // to specific localhost patterns; setting `cors: true` emits a wildcard
    // `Access-Control-Allow-Origin: *` for dev which is what federation needs.
    cors: true,
  },
  preview: { port: PORT, strictPort: true, cors: true },
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
      name: "auth",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/App.tsx",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
    react(),
  ],
});
