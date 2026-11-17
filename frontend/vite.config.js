import { openelisModule } from "@openelis/module-sdk/build";

/**
 * The module's pages as a Module Federation remote of the OpenELIS shell
 * (docs/modules.md in the core repository). The remote name, the output
 * directory inside the Maven build, the shell's remote and shared singletons,
 * and the exposes (one per manifest route and slot contribution, from
 * src/pages and src/slots) all come from the manifest through the module SDK.
 *
 * `npm run dev` serves the remote for the shell's dev override
 * (localStorage["oe.module-override.specimen-followup"] = "http://localhost:5174/remoteEntry.js").
 */
export default openelisModule({
  test: { setupFiles: ["./src/setupTests.js"] },
});
