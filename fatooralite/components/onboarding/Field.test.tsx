import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field";

describe("Field", () => {
  it("associates the label with the control so clicking it focuses the field", () => {
    render(
      <Field id="vat" label="VAT number">
        {(p) => <input {...p} />}
      </Field>,
    );
    // getByLabelText resolves through htmlFor/id — it fails if the label is
    // merely adjacent, which is exactly the bug this component exists to stop.
    expect(screen.getByLabelText("VAT number")).toBe(screen.getByRole("textbox"));
  });

  it("marks a required field with aria-required rather than only a visual asterisk", () => {
    render(
      <Field id="cr" label="CR number" required>
        {(p) => <input {...p} />}
      </Field>,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-required", "true");
  });

  it("does not leak the asterisk into the accessible name", () => {
    render(
      <Field id="cr" label="CR number" required>
        {(p) => <input {...p} />}
      </Field>,
    );
    expect(screen.getByRole("textbox")).toHaveAccessibleName("CR number");
  });

  it("announces an error and points the control at it", () => {
    render(
      <Field id="postal" label="Postal code" error="Postal code is 5 digits">
        {(p) => <input {...p} />}
      </Field>,
    );
    const control = screen.getByRole("textbox");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Postal code is 5 digits");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control.getAttribute("aria-describedby")).toContain(alert.id);
  });

  it("describes the control with its hint when there is no error", () => {
    render(
      <Field id="vat" label="VAT number" hint="15 digits, verified at registration">
        {(p) => <input {...p} />}
      </Field>,
    );
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("15 digits, verified at registration");
  });

  it("replaces the hint with the error rather than showing both", () => {
    render(
      <Field id="vat" label="VAT number" hint="15 digits" error="VAT must be exactly 15 digits">
        {(p) => <input {...p} />}
      </Field>,
    );
    expect(screen.queryByText("15 digits")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("labels a select the same way it labels an input", () => {
    render(
      <Field id="cat" label="Business category">
        {(p) => (
          <select {...p}>
            <option value="">Select</option>
          </select>
        )}
      </Field>,
    );
    expect(screen.getByLabelText("Business category")).toBe(screen.getByRole("combobox"));
  });
});
