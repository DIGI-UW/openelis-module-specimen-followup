import React from "react";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  apiCalls,
  apiResponses,
  deniedPermissions,
  resetSdkStubs,
} from "@openelis/module-sdk/testing/sdk.jsx";
import FollowUpListPage from "./FollowUpListPage";
import { byId, optionsOf, renderPage } from "../test/renderPage";

const LIST = "/rest/modules/specimen-followup/followups";
const OPTIONS = "/rest/modules/specimen-followup/options";

const actionTypes = [
  { value: "RECOLLECTION", label: "Request specimen recollection" },
  { value: "INVESTIGATION", label: "Investigate a specimen issue" },
  { value: "OTHER", label: "Other" },
];

const item = {
  id: 7,
  followUpNumber: "FU-000007",
  patientId: "3",
  patient: { patientId: "3", lastName: "Fedrunner", firstName: "Ama" },
  accessionNumber: "DEV01260000000000001",
  actionType: "INVESTIGATION",
  actionTypeLabel: "Investigate a specimen issue",
  priority: "HIGH",
  status: "IN_PROGRESS",
  assignedUserName: "Open ELIS",
  dueDate: "2026-11-20",
};

const listCalls = () =>
  apiCalls
    .filter((call) => call.endpoint.startsWith(LIST))
    .map((call) => call.endpoint);

describe("FollowUpListPage", () => {
  beforeEach(() => {
    resetSdkStubs();
    apiResponses[OPTIONS] = { actionTypes };
    apiResponses[`${LIST}?page=0&size=20`] = {
      items: [item],
      total: 1,
      page: 0,
      size: 20,
    };
  });

  it("lists the follow-ups with their patient, labels and site-formatted due date", async () => {
    renderPage(<FollowUpListPage />);

    const row = await screen.findByTestId("followup-row-7");
    const cells = within(row);
    expect(cells.getByRole("link", { name: "FU-000007" })).toHaveAttribute(
      "href",
      "/m/specimen-followup/followups/7",
    );
    expect(cells.getByText("Fedrunner, Ama")).toBeInTheDocument();
    expect(cells.getByText("DEV01260000000000001")).toBeInTheDocument();
    expect(cells.getByText("Investigate a specimen issue")).toBeInTheDocument();
    expect(cells.getByText("High")).toBeInTheDocument();
    expect(cells.getByText("In progress")).toBeInTheDocument();
    expect(cells.getByText("Open ELIS")).toBeInTheDocument();
    expect(cells.getByText("11/20/2026")).toBeInTheDocument();
    expect(listCalls()).toEqual([`${LIST}?page=0&size=20`]);
  });

  it("offers the action types from the API in the filter", async () => {
    renderPage(<FollowUpListPage />);

    await screen.findByTestId("followup-row-7");
    const options = optionsOf("filter-type");
    expect(options).toEqual([
      ["", "Any"],
      ["RECOLLECTION", "Request specimen recollection"],
      ["INVESTIGATION", "Investigate a specimen issue"],
      ["OTHER", "Other"],
    ]);
  });

  it("searches with the filters set and resets them", async () => {
    apiResponses[
      `${LIST}?followUpNumber=FU-000007&actionType=INVESTIGATION&priority=HIGH&status=IN_PROGRESS&page=0&size=20`
    ] = { items: [item], total: 1, page: 0, size: 20 };
    renderPage(<FollowUpListPage />);
    await screen.findByTestId("followup-row-7");

    fireEvent.change(byId("filter-number"), {
      target: { value: "FU-000007" },
    });
    fireEvent.change(byId("filter-type"), {
      target: { value: "INVESTIGATION" },
    });
    fireEvent.change(byId("filter-priority"), {
      target: { value: "HIGH" },
    });
    fireEvent.change(byId("filter-status"), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.click(byId("followup-search"));
    await waitFor(() =>
      expect(listCalls()).toContain(
        `${LIST}?followUpNumber=FU-000007&actionType=INVESTIGATION&priority=HIGH&status=IN_PROGRESS&page=0&size=20`,
      ),
    );

    fireEvent.click(byId("followup-reset"));
    await waitFor(() =>
      expect(listCalls()[listCalls().length - 1]).toBe(
        `${LIST}?page=0&size=20`,
      ),
    );
    expect(byId("filter-number")).toHaveValue("");
    expect(byId("filter-status")).toHaveValue("");
  });

  it("starts filtered by the status the dashboard card links with", async () => {
    apiResponses[`${LIST}?status=OPEN&page=0&size=20`] = {
      items: [],
      total: 0,
      page: 0,
      size: 20,
    };
    renderPage(<FollowUpListPage />, {
      url: "/m/specimen-followup/followups?status=OPEN",
    });

    expect(await screen.findByTestId("followup-list-empty")).toHaveTextContent(
      "No follow-ups match.",
    );
    expect(listCalls()).toEqual([`${LIST}?status=OPEN&page=0&size=20`]);
    expect(byId("filter-status")).toHaveValue("OPEN");
  });

  it("asks the API for the page size the pager selects", async () => {
    apiResponses[`${LIST}?page=0&size=50`] = {
      items: [item],
      total: 1,
      page: 0,
      size: 50,
    };
    renderPage(<FollowUpListPage />);
    await screen.findByTestId("followup-row-7");

    fireEvent.change(screen.getByLabelText(/items per page/i), {
      target: { value: "50" },
    });
    await waitFor(() =>
      expect(listCalls()).toContain(`${LIST}?page=0&size=50`),
    );
  });

  it("opens the create page for a user with the manage key", async () => {
    const { location } = renderPage(<FollowUpListPage />);
    await screen.findByTestId("followup-row-7");

    fireEvent.click(byId("followup-new"));
    expect(location.current?.pathname).toBe("/m/specimen-followup/create");
  });

  it("hides create from a user without the manage key", async () => {
    deniedPermissions.add("mod.specimen-followup.manage");
    renderPage(<FollowUpListPage />);
    await screen.findByTestId("followup-row-7");

    expect(byId("followup-new")).toBeNull();
  });

  it("says so when the list cannot be read", async () => {
    apiResponses[`${LIST}?page=0&size=20`] = () => {
      throw new Error("503");
    };
    renderPage(<FollowUpListPage />);

    expect(
      await screen.findByText("The follow-ups could not be read."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("followup-list-empty")).toBeNull();
  });

  it("reads in French with the module's French bundle", async () => {
    renderPage(<FollowUpListPage />, { locale: "fr" });

    const row = await screen.findByTestId("followup-row-7");
    const cells = within(row);
    expect(
      cells.getByText("Examiner un problème d'échantillon"),
    ).toBeInTheDocument();
    expect(cells.getByText("Haute")).toBeInTheDocument();
    expect(cells.getByText("En cours")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Suivis des échantillons" }),
    ).toBeInTheDocument();
  });
});
