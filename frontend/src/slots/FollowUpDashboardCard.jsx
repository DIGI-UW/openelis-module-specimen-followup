import React, { useEffect, useState } from "react";
import { ClickableTile } from "@carbon/react";
import { useHistory } from "react-router-dom";
import { useIntl } from "react-intl";
import { useOpenElisApi } from "openelis_core/sdk";
import { ROUTES, endpoints } from "../followUpApi";

/**
 * The module's contribution to the core home dashboard's `home.dashboard.cards`
 * slot: one card with the number of open follow-ups, opening the list filtered
 * to them. The shell renders it only for users who hold the view permission.
 */
export default function FollowUpDashboardCard() {
  const intl = useIntl();
  const history = useHistory();
  const api = useOpenElisApi();
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(endpoints.followUps({ status: "OPEN", page: 1, size: 1 }))
      .then((page) => {
        if (!cancelled) {
          setOpen(page && typeof page.total === "number" ? page.total : 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpen(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <ClickableTile
      className="dashboard-tile"
      data-testid="followup-dashboard-card"
      onClick={() => history.push(`${ROUTES.list}?status=OPEN`)}
    >
      <h5 className="dashboard-tile__title">
        {intl.formatMessage({ id: "mod.specimen-followup.card.title" })}
      </h5>
      <p className="dashboard-tile__subtitle">
        {intl.formatMessage({ id: "mod.specimen-followup.card.subtitle" })}
      </p>
      <p className="dashboard-tile__value">{open === null ? "…" : open}</p>
    </ClickableTile>
  );
}
