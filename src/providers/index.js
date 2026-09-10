import { createDemoProvider } from "./demo.js";
import { createHttpProvider } from "./http.js";

export function createProvider(config, { fetchImpl, today } = {}) {
  switch (config.provider) {
    case "demo":
      return createDemoProvider({ today });
    case "http":
      return createHttpProvider({
        url: config.api.url,
        token: config.api.token,
        timeoutMs: config.requestTimeoutMs,
        fetchImpl,
      });
    default:
      throw new Error(
        `Неизвестный провайдер «${config.provider}». Доступны: demo, http.`,
      );
  }
}
