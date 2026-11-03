package org.openelisglobal.module.followup.domain;

import java.util.EnumSet;
import java.util.Set;

/**
 * The life of a follow-up: {@code OPEN} on creation, {@code IN_PROGRESS} while someone works on it, then
 * {@code COMPLETED} or {@code CANCELLED}, both kept for history. A concluded follow-up never reverts, so a completed
 * one cannot silently reopen and a cancelled one stops counting as outstanding.
 */
public enum FollowUpStatus {
    OPEN, IN_PROGRESS, COMPLETED, CANCELLED;

    public boolean isConcluded() {
        return this == COMPLETED || this == CANCELLED;
    }

    /** The states this one may move to. */
    public Set<FollowUpStatus> transitions() {
        switch (this) {
        case OPEN:
            return EnumSet.of(IN_PROGRESS, COMPLETED, CANCELLED);
        case IN_PROGRESS:
            return EnumSet.of(OPEN, COMPLETED, CANCELLED);
        default:
            return EnumSet.noneOf(FollowUpStatus.class);
        }
    }

    public boolean canMoveTo(FollowUpStatus target) {
        return target != null && (target == this || transitions().contains(target));
    }
}
