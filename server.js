import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT) || 3000;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

export function normalizePlate(value = "") {
  return value
    .toUpperCase()
    .replace(/[АВЕКМНОРСТУХ]/g, (letter) => ({
      А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H",
      О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X",
    })[letter])
    .replace(/[^A-Z0-9]/g, "");
}

async function searchPublicRecords(query) {
  const records = JSON.parse(
    await readFile(join(root, "data", "public-records.json"), "utf8"),
  );
  const needle = normalizePlate(query);
  return records.filter((record) => normalizePlate(record.plate) === needle);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": mimeTypes[".json"],
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function serveStatic(pathname, response) {
  const decodedPath = decodeURIComponent(pathname);
  const requested = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = normalize(join(publicDir, requested));

  if (filePath !== publicDir && !filePath.startsWith(`${publicDir}/`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const contents = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; connect-src 'self' https://vpic.nhtsa.dot.gov; style-src 'self'; script-src 'self'; img-src 'self' data:",
    });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    throw error;
  }
}

export function createApp() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

      if (request.method === "GET" && url.pathname === "/api/search") {
        const plate = url.searchParams.get("plate") || "";
        if (normalizePlate(plate).length < 6) {
          sendJson(response, 400, { error: "Введите корректный госномер" });
          return;
        }
        const results = await searchPublicRecords(plate);
        sendJson(response, 200, { results, sourceUpdated: "2026-09-01" });
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { error: "Метод не поддерживается" });
        return;
      }

      await serveStatic(url.pathname, response);
    } catch (error) {
      console.error(error);
      sendJson(response, 500, { error: "Внутренняя ошибка сервера" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createApp().listen(port, () => {
    console.log(`АвтоСлед запущен: http://localhost:${port}`);
  });
}
