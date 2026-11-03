package io.github.mozzy11.openelis.followup.repository;

import io.github.mozzy11.openelis.followup.domain.FollowUp;
import io.github.mozzy11.openelis.followup.domain.FollowUpActionType;
import io.github.mozzy11.openelis.followup.domain.FollowUpPriority;
import io.github.mozzy11.openelis.followup.domain.FollowUpStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/**
 * The module's own data access, on the core's entity manager (the module entity joined the core persistence unit
 * at start-up) and inside the core's transactions.
 */
@Repository
public class FollowUpRepository {

    /** What the list screen filters by; every criterion is optional. */
    public record Filter(String followUpNumber, String patientId, String accessionNumber, FollowUpActionType actionType,
            FollowUpPriority priority, FollowUpStatus status) {
    }

    /** One page of results and the total count behind it. */
    public record Page(List<FollowUp> items, long total, int page, int size) {
    }

    @PersistenceContext
    private EntityManager entityManager;

    public FollowUp save(FollowUp followUp) {
        if (followUp.getId() == null) {
            entityManager.persist(followUp);
            return followUp;
        }
        return entityManager.merge(followUp);
    }

    public Optional<FollowUp> find(Long id) {
        return Optional.ofNullable(entityManager.find(FollowUp.class, id));
    }

    public Optional<FollowUp> findByNumber(String followUpNumber) {
        List<FollowUp> found = entityManager
                .createQuery("select f from FollowUp f where f.followUpNumber = :number", FollowUp.class)
                .setParameter("number", followUpNumber).setMaxResults(1).getResultList();
        return found.isEmpty() ? Optional.empty() : Optional.of(found.get(0));
    }

    public void delete(FollowUp followUp) {
        entityManager.remove(entityManager.contains(followUp) ? followUp : entityManager.merge(followUp));
    }

    public long nextFollowUpNumber() {
        Number next = (Number) entityManager
                .createNativeQuery("select nextval('clinlims.mod_specimen_followup_number_seq')").getSingleResult();
        return next.longValue();
    }

    public Page search(Filter filter, int page, int size) {
        List<String> where = new ArrayList<>();
        Map<String, Object> parameters = new java.util.LinkedHashMap<>();
        if (notBlank(filter.followUpNumber())) {
            where.add("upper(f.followUpNumber) like :number");
            parameters.put("number", "%" + filter.followUpNumber().trim().toUpperCase() + "%");
        }
        if (notBlank(filter.patientId())) {
            where.add("f.patientId = :patientId");
            parameters.put("patientId", filter.patientId().trim());
        }
        if (notBlank(filter.accessionNumber())) {
            where.add("upper(f.accessionNumber) like :accession");
            parameters.put("accession", "%" + filter.accessionNumber().trim().toUpperCase() + "%");
        }
        if (filter.actionType() != null) {
            where.add("f.actionType = :actionType");
            parameters.put("actionType", filter.actionType());
        }
        if (filter.priority() != null) {
            where.add("f.priority = :priority");
            parameters.put("priority", filter.priority());
        }
        if (filter.status() != null) {
            where.add("f.status = :status");
            parameters.put("status", filter.status());
        }
        String clause = where.isEmpty() ? "" : " where " + String.join(" and ", where);
        TypedQuery<Long> count = entityManager.createQuery("select count(f) from FollowUp f" + clause, Long.class);
        TypedQuery<FollowUp> select = entityManager.createQuery(
                "select f from FollowUp f" + clause + " order by f.createdAt desc, f.id desc", FollowUp.class);
        parameters.forEach((name, value) -> {
            count.setParameter(name, value);
            select.setParameter(name, value);
        });
        long total = count.getSingleResult();
        List<FollowUp> items = select.setFirstResult(page * size).setMaxResults(size).getResultList();
        return new Page(items, total, page, size);
    }

    public long countOutstandingForSample(String sampleId) {
        return entityManager
                .createQuery("select count(f) from FollowUp f where f.sampleId = :sampleId and f.status in :open",
                        Long.class)
                .setParameter("sampleId", sampleId)
                .setParameter("open", List.of(FollowUpStatus.OPEN, FollowUpStatus.IN_PROGRESS)).getSingleResult();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
