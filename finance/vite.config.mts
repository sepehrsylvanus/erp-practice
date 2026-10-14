import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { erpAlias } from "../vite.shared.mts";

// Port deliberately avoids 5000 (macOS AirTunes binds it on 0.0.0.0, leading
// to silent EADDRINUSE on 127.0.0.1). Override `--port` only if 5000+ is free.
const PORT = 4507;

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
  resolve: { alias: erpAlias },

  plugins: [
    federation({
      name: "finance",
      filename: "remoteEntry.js",
      exposes: {
        "./Invoices": "./src/pages/Invoices.tsx",
        "./Payments": "./src/pages/Payments.tsx",
        // "./TrialBalance": "./src/pages/TrialBalance.tsx",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "react-toastify": { singleton: true },
        "@erp/shared-ui": { singleton: true },
        "@erp/shared-api": { singleton: true },
        "@erp/shared-auth": { singleton: true },
      },
    }),
    react(),
  ],
});
