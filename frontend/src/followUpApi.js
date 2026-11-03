/**
 * The module's own endpoints, under the prefix the core reserves for it. The
 * shell's client (openelis_core/sdk) adds the base URL, the session cookie,
 * the locale and the CSRF token.
 */
export const MODULE_ID = "specimen-followup";
export const API = `/rest/modules/${MODULE_ID}`;
export const ROUTES = {
  create: `/m/${MODULE_ID}/create`,
  list: `/m/${MODULE_ID}/followups`,
  detail: (id) => `/m/${MODULE_ID}/followups/${id}`,
};

export const endpoints = {
  options: `${API}/options`,
  users: `${API}/users`,
  specimensOfPatient: (patientId) =>
    `${API}/patients/${encodeURIComponent(patientId)}/specimens`,
  followUps: (filters = {}) => {
    const query = Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    return `${API}/followups${query ? `?${query}` : ""}`;
  },
  followUp: (id) => `${API}/followups/${id}`,
  status: (id) => `${API}/followups/${id}/status`,
};

/** Field errors as the API returns them, keyed by field for the form. */
export function fieldErrorsOf(response) {
  const errors = {};
  if (response && Array.isArray(response.fieldErrors)) {
    response.fieldErrors.forEach((problem) => {
      errors[problem.field] = problem.message;
    });
  }
  return errors;
}

/** Whether a response from the shell's post/put client is a refusal. */
export function isRefusal(response) {
  return !response || (response.statusCode && response.statusCode >= 400) || response.error === "validation";
}

export const PRIORITIES = ["LOW", "NORMAL", "HIGH"];
export const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function todayPlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + (Number(days) || 0));
  return date.toISOString().substring(0, 10);
}
