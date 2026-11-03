package org.openelisglobal.module.followup.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.time.LocalDate;
import org.openelisglobal.module.api.ModuleAuditedEntity;

/**
 * A follow-up action on an existing specimen. The patient and the sample are referenced by their core ids and
 * never copied: the module reads their details through the core services when it shows a follow-up.
 */
@Entity
@Table(name = "mod_specimen_followup_record", schema = "clinlims")
public class FollowUp extends ModuleAuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "modSpecimenFollowUpSeq")
    @SequenceGenerator(name = "modSpecimenFollowUpSeq", sequenceName = "mod_specimen_followup_record_seq", schema = "clinlims", allocationSize = 1)
    @Column(name = "id")
    private Long id;

    @Column(name = "follow_up_number", nullable = false, length = 20)
    private String followUpNumber;

    @Column(name = "patient_id", nullable = false, length = 20)
    private String patientId;

    @Column(name = "sample_id", nullable = false, length = 20)
    private String sampleId;

    @Column(name = "accession_number", length = 50)
    private String accessionNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 40)
    private FollowUpActionType actionType;

    @Column(name = "description", nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 10)
    private FollowUpPriority priority;

    @Column(name = "assigned_user_id", length = 20)
    private String assignedUserId;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "notes", length = 4000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FollowUpStatus status;

    public Long getId() {
        return id;
    }

    public String getFollowUpNumber() {
        return followUpNumber;
    }

    public void setFollowUpNumber(String followUpNumber) {
        this.followUpNumber = followUpNumber;
    }

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

    public String getAccessionNumber() {
        return accessionNumber;
    }

    public void setAccessionNumber(String accessionNumber) {
        this.accessionNumber = accessionNumber;
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

    public FollowUpStatus getStatus() {
        return status;
    }

    public void setStatus(FollowUpStatus status) {
        this.status = status;
    }
}
