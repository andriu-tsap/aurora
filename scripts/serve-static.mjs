import http from "node:http";
import { gzipSync } from "node:zlib";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.env.STATIC_ROOT || "apps/web/out");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (!pathname.startsWith("/aurora/")) {
        res.writeHead(404).end();
        return;
      }
      let target = path.resolve(root, "." + pathname.slice("/aurora".length));
      if (!target.startsWith(root + path.sep) && target !== root) {
        res.writeHead(403).end();
        return;
      }
      if ((await stat(target)).isDirectory())
        target = path.join(target, "index.html");
      res.setHeader(
        "Content-Type",
        mime[path.extname(target)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "public, max-age=3600");
      const body = await readFile(target);
      if (req.headers["accept-encoding"]?.includes("gzip")) {
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        res.end(gzipSync(body));
      } else res.end(body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1");
