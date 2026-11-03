package io.github.mozzy11.openelis.followup.domain;

/** The actions a follow-up asks for. Module-specific: none of them triggers a core workflow. */
public enum FollowUpActionType {
    RECOLLECTION("Request specimen recollection"),
    INVESTIGATION("Investigate a specimen issue"),
    PATIENT_INFORMATION("Request additional patient information"),
    NOTIFY_CLINICIAN("Notify the responsible clinician"),
    OTHER("Other");

    private final String label;

    FollowUpActionType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
