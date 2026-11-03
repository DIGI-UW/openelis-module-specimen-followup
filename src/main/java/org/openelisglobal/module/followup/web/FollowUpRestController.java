package org.openelisglobal.module.followup.web;

import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpPage;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpRequest;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpView;
import org.openelisglobal.module.followup.api.FollowUpDtos.PatientSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.SpecimenSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.StatusChangeRequest;
import org.openelisglobal.module.followup.api.FollowUpDtos.UserSummary;
import org.openelisglobal.module.followup.domain.FollowUpActionType;
import org.openelisglobal.module.followup.domain.FollowUpPriority;
import org.openelisglobal.module.followup.domain.FollowUpStatus;
import org.openelisglobal.module.followup.repository.FollowUpRepository;
import org.openelisglobal.module.followup.service.CoreLookupService;
import org.openelisglobal.module.followup.service.FollowUpNotFoundException;
import org.openelisglobal.module.followup.service.FollowUpService;
import org.openelisglobal.module.followup.service.FollowUpValidationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.openelisglobal.common.action.IActionConstants;
import org.openelisglobal.login.valueholder.UserSessionData;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The module's API, under its own prefix. Every method is gated by one of the module's permission keys
 * ({@code mod.specimen-followup.view} to read, {@code mod.specimen-followup.manage} to write), which administrators
 * grant to roles in Role Management like any other key. The session, CSRF handling, JSON conversion and
 * interceptors are the core's, because the controller is registered into the core request mapping.
 */
@RestController
@RequestMapping("/rest/modules/specimen-followup")
public class FollowUpRestController {

    static final String VIEW = "hasAuthority('mod.specimen-followup.view')";
    static final String MANAGE = "hasAuthority('mod.specimen-followup.manage')";

    private final FollowUpService followUpService;
    private final CoreLookupService core;

    public FollowUpRestController(FollowUpService followUpService, CoreLookupService core) {
        this.followUpService = followUpService;
        this.core = core;
    }

    @GetMapping(value = "/followups", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(VIEW)
    public FollowUpPage list(@RequestParam(required = false) String followUpNumber,
            @RequestParam(required = false) String patientId, @RequestParam(required = false) String accessionNumber,
            @RequestParam(required = false) FollowUpActionType actionType,
            @RequestParam(required = false) FollowUpPriority priority,
            @RequestParam(required = false) FollowUpStatus status, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return followUpService.search(new FollowUpRepository.Filter(followUpNumber, patientId, accessionNumber,
                actionType, priority, status), page, size);
    }

    @GetMapping(value = "/followups/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(VIEW)
    public ResponseEntity<FollowUpView> get(@PathVariable("id") Long id) {
        return followUpService.get(id).map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping(value = "/followups", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(MANAGE)
    public ResponseEntity<FollowUpView> create(@RequestBody FollowUpRequest request,
            HttpServletRequest httpRequest) {
        FollowUpView created = followUpService.create(request, getSysUserId(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping(value = "/followups/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(MANAGE)
    public FollowUpView update(@PathVariable("id") Long id, @RequestBody FollowUpRequest request,
            HttpServletRequest httpRequest) {
        return followUpService.update(id, request, getSysUserId(httpRequest));
    }

    @PutMapping(value = "/followups/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(MANAGE)
    public FollowUpView changeStatus(@PathVariable("id") Long id, @RequestBody StatusChangeRequest request,
            HttpServletRequest httpRequest) {
        return followUpService.changeStatus(id, request, getSysUserId(httpRequest));
    }

    @DeleteMapping("/followups/{id}")
    @PreAuthorize(MANAGE)
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        followUpService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** The specimens of a patient, read from the core, for the create form. */
    @GetMapping(value = "/patients/{patientId}/specimens", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(VIEW)
    public ResponseEntity<Map<String, Object>> specimens(@PathVariable("patientId") String patientId) {
        PatientSummary patient = core.patient(patientId).orElse(null);
        if (patient == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        List<SpecimenSummary> specimens = core.specimensOfPatient(patientId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("patient", patient);
        body.put("specimens", specimens);
        return ResponseEntity.ok(body);
    }

    /** Active staff, for the assignee list. */
    @GetMapping(value = "/users", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(VIEW)
    public List<UserSummary> users() {
        return core.activeUsers();
    }

    /** The option lists the forms offer. */
    @GetMapping(value = "/options", produces = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(VIEW)
    public Map<String, Object> options() {
        List<Map<String, String>> actionTypes = new ArrayList<>();
        for (FollowUpActionType type : FollowUpActionType.values()) {
            actionTypes.add(Map.of("value", type.name(), "label", type.getLabel()));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("actionTypes", actionTypes);
        body.put("priorities", List.of(FollowUpPriority.values()));
        body.put("statuses", List.of(FollowUpStatus.values()));
        return body;
    }

    /**
     * The signed-in user's id as the core keeps it for the request (request attribute for stateless logins, the
     * session for interactive ones); {@code null} when neither is present.
     */
    static String getSysUserId(HttpServletRequest request) {
        UserSessionData data = (UserSessionData) request.getAttribute(IActionConstants.USER_SESSION_DATA);
        if (data == null) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                data = (UserSessionData) session.getAttribute(IActionConstants.USER_SESSION_DATA);
            }
        }
        return data == null ? null : String.valueOf(data.getSystemUserId());
    }

    @ExceptionHandler(FollowUpValidationException.class)
    public ResponseEntity<Map<String, Object>> refused(FollowUpValidationException e) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "validation");
        body.put("message", e.getMessage());
        body.put("fieldErrors", e.getProblems());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(FollowUpNotFoundException.class)
    public ResponseEntity<Map<String, Object>> missing(FollowUpNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "notFound", "message", e.getMessage()));
    }
}
