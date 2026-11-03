package org.openelisglobal.module.followup.api;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.openelisglobal.module.followup.domain.FollowUpActionType;
import org.openelisglobal.module.followup.domain.FollowUpPriority;
import org.openelisglobal.module.followup.domain.FollowUpStatus;
import java.time.LocalDate;
import java.util.List;

/**
 * What the module's REST API accepts and returns. Entities never leave the
 * service layer. Dates travel as ISO strings whatever the host's object mapper
 * does with java.time values (the core writes them as timestamps, which would
 * turn a due date into an array).
 */
public final class FollowUpDtos {

    static final String ISO_DATE = "yyyy-MM-dd";

    private FollowUpDtos() {
    }

    /** The payload of a create or update; {@code patientId} and {@code sampleId} are fixed after creation. */
    public static final class FollowUpRequest {
        private String patientId;
        private String sampleId;
        private FollowUpActionType actionType;
        private String description;
        private FollowUpPriority priority;
        private String assignedUserId;
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = ISO_DATE)
        private LocalDate dueDate;
        private String notes;

        public String getPatientId() {
            return patientId;
        }

        public void setPatientId(String patientId) {
            this.patientId = patientId;
        }

        public String getSampleId() {
            return sampleId;
        }

        public void setSampleId(String sampleId) {
            this.sampleId = sampleId;
        }

        public FollowUpActionType getActionType() {
            return actionType;
        }

        public void setActionType(FollowUpActionType actionType) {
            this.actionType = actionType;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public FollowUpPriority getPriority() {
            return priority;
        }

        public void setPriority(FollowUpPriority priority) {
            this.priority = priority;
        }

        public String getAssignedUserId() {
            return assignedUserId;
        }

        public void setAssignedUserId(String assignedUserId) {
            this.assignedUserId = assignedUserId;
        }

        public LocalDate getDueDate() {
            return dueDate;
        }

        public void setDueDate(LocalDate dueDate) {
            this.dueDate = dueDate;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }

    /** A status transition with an optional note appended to the follow-up's notes. */
    public static final class StatusChangeRequest {
        private FollowUpStatus status;
        private String note;

        public FollowUpStatus getStatus() {
            return status;
        }

        public void setStatus(FollowUpStatus status) {
            this.status = status;
        }

        public String getNote() {
            return note;
        }

        public void setNote(String note) {
            this.note = note;
        }
    }

    /** The patient as the core knows it, read through {@code PatientService} when the follow-up is shown. */
    public record PatientSummary(String patientId, String firstName, String lastName, String gender, String birthDate,
            String nationalId, String subjectNumber) {
    }

    /** The specimen as the core knows it, read through the sample services when the follow-up is shown. */
    public record SpecimenSummary(String sampleId, String accessionNumber, String collectionDate, String receivedDate,
            String status, List<String> sampleTypes, long outstandingFollowUps) {
    }

    /** A staff member who may be assigned a follow-up. */
    public record UserSummary(String id, String loginName, String displayName) {
    }

    /** One follow-up with its patient and specimen details. */
    public record FollowUpView(Long id, String followUpNumber, String patientId, String sampleId, String accessionNumber,
            FollowUpActionType actionType, String actionTypeLabel, String description, FollowUpPriority priority,
            String assignedUserId, String assignedUserName,
            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = ISO_DATE) LocalDate dueDate, String notes,
            FollowUpStatus status,
            List<FollowUpStatus> allowedTransitions, boolean deletable, String createdAt, String lastUpdated,
            PatientSummary patient, SpecimenSummary specimen) {
    }

    /** A page of follow-ups, as the list screen shows them (patient name included, details on demand). */
    public record FollowUpPage(List<FollowUpView> items, long total, int page, int size) {
    }

    /** A problem the API refused with, as a field-level message. */
    public record FieldProblem(String field, String message) {
    }
}
