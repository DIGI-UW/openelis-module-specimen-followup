package org.openelisglobal.module.followup.service;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.hibernate.ObjectNotFoundException;
import org.junit.Before;
import org.junit.Test;
import org.openelisglobal.common.services.IStatusService;
import org.openelisglobal.module.followup.repository.FollowUpRepository;
import org.openelisglobal.patient.service.PatientService;
import org.openelisglobal.sample.service.SampleService;
import org.openelisglobal.samplehuman.service.SampleHumanService;
import org.openelisglobal.sampleitem.service.SampleItemService;
import org.openelisglobal.systemuser.service.SystemUserService;
import org.openelisglobal.typeofsample.service.TypeOfSampleService;

/**
 * The core answers an unknown sample id by throwing, not with null; the lookup
 * turns that into "no specimen" so the API refuses the request instead of
 * failing with a 500.
 */
public class CoreLookupServiceTest {

    private SampleService sampleService;
    private CoreLookupService lookup;

    @Before
    public void wire() {
        sampleService = mock(SampleService.class);
        lookup = new CoreLookupService(mock(PatientService.class), sampleService, mock(SampleHumanService.class),
                mock(SampleItemService.class), mock(TypeOfSampleService.class), mock(SystemUserService.class),
                mock(IStatusService.class), mock(FollowUpRepository.class));
    }

    @Test
    public void anUnknownSampleIdIsNoSpecimen() {
        when(sampleService.get(anyString()))
                .thenThrow(new ObjectNotFoundException("999999", "org.openelisglobal.sample.valueholder.Sample"));

        assertTrue(lookup.specimen("999999").isEmpty());
        assertFalse(lookup.sampleBelongsToPatient("999999", "83"));
    }

    @Test
    public void aBlankSampleIdIsNoSpecimenWithoutAskingTheCore() {
        assertTrue(lookup.specimen("  ").isEmpty());
        assertFalse(lookup.sampleBelongsToPatient(null, "83"));
    }
}
