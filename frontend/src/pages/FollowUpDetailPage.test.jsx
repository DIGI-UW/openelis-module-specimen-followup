import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  apiCalls,
  apiResponses,
  deniedPermissions,
  resetSdkStubs,
} from "@openelis/module-sdk/testing/sdk.jsx";
import FollowUpDetailPage from "./FollowUpDetailPage";
import { renderPage } from "../test/renderPage";

const API = "/rest/modules/specimen-followup";
const ONE = `${API}/followups/7`;
const PATH = "/m/specimen-followup/followups/:followUpId";
const URL = "/m/specimen-followup/followups/7";

const view = (overrides = {}) => ({
  id: 7,
  followUpNumber: "FU-000007",
  patientId: "3",
  sampleId: "2",
  accessionNumber: "DEV01260000000000001",
  actionType: "INVESTIGATION",
  actionTypeLabel: "Investigate a specimen issue",
  description: "Specimen clarity to check",
  priority: "HIGH",
  assignedUserId: "1",
  assignedUserName: "Open ELIS",
  dueDate: "2026-11-20",
  notes: "call the ward",
  status: "OPEN",
  allowedTransitions: ["IN_PROGRESS", "CANCELLED"],
  deletable: true,
  createdAt: "2026-11-17 23:38",
  lastUpdated: "2026-11-17 23:40",
  patient: {
    patientId: "3",
    lastName: "Fedrunner",
    firstName: "Ama",
    gender: "F",
    birthDate: "11/17/1992",
    nationalId: "NID5114A",
  },
  specimen: {
    sampleId: "2",
    accessionNumber: "DEV01260000000000001",
    sampleTypes: ["Serum"],
    collectionDate: "",
    receivedDate: "11/17/2026",
    status: "No tests have been run for this sample",
    outstandingFollowUps: 1,
  },
  ...overrides,
});

const writes = () => apiCalls.filter((call) => call.method !== "GET");
const open = () => renderPage(<FollowUpDetailPage />, { url: URL, path: PATH });

describe("FollowUpDetailPage", () => {
  beforeEach(() => {
    resetSdkStubs();
    apiResponses[ONE] = view();
    apiResponses[`${API}/options`] = {
      actionTypes: [
        { value: "INVESTIGATION", label: "Investigate a specimen issue" },
        { value: "OTHER", label: "Other" },
      ],
    };
    apiResponses[`${API}/users`] = [
      { id: "1", loginName: "admin", displayName: "Open ELIS" },
    ];
  });

  it("shows the follow-up, its patient and its specimen", async () => {
    open();

    expect(
      await screen.findByTestId("followup-detail-title"),
    ).toHaveTextContent("Follow-up FU-000007 Open");
    expect(screen.getByTestId("followup-patient-card")).toHaveTextContent(
      "Fedrunner, Ama",
    );
    expect(screen.getByTestId("specimen-accession")).toHaveTextContent(
      "DEV01260000000000001",
    );
    expect(screen.getByTestId("specimen-types")).toHaveTextContent("Serum");
    expect(screen.getByTestId("specimen-received")).toHaveTextContent(
      "11/17/2026",
    );
    expect(screen.getByTestId("followup-action-type")).toHaveTextContent(
      "Investigate a specimen issue",
    );
    expect(screen.getByTestId("followup-description")).toHaveTextContent(
      "Specimen clarity to check",
    );
    expect(screen.getByTestId("followup-priority")).toHaveTextContent("High");
    expect(screen.getByTestId("followup-assignee")).toHaveTextContent(
      "Open ELIS",
    );
    expect(screen.getByTestId("followup-due-date")).toHaveTextContent(
      "11/20/2026",
    );
    expect(screen.getByTestId("followup-notes")).toHaveTextContent(
      "call the ward",
    );
    expect(screen.getByTestId("followup-created")).toHaveTextContent(
      "2026-11-17 23:38",
    );
  });

  it("offers edit, the allowed transitions and delete to a manager", async () => {
    open();
    await screen.findByTestId("followup-detail-title");

    expect(document.getElementById("followup-edit")).toHaveTextContent("Edit");
    expect(
      document.getElementById("followup-status-IN_PROGRESS"),
    ).toHaveTextContent("Start work");
    expect(
      document.getElementById("followup-status-CANCELLED"),
    ).toHaveTextContent("Cancel follow-up");
    expect(document.getElementById("followup-status-COMPLETED")).toBeNull();
    expect(document.getElementById("followup-delete")).toHaveTextContent(
      "Delete",
    );
  });

  it("keeps a completed follow-up read-only", async () => {
    apiResponses[ONE] = view({
      status: "COMPLETED",
      allowedTransitions: [],
      deletable: false,
    });
    open();
    expect(await screen.findByTestId("followup-status")).toHaveTextContent(
      "Completed",
    );

    expect(document.getElementById("followup-edit")).toBeNull();
    expect(document.getElementById("followup-delete")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Start work|Reopen/ }),
    ).toBeNull();
    expect(document.getElementById("followup-back")).toBeInTheDocument();
  });

  it("shows a viewer no actions and reads no form lists", async () => {
    deniedPermissions.add("mod.specimen-followup.manage");
    open();
    await screen.findByTestId("followup-detail-title");

    expect(document.getElementById("followup-edit")).toBeNull();
    expect(document.getElementById("followup-status-IN_PROGRESS")).toBeNull();
    expect(document.getElementById("followup-delete")).toBeNull();
    expect(apiCalls.map((call) => call.endpoint)).toEqual([ONE]);
  });

  it("says so for an unknown follow-up", async () => {
    apiResponses[ONE] = () => {
      throw new Error("404");
    };
    open();

    expect(
      await screen.findByText("There is no follow-up at this address."),
    ).toBeInTheDocument();
  });

  it("edits the follow-up and shows the saved values", async () => {
    apiResponses[ONE] = (endpoint, body, method) =>
      method === "PUT"
        ? view({
            actionType: "OTHER",
            actionTypeLabel: "Other",
            priority: "LOW",
            description: "Edited",
          })
        : view();
    const { notifications } = open();
    await screen.findByTestId("followup-detail-title");

    fireEvent.click(document.getElementById("followup-edit"));
    expect(document.getElementById("edit-action-type")).toHaveValue(
      "INVESTIGATION",
    );
    expect(document.getElementById("edit-priority-HIGH")).toBeChecked();
    expect(document.getElementById("edit-description")).toHaveValue(
      "Specimen clarity to check",
    );
    expect(document.getElementById("edit-assignee")).toHaveValue("1");
    expect(document.getElementById("edit-due-date")).toHaveValue("11/20/2026");

    fireEvent.change(document.getElementById("edit-action-type"), {
      target: { value: "OTHER" },
    });
    fireEvent.click(document.getElementById("edit-priority-LOW"));
    fireEvent.change(document.getElementById("edit-description"), {
      target: { value: " Edited " },
    });
    fireEvent.change(document.getElementById("edit-assignee"), {
      target: { value: "" },
    });
    fireEvent.click(document.getElementById("followup-save-edit"));

    await waitFor(() =>
      expect(screen.getByTestId("followup-action-type")).toHaveTextContent(
        "Other",
      ),
    );
    expect(writes()).toEqual([
      {
        method: "PUT",
        endpoint: ONE,
        body: {
          patientId: "3",
          sampleId: "2",
          actionType: "OTHER",
          description: "Edited",
          priority: "LOW",
          assignedUserId: null,
          dueDate: "2026-11-20",
          notes: "call the ward",
        },
      },
    ]);
    expect(screen.getByTestId("followup-priority")).toHaveTextContent("Low");
    expect(notifications).toEqual([
      { kind: "success", title: "Follow-up updated", message: "" },
    ]);
  });

  it("refuses an edit without a description and sends nothing", async () => {
    open();
    await screen.findByTestId("followup-detail-title");

    fireEvent.click(document.getElementById("followup-edit"));
    fireEvent.change(document.getElementById("edit-description"), {
      target: { value: "   " },
    });
    fireEvent.click(document.getElementById("followup-save-edit"));

    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("moves the follow-up through a transition with its note", async () => {
    apiResponses[`${ONE}/status`] = view({
      status: "IN_PROGRESS",
      allowedTransitions: ["OPEN", "COMPLETED", "CANCELLED"],
      deletable: false,
    });
    const { notifications } = open();
    await screen.findByTestId("followup-detail-title");

    fireEvent.click(document.getElementById("followup-status-IN_PROGRESS"));
    const dialog = screen.getByTestId("followup-status-modal");
    expect(dialog).toHaveTextContent("Start work");
    fireEvent.change(within(dialog).getByLabelText("Note (optional)"), {
      target: { value: " starting " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(screen.getByTestId("followup-status")).toHaveTextContent(
        "In progress",
      ),
    );
    expect(writes()).toEqual([
      {
        method: "PUT",
        endpoint: `${ONE}/status`,
        body: { status: "IN_PROGRESS", note: "starting" },
      },
    ]);
    expect(document.getElementById("followup-status-OPEN")).toHaveTextContent(
      "Reopen",
    );
    expect(
      document.getElementById("followup-status-COMPLETED"),
    ).toHaveTextContent("Mark completed");
    expect(document.getElementById("followup-delete")).toBeNull();
    expect(notifications).toEqual([
      { kind: "success", title: "Status updated", message: "" },
    ]);
  });

  it("reports a refused transition and keeps the status", async () => {
    apiResponses[`${ONE}/status`] = {
      statusCode: 409,
      message: "a completed follow-up cannot move to open",
    };
    const { notifications } = open();
    await screen.findByTestId("followup-detail-title");

    fireEvent.click(document.getElementById("followup-status-CANCELLED"));
    fireEvent.click(
      within(screen.getByTestId("followup-status-modal")).getByRole("button", {
        name: "Confirm",
      }),
    );

    await waitFor(() =>
      expect(notifications).toEqual([
        {
          kind: "error",
          title: "The status was not changed",
          message: "a completed follow-up cannot move to open",
        },
      ]),
    );
    expect(screen.getByTestId("followup-status")).toHaveTextContent("Open");
  });

  it("deletes an open follow-up after confirmation and returns to the list", async () => {
    apiResponses[ONE] = (endpoint, body, method) =>
      method === "DELETE" ? 204 : view();
    const { notifications, location } = open();
    await screen.findByTestId("followup-detail-title");

    fireEvent.click(document.getElementById("followup-delete"));
    const dialog = screen.getByTestId("followup-delete-modal");
    expect(dialog).toHaveTextContent(
      "Follow-up FU-000007 is still open and will be removed.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(location.current.pathname).toBe("/m/specimen-followup/followups"),
    );
    expect(writes()).toEqual([
      { method: "DELETE", endpoint: ONE, body: undefined },
    ]);
    expect(notifications).toEqual([
      { kind: "success", title: "Follow-up deleted", message: "" },
    ]);
  });

  it("reports a refused delete, stays and reads the follow-up again", async () => {
    let deletes = 0;
    apiResponses[ONE] = (endpoint, body, method) => {
      if (method === "DELETE") {
        deletes += 1;
        return 409;
      }
      return view();
    };
    const { notifications, location } = open();
    await screen.findByTestId("followup-detail-title");

    fireEvent.click(document.getElementById("followup-delete"));
    fireEvent.click(
      within(screen.getByTestId("followup-delete-modal")).getByRole("button", {
        name: "Delete",
      }),
    );

    await waitFor(() =>
      expect(notifications).toEqual([
        { kind: "error", title: "The follow-up was not deleted", message: "" },
      ]),
    );
    expect(deletes).toBe(1);
    expect(location.current.pathname).toBe(URL);
    await waitFor(() =>
      expect(
        apiCalls.filter(
          (call) => call.method === "GET" && call.endpoint === ONE,
        ),
      ).toHaveLength(2),
    );
  });

  it("reads in French with the module's French bundle", async () => {
    renderPage(<FollowUpDetailPage />, { url: URL, path: PATH, locale: "fr" });

    expect(
      await screen.findByTestId("followup-detail-title"),
    ).toHaveTextContent("Suivi FU-000007 Ouvert");
    expect(screen.getByTestId("followup-action-type")).toHaveTextContent(
      "Examiner un problème d'échantillon",
    );
    expect(screen.getByTestId("followup-priority")).toHaveTextContent("Haute");
    expect(
      document.getElementById("followup-status-IN_PROGRESS"),
    ).toHaveTextContent("Commencer");
  });
});
