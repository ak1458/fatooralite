import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/lib/i18n/LangProvider";
import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  it("renders user text", () => {
    render(
      <LangProvider initial="en">
        <MessageBubble msg={{ role: "user", text: { en: "Hello?", ar: "؟" } }} />
      </LangProvider>,
    );
    expect(screen.getByText("Hello?")).toBeTruthy();
  });
  it("renders assistant text", () => {
    render(
      <LangProvider initial="en">
        <MessageBubble msg={{ role: "assistant", text: { en: "Fix it", ar: "أصلح" } }} />
      </LangProvider>,
    );
    expect(screen.getByText("Fix it")).toBeTruthy();
  });
  it("renders a plain string assistant message (streamed)", () => {
    render(
      <LangProvider initial="en">
        <MessageBubble msg={{ role: "assistant", text: "Streamed answer" }} />
      </LangProvider>,
    );
    expect(screen.getByText("Streamed answer")).toBeTruthy();
  });
});
