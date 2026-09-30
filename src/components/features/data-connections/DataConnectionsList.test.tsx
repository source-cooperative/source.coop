import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { DataConnectionsList } from "./DataConnectionsList";
import { Account, DataConnection, DataProvider } from "@/types";

const conn = (over: Partial<DataConnection>): DataConnection =>
  ({
    data_connection_id: "conn-1",
    name: "Conn 1",
    details: {
      provider: DataProvider.S3,
      bucket: "rainfall-archive",
      region: "us-east-1",
    },
    read_only: false,
    allowed_visibilities: [],
    ...over,
  }) as DataConnection;

const acme = { account_id: "acme", name: "Acme Corp" } as Account;

const renderWithTheme = (ui: React.ReactElement) =>
  render(<Theme>{ui}</Theme>);

describe("DataConnectionsList owner", () => {
  it("says nothing about the owner outside the admin view", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[conn({ owner: "acme" })]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    // In an account's own list every connection has the same owner, so saying
    // so on every row would be noise.
    expect(screen.queryByText(/system/)).not.toBeInTheDocument();
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("labels unowned connections as system", () => {
    const { container } = renderWithTheme(
      <DataConnectionsList
        connections={[conn({ data_connection_id: "sys", owner: undefined })]}
        editHref={(id) => `/edit/${id}`}
        ownerAccounts={{}}
      />
    );

    // Quiet text on the identifier line, not a chip, so it is matched
    // against the row rather than as a standalone element -- and it comes
    // last, after backend, bucket and region.
    expect(container).toHaveTextContent(
      "s3 · rainfall-archive · us-east-1 · system"
    );
  });

  it("shows the owning account's name when resolvable", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[conn({ owner: "acme" })]}
        editHref={(id) => `/edit/${id}`}
        ownerAccounts={{ acme }}
      />
    );

    // By role, not by text: the name sits inside the link rather than being
    // the link's only child, so matching text alone would return the span.
    const link = screen.getByRole("link", { name: "Acme Corp" });
    expect(link).toHaveAttribute("href", "/acme");
  });

  it("falls back to the raw owner id for unresolvable accounts", () => {
    const { container } = renderWithTheme(
      <DataConnectionsList
        connections={[conn({ owner: "ghost" })]}
        editHref={(id) => `/edit/${id}`}
        ownerAccounts={{}}
      />
    );

    expect(container).toHaveTextContent("ghost");
  });
});

describe("DataConnectionsList read-only and storage", () => {
  it("marks a read-only connection on its row", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[conn({ read_only: true })]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    expect(screen.getByText("Read only")).toBeInTheDocument();
  });

  it("says nothing at all about a writable connection", () => {
    // Read-only is a deliberate configuration, not a fault. It used to render
    // as a red "Yes", and every writable row carried a green "No" announcing
    // that nothing had happened.
    renderWithTheme(
      <DataConnectionsList
        connections={[conn({ read_only: false })]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    expect(screen.queryByText("Read only")).not.toBeInTheDocument();
    expect(screen.queryByText("No")).not.toBeInTheDocument();
    expect(screen.queryByText("Yes")).not.toBeInTheDocument();
  });

  it("reads backend, then bucket, then region", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[conn({})]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    // Order matters: it answers "which backend, which bucket, which region" in
    // the order you would ask it.
    expect(
      screen.getByText("s3 · rainfall-archive · us-east-1")
    ).toBeInTheDocument();
  });

  it("leaves the connection id off the line the name already implies", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[conn({ data_connection_id: "conn-1" })]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    // The id is slugified from the name shown directly above, so printing it
    // spent a column restating the row.
    expect(screen.queryByText(/conn-1/)).not.toBeInTheDocument();
  });

  it("names an Azure container by its storage account too", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[
          conn({
            details: {
              provider: DataProvider.Azure,
              account_name: "opendatastore",
              container_name: "rainfall",
              region: "westeurope",
            } as DataConnection["details"],
          }),
        ]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    // A container name alone does not address anything on Azure.
    expect(
      screen.getByText("azure · opendatastore/rainfall · westeurope")
    ).toBeInTheDocument();
  });

  it("omits the region for a keyless provider that has none", () => {
    renderWithTheme(
      <DataConnectionsList
        connections={[
          conn({
            details: {
              provider: DataProvider.GCS,
              bucket: "rainfall-archive",
            } as DataConnection["details"],
          }),
        ]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    // Keyless, so there is no region to append after the bucket.
    expect(
      screen.getByText("gcs · rainfall-archive")
    ).toBeInTheDocument();
  });
});
