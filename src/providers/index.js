import { createAssistProvider } from "./assist.js";
import { createCloudProvider } from "./cloud.js";
import { createDemoProvider } from "./demo.js";
import { createHttpProvider } from "./http.js";

export const PROVIDER_INFO = {
  demo: {
    id: "demo",
    label: "Учебные данные",
    live: false,
    quota: null,
    docs: null,
    keyHint: null,
  },
  assist: {
    id: "assist",
    label: "API Assist",
    live: true,
    quota: "200 запросов/мес бесплатно",
    docs: "https://api-assist.com/api/fines",
    keyHint: "ASSIST_API_KEY",
  },
  cloud: {
    id: "cloud",
    label: "API-CLOUD",
    live: true,
    quota: "по договору",
    docs: "https://api-cloud.ru/gibdd",
    keyHint: "CLOUD_API_TOKEN",
  },
  http: {
    id: "http",
    label: "Свой HTTP API",
    live: true,
    quota: null,
    docs: null,
    keyHint: "FINES_API_URL",
  },
};

export function describeProvider(config) {
  const info = PROVIDER_INFO[config.provider] || PROVIDER_INFO.demo;
  const hasKey =
    (config.provider === "assist" && Boolean(config.assist.key)) ||
    (config.provider === "cloud" && Boolean(config.cloud.token)) ||
    (config.provider === "http" && Boolean(config.api.url)) ||
    config.provider === "demo";

  return { ...info, hasKey, ready: hasKey };
}

export function createProvider(config, { fetchImpl, today } = {}) {
  switch (config.provider) {
    case "demo":
      return createDemoProvider({ today });
    case "assist":
      return createAssistProvider({
        key: config.assist.key,
        timeoutMs: config.requestTimeoutMs,
        fetchImpl,
        baseUrl: config.assist.url,
      });
    case "cloud":
      return createCloudProvider({
        token: config.cloud.token,
        timeoutMs: config.requestTimeoutMs,
        fetchImpl,
        baseUrl: config.cloud.url,
      });
    case "http":
      return createHttpProvider({
        url: config.api.url,
        token: config.api.token,
        timeoutMs: config.requestTimeoutMs,
        fetchImpl,
      });
    default:
      throw new Error(
        `Неизвестный провайдер «${config.provider}». Доступны: demo, assist, cloud, http.`,
      );
  }
}
