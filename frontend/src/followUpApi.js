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
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
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
  return (
    !response ||
    (response.statusCode && response.statusCode >= 400) ||
    response.error === "validation"
  );
}

export const PRIORITIES = ["LOW", "NORMAL", "HIGH"];
export const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function todayPlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + (Number(days) || 0));
  return localIsoDate(date);
}

/** yyyy-mm-dd of a Date in the browser's own calendar, never shifted through UTC. */
export function localIsoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The site's date format as the core's CustomDatePicker shows and accepts it:
 * day first for a French site, month first otherwise.
 */
export function siteDateFormat(configurationProperties) {
  return configurationProperties &&
    configurationProperties.DEFAULT_DATE_LOCALE === "fr-FR"
    ? "dd/MM/yyyy"
    : "MM/dd/yyyy";
}

/** "2026-11-06" -> "11/06/2026" (or "06/11/2026" day first); anything else passes through. */
export function isoToSiteDate(iso, format) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) {
    return iso || "";
  }
  const [, year, month, day] = match;
  return format === "dd/MM/yyyy"
    ? `${day}/${month}/${year}`
    : `${month}/${day}/${year}`;
}

/** "11/06/2026" (or "06/11/2026" day first) -> "2026-11-06"; an incomplete entry is empty. */
export function siteDateToIso(text, format) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || "");
  if (!match) {
    return "";
  }
  const [, first, second, year] = match;
  return format === "dd/MM/yyyy"
    ? `${year}-${second}-${first}`
    : `${year}-${first}-${second}`;
}
