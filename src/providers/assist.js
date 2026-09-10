import { toGibddSts } from "../vehicles.js";
import { fetchJson } from "./fetch-json.js";

export const ASSIST_DOCS = "https://api-assist.com/api/fines";
export const ASSIST_DEFAULT_URL = "https://service.api-assist.com/parser/fines_api/fines";

/**
 * Бесплатный тариф API Assist: 200 запросов в месяц.
 * Документация: https://api-assist.com/documentation/fines-api.txt
 * Ключ выдают по письму на support@api-assist.com
 */
export function createAssistProvider({
  key,
  timeoutMs,
  fetchImpl = fetch,
  baseUrl = ASSIST_DEFAULT_URL,
} = {}) {
  if (!key) {
    throw new Error(
      "Для API Assist задайте ASSIST_API_KEY. Бесплатный ключ (200 запросов/мес) — письмо на support@api-assist.com",
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
        throw new Error(payload.error || `API Assist ответил ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`API Assist ответил ${response.status}`);
      }
      if (payload.success === 0) {
        throw new Error("ГИБДД временно не отдал данные, повторю в следующей попытке");
      }
      if (payload.success !== 1 && payload.success !== undefined) {
        throw new Error(payload.error || "Некорректный ответ API Assist");
      }

      return Array.isArray(payload.fines) ? payload.fines : [];
    },
  };
}
