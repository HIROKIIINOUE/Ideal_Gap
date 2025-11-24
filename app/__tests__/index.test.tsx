import { render, screen } from "@testing-library/react-native";
import Index from "../index";

describe("Index screen", () => {
  it("shows pricing and CTA buttons", () => {
    render(<Index />);

    expect(screen.getAllByText(/初月無料・次月以降 8.5 CAD/)[0]).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "無料で始める" })[0]).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: /サインイン/ })[0]).toBeOnTheScreen();
  });
});
