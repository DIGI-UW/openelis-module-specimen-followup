import React from "react";
import { render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, useLocation } from "react-router-dom";
import { NotificationContext } from "openelis_core/contexts";
import en from "../../public/messages/en.json";
import fr from "../../public/messages/fr.json";

/**
 * Renders a module page the way the shell mounts it: inside the router at
 * `path` (the route pattern, `:followUpId` and the like), with the module's
 * messages for `locale` layered over English as the shell layers them, and a
 * notification context that records what the page announces. The page's
 * `openelis_core/*` imports resolve to the SDK's doubles through the preset's
 * test aliases.
 */
export function renderPage(
  page,
  { url = "/", path = "*", locale = "en" } = {},
) {
  const notifications = [];
  const location = { current: null };
  const LocationProbe = () => {
    location.current = useLocation();
    return null;
  };
  const notificationContext = {
    notificationVisible: false,
    setNotificationVisible: () => {},
    notifications,
    addNotification: (notification) => notifications.push(notification),
    removeNotification: () => {},
  };
  const messages = locale === "fr" ? { ...en, ...fr } : en;
  const view = render(
    <IntlProvider locale={locale} messages={messages}>
      <NotificationContext.Provider value={notificationContext}>
        <MemoryRouter initialEntries={[url]}>
          <Route path={path}>{page}</Route>
          <LocationProbe />
        </MemoryRouter>
      </NotificationContext.Provider>
    </IntlProvider>,
  );
  return { ...view, notifications, location };
}
