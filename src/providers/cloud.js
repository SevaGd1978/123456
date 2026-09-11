import { toGibddPlate, toGibddSts } from "../vehicles.js";
import { fetchJson } from "./fetch-json.js";

export const CLOUD_DOCS = "https://api-cloud.ru/gibdd";
export const CLOUD_DEFAULT_URL = "https://api-cloud.ru/api/gibdd.php";

/**
 * API-CLOUD: проверка штрафов ГИБДД по госномеру и СТС.
 * Бесплатного самообслуживания нет, ключ — после заявки на support@api-cloud.ru
 */
export function createCloudProvider({
  token,
  timeoutMs,
  fetchImpl = fetch,
  baseUrl = CLOUD_DEFAULT_URL,
} = {}) {
  if (!token) {
    throw new Error("Для API-CLOUD задайте CLOUD_API_TOKEN");
  }

  return {
    name: "cloud",
    async checkVehicle(vehicle) {
      const endpoint = new URL(baseUrl);
      endpoint.searchParams.set("type", "fines");
      endpoint.searchParams.set("regNumber", toGibddPlate(vehicle.plate));
      endpoint.searchParams.set("stsNumber", toGibddSts(vehicle.sts));
      endpoint.searchParams.set("token", token);

      const { response, payload } = await fetchJson(endpoint.href, {
        timeoutMs,
        fetchImpl,
        headers: { Token: token },
      });

      if (!response.ok) {
        throw new Error(payload.message || payload.error || `API-CLOUD ответил ${response.status}`);
      }
      if (payload.status === 404) {
        return [];
      }
      if (payload.status && payload.status !== 200) {
        throw new Error(payload.message || `API-CLOUD статус ${payload.status}`);
      }
      return Array.isArray(payload.rez) ? payload.rez : [];
    },
  };
}
