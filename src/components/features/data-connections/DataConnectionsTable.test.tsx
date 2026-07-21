import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { DataConnectionsTable } from "./DataConnectionsTable";
import { Account, DataConnection, DataProvider } from "@/types";

const conn = (over: Partial<DataConnection>): DataConnection =>
  ({
    data_connection_id: "conn-1",
    name: "Conn 1",
    details: { provider: DataProvider.S3, region: "us-east-1" },
    read_only: false,
    allowed_visibilities: [],
    ...over,
  }) as DataConnection;

const acme = { account_id: "acme", name: "Acme Corp" } as Account;

const renderWithTheme = (ui: React.ReactElement) =>
  render(<Theme>{ui}</Theme>);

describe("DataConnectionsTable owner column", () => {
  it("hides the Owner column when ownerAccounts is omitted", () => {
    renderWithTheme(
      <DataConnectionsTable
        connections={[conn({ owner: "acme" })]}
        editHref={(id) => `/edit/${id}`}
      />
    );

    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });

  it("labels unowned connections as System", () => {
    renderWithTheme(
      <DataConnectionsTable
        connections={[conn({ data_connection_id: "sys", owner: undefined })]}
        editHref={(id) => `/edit/${id}`}
        ownerAccounts={{}}
      />
    );

    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("shows the owning account's name when resolvable", () => {
    renderWithTheme(
      <DataConnectionsTable
        connections={[conn({ owner: "acme" })]}
        editHref={(id) => `/edit/${id}`}
        ownerAccounts={{ acme }}
      />
    );

    const link = screen.getByText("Acme Corp");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/acme");
  });

  it("falls back to the raw owner id for unresolvable accounts", () => {
    renderWithTheme(
      <DataConnectionsTable
        connections={[conn({ owner: "ghost" })]}
        editHref={(id) => `/edit/${id}`}
        ownerAccounts={{}}
      />
    );

    expect(screen.getByText("ghost")).toBeInTheDocument();
  });
});
