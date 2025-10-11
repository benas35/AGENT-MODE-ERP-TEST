import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";
import { useState } from "react";

const ThrowOnRender = () => {
  throw new Error("Boom");
};

describe("ErrorBoundary", () => {
  it("renders fallback and calls reset handler", () => {
    const resetSpy = vi.fn();

    const Harness = () => {
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <ErrorBoundary onReset={() => { resetSpy(); setShouldThrow(false); }}>
          {shouldThrow ? <ThrowOnRender /> : <div>All good</div>}
        </ErrorBoundary>
      );
    };

    render(<Harness />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/something went wrong/i);

    const tryAgainButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(tryAgainButton);

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("All good")).toBeInTheDocument();
  });
});
