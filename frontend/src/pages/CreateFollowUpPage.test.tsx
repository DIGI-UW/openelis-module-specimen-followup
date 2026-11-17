import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  apiCalls,
  apiResponses,
  moduleConfigs,
  resetSdkStubs,
} from "@openelis/module-sdk/testing/sdk.jsx";
import { testPatients } from "@openelis/module-sdk/testing/components.jsx";
import CreateFollowUpPage from "./CreateFollowUpPage";
import { isoToSiteDate, todayPlusDays } from "../followUpApi";
import { byId, optionsOf, renderPage } from "../test/renderPage";

const API = "/rest/modules/specimen-followup";

const patient = {
  patientPK: "3",
  lastName: "Fedrunner",
  firstName: "Ama",
  gender: "F",
  birthDateForDisplay: "11/17/1992",
  nationalId: "NID5114A",
};

const specimen = {
  sampleId: "2",
  accessionNumber: "DEV01260000000000001",
  sampleTypes: ["Serum"],
  collectionDate: "",
  receivedDate: "11/17/2026",
  status: "No tests have been run for this sample",
  outstandingFollowUps: 1,
};

const posts = () => apiCalls.filter((call) => call.method === "POST");

const pickPatientAndSpecimen = async () => {
  fireEvent.click(
    await screen.findByRole("button", { name: "Fedrunner, Ama" }),
  );
  const row = await screen.findByTestId("specimen-row-2");
  fireEvent.click(within(row).getByRole("radio"));
  await screen.findByText("3. Follow-up");
};

describe("CreateFollowUpPage", () => {
  beforeEach(() => {
    resetSdkStubs();
    testPatients.length = 0;
    testPatients.push(patient);
    apiResponses[`${API}/options`] = {
      actionTypes: [
        { value: "RECOLLECTION", label: "Request specimen recollection" },
        { value: "OTHER", label: "Other" },
      ],
    };
    apiResponses[`${API}/users`] = [
      { id: "1", loginName: "admin", displayName: "Open ELIS" },
    ];
    apiResponses[`${API}/patients/3/specimens`] = {
      patient: { patientId: "3" },
      specimens: [specimen],
    };
    moduleConfigs["specimen-followup"] = { defaultDueDays: "3" };
  });

  it("shows the picked patient and that patient's specimens", async () => {
    renderPage(<CreateFollowUpPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Fedrunner, Ama" }),
    );
    const card = await screen.findByTestId("followup-patient-card");
    expect(card).toHaveTextContent("Fedrunner, Ama");
    expect(card).toHaveTextContent("Patient id: 3 · NID5114A");
    expect(card).toHaveTextContent("F · 11/17/1992");
    const row = await screen.findByTestId("specimen-row-2");
    expect(row).toHaveTextContent("DEV01260000000000001");
    expect(row).toHaveTextContent("Serum");
    expect(row).toHaveTextContent("11/17/2026");
    expect(
      apiCalls.filter((call) => call.endpoint.includes("/patients/")),
    ).toEqual([
      {
        method: "GET",
        endpoint: `${API}/patients/3/specimens`,
        body: undefined,
      },
    ]);
  });

  it("goes back to the search when the patient is changed", async () => {
    renderPage(<CreateFollowUpPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Fedrunner, Ama" }),
    );
    fireEvent.click(await screen.findByTestId("followup-change-patient"));

    expect(
      await screen.findByTestId("followup-search-patient-form"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("followup-patient-card")).toBeNull();
  });

  it("offers the form once a specimen is picked, due by the module's default", async () => {
    renderPage(<CreateFollowUpPage />);
    await pickPatientAndSpecimen();

    expect(byId("followup-due-date")).toHaveValue(
      isoToSiteDate(todayPlusDays(3), "MM/dd/yyyy"),
    );
    expect(byId("followup-priority-NORMAL")).toBeChecked();
    const types = optionsOf("followup-action-type").map(([, text]) => text);
    expect(types).toEqual([
      "Choose...",
      "Request specimen recollection",
      "Other",
    ]);
    const assignees = optionsOf("followup-assignee").map(([, text]) => text);
    expect(assignees).toEqual(["Unassigned", "Open ELIS (admin)"]);
  });

  it("marks the required fields and sends nothing while they are empty", async () => {
    renderPage(<CreateFollowUpPage />);
    await pickPatientAndSpecimen();

    fireEvent.click(byId("followup-save"));

    expect(await screen.findAllByText("Required")).toHaveLength(2);
    expect(posts()).toEqual([]);
  });

  it("saves the follow-up and opens it", async () => {
    apiResponses[`${API}/followups`] = { id: 9, followUpNumber: "FU-000009" };
    const { notifications, location } = renderPage(<CreateFollowUpPage />);
    await pickPatientAndSpecimen();

    fireEvent.change(byId("followup-action-type"), {
      target: { value: "OTHER" },
    });
    fireEvent.click(byId("followup-priority-HIGH"));
    fireEvent.change(byId("followup-description"), {
      target: { value: "  Specimen clarity to check  " },
    });
    fireEvent.change(byId("followup-assignee"), {
      target: { value: "1" },
    });
    fireEvent.change(byId("followup-due-date"), {
      target: { value: "12/24/2026" },
    });
    fireEvent.change(byId("followup-notes"), {
      target: { value: "  call the ward  " },
    });
    fireEvent.click(byId("followup-save"));

    await waitFor(() =>
      expect(location.current?.pathname).toBe(
        "/m/specimen-followup/followups/9",
      ),
    );
    expect(posts()).toEqual([
      {
        method: "POST",
        endpoint: `${API}/followups`,
        body: {
          patientId: "3",
          sampleId: "2",
          actionType: "OTHER",
          description: "Specimen clarity to check",
          priority: "HIGH",
          assignedUserId: "1",
          dueDate: "2026-12-24",
          notes: "call the ward",
        },
      },
    ]);
    expect(notifications).toEqual([
      {
        kind: "success",
        title: "Follow-up created",
        message: "Follow-up FU-000009 is open.",
      },
    ]);
  });

  it("sends empty optional fields as null", async () => {
    apiResponses[`${API}/followups`] = { id: 10, followUpNumber: "FU-000010" };
    moduleConfigs["specimen-followup"] = {};
    renderPage(<CreateFollowUpPage />);
    await pickPatientAndSpecimen();

    fireEvent.change(byId("followup-action-type"), {
      target: { value: "RECOLLECTION" },
    });
    fireEvent.change(byId("followup-description"), {
      target: { value: "Recollect" },
    });
    fireEvent.click(byId("followup-save"));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0].body).toEqual({
      patientId: "3",
      sampleId: "2",
      actionType: "RECOLLECTION",
      description: "Recollect",
      priority: "NORMAL",
      assignedUserId: null,
      dueDate: null,
      notes: null,
    });
  });

  it("shows the API's field errors when the save is refused and stays on the form", async () => {
    apiResponses[`${API}/followups`] = {
      statusCode: 400,
      error: "validation",
      message: "Invalid follow-up",
      fieldErrors: [{ field: "description", message: "Too long" }],
    };
    const { notifications, location } = renderPage(<CreateFollowUpPage />);
    await pickPatientAndSpecimen();

    fireEvent.change(byId("followup-action-type"), {
      target: { value: "OTHER" },
    });
    fireEvent.change(byId("followup-description"), {
      target: { value: "x" },
    });
    fireEvent.click(byId("followup-save"));

    expect(await screen.findByText("Too long")).toBeInTheDocument();
    expect(notifications).toEqual([
      {
        kind: "error",
        title: "The follow-up was not saved",
        message: "Invalid follow-up",
      },
    ]);
    expect(location.current?.pathname).not.toMatch(/followups\/\d+/);
    expect(byId("followup-save")).not.toBeDisabled();
  });

  it("says so when the patient has no specimens", async () => {
    apiResponses[`${API}/patients/3/specimens`] = { specimens: [] };
    renderPage(<CreateFollowUpPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Fedrunner, Ama" }),
    );

    expect(
      await screen.findByTestId("followup-no-specimens"),
    ).toHaveTextContent("This patient has no specimens in OpenELIS yet.");
    expect(byId("followup-save")).toBeNull();
  });

  it("says so when the specimens cannot be read", async () => {
    apiResponses[`${API}/patients/3/specimens`] = () => {
      throw new Error("500");
    };
    renderPage(<CreateFollowUpPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Fedrunner, Ama" }),
    );

    expect(
      await screen.findByText("The patient's specimens could not be read."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("followup-no-specimens")).toBeNull();
  });

  it("reads in French with the module's French bundle", async () => {
    renderPage(<CreateFollowUpPage />, { locale: "fr" });

    expect(
      await screen.findByRole("heading", { name: "Créer un suivi" }),
    ).toBeInTheDocument();
  });
});
