import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { rootDir } from "./config.js";
import { checkFleet } from "./checker.js";
import { buildDashboard } from "./dashboard.js";
import { notifyCheck } from "./notify.js";
import { createProvider } from "./providers/index.js";
import { forgetVehicle, loadState, syncVehicleRecord } from "./store.js";
import { addVehicle, deleteVehicle, FleetError, saveVehicles, updateVehicle } from "./vehicles-file.js";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const publicDir = join(rootDir, "public");

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("Слишком большой запрос"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function authorize(request, config) {
  if (!config.apiToken) return true;
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === config.apiToken;
}

function vehicleIdFromPath(pathname) {
  const rest = pathname.slice("/api/vehicles/".length);
  if (!rest) return "";
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

function sendError(response, error) {
  if (error instanceof SyntaxError) {
    sendJson(response, 400, { error: "Некорректный JSON" });
    return;
  }
  if (error instanceof FleetError) {
    sendJson(response, error.status, { error: error.message });
    return;
  }
  if (error.status && error.status < 500) {
    sendJson(response, error.status, { error: error.message });
    return;
  }
  if (String(error.message || "").startsWith("Ошибки в списке")) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  console.error(error);
  sendJson(response, 500, { error: error.message || "Внутренняя ошибка сервера" });
}

async function serveStatic(pathname, response) {
  const decoded = decodeURIComponent(pathname);
  const requested = decoded === "/" ? "index.html" : decoded.slice(1);
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
        "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; font-src 'self'",
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

export function createApp(context) {
  const { config, loadFleet, getNextCheck, setNextCheck, fetchImpl } = context;
  let checking = null;
  let vehiclesCache = [];

  async function refreshVehicles() {
    const loaded = await loadFleet();
    vehiclesCache = loaded.vehicles;
    return loaded;
  }

  async function runCheck({ ids } = {}) {
    if (checking) {
      const error = new Error("Проверка уже идёт");
      error.status = 409;
      throw error;
    }

    checking = (async () => {
      const { vehicles } = await refreshVehicles();
      const provider = createProvider(config, { fetchImpl });
      const result = await checkFleet({ vehicles, provider, config, ids });
      try {
        await notifyCheck(result, config, { fetchImpl, nextCheck: getNextCheck?.() });
      } catch (error) {
        result.notifyError = error.message;
      }
      return result;
    })().finally(() => {
      checking = null;
    });

    return checking;
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

      if (url.pathname.startsWith("/api/")) {
        if (!authorize(request, config)) {
          sendJson(response, 401, { error: "Нужен заголовок Authorization: Bearer …" });
          return;
        }

        if (request.method === "GET" && url.pathname === "/api/dashboard") {
          if (!vehiclesCache.length) await refreshVehicles();
          const state = await loadState(config.dataFile);
          sendJson(response, 200, buildDashboard({
            vehicles: vehiclesCache,
            state,
            config,
            nextCheck: getNextCheck?.(),
            checking: Boolean(checking),
          }));
          return;
        }

        if (request.method === "GET" && url.pathname.startsWith("/api/vehicles/")) {
          const id = vehicleIdFromPath(url.pathname);
          if (!vehiclesCache.length) await refreshVehicles();
          const vehicle = vehiclesCache.find((item) => item.id === id);
          if (!vehicle) {
            sendJson(response, 404, { error: "Автомобиль не найден" });
            return;
          }
          const state = await loadState(config.dataFile);
          sendJson(response, 200, {
            ...vehicle,
            snapshot: state.vehicles[vehicle.id] || null,
          });
          return;
        }

        if (request.method === "GET" && url.pathname === "/api/vehicles") {
          const loaded = await refreshVehicles();
          sendJson(response, 200, {
            vehicles: loaded.vehicles,
            warnings: loaded.warnings,
          });
          return;
        }

        if (request.method === "PUT" && url.pathname === "/api/vehicles") {
          const payload = JSON.parse((await readBody(request)) || "[]");
          const list = Array.isArray(payload) ? payload : payload.vehicles;
          const saved = await saveVehicles(config.vehiclesFile, list);
          vehiclesCache = saved.vehicles;
          sendJson(response, 200, saved);
          return;
        }

        if (request.method === "POST" && url.pathname === "/api/vehicles") {
          const payload = JSON.parse((await readBody(request)) || "{}");
          const loaded = await refreshVehicles();
          const saved = await addVehicle(config.vehiclesFile, loaded.vehicles, payload);
          vehiclesCache = saved.vehicles;
          sendJson(response, 201, saved);
          return;
        }

        if (request.method === "PATCH" && url.pathname.startsWith("/api/vehicles/")) {
          const id = vehicleIdFromPath(url.pathname);
          const payload = JSON.parse((await readBody(request)) || "{}");
          const loaded = await refreshVehicles();
          if (!id) {
            sendJson(response, 404, { error: "Автомобиль не найден" });
            return;
          }
          const saved = await updateVehicle(config.vehiclesFile, loaded.vehicles, id, payload);
          vehiclesCache = saved.vehicles;
          await syncVehicleRecord(config.dataFile, { fromId: saved.previousId, vehicle: saved.vehicle });
          sendJson(response, 200, saved);
          return;
        }

        if (request.method === "DELETE" && url.pathname.startsWith("/api/vehicles/")) {
          const id = vehicleIdFromPath(url.pathname);
          if (!id) {
            sendJson(response, 404, { error: "Автомобиль не найден" });
            return;
          }
          const loaded = await refreshVehicles();
          const saved = await deleteVehicle(config.vehiclesFile, loaded.vehicles, id);
          vehiclesCache = saved.vehicles;
          await forgetVehicle(config.dataFile, id);
          sendJson(response, 200, saved);
          return;
        }

        if (request.method === "POST" && url.pathname === "/api/check") {
          const raw = await readBody(request);
          const payload = raw ? JSON.parse(raw) : {};
          const ids = Array.isArray(payload.ids)
            ? payload.ids.map(String)
            : payload.id
              ? [String(payload.id)]
              : undefined;
          const result = await runCheck({ ids });
          sendJson(response, 200, {
            ok: true,
            appeared: result.appeared.length,
            paid: result.paid.length,
            settled: result.settled.length,
            errors: result.errors.length,
            vehiclesChecked: result.entry.vehiclesChecked,
            summary: result.summary,
            notifyError: result.notifyError || null,
          });
          return;
        }

        const vehicleCheck = /^\/api\/vehicles\/(.+)\/check$/.exec(url.pathname);
        if (request.method === "POST" && vehicleCheck) {
          const id = decodeURIComponent(vehicleCheck[1]);
          const result = await runCheck({ ids: [id] });
          sendJson(response, 200, {
            ok: true,
            appeared: result.appeared.length,
            paid: result.paid.length,
            settled: result.settled.length,
            errors: result.errors.length,
            vehiclesChecked: result.entry.vehiclesChecked,
            summary: result.summary,
            notifyError: result.notifyError || null,
          });
          return;
        }

        sendJson(response, 404, { error: "Маршрут не найден" });
        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, { error: "Метод не поддерживается" });
        return;
      }

      await serveStatic(url.pathname, response);
    } catch (error) {
      sendError(response, error);
    }
  });

  return { server, runCheck, refreshVehicles, get checking() { return checking; } };
}
