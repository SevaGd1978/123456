async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Провайдер штрафов вернул не JSON");
  }
}

/**
 * Адаптер к вашему легальному API (ГИС ГМП, коммерческий агрегатор
 * с договором, внутренняя шина компании). Контракт:
 * GET {url}?plate=&sts=  →  { fines: [...] } или [...]
 */
export function createHttpProvider({ url, token, timeoutMs, fetchImpl = fetch }) {
  if (!url) {
    throw new Error("Для провайдера http задайте FINES_API_URL");
  }

  return {
    name: "http",
    async checkVehicle(vehicle) {
      const endpoint = new URL(url);
      endpoint.searchParams.set("plate", vehicle.plate);
      endpoint.searchParams.set("sts", vehicle.sts);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const headers = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetchImpl(endpoint.href, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API штрафов ответил ${response.status}`);
        }

        const payload = await readJson(response);
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.fines)) return payload.fines;
        if (Array.isArray(payload.data)) return payload.data;
        return [];
      } catch (error) {
        if (error.name === "AbortError") {
          throw new Error(`Таймаут запроса штрафов для ${vehicle.displayPlate}`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
