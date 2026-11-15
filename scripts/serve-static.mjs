import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("apps/web/out");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
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
      res.end(await readFile(target));
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(4173, "127.0.0.1");
