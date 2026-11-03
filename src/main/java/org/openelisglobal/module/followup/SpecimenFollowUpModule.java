package org.openelisglobal.module.followup;

import org.openelisglobal.module.api.ModuleContext;
import org.openelisglobal.module.api.OpenElisModule;

/**
 * The module's lifecycle hooks. Validation checks the one configuration property the module reads; start-up only
 * logs, because the runtime has already run the migrations, registered the permissions and the menu, and wired the
 * controller when it gets here.
 */
public class SpecimenFollowUpModule implements OpenElisModule {

    public static final String DEFAULT_DUE_DAYS = "defaultDueDays";

    @Override
    public void validate(ModuleContext context) {
        context.configuration().requireInteger(DEFAULT_DUE_DAYS, 0, 365);
    }

    @Override
    public void onStart(ModuleContext context) {
        context.log().info("started " + context.descriptor().version() + "; new follow-ups are due in "
                + context.configuration().getInteger(DEFAULT_DUE_DAYS).orElse(0) + " days by default");
    }

    @Override
    public void onUpgrade(ModuleContext context, String fromVersion, String toVersion) {
        context.log().info("upgraded from " + fromVersion + " to " + toVersion);
    }
}
