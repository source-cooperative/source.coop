// The reference renders this deploy's own /api/openapi, so a branch preview
// documents exactly that branch's endpoints.
const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Source Cooperative API</title>
  </head>
  <body style="margin: 0">
    <redoc spec-url="/api/openapi"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.5.4/bundles/redoc.standalone.js"></script>
  </body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
