// The published reference is api.docs.source.coop, which renders production's
// /api/openapi. This page renders the deploy's own, so a branch preview — whose
// Vercel login a cross-origin page can't pass — documents that branch's
// endpoints for review. It uses Swagger UI rather than Redoc so a reviewer can
// call them too: the document's server is the relative /api/v1, so "Try it out"
// reaches the deploy serving the page.
const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Source Cooperative API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0/swagger-ui.css" />
  </head>
  <body style="margin: 0">
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({ url: "/api/openapi", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
