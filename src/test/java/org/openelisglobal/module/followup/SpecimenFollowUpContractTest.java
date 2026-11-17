package org.openelisglobal.module.followup;

import static org.junit.Assert.assertEquals;

import org.junit.Test;
import org.openelisglobal.module.api.manifest.ModuleManifest;
import org.openelisglobal.module.test.ModuleContractTest;

public class SpecimenFollowUpContractTest extends ModuleContractTest {

    @Test
    public void declaresItsPagesMenuAndPermissions() {
        ModuleManifest manifest = manifest();

        assertEquals("specimen-followup", manifest.getId());
        assertEquals("module", manifest.getKind());
        assertEquals(3, manifest.getFrontend().getRoutes().size());
        assertEquals(3, manifest.getMenu().size());
        assertEquals(2, manifest.getPermissions().size());
    }
}
