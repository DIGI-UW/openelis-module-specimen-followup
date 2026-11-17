import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The `.jsx` pages are outside `tsc`'s reach (the SDK's base config checks
 * TypeScript files only), so this is what catches a misspelt `openelis_core/*`
 * import in them: every name a page imports from an entry point must be one
 * the SDK's double for that entry point exports, and the core keeps those
 * doubles complete against the runtime surface.
 */
const pages = [
  "pages/CreateFollowUpPage.jsx",
  "pages/FollowUpListPage.jsx",
  "pages/FollowUpDetailPage.jsx",
  "slots/FollowUpDashboardCard.tsx",
];

const doubles = {
  components: () => import("@openelis/module-sdk/testing/components.jsx"),
  api: () => import("@openelis/module-sdk/testing/api.js"),
  hooks: () => import("@openelis/module-sdk/testing/hooks.js"),
  contexts: () => import("@openelis/module-sdk/testing/contexts.js"),
  sdk: () => import("@openelis/module-sdk/testing/sdk.jsx"),
};

const coreImports = (source) => {
  const found = [];
  const pattern = /import\s*\{([^}]*)\}\s*from\s*["']openelis_core\/(\w+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const names = match[1]
      .split(",")
      .map((name) => name.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);
    found.push({ entry: match[2], names });
  }
  return found;
};

describe("pages", () => {
  it.each(pages)(
    "%s imports only names the core surface exports",
    async (page) => {
      const source = readFileSync(path.resolve(__dirname, "..", page), "utf8");
      const imports = coreImports(source);
      expect(imports.length).toBeGreaterThan(0);
      for (const { entry, names } of imports) {
        const exported = Object.keys(await doubles[entry]());
        const unknown = names.filter((name) => !exported.includes(name));
        expect(unknown, `openelis_core/${entry}`).toEqual([]);
      }
    },
  );
});
