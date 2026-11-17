import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";
import { coreRemote, sharedForModule } from "@openelis/module-sdk/shared";
import {
  openelisCoreAliases,
  openelisCoreDedupe,
} from "@openelis/module-sdk/testing";

/**
 * The module's pages as a Module Federation remote of the OpenELIS shell
 * (docs/modules.md in the core repository). The remote name is the module id
 * with hyphens replaced; each exposed name is one of the manifest's routes.
 * The shell provides the shared singletons at runtime, so none of them is
 * bundled here, and the core surface is imported from `openelis_core/*`. Both
 * settings come from the module SDK, so the shared list is written once, in
 * the core.
 *
 * `vite build` writes straight into the Maven output directory, so the JAR
 * carries the prebuilt bundle under META-INF/resources/modules/<id>/.
 */
const MODULE_ID = "specimen-followup";
const REMOTE_NAME = "specimen_followup";

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
        "./FollowUpDashboardCard": "./src/slots/FollowUpDashboardCard.tsx",
      },
      // The shell's own remote entry, served next to index.html on the same origin
      remotes: { openelis_core: coreRemote() },
      // The shell's singletons with import: false: the module ships no fallback copy
      shared: sharedForModule(),
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
  resolve: {
    // One React (and one of each shared library) for the module and the SDK's doubles
    dedupe: openelisCoreDedupe,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.js"],
    // A page test renders against the SDK's doubles; the shell exists only at runtime
    alias: openelisCoreAliases,
  },
}));
