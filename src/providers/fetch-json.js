export async function fetchJson(url, { timeoutMs, headers = {}, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("Провайдер штрафов вернул не JSON");
      }
    }
    return { response, payload };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Таймаут запроса к API штрафов");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
