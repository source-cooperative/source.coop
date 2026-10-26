import { PROBLEMS, ProblemCode, problemType } from "./problems";

/**
 * The pages a problem's `type` URL resolves to, rendered from the same table
 * the handler answers with. Plain HTML, like `/api/docs`: they are reference
 * pages for developers, not part of the app.
 */

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Our prose marks code with backticks, as Markdown does. */
const prose = (text: string) => escape(text).replace(/`([^`]+)`/g, "<code>$1</code>");

const page = (title: string, body: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)} · Source Cooperative API</title>
    <style>
      :root { color-scheme: light dark; }
      body { font: 16px/1.6 system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; }
      code { font: 0.9em ui-monospace, monospace; }
      dt { margin-top: 1.25rem; font-weight: 600; }
      dd { margin: 0.25rem 0 0; }
      .status { color: GrayText; font-weight: 400; }
    </style>
  </head>
  <body>
${body}
    <p><a href="/api/problems">All problem types</a> · <a href="https://api.docs.source.coop">API reference</a></p>
  </body>
</html>`;

export const isProblemCode = (code: string): code is ProblemCode =>
  Object.prototype.hasOwnProperty.call(PROBLEMS, code);

export function problemPage(code: ProblemCode, origin: string) {
  const { status, title, description, remedy } = PROBLEMS[code];
  return page(
    title,
    `    <h1>${escape(title)} <span class="status">${status}</span></h1>
    <p><code>${escape(new URL(problemType(code), origin).href)}</code></p>
    <h2>When the API answers it</h2>
    <p>${prose(description)}</p>
    <h2>What to do</h2>
    <p>${prose(remedy)}</p>`
  );
}

export function problemIndexPage() {
  const items = (Object.keys(PROBLEMS) as ProblemCode[])
    .map((code) => {
      const { status, title, description } = PROBLEMS[code];
      return `      <dt><a href="/api/problems/${code}">${escape(title)}</a> <span class="status">${status} · <code>${code}</code></span></dt>
      <dd>${prose(description)}</dd>`;
    })
    .join("\n");
  return page(
    "Problem types",
    `    <h1>Problem types</h1>
    <p>Every error from the Source Cooperative API is an <a href="https://www.rfc-editor.org/rfc/rfc9457">RFC 9457</a> problem, served as <code>application/problem+json</code>. Its <code>type</code> is one of the URLs below, and <code>code</code> is that URL's last segment.</p>
    <dl>
${items}
    </dl>`
  );
}

export const htmlResponse = (html: string) =>
  new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
