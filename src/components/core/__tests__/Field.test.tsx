import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { TextField } from "@radix-ui/themes";
import { Field } from "../Field";

// The point of Field is the wiring nobody remembers: label association and the
// describedby/invalid attributes. If those break, everything downstream reads
// as an unlabelled box to a screen reader, and nothing else would notice.
const renderInTheme = (ui: React.ReactElement) =>
  render(<Theme>{ui}</Theme>);

describe("Field", () => {
  it("associates the label with the control it wraps", () => {
    renderInTheme(
      <Field label="Bucket">
        {(props) => <TextField.Root {...props} name="bucket" />}
      </Field>
    );

    expect(screen.getByLabelText("Bucket")).toBeInTheDocument();
  });

  it("honours an explicit htmlFor", () => {
    renderInTheme(
      <Field label="Region" htmlFor="region-input">
        <TextField.Root id="region-input" name="region" />
      </Field>
    );

    expect(screen.getByLabelText("Region")).toHaveAttribute("id", "region-input");
  });

  it("describes the control with its help text", () => {
    renderInTheme(
      <Field label="Bucket" help="Name of the S3 bucket.">
        {(props) => <TextField.Root {...props} name="bucket" />}
      </Field>
    );

    const input = screen.getByLabelText("Bucket");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).not.toEqual("");
    expect(document.getElementById(describedBy.split(" ")[0])).toHaveTextContent(
      "Name of the S3 bucket."
    );
  });

  it("marks the control invalid and points at the error", () => {
    renderInTheme(
      <Field label="Bucket" help="Name of the S3 bucket." errors={["Bucket is required"]}>
        {(props) => <TextField.Root {...props} name="bucket" />}
      </Field>
    );

    const input = screen.getByLabelText("Bucket");
    expect(input).toHaveAttribute("aria-invalid", "true");

    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    const described = ids.map((id) => document.getElementById(id)?.textContent).join(" ");
    expect(described).toContain("Name of the S3 bucket.");
    expect(described).toContain("Bucket is required");
  });

  it("describes the control with every error, not just the first", () => {
    // zod's flatten() returns an array per field because several checks can
    // fail at once; tagging only the first error dropped the rest silently.
    renderInTheme(
      <Field label="Bucket" errors={["Bucket is required", "Must be lowercase"]}>
        {(props) => <TextField.Root {...props} name="bucket" />}
      </Field>
    );

    const input = screen.getByLabelText("Bucket");
    const described = (input.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ");

    expect(described).toContain("Bucket is required");
    expect(described).toContain("Must be lowercase");
  });

  it("leaves the control valid when there are no errors", () => {
    renderInTheme(
      <Field label="Bucket">
        {(props) => <TextField.Root {...props} name="bucket" />}
      </Field>
    );

    expect(screen.getByLabelText("Bucket")).not.toHaveAttribute("aria-invalid");
  });

  it("names a group instead of pointing a label at nothing", () => {
    // A set of controls has no single element to own the id. The plain-children
    // path used to emit <label htmlFor> against an id that existed nowhere,
    // which is how ~20 DataConnectionForm fields shipped unwired.
    renderInTheme(
      <Field label="Allowed visibilities" help="Which visibilities may be used." group>
        <TextField.Root name="a" />
      </Field>
    );

    const group = screen.getByRole("group");
    expect(group).toHaveAccessibleName("Allowed visibilities");
    expect(document.querySelector("label[for]")).toBeNull();
  });

  it("hands a group's render-prop child an aria-labelledby to name itself", () => {
    // RadioCards.Root is a div[role=radiogroup] and a custom component never
    // receives the id — neither can be named by htmlFor, so Field passes the
    // label's id through for the control to point at.
    renderInTheme(
      <Field label="Visibility" group>
        {(props) => (
          <div role="radiogroup" {...props}>
            <span>Public</span>
          </div>
        )}
      </Field>
    );

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Visibility");
  });

  it("omits aria-labelledby when the field is not a group", () => {
    renderInTheme(
      <Field label="Bucket">
        {(props) => <TextField.Root {...props} name="bucket" />}
      </Field>
    );

    expect(screen.getByLabelText("Bucket")).not.toHaveAttribute(
      "aria-labelledby"
    );
  });

  it("renders a counter against the enforced maximum", () => {
    renderInTheme(
      <Field label="Bio" counter={{ value: 74, max: 1024 }}>
        {(props) => <TextField.Root {...props} name="bio" />}
      </Field>
    );

    expect(screen.getByText("74 / 1024")).toBeInTheDocument();
  });
});
