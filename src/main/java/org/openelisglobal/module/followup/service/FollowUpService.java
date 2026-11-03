package org.openelisglobal.module.followup.service;

import org.openelisglobal.module.followup.api.FollowUpDtos.FieldProblem;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpPage;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpRequest;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpView;
import org.openelisglobal.module.followup.api.FollowUpDtos.PatientSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.SpecimenSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.StatusChangeRequest;
import org.openelisglobal.module.followup.domain.FollowUp;
import org.openelisglobal.module.followup.domain.FollowUpPriority;
import org.openelisglobal.module.followup.domain.FollowUpStatus;
import org.openelisglobal.module.followup.repository.FollowUpRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The follow-up workflow: create against an existing patient and specimen, list and search, show with the core's
 * patient and specimen details, update, move through its states and delete while still open. Runs inside the
 * core's transactions; a refused request carries field-level problems for the form.
 */
@Service
@Transactional
public class FollowUpService {

    static final String NUMBER_PREFIX = "FU-";
    static final int MAX_DESCRIPTION = 2000;
    static final int MAX_NOTES = 4000;
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final FollowUpRepository repository;
    private final CoreLookupService core;

    public FollowUpService(FollowUpRepository repository, CoreLookupService core) {
        this.repository = repository;
        this.core = core;
    }

    public FollowUpView create(FollowUpRequest request, String sysUserId) {
        List<FieldProblem> problems = new ArrayList<>();
        PatientSummary patient = null;
        SpecimenSummary specimen = null;
        if (isBlank(request.getPatientId())) {
            problems.add(new FieldProblem("patientId", "select a patient"));
        } else {
            patient = core.patient(request.getPatientId()).orElse(null);
            if (patient == null) {
                problems.add(new FieldProblem("patientId", "no patient with id " + request.getPatientId()));
            }
        }
        if (isBlank(request.getSampleId())) {
            problems.add(new FieldProblem("sampleId", "select a specimen"));
        } else {
            specimen = core.specimen(request.getSampleId()).orElse(null);
            if (specimen == null) {
                problems.add(new FieldProblem("sampleId", "no specimen with id " + request.getSampleId()));
            } else if (patient != null && !core.sampleBelongsToPatient(request.getSampleId(), patient.patientId())) {
                problems.add(new FieldProblem("sampleId", "the specimen does not belong to the selected patient"));
            }
        }
        validateDetails(request, problems);
        if (!problems.isEmpty()) {
            throw new FollowUpValidationException(problems);
        }
        FollowUp followUp = new FollowUp();
        followUp.setFollowUpNumber(NUMBER_PREFIX + String.format("%06d", repository.nextFollowUpNumber()));
        followUp.setPatientId(patient.patientId());
        followUp.setSampleId(specimen.sampleId());
        followUp.setAccessionNumber(specimen.accessionNumber());
        followUp.setStatus(FollowUpStatus.OPEN);
        apply(request, followUp);
        followUp.setCreatedByUserId(parseUserId(sysUserId));
        followUp.setLastUpdatedByUserId(parseUserId(sysUserId));
        return view(repository.save(followUp), true);
    }

    public FollowUpView update(Long id, FollowUpRequest request, String sysUserId) {
        FollowUp followUp = require(id);
        if (followUp.getStatus().isConcluded()) {
            throw new FollowUpValidationException("status",
                    "a " + followUp.getStatus().name().toLowerCase().replace('_', ' ')
                            + " follow-up is kept for history and cannot be edited");
        }
        List<FieldProblem> problems = new ArrayList<>();
        validateDetails(request, problems);
        if (!problems.isEmpty()) {
            throw new FollowUpValidationException(problems);
        }
        apply(request, followUp);
        followUp.setLastUpdatedByUserId(parseUserId(sysUserId));
        return view(repository.save(followUp), true);
    }

    public FollowUpView changeStatus(Long id, StatusChangeRequest request, String sysUserId) {
        FollowUp followUp = require(id);
        FollowUpStatus target = request.getStatus();
        if (target == null) {
            throw new FollowUpValidationException("status", "choose a status");
        }
        if (!followUp.getStatus().canMoveTo(target)) {
            throw new FollowUpValidationException("status", "a " + label(followUp.getStatus())
                    + " follow-up cannot move to " + label(target));
        }
        if (target != followUp.getStatus()) {
            followUp.setStatus(target);
            String stamp = LocalDateTime.now().format(STAMP) + " " + label(target)
                    + (isBlank(request.getNote()) ? "" : ": " + request.getNote().trim());
            followUp.setNotes(isBlank(followUp.getNotes()) ? stamp : followUp.getNotes() + "\n" + stamp);
            if (followUp.getNotes().length() > MAX_NOTES) {
                followUp.setNotes(followUp.getNotes().substring(followUp.getNotes().length() - MAX_NOTES));
            }
            followUp.setLastUpdatedByUserId(parseUserId(sysUserId));
        }
        return view(repository.save(followUp), true);
    }

    public void delete(Long id) {
        FollowUp followUp = require(id);
        if (followUp.getStatus() != FollowUpStatus.OPEN) {
            throw new FollowUpValidationException("status", "only an open follow-up can be deleted; a "
                    + label(followUp.getStatus()) + " one is kept for history (cancel it instead)");
        }
        repository.delete(followUp);
    }

    @Transactional(readOnly = true)
    public Optional<FollowUpView> get(Long id) {
        return repository.find(id).map(followUp -> view(followUp, true));
    }

    @Transactional(readOnly = true)
    public FollowUpPage search(FollowUpRepository.Filter filter, int page, int size) {
        int safeSize = Math.max(1, Math.min(size, 100));
        FollowUpRepository.Page found = repository.search(filter, Math.max(0, page), safeSize);
        List<FollowUpView> items = new ArrayList<>();
        for (FollowUp followUp : found.items()) {
            items.add(view(followUp, false));
        }
        return new FollowUpPage(items, found.total(), found.page(), found.size());
    }

    private FollowUp require(Long id) {
        return repository.find(id).orElseThrow(() -> new FollowUpNotFoundException(id));
    }

    static void validateDetails(FollowUpRequest request, List<FieldProblem> problems) {
        if (request.getActionType() == null) {
            problems.add(new FieldProblem("actionType", "choose an action type"));
        }
        if (isBlank(request.getDescription())) {
            problems.add(new FieldProblem("description", "describe the follow-up"));
        } else if (request.getDescription().length() > MAX_DESCRIPTION) {
            problems.add(new FieldProblem("description", "at most " + MAX_DESCRIPTION + " characters"));
        }
        if (request.getPriority() == null) {
            problems.add(new FieldProblem("priority", "choose a priority"));
        }
        if (request.getNotes() != null && request.getNotes().length() > MAX_NOTES) {
            problems.add(new FieldProblem("notes", "at most " + MAX_NOTES + " characters"));
        }
        if (request.getDueDate() != null && request.getDueDate().isBefore(LocalDate.now().minusYears(1))) {
            problems.add(new FieldProblem("dueDate", "the due date is more than a year in the past"));
        }
    }

    private void apply(FollowUpRequest request, FollowUp followUp) {
        followUp.setActionType(request.getActionType());
        followUp.setDescription(request.getDescription().trim());
        followUp.setPriority(request.getPriority() == null ? FollowUpPriority.NORMAL : request.getPriority());
        if (!isBlank(request.getAssignedUserId())) {
            if (core.user(request.getAssignedUserId()).isEmpty()) {
                throw new FollowUpValidationException("assignedUserId",
                        "no staff member with id " + request.getAssignedUserId());
            }
            followUp.setAssignedUserId(request.getAssignedUserId().trim());
        } else {
            followUp.setAssignedUserId(null);
        }
        followUp.setDueDate(request.getDueDate());
        followUp.setNotes(isBlank(request.getNotes()) ? null : request.getNotes().trim());
    }

    FollowUpView view(FollowUp followUp, boolean withCoreDetails) {
        PatientSummary patient = null;
        SpecimenSummary specimen = null;
        String assignedUserName = followUp.getAssignedUserId() == null ? null
                : core.user(followUp.getAssignedUserId()).map(user -> user.displayName()).orElse(null);
        if (withCoreDetails) {
            patient = core.patient(followUp.getPatientId()).orElse(null);
            specimen = core.specimen(followUp.getSampleId()).orElse(null);
        } else {
            patient = core.patient(followUp.getPatientId()).orElse(null);
        }
        return new FollowUpView(followUp.getId(), followUp.getFollowUpNumber(), followUp.getPatientId(),
                followUp.getSampleId(), followUp.getAccessionNumber(), followUp.getActionType(),
                followUp.getActionType() == null ? null : followUp.getActionType().getLabel(),
                followUp.getDescription(), followUp.getPriority(), followUp.getAssignedUserId(), assignedUserName,
                followUp.getDueDate(), followUp.getNotes(), followUp.getStatus(),
                new ArrayList<>(followUp.getStatus().transitions()), followUp.getStatus() == FollowUpStatus.OPEN,
                stamp(followUp.getCreatedAt()), stamp(followUp.getLastUpdated()), patient, specimen);
    }

    private static String stamp(java.sql.Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime().format(STAMP);
    }

    private static Long parseUserId(String sysUserId) {
        try {
            return sysUserId == null ? null : Long.valueOf(sysUserId.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String label(FollowUpStatus status) {
        return status.name().toLowerCase().replace('_', ' ');
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
