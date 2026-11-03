package io.github.mozzy11.openelis.followup.service;

import io.github.mozzy11.openelis.followup.api.FollowUpDtos.FieldProblem;
import java.util.List;

/** A request the module refuses, with one message per field so the form can show them in place. */
public class FollowUpValidationException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final List<FieldProblem> problems;

    public FollowUpValidationException(List<FieldProblem> problems) {
        super(describe(problems));
        this.problems = List.copyOf(problems);
    }

    public FollowUpValidationException(String field, String message) {
        this(List.of(new FieldProblem(field, message)));
    }

    public List<FieldProblem> getProblems() {
        return problems;
    }

    private static String describe(List<FieldProblem> problems) {
        StringBuilder text = new StringBuilder();
        for (FieldProblem problem : problems) {
            if (text.length() > 0) {
                text.append("; ");
            }
            text.append(problem.field()).append(": ").append(problem.message());
        }
        return text.toString();
    }
}
