import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

/**
 * The module's pages as a Module Federation remote of the OpenELIS shell
 * (docs/modules.md in the core repository). The remote name is the module id
 * with hyphens replaced; each exposed name is one of the manifest's routes.
 * The shell provides the shared singletons at runtime, so none of them is
 * bundled here, and the core surface is imported from `openelis_core/*`.
 *
 * `vite build` writes straight into the Maven output directory, so the JAR
 * carries the prebuilt bundle under META-INF/resources/modules/<id>/.
 */
const MODULE_ID = "specimen-followup";
const REMOTE_NAME = "specimen_followup";

// import: false, because the shell always provides these; the module never
// ships a fallback copy, which keeps the bundle to the module's own code.
export const SHARED_SINGLETONS = {
  react: { singleton: true, requiredVersion: "^17.0.0", import: false },
  "react-dom": { singleton: true, requiredVersion: "^17.0.0", import: false },
  "react-router-dom": {
    singleton: true,
    requiredVersion: "^5.2.0",
    import: false,
  },
  "react-intl": { singleton: true, requiredVersion: "^5.20.0", import: false },
  "@carbon/react": {
    singleton: true,
    requiredVersion: "^1.15.0",
    import: false,
  },
  "@carbon/icons-react": {
    singleton: true,
    requiredVersion: "^11.17.0",
    import: false,
  },
  "@tanstack/react-query": {
    singleton: true,
    requiredVersion: "^4.44.0",
    import: false,
  },
};

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    federation({
      name: REMOTE_NAME,
      filename: "remoteEntry.js",
      exposes: {
        "./CreateFollowUpPage": "./src/pages/CreateFollowUpPage.jsx",
        "./FollowUpListPage": "./src/pages/FollowUpListPage.jsx",
        "./FollowUpDetailPage": "./src/pages/FollowUpDetailPage.jsx",
      },
      remotes: {
        openelis_core: {
          type: "module",
          name: "openelis_core",
          // The shell's own remote entry, served next to index.html on the same origin
          entry: "/remoteEntry.js",
        },
      },
      shared: SHARED_SINGLETONS,
      dts: false,
    }),
  ],
  build: {
    outDir: `../target/classes/META-INF/resources/modules/${MODULE_ID}`,
    emptyOutDir: true,
    sourcemap: mode !== "production",
    target: "es2020",
  },
  server: {
    // `npm run dev` serves the remote for the shell's dev override
    // (localStorage["oe.module-override.specimen-followup"] = "http://localhost:5174/remoteEntry.js")
    port: 5174,
    strictPort: true,
    cors: true,
    origin: "http://localhost:5174",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    alias: [
      { find: /^openelis_core\/(.*)$/, replacement: "/src/test/coreStubs/$1.jsx" },
    ],
  },
}));
