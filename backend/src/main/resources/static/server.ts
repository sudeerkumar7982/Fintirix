import { join, extname, dirname, fromFileUrl } from "https://deno.land/std@0.224.0/path/mod.ts";

const PORT = 3000;
const PUBLIC_DIR = dirname(fromFileUrl(import.meta.url));

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  if (method === "GET") {
    let safePath = pathname;
    if (safePath === "/") {
      safePath = "/index.html";
    }

    const localPath = join(PUBLIC_DIR, safePath);

    try {
      const fileInfo = await Deno.stat(localPath);
      if (fileInfo.isFile) {
        const fileContent = await Deno.readFile(localPath);
        const ext = extname(localPath);
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        return new Response(fileContent, {
          headers: {
            "Content-Type": contentType
          }
        });
      }
    } catch {
      try {
        const indexContent = await Deno.readFile(join(PUBLIC_DIR, "index.html"));
        return new Response(indexContent, {
          headers: {
            "Content-Type": "text/html"
          }
        });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}

console.log(`Fintirix Frontend Server running on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handler);
