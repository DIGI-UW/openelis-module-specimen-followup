package org.openelisglobal.module.followup.web;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.openelisglobal.module.followup.api.FollowUpDtos.FieldProblem;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpPage;
import org.openelisglobal.module.followup.api.FollowUpDtos.FollowUpView;
import org.openelisglobal.module.followup.api.FollowUpDtos.PatientSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.SpecimenSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.UserSummary;
import org.openelisglobal.module.followup.domain.FollowUpActionType;
import org.openelisglobal.module.followup.domain.FollowUpPriority;
import org.openelisglobal.module.followup.domain.FollowUpStatus;
import org.openelisglobal.module.followup.repository.FollowUpRepository;
import org.openelisglobal.module.followup.service.CoreLookupService;
import org.openelisglobal.module.followup.service.FollowUpNotFoundException;
import org.openelisglobal.module.followup.service.FollowUpService;
import org.openelisglobal.module.followup.service.FollowUpValidationException;
import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RequestMapping;

public class FollowUpRestControllerTest {

    private FollowUpService service;
    private CoreLookupService core;
    private MockMvc mockMvc;
    private final ObjectMapper json = new ObjectMapper().registerModule(new JavaTimeModule());

    private static final PatientSummary PATIENT = new PatientSummary("77", "Ada", "Lovelace", "F", "10/12/1990",
            "NID-77", "SN-77");
    private static final SpecimenSummary SPECIMEN = new SpecimenSummary("4711", "25000000001", "03/11/2026",
            "03/11/2026", "Sample entered", List.of("Serum"), 1);

    private static FollowUpView view(FollowUpStatus status) {
        return new FollowUpView(7L, "FU-000007", "77", "4711", "25000000001", FollowUpActionType.RECOLLECTION,
                "Request specimen recollection", "Haemolysed", FollowUpPriority.HIGH, "9", "Tech Nician",
                LocalDate.of(2026, 11, 6), null, status, List.of(FollowUpStatus.IN_PROGRESS), status == FollowUpStatus.OPEN,
                "2026-11-03 10:00", "2026-11-03 10:00", PATIENT, SPECIMEN);
    }

    @Before
    public void setUp() {
        service = mock(FollowUpService.class);
        core = mock(CoreLookupService.class);
        FollowUpRestController controller = new FollowUpRestController(service, core);
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(json);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setMessageConverters(converter).build();
    }

    @Test
    public void everyEndpointLivesUnderTheModulePrefixAndIsGated() {
        RequestMapping mapping = FollowUpRestController.class.getAnnotation(RequestMapping.class);
        Assert.assertEquals("/rest/modules/specimen-followup", mapping.value()[0]);
        for (Method method : FollowUpRestController.class.getDeclaredMethods()) {
            boolean handler = method.getAnnotations().length > 0 && java.util.Arrays.stream(method.getAnnotations())
                    .anyMatch(a -> a.annotationType().getSimpleName().endsWith("Mapping"));
            if (handler) {
                PreAuthorize gate = method.getAnnotation(PreAuthorize.class);
                Assert.assertNotNull(method.getName() + " must be gated", gate);
                Assert.assertTrue(gate.value(), gate.value().contains("mod.specimen-followup."));
            }
        }
    }

    @Test
    public void listsAndGetsFollowUpsWithCoreDetails() throws Exception {
        when(service.search(any(FollowUpRepository.Filter.class), anyInt(), anyInt()))
                .thenReturn(new FollowUpPage(List.of(view(FollowUpStatus.OPEN)), 1, 0, 20));
        when(service.get(7L)).thenReturn(Optional.of(view(FollowUpStatus.OPEN)));

        mockMvc.perform(get("/rest/modules/specimen-followup/followups?status=OPEN&page=0&size=20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].followUpNumber").value("FU-000007"))
                .andExpect(jsonPath("$.items[0].patient.lastName").value("Lovelace"))
                .andExpect(jsonPath("$.items[0].dueDate").value("2026-11-06"));
        mockMvc.perform(get("/rest/modules/specimen-followup/followups/7")).andExpect(status().isOk())
                .andExpect(jsonPath("$.specimen.accessionNumber").value("25000000001"))
                .andExpect(jsonPath("$.deletable").value(true))
                .andExpect(jsonPath("$.allowedTransitions[0]").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.dueDate").value("2026-11-06"));
        when(service.get(8L)).thenReturn(Optional.empty());
        mockMvc.perform(get("/rest/modules/specimen-followup/followups/8")).andExpect(status().isNotFound());
    }

    @Test
    public void createAnswers201AndARefusalAnswers400WithFieldErrors() throws Exception {
        when(service.create(any(), any())).thenReturn(view(FollowUpStatus.OPEN));
        mockMvc.perform(post("/rest/modules/specimen-followup/followups").contentType(MediaType.APPLICATION_JSON)
                .content("{\"patientId\":\"77\",\"sampleId\":\"4711\",\"actionType\":\"RECOLLECTION\","
                        + "\"description\":\"Haemolysed\",\"priority\":\"HIGH\",\"dueDate\":\"2026-11-06\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.followUpNumber").value("FU-000007"));

        when(service.create(any(), any())).thenThrow(new FollowUpValidationException(
                List.of(new FieldProblem("description", "describe the follow-up"))));
        mockMvc.perform(post("/rest/modules/specimen-followup/followups").contentType(MediaType.APPLICATION_JSON)
                .content("{\"patientId\":\"77\",\"sampleId\":\"4711\"}")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("description"));
    }

    @Test
    public void updateStatusAndDeleteDelegateAndReportRefusals() throws Exception {
        when(service.update(eq(7L), any(), any())).thenReturn(view(FollowUpStatus.OPEN));
        mockMvc.perform(put("/rest/modules/specimen-followup/followups/7").contentType(MediaType.APPLICATION_JSON)
                .content("{\"actionType\":\"OTHER\",\"description\":\"x\",\"priority\":\"LOW\"}"))
                .andExpect(status().isOk());

        when(service.changeStatus(eq(7L), any(), any())).thenReturn(view(FollowUpStatus.IN_PROGRESS));
        mockMvc.perform(put("/rest/modules/specimen-followup/followups/7/status")
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"IN_PROGRESS\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(delete("/rest/modules/specimen-followup/followups/7")).andExpect(status().isNoContent());

        org.mockito.Mockito.doThrow(new FollowUpNotFoundException(9L)).when(service).delete(9L);
        mockMvc.perform(delete("/rest/modules/specimen-followup/followups/9")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("notFound"));
    }

    @Test
    public void specimensUsersAndOptionsComeFromTheCoreLookups() throws Exception {
        when(core.patient("77")).thenReturn(Optional.of(PATIENT));
        when(core.specimensOfPatient("77")).thenReturn(List.of(SPECIMEN));
        when(core.patient("1")).thenReturn(Optional.empty());
        when(core.activeUsers()).thenReturn(List.of(new UserSummary("9", "tech", "Tech Nician")));

        mockMvc.perform(get("/rest/modules/specimen-followup/patients/77/specimens")).andExpect(status().isOk())
                .andExpect(jsonPath("$.patient.firstName").value("Ada"))
                .andExpect(jsonPath("$.specimens[0].sampleTypes[0]").value("Serum"))
                .andExpect(jsonPath("$.specimens[0].outstandingFollowUps").value(1));
        mockMvc.perform(get("/rest/modules/specimen-followup/patients/1/specimens")).andExpect(status().isNotFound());
        mockMvc.perform(get("/rest/modules/specimen-followup/users")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].displayName").value("Tech Nician"));
        mockMvc.perform(get("/rest/modules/specimen-followup/options")).andExpect(status().isOk())
                .andExpect(jsonPath("$.actionTypes.length()").value(5))
                .andExpect(jsonPath("$.actionTypes[0].value").value("RECOLLECTION"))
                .andExpect(jsonPath("$.priorities[1]").value("NORMAL"))
                .andExpect(jsonPath("$.statuses[3]").value("CANCELLED"));
    }
}
