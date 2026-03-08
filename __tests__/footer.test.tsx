import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";
import Footer from "../components/Footer";
import i18n from "../i18n";

describe("Footer", () => {
  const renderFooter = (props?: Partial<React.ComponentProps<typeof Footer>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <Footer isAuthenticated={false} {...props} />
      </I18nextProvider>,
    );
  const renderAuthenticatedFooter = (props?: Partial<React.ComponentProps<typeof Footer>>) =>
    render(
      <I18nextProvider i18n={i18n}>
        <Footer isAuthenticated {...props} />
      </I18nextProvider>,
    );

  test("shows language and contact actions for guests", () => {
    const onContactPress = jest.fn();
    const { getByRole, queryByRole } = renderFooter({ onContactPress });

    const languageButton = getByRole("button", { name: /language/i });
    const contactButton = getByRole("button", { name: /contact/i });

    expect(languageButton).toBeTruthy();
    fireEvent.press(contactButton);

    expect(onContactPress).toHaveBeenCalledTimes(1);
    expect(queryByRole("button", { name: /dashboard/i })).toBeNull();
  });

  test("shows home action when guestActions is home", () => {
    const onHomePress = jest.fn();
    const { getByRole, queryByRole } = renderFooter({ guestActions: "home", onHomePress });

    const homeButton = getByRole("button", { name: /home/i });
    fireEvent.press(homeButton);

    expect(onHomePress).toHaveBeenCalledTimes(1);
    expect(queryByRole("button", { name: /contact/i })).toBeNull();
  });

  test("shows home label for authenticated center action", () => {
    const onDashboardPress = jest.fn();
    const { getByRole, queryByRole } = renderAuthenticatedFooter({ onDashboardPress });

    const homeButton = getByRole("button", { name: /home/i });
    fireEvent.press(homeButton);

    expect(onDashboardPress).toHaveBeenCalledTimes(1);
    expect(queryByRole("button", { name: /dashboard/i })).toBeNull();
  });
});
