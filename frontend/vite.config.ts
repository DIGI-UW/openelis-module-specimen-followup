import { openelisModule } from "@openelis/module-sdk/build";

/**
 * The module's pages as a Module Federation remote of the OpenELIS shell: the
 * remote name, the output directory in the Maven build, the shared singletons
 * and the exposes (one per manifest route and slot contribution) come from the
 * manifest through the module SDK (docs/modules.md in the core repository).
 */
export default openelisModule({
  test: { setupFiles: ["./src/setupTests.ts"] },
});
