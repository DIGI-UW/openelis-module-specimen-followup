package io.github.mozzy11.openelis.followup.service;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.github.mozzy11.openelis.followup.api.FollowUpDtos.FieldProblem;
import io.github.mozzy11.openelis.followup.api.FollowUpDtos.FollowUpRequest;
import io.github.mozzy11.openelis.followup.api.FollowUpDtos.FollowUpView;
import io.github.mozzy11.openelis.followup.api.FollowUpDtos.PatientSummary;
import io.github.mozzy11.openelis.followup.api.FollowUpDtos.SpecimenSummary;
import io.github.mozzy11.openelis.followup.api.FollowUpDtos.StatusChangeRequest;
import io.github.mozzy11.openelis.followup.api.FollowUpDtos.UserSummary;
import io.github.mozzy11.openelis.followup.domain.FollowUp;
import io.github.mozzy11.openelis.followup.domain.FollowUpActionType;
import io.github.mozzy11.openelis.followup.domain.FollowUpPriority;
import io.github.mozzy11.openelis.followup.domain.FollowUpStatus;
import io.github.mozzy11.openelis.followup.repository.FollowUpRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.Before;
import org.junit.Test;

public class FollowUpServiceTest {

    private FollowUpRepository repository;
    private CoreLookupService core;
    private FollowUpService service;

    private static final PatientSummary PATIENT = new PatientSummary("77", "Ada", "Lovelace", "F", "10/12/1990",
            "NID-77", "SN-77");
    private static final SpecimenSummary SPECIMEN = new SpecimenSummary("4711", "25000000001", "03/11/2026",
            "03/11/2026", "Sample entered", List.of("Serum"), 0);

    @Before
    public void setUp() {
        repository = mock(FollowUpRepository.class);
        core = mock(CoreLookupService.class);
        service = new FollowUpService(repository, core);
        when(repository.save(any(FollowUp.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(repository.nextFollowUpNumber()).thenReturn(42L);
        when(core.patient("77")).thenReturn(Optional.of(PATIENT));
        when(core.specimen("4711")).thenReturn(Optional.of(SPECIMEN));
        when(core.sampleBelongsToPatient("4711", "77")).thenReturn(true);
        when(core.user("9")).thenReturn(Optional.of(new UserSummary("9", "tech", "Tech Nician")));
    }

    private static FollowUpRequest validRequest() {
        FollowUpRequest request = new FollowUpRequest();
        request.setPatientId("77");
        request.setSampleId("4711");
        request.setActionType(FollowUpActionType.RECOLLECTION);
        request.setDescription("Haemolysed sample, please recollect");
        request.setPriority(FollowUpPriority.HIGH);
        request.setAssignedUserId("9");
        request.setDueDate(LocalDate.now().plusDays(3));
        request.setNotes("call the ward first");
        return request;
    }

    @Test
    public void createsAnOpenFollowUpWithAnIdentifierAndTheCoreReferences() {
        FollowUpView view = service.create(validRequest(), "5");

        assertEquals("FU-000042", view.followUpNumber());
        assertEquals(FollowUpStatus.OPEN, view.status());
        assertEquals("77", view.patientId());
        assertEquals("4711", view.sampleId());
        assertEquals("25000000001", view.accessionNumber());
        assertEquals("Request specimen recollection", view.actionTypeLabel());
        assertEquals("Tech Nician", view.assignedUserName());
        assertEquals(PATIENT, view.patient());
        assertEquals(SPECIMEN, view.specimen());
        assertTrue(view.deletable());
        assertEquals(List.of(FollowUpStatus.IN_PROGRESS, FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED),
                view.allowedTransitions());
    }

    @Test
    public void refusesAMissingPatientSpecimenAndDetailsWithOneProblemPerField() {
        FollowUpRequest request = new FollowUpRequest();
        request.setPatientId("");
        request.setSampleId(null);
        request.setDescription(" ");
        try {
            service.create(request, "5");
            fail("expected refusal");
        } catch (FollowUpValidationException e) {
            List<String> fields = e.getProblems().stream().map(FieldProblem::field).toList();
            assertEquals(List.of("patientId", "sampleId", "actionType", "description", "priority"), fields);
        }
        verify(repository, never()).save(any());
    }

    @Test
    public void refusesASpecimenOfAnotherPatient() {
        when(core.sampleBelongsToPatient("4711", "77")).thenReturn(false);
        try {
            service.create(validRequest(), "5");
            fail("expected refusal");
        } catch (FollowUpValidationException e) {
            assertEquals("sampleId", e.getProblems().get(0).field());
            assertTrue(e.getMessage(), e.getMessage().contains("does not belong"));
        }
    }

    @Test
    public void refusesAnUnknownAssignee() {
        FollowUpRequest request = validRequest();
        request.setAssignedUserId("999");
        try {
            service.create(request, "5");
            fail("expected refusal");
        } catch (FollowUpValidationException e) {
            assertEquals("assignedUserId", e.getProblems().get(0).field());
        }
    }

    private FollowUp existing(FollowUpStatus status) {
        FollowUp followUp = new FollowUp();
        followUp.setFollowUpNumber("FU-000007");
        followUp.setPatientId("77");
        followUp.setSampleId("4711");
        followUp.setAccessionNumber("25000000001");
        followUp.setActionType(FollowUpActionType.INVESTIGATION);
        followUp.setDescription("Label mismatch");
        followUp.setPriority(FollowUpPriority.NORMAL);
        followUp.setStatus(status);
        when(repository.find(7L)).thenReturn(Optional.of(followUp));
        return followUp;
    }

    @Test
    public void updatesAnOpenFollowUpButNotAConcludedOne() {
        existing(FollowUpStatus.OPEN);
        FollowUpRequest request = validRequest();
        request.setDescription("Label mismatch, verify with the ward");
        request.setPriority(FollowUpPriority.LOW);
        request.setAssignedUserId(null);

        FollowUpView updated = service.update(7L, request, "5");
        assertEquals("Label mismatch, verify with the ward", updated.description());
        assertEquals(FollowUpPriority.LOW, updated.priority());
        assertNull(updated.assignedUserId());
        assertEquals("77", updated.patientId());

        existing(FollowUpStatus.COMPLETED);
        try {
            service.update(7L, request, "5");
            fail("a completed follow-up is read-only");
        } catch (FollowUpValidationException e) {
            assertTrue(e.getMessage(), e.getMessage().contains("completed"));
        }
    }

    @Test
    public void statusMovesForwardAndNeverRevertsOnceConcluded() {
        FollowUp followUp = existing(FollowUpStatus.OPEN);
        StatusChangeRequest start = new StatusChangeRequest();
        start.setStatus(FollowUpStatus.IN_PROGRESS);
        start.setNote("picked up");
        FollowUpView inProgress = service.changeStatus(7L, start, "5");
        assertEquals(FollowUpStatus.IN_PROGRESS, inProgress.status());
        assertTrue(inProgress.notes(), inProgress.notes().contains("in progress: picked up"));
        assertFalse(inProgress.deletable());

        StatusChangeRequest complete = new StatusChangeRequest();
        complete.setStatus(FollowUpStatus.COMPLETED);
        FollowUpView completed = service.changeStatus(7L, complete, "5");
        assertEquals(FollowUpStatus.COMPLETED, completed.status());
        assertTrue(completed.allowedTransitions().isEmpty());

        StatusChangeRequest reopen = new StatusChangeRequest();
        reopen.setStatus(FollowUpStatus.OPEN);
        try {
            service.changeStatus(7L, reopen, "5");
            fail("a completed follow-up must not reopen");
        } catch (FollowUpValidationException e) {
            assertEquals(FollowUpStatus.COMPLETED, followUp.getStatus());
        }
    }

    @Test
    public void cancelledFollowUpsStayForHistory() {
        existing(FollowUpStatus.OPEN);
        StatusChangeRequest cancel = new StatusChangeRequest();
        cancel.setStatus(FollowUpStatus.CANCELLED);
        FollowUpView cancelled = service.changeStatus(7L, cancel, "5");
        assertEquals(FollowUpStatus.CANCELLED, cancelled.status());
        assertFalse(cancelled.deletable());
        try {
            service.delete(7L);
            fail("a cancelled follow-up is kept");
        } catch (FollowUpValidationException e) {
            assertTrue(e.getMessage(), e.getMessage().contains("kept for history"));
        }
        verify(repository, never()).delete(any());
    }

    @Test
    public void onlyOpenFollowUpsCanBeDeleted() {
        FollowUp open = existing(FollowUpStatus.OPEN);
        service.delete(7L);
        verify(repository).delete(open);

        existing(FollowUpStatus.IN_PROGRESS);
        try {
            service.delete(7L);
            fail("an in-progress follow-up is cancelled, not deleted");
        } catch (FollowUpValidationException e) {
            assertEquals("status", e.getProblems().get(0).field());
        }
    }

    @Test
    public void missingFollowUpIsReportedAsSuch() {
        when(repository.find(404L)).thenReturn(Optional.empty());
        assertTrue(service.get(404L).isEmpty());
        try {
            service.delete(404L);
            fail("expected not found");
        } catch (FollowUpNotFoundException e) {
            assertTrue(e.getMessage().contains("404"));
        }
    }
}
