// jest resolves react@18.3.1, which has no useActionState (it arrives in 19,
// and the app only gets it through Next's bundled runtime). Without this shim
// DynamicForm cannot be rendered here at all — which is how two label-wiring
// bugs reached review: Field's own tests exercise Field, never the dispatch in
// renderControl that decides which control each field type gets.
// Add the one missing export to the real module rather than returning a copy:
// babel's interop enumerates own keys, so neither a spread nor a Proxy survives
// it — and a copy also loses `default`/`__esModule`.
jest.mock("react", () => {
  const actual = jest.requireActual("react");
  actual.useActionState ??= (_action: unknown, initial: unknown) => [
    initial,
    () => {},
    false,
  ];
  return actual;
});

import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { DynamicForm, type FormField, type FormState } from "../DynamicForm";

// jsdom has no ResizeObserver; Radix's Select, Switch and RadioCards all use it.
global.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

type Demo = Record<string, string>;

const noop = (): FormState<Demo> => ({
  fieldErrors: {},
  data: new FormData(),
  message: "",
  success: false,
});

const renderForm = (fields: FormField<Demo>[]) =>
  render(
    <Theme>
      <DynamicForm<Demo> fields={fields} action={noop} />
    </Theme>
  );

describe("DynamicForm label wiring", () => {
  it("labels a text field by pointing at its control", () => {
    renderForm([{ label: "Name", name: "name", type: "text" }]);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("labels a select by its trigger", () => {
    renderForm([
      {
        label: "Role",
        name: "role",
        type: "select",
        options: [{ value: "read", label: "Reader" }],
      },
    ]);

    expect(screen.getByLabelText("Role")).toBeInTheDocument();
  });

  it("names a radio-cards group rather than pointing a label at a div", () => {
    // RadioCards.Root renders div[role=radiogroup], which htmlFor cannot reach.
    renderForm([
      {
        label: "Visibility",
        name: "visibility",
        type: "radio-cards",
        controlled: true,
        value: "public",
        onValueChange: () => {},
        options: [
          { value: "public", label: "Public" },
          { value: "unlisted", label: "Unlisted" },
        ],
      },
    ]);

    expect(screen.getByRole("radiogroup")).toHaveAccessibleName("Visibility");
  });

  it("names a custom field's group — customComponent never receives the id", () => {
    renderForm([
      {
        label: "Websites",
        name: "websites",
        type: "custom",
        customComponent: <input name="websites" aria-label="Website URL" />,
      },
    ]);

    expect(screen.getByRole("group")).toHaveAccessibleName("Websites");
  });

  it("hands a custom field's function form the ids to wire up itself", () => {
    // The only way a description is genuinely announced with a custom control:
    // aria-describedby on a wrapper does not reach the control inside it.
    renderForm([
      {
        name: "flag",
        type: "custom",
        description: "Allows this account to create products.",
        customComponent: (controlProps) => (
          <label htmlFor="flag-box">
            <input {...controlProps} id="flag-box" type="checkbox" name="flag" />
            Create products
          </label>
        ),
      },
    ]);

    const box = screen.getByLabelText("Create products");
    const describedBy = box.getAttribute("aria-describedby") ?? "";
    expect(describedBy).not.toEqual("");
    expect(document.getElementById(describedBy.split(" ")[0])).toHaveTextContent(
      "Allows this account to create products."
    );
  });

  it("wraps an unlabelled custom field that still has a description", () => {
    // Previously the wrapper was gated on `label`, so a described-but-unlabelled
    // custom field dropped aria-describedby silently.
    renderForm([
      {
        name: "flag",
        type: "custom",
        description: "Allows this account to create products.",
        customComponent: <input name="flag" aria-label="Create products" />,
      },
    ]);

    expect(screen.getByRole("group")).toHaveAttribute("aria-describedby");
  });

  it("leaves an unlabelled custom field unwrapped", () => {
    renderForm([
      {
        name: "flags",
        type: "custom",
        customComponent: <input name="flags" aria-label="Admin" />,
      },
    ]);

    expect(screen.queryByRole("group")).toBeNull();
  });

  it("labels a switch by its button, which is labelable", () => {
    renderForm([
      {
        label: "Status",
        name: "disabled",
        type: "switch",
        controlled: true,
        value: "false",
        onValueChange: () => {},
      },
    ]);

    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("marks a dangerWhenOff switch red only while it is off", () => {
    const danger = {
      type: "switch" as const,
      invert: true,
      dangerWhenOff: true,
      controlled: true as const,
      onValueChange: () => {},
    };

    renderForm([
      { ...danger, label: "Deactivated product", name: "off", value: "true" },
      { ...danger, label: "Active product", name: "on", value: "false" },
    ]);

    expect(screen.getByLabelText("Deactivated product")).toHaveClass(
      "switch-danger"
    );
    expect(screen.getByLabelText("Active product")).not.toHaveClass(
      "switch-danger"
    );
  });

  it("leaves no label pointing at an id that does not exist", () => {
    // The defect this whole refactor exists to prevent, asserted across every
    // field type at once.
    renderForm([
      { label: "Name", name: "name", type: "text" },
      { label: "Bio", name: "bio", type: "textarea" },
      {
        label: "Role",
        name: "role",
        type: "select",
        options: [{ value: "read", label: "Reader" }],
      },
      {
        label: "Visibility",
        name: "visibility",
        type: "radio-cards",
        controlled: true,
        value: "public",
        onValueChange: () => {},
        options: [{ value: "public", label: "Public" }],
      },
      {
        label: "Status",
        name: "st",
        type: "switch",
        controlled: true,
        value: "false",
        onValueChange: () => {},
      },
      {
        label: "Websites",
        name: "websites",
        type: "custom",
        customComponent: <input name="websites" aria-label="Website URL" />,
      },
    ]);

    // htmlFor only associates with *labelable* elements. Pointing it at a div
    // — RadioCards.Root is div[role=radiogroup] — resolves to a node but names
    // nothing, so checking the id merely exists is not enough.
    const LABELABLE = ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "METER", "OUTPUT", "PROGRESS"];

    const broken = Array.from(
      document.querySelectorAll<HTMLLabelElement>("label[for]")
    )
      .map((label) => ({
        text: label.textContent,
        target: document.getElementById(label.htmlFor),
      }))
      .filter(({ target }) => !target || !LABELABLE.includes(target.tagName));

    expect(
      broken.map((b) => `${b.text} -> ${b.target?.tagName ?? "MISSING"}`)
    ).toEqual([]);
  });
});
