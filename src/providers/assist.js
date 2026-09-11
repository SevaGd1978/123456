import { toGibddSts } from "../vehicles.js";
import { fetchJson } from "./fetch-json.js";

export const ASSIST_DOCS = "https://api-assist.com/api/fines";
export const ASSIST_DEFAULT_URL = "https://service.api-assist.com/parser/fines_api/fines";

function abort(message, { retryable = true } = {}) {
  const error = new Error(message);
  error.retryable = retryable;
  return error;
}

/**
 * Бесплатный тариф API Assist: 200 запросов в месяц.
 * Документация: https://api-assist.com/documentation/fines-api.txt
 * Запрос: GET .../fines?key=&sts=
 */
export function createAssistProvider({
  key,
  timeoutMs,
  fetchImpl = fetch,
  baseUrl = ASSIST_DEFAULT_URL,
} = {}) {
  if (!key) {
    throw abort(
      "Для API Assist задайте ASSIST_API_KEY. Бесплатный ключ (200 запросов/мес) — письмо на support@api-assist.com",
      { retryable: false },
    );
  }

  return {
    name: "assist",
    async checkVehicle(vehicle) {
      const endpoint = new URL(baseUrl);
      endpoint.searchParams.set("key", key);
      endpoint.searchParams.set("sts", toGibddSts(vehicle.sts));

      const { response, payload } = await fetchJson(endpoint.href, { timeoutMs, fetchImpl });

      if (response.status === 403 || payload.error_code) {
        throw abort(payload.error || `API Assist ответил ${response.status}`, { retryable: false });
      }
      if (response.status === 400) {
        throw abort(payload.error || "Некорректный запрос к API Assist", { retryable: false });
      }
      if (!response.ok) {
        throw abort(`API Assist ответил ${response.status}`);
      }
      if (payload.success === 0) {
        throw abort("ГИБДД временно не отдал данные, повторю в следующей попытке");
      }
      if (payload.success !== 1 && payload.success !== undefined) {
        throw abort(payload.error || "Некорректный ответ API Assist");
      }

      return Array.isArray(payload.fines) ? payload.fines : [];
    },
  };
}
