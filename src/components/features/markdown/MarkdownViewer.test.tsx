import { render } from "@testing-library/react";
import { MarkdownViewer } from "./MarkdownViewer";

describe("MarkdownViewer", () => {
  it("namespaces heading ids and the in-document links that point at them", () => {
    const { container } = render(
      <MarkdownViewer
        content={"## Contents\n\n[jump](#contents) [top](#) [out](https://x.test/#a)"}
      />,
    );
    expect(container.querySelector("h1")?.id).toBe("user-content-contents");
    const hrefs = [...container.querySelectorAll("p a")].map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(["#user-content-contents", "#", "https://x.test/#a"]);
  });
});
