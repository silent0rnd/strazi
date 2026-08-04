import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4174);
const root = process.cwd();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
    const requestedPath = pathname === "/" ? "/index.html" : pathname;
    const filePath = resolve(root, `.${requestedPath}`);

    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");

    const contentType = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
    const range = request.headers.range;

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        response.writeHead(416, { "Content-Range": `bytes */${fileStat.size}` });
        response.end();
        return;
      }

      const [, startValue, endValue] = match;
      let start;
      let end;

      if (!startValue && endValue) {
        const suffixLength = Number(endValue);
        start = Math.max(fileStat.size - suffixLength, 0);
        end = fileStat.size - 1;
      } else {
        start = Number(startValue || 0);
        end = endValue ? Number(endValue) : fileStat.size - 1;
      }

      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= fileStat.size) {
        response.writeHead(416, { "Content-Range": `bytes */${fileStat.size}` });
        response.end();
        return;
      }

      end = Math.min(end, fileStat.size - 1);
      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Length": end - start + 1,
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        "Content-Type": contentType,
      });

      if (request.method === "HEAD") {
        response.end();
      } else {
        createReadStream(filePath, { start, end }).pipe(response);
      }
      return;
    }

    response.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Length": fileStat.size,
      "Content-Type": contentType,
    });

    if (request.method === "HEAD") {
      response.end();
    } else {
      createReadStream(filePath).pipe(response);
    }
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Lady Brill preview: http://${host}:${port}`);
});
