package org.openelisglobal.module.followup.service;

/** No follow-up with that id. */
public class FollowUpNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public FollowUpNotFoundException(Long id) {
        super("no follow-up with id " + id);
    }
}
