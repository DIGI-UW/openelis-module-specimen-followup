import type { ChangeEvent } from "react";
import type { IntlShape } from "react-intl";
import type { ApiFailure } from "openelis_core/api";

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
  detail: (id: string | number) => `/m/${MODULE_ID}/followups/${id}`,
};

export type Priority = "LOW" | "NORMAL" | "HIGH";
export type Status = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type ActionType =
  | "RECOLLECTION"
  | "INVESTIGATION"
  | "PATIENT_INFORMATION"
  | "NOTIFY_CLINICIAN"
  | "OTHER";

/** PatientSummary in the backend's FollowUpDtos. */
export interface PatientSummary {
  patientId: string;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  nationalId?: string | null;
  subjectNumber?: string | null;
}

/** A patient as the card shows it: the API's summary, or the core search result the create page picked. */
export type ShownPatient = PatientSummary & {
  birthDateForDisplay?: string | null;
};

/** SpecimenSummary in the backend's FollowUpDtos. */
export interface SpecimenSummary {
  sampleId: string;
  accessionNumber: string;
  collectionDate?: string | null;
  receivedDate?: string | null;
  status?: string | null;
  sampleTypes?: string[] | null;
  outstandingFollowUps?: number;
}

/** UserSummary in the backend's FollowUpDtos. */
export interface UserSummary {
  id: string;
  loginName: string;
  displayName: string;
}

/** FollowUpView in the backend's FollowUpDtos; `dueDate` is yyyy-MM-dd. */
export interface FollowUp {
  id: number;
  followUpNumber: string;
  patientId: string;
  sampleId: string;
  accessionNumber?: string | null;
  actionType: ActionType;
  actionTypeLabel?: string | null;
  description: string;
  priority: Priority;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  status: Status;
  allowedTransitions?: Status[];
  deletable?: boolean;
  createdAt?: string | null;
  lastUpdated?: string | null;
  patient?: PatientSummary | null;
  specimen?: SpecimenSummary | null;
}

/** FollowUpPage in the backend's FollowUpDtos. */
export interface FollowUpPage {
  items: FollowUp[];
  total: number;
  page: number;
  size: number;
}

export interface ActionTypeOption {
  value: ActionType;
  label: string;
}

/** What `GET .../options` answers. */
export interface FollowUpOptions {
  actionTypes: ActionTypeOption[];
  priorities?: Priority[];
  statuses?: Status[];
}

/** What `GET .../patients/{id}/specimens` answers. */
export interface PatientSpecimens {
  patient?: PatientSummary;
  specimens?: SpecimenSummary[];
}

/** The create and edit forms' values, as the controls hold them. */
export interface FollowUpForm {
  actionType: string;
  description: string;
  priority: string;
  assignedUserId: string;
  dueDate: string;
  notes: string;
}

/** FollowUpRequest in the backend's FollowUpDtos: what create and edit send. */
export interface FollowUpRequest {
  patientId: string;
  sampleId: string;
  actionType: string;
  description: string;
  priority: string;
  assignedUserId: string | null;
  dueDate: string | null;
  notes: string | null;
}

/** StatusChangeRequest in the backend's FollowUpDtos. */
export interface StatusChange {
  status: Status | null;
  note: string;
}

/** Messages by field, as the forms show them under their controls. */
export type FieldErrors = Partial<Record<string, string>>;

/** A text, select or text-area change, or a value a Carbon control hands over directly. */
export type FieldChange =
  | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  | string;

export type FollowUpFilters = Record<
  string,
  string | number | null | undefined
>;

export const endpoints = {
  options: `${API}/options`,
  users: `${API}/users`,
  specimensOfPatient: (patientId: string | number) =>
    `${API}/patients/${encodeURIComponent(patientId)}/specimens`,
  followUps: (filters: FollowUpFilters = {}) => {
    const query = Object.entries(filters)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== "",
      )
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value as string | number)}`,
      )
      .join("&");
    return `${API}/followups${query ? `?${query}` : ""}`;
  },
  followUp: (id: string | number) => `${API}/followups/${id}`,
  status: (id: string | number) => `${API}/followups/${id}/status`,
};

/** Field errors as the API returns them, keyed by field for the form. */
export function fieldErrorsOf(
  response: ApiFailure | null | undefined,
): FieldErrors {
  const errors: FieldErrors = {};
  if (response && Array.isArray(response.fieldErrors)) {
    response.fieldErrors.forEach((problem) => {
      errors[problem.field as string] = problem.message;
    });
  }
  return errors;
}

/** Whether a response from the shell's post/put client is a refusal. */
export function isRefusal<T>(
  response: T | ApiFailure | null | undefined,
): response is ApiFailure | null | undefined {
  return (!response ||
    ((response as ApiFailure).statusCode &&
      (response as ApiFailure).statusCode! >= 400) ||
    (response as ApiFailure).error === "validation") as boolean;
}

/**
 * An action type's label in the shell's locale: the module's own message for
 * the value when the active bundle has one, else the label the API sent, else
 * the value.
 */
export function actionTypeLabel(
  intl: IntlShape | null | undefined,
  value: string | null | undefined,
  serverLabel?: string | null,
): string {
  const id = `mod.specimen-followup.actionType.${value}`;
  if (value && intl && intl.messages && intl.messages[id]) {
    return intl.formatMessage({ id });
  }
  return serverLabel || value || "";
}

export const PRIORITIES: Priority[] = ["LOW", "NORMAL", "HIGH"];
export const STATUSES: Status[] = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export function todayPlusDays(days: string | number | null | undefined) {
  const date = new Date();
  date.setDate(date.getDate() + (Number(days) || 0));
  return localIsoDate(date);
}

/** yyyy-mm-dd of a Date in the browser's own calendar, never shifted through UTC. */
export function localIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type SiteDateFormat = "dd/MM/yyyy" | "MM/dd/yyyy";

/**
 * The site's date format as the core's CustomDatePicker shows and accepts it:
 * day first for a French site, month first otherwise.
 */
export function siteDateFormat(
  configurationProperties: Record<string, unknown> | null | undefined,
): SiteDateFormat {
  return configurationProperties &&
    configurationProperties.DEFAULT_DATE_LOCALE === "fr-FR"
    ? "dd/MM/yyyy"
    : "MM/dd/yyyy";
}

/** "2026-11-06" -> "11/06/2026" (or "06/11/2026" day first); anything else passes through. */
export function isoToSiteDate(
  iso: string | null | undefined,
  format: string,
): string {
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
export function siteDateToIso(
  text: string | null | undefined,
  format: string,
): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || "");
  if (!match) {
    return "";
  }
  const [, first, second, year] = match;
  return format === "dd/MM/yyyy"
    ? `${year}-${second}-${first}`
    : `${year}-${first}-${second}`;
}
