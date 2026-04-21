import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders bootstrap headline", () => {
    render(<App />);

    expect(screen.getByText("Notes App")).toBeInTheDocument();
  });
});
