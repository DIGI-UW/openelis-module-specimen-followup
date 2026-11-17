import React from "react";
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { MemoryRouter, Route, useLocation } from "react-router-dom";
import { NotificationContext } from "openelis_core/contexts";
import type {
  Notification,
  NotificationContextValue,
} from "openelis_core/contexts";
import en from "../../public/messages/en.json";
import fr from "../../public/messages/fr.json";

export interface PageOptions {
  /** The address the router starts at. */
  url?: string;
  /** The route pattern the page is mounted under, `:followUpId` and the like. */
  path?: string;
  locale?: "en" | "fr";
}

/**
 * Renders a module page the way the shell mounts it: inside the router at
 * `path`, with the module's messages for `locale` layered over English as the
 * shell layers them, and a notification context that records what the page
 * announces. The page's `openelis_core/*` imports resolve to the SDK's doubles
 * through the preset's test aliases.
 */
export function renderPage(
  page: ReactElement,
  { url = "/", path = "*", locale = "en" }: PageOptions = {},
) {
  const notifications: Notification[] = [];
  const location: { current: ReturnType<typeof useLocation> | null } = {
    current: null,
  };
  const LocationProbe = () => {
    location.current = useLocation();
    return null;
  };
  const notificationContext: NotificationContextValue = {
    notificationVisible: false,
    setNotificationVisible: () => {},
    notifications,
    addNotification: (notification) => notifications.push(notification),
    removeNotification: () => {},
  };
  const messages: Record<string, string> =
    locale === "fr" ? { ...en, ...fr } : en;
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

/** A form control by id, as the page renders it. */
export const byId = <T extends HTMLElement = HTMLInputElement>(id: string) =>
  document.getElementById(id) as T;

/** The [value, text] pairs of a select, in order. */
export const optionsOf = (id: string) =>
  Array.from(byId<HTMLSelectElement>(id).options).map((option) => [
    option.value,
    option.textContent,
  ]);
