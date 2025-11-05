import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalMessagePanel } from "../PortalMessagePanel";

const baseMessage = {
  id: "msg-1",
  direction: "staff" as const,
  body: "Sveiki",
  createdAt: "2024-01-01T10:00:00Z",
  readByCustomerAt: null,
  readByStaffAt: null,
  metadata: null,
};

describe("PortalMessagePanel", () => {
  it("renders placeholder when empty", () => {
    render(<PortalMessagePanel messages={[]} isLoading={false} onSend={vi.fn()} />);
    expect(screen.getByText(/Kol kas nėra žinučių/i)).toBeInTheDocument();
  });

  it("calls onSend with trimmed message", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    render(<PortalMessagePanel messages={[baseMessage]} isLoading={false} onSend={handler} />);

    const textarea = screen.getByPlaceholderText(/Įrašykite žinutę/i);
    fireEvent.change(textarea, { target: { value: "  Ačiū  " } });
    fireEvent.click(screen.getByRole("button", { name: /Siųsti/i }));

    expect(handler).toHaveBeenCalledWith({ body: "Ačiū" });
  });
});
