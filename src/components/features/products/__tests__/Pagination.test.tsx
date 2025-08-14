import { render, screen } from "@testing-library/react";
import { Pagination } from "../Pagination";

describe("Pagination", () => {
  const defaultProps = {
    hasNextPage: true,
    hasPreviousPage: false,
    nextCursor: "next-cursor",
    previousCursor: undefined,
    currentCursor: undefined,
  };

  it("renders pagination controls", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("Previous")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("disables buttons appropriately", () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });

  it("handles previous cursor correctly", () => {
    const propsWithPrevious = {
      ...defaultProps,
      hasPreviousPage: true,
      previousCursor: "prev-cursor",
    };

    render(<Pagination {...propsWithPrevious} />);
    expect(screen.getByText("Previous")).not.toBeDisabled();

    const previousLink = screen.getByText("Previous").closest("a");
    expect(previousLink).toHaveAttribute("href", "/?cursor=prev-cursor");
  });

  it("handles going back to first page when no previous cursor", () => {
    const propsWithNoPrevious = {
      ...defaultProps,
      hasPreviousPage: true,
      previousCursor: undefined,
    };

    render(<Pagination {...propsWithNoPrevious} />);
    expect(screen.getByText("Previous")).not.toBeDisabled();

    const previousLink = screen.getByText("Previous").closest("a");
    expect(previousLink).toHaveAttribute("href", "/");
  });

  it("handles current cursor for next navigation", () => {
    const propsWithCurrent = {
      ...defaultProps,
      currentCursor: "current-cursor",
    };

    render(<Pagination {...propsWithCurrent} />);
    expect(screen.getByText("Next")).not.toBeDisabled();

    const nextLink = screen.getByText("Next").closest("a");
    expect(nextLink).toHaveAttribute(
      "href",
      "/?cursor=next-cursor&previous=current-cursor"
    );
  });

  it("handles next navigation without current cursor (first page)", () => {
    render(<Pagination {...defaultProps} />);

    const nextLink = screen.getByText("Next").closest("a");
    expect(nextLink).toHaveAttribute("href", "/?cursor=next-cursor");
  });

  it("uses # for disabled navigation", () => {
    const propsDisabled = {
      hasNextPage: false,
      hasPreviousPage: false,
    };

    render(<Pagination {...propsDisabled} />);
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  it("does not render when no pagination needed", () => {
    const { container } = render(
      <Pagination hasNextPage={false} hasPreviousPage={false} />
    );
    expect(container.firstChild).toBeNull();
  });
});
