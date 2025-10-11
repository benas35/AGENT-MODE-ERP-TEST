import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { SuccessCheck } from "../SuccessCheck";

describe("SuccessCheck", () => {
  it("renders and auto-dismisses after the provided duration", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();

    render(<SuccessCheck message="Uploaded" duration={800} onDone={onDone} />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Uploaded");

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).toBeNull();

    vi.useRealTimers();
  });
});
