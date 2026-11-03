package org.openelisglobal.module.followup.service;

import org.openelisglobal.module.followup.api.FollowUpDtos.PatientSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.SpecimenSummary;
import org.openelisglobal.module.followup.api.FollowUpDtos.UserSummary;
import org.openelisglobal.module.followup.repository.FollowUpRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.hibernate.ObjectNotFoundException;
import org.openelisglobal.common.services.IStatusService;
import org.openelisglobal.patient.service.PatientService;
import org.openelisglobal.patient.valueholder.Patient;
import org.openelisglobal.sample.service.SampleService;
import org.openelisglobal.sample.valueholder.Sample;
import org.openelisglobal.samplehuman.service.SampleHumanService;
import org.openelisglobal.sampleitem.service.SampleItemService;
import org.openelisglobal.sampleitem.valueholder.SampleItem;
import org.openelisglobal.systemuser.service.SystemUserService;
import org.openelisglobal.systemuser.valueholder.SystemUser;
import org.openelisglobal.typeofsample.service.TypeOfSampleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Everything the module reads from the core: patients, their specimens and the staff directory, through the core
 * services resolved from the parent (core) context. The module stores ids only; this service turns them back into
 * what a user needs to see, so patient and specimen information is never duplicated.
 */
@Service
@Transactional(readOnly = true)
public class CoreLookupService {

    private final PatientService patientService;
    private final SampleService sampleService;
    private final SampleHumanService sampleHumanService;
    private final SampleItemService sampleItemService;
    private final TypeOfSampleService typeOfSampleService;
    private final SystemUserService systemUserService;
    private final IStatusService statusService;
    private final FollowUpRepository followUpRepository;

    public CoreLookupService(PatientService patientService, SampleService sampleService,
            SampleHumanService sampleHumanService, SampleItemService sampleItemService,
            TypeOfSampleService typeOfSampleService, SystemUserService systemUserService,
            IStatusService statusService, FollowUpRepository followUpRepository) {
        this.patientService = patientService;
        this.sampleService = sampleService;
        this.sampleHumanService = sampleHumanService;
        this.sampleItemService = sampleItemService;
        this.typeOfSampleService = typeOfSampleService;
        this.systemUserService = systemUserService;
        this.statusService = statusService;
        this.followUpRepository = followUpRepository;
    }

    public Optional<PatientSummary> patient(String patientId) {
        if (patientId == null || patientId.isBlank()) {
            return Optional.empty();
        }
        Patient patient = patientService.getData(patientId);
        if (patient == null || patient.getId() == null) {
            return Optional.empty();
        }
        return Optional.of(new PatientSummary(patient.getId(), patientService.getFirstName(patient),
                patientService.getLastName(patient), patientService.getGender(patient),
                patientService.getBirthdayForDisplay(patient), patientService.getNationalId(patient),
                patientService.getSubjectNumber(patient)));
    }

    /** The specimens of a patient, newest first, as the core holds them. */
    public List<SpecimenSummary> specimensOfPatient(String patientId) {
        List<SpecimenSummary> specimens = new ArrayList<>();
        if (patientId == null || patientId.isBlank()) {
            return specimens;
        }
        List<Sample> samples = sampleHumanService.getSamplesForPatient(patientId);
        for (Sample sample : samples) {
            specimens.add(summarize(sample));
        }
        specimens.sort(Comparator.comparing(SpecimenSummary::sampleId, Comparator.comparingLong(Long::parseLong))
                .reversed());
        return specimens;
    }

    public Optional<SpecimenSummary> specimen(String sampleId) {
        return findSample(sampleId).map(this::summarize);
    }

    /** Whether the sample belongs to the patient, so a follow-up never pairs a patient with another's specimen. */
    public boolean sampleBelongsToPatient(String sampleId, String patientId) {
        Sample sample = findSample(sampleId).orElse(null);
        if (sample == null) {
            return false;
        }
        Patient patient = sampleHumanService.getPatientForSample(sample);
        return patient != null && patientId != null && patientId.equals(patient.getId());
    }

    /** The core's get() throws for an id it does not know; to the module that is simply no specimen. */
    private Optional<Sample> findSample(String sampleId) {
        if (sampleId == null || sampleId.isBlank()) {
            return Optional.empty();
        }
        try {
            Sample sample = sampleService.get(sampleId);
            return sample == null || sample.getId() == null ? Optional.empty() : Optional.of(sample);
        } catch (ObjectNotFoundException e) {
            return Optional.empty();
        }
    }

    private SpecimenSummary summarize(Sample sample) {
        List<String> types = new ArrayList<>();
        for (SampleItem item : sampleItemService.getSampleItemsBySampleId(sample.getId())) {
            String typeName = typeOfSampleService.getNameForTypeOfSampleId(sampleItemService.getTypeOfSampleId(item));
            if (typeName != null && !types.contains(typeName)) {
                types.add(typeName);
            }
        }
        String status = sample.getStatusId() == null ? null : statusService.getStatusNameFromId(sample.getStatusId());
        return new SpecimenSummary(sample.getId(), sample.getAccessionNumber(), sample.getCollectionDateForDisplay(),
                sampleService.getReceivedDateForDisplay(sample), status, types,
                followUpRepository.countOutstandingForSample(sample.getId()));
    }

    /** Active staff, for the assignee list. */
    public List<UserSummary> activeUsers() {
        List<UserSummary> users = new ArrayList<>();
        for (SystemUser user : systemUserService.getAllSystemUsers()) {
            if ("Y".equalsIgnoreCase(user.getIsActive())) {
                users.add(new UserSummary(user.getId(), user.getLoginName(), displayName(user)));
            }
        }
        users.sort(Comparator.comparing(UserSummary::displayName, String.CASE_INSENSITIVE_ORDER));
        return users;
    }

    public Optional<UserSummary> user(String userId) {
        if (userId == null || userId.isBlank()) {
            return Optional.empty();
        }
        SystemUser user = systemUserService.get(userId);
        return user == null || user.getId() == null ? Optional.empty()
                : Optional.of(new UserSummary(user.getId(), user.getLoginName(), displayName(user)));
    }

    private static String displayName(SystemUser user) {
        String first = user.getFirstName() == null ? "" : user.getFirstName().trim();
        String last = user.getLastName() == null ? "" : user.getLastName().trim();
        String name = (first + " " + last).trim();
        return name.isEmpty() ? user.getLoginName() : name;
    }
}
