package org.openelisglobal.module.followup;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.openelisglobal.module.followup.domain.FollowUp;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.Test;
import org.openelisglobal.module.api.OpenElisModule;
import org.openelisglobal.module.api.manifest.ModuleManifest;
import org.openelisglobal.module.manifest.ManifestValidation;
import org.openelisglobal.module.manifest.ManifestValidator;

/**
 * The contract the core checks at start-up, checked at build time with the core's own validator: the manifest is
 * valid, and every class and resource it names exists in this JAR.
 */
public class ManifestContractTest {

    private static String manifestText() throws Exception {
        try (InputStream in = ManifestContractTest.class.getResourceAsStream("/META-INF/openelis-module.json")) {
            assertNotNull("META-INF/openelis-module.json is missing", in);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    public void manifestIsValidForTheCore() throws Exception {
        ManifestValidation validation = new ManifestValidator().validate(manifestText());

        assertTrue(validation.describe(), validation.isValid());
        ModuleManifest manifest = validation.manifest();
        assertEquals("specimen-followup", manifest.getId());
        assertEquals("module", manifest.getKind());
        assertEquals(3, manifest.getFrontend().getRoutes().size());
        assertEquals(3, manifest.getMenu().size());
        assertEquals(2, manifest.getPermissions().size());
    }

    @Test
    public void everyDeclaredClassAndResourceExists() throws Exception {
        ModuleManifest manifest = new ManifestValidator().validate(manifestText()).manifest();

        Class<?> activator = Class.forName(manifest.getBackend().getActivator());
        assertTrue(OpenElisModule.class.isAssignableFrom(activator));
        assertEquals(FollowUp.class.getName(), manifest.getBackend().getEntities().get(0));
        assertNotNull("changelog " + manifest.getBackend().getLiquibase(),
                ManifestContractTest.class.getResource("/" + manifest.getBackend().getLiquibase()));
        if (!"true".equals(System.getProperty("skipFrontend"))) {
            assertNotNull("the English message file ships in the frontend bundle",
                    ManifestContractTest.class.getResource("/META-INF/resources/modules/specimen-followup/messages/en.json"));
            assertNotNull("the remote entry ships in the frontend bundle",
                    ManifestContractTest.class.getResource("/META-INF/resources/modules/specimen-followup/remoteEntry.js"));
        }
    }
}
