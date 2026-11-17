import React from "react";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  apiCalls,
  apiResponses,
  resetSdkStubs,
} from "@openelis/module-sdk/testing/sdk.jsx";
import FollowUpDashboardCard from "./FollowUpDashboardCard";
import messages from "../../public/messages/en.json";

/**
 * The card renders against the SDK's doubles: `openelis_core/sdk` resolves to
 * the test double through the Vite alias, so no shell, no server. The double
 * answers the API from `apiResponses` and records what the card asked for.
 */
const renderCard = () =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <MemoryRouter>
        <FollowUpDashboardCard />
      </MemoryRouter>
    </IntlProvider>,
  );

describe("FollowUpDashboardCard", () => {
  beforeEach(resetSdkStubs);

  it("shows the number of open follow-ups the API reports", async () => {
    apiResponses[
      "/rest/modules/specimen-followup/followups?status=OPEN&page=0&size=1"
    ] = {
      total: 3,
      items: [],
    };
    renderCard();
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(apiCalls.map((call) => call.endpoint)).toEqual([
      "/rest/modules/specimen-followup/followups?status=OPEN&page=0&size=1",
    ]);
  });

  it("shows zero when the API refuses the count", async () => {
    apiResponses[
      "/rest/modules/specimen-followup/followups?status=OPEN&page=0&size=1"
    ] = () => {
      throw new Error("503");
    };
    renderCard();
    expect(await screen.findByText("0")).toBeInTheDocument();
  });
});
