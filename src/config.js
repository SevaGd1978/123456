import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const resolvePath = (value) => (isAbsolute(value) ? value : join(rootDir, value));

function readNumber(raw, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function readBoolean(raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "да"].includes(String(raw).toLowerCase());
}

export function parseCheckTime(raw, fallback = "20:00") {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(raw ?? "").trim());
  if (!match) {
    if (raw) throw new Error(`Некорректное время проверки: ${raw}. Ожидается формат ЧЧ:ММ`);
    return parseCheckTime(fallback);
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/**
 * Скидка на штрафы ГИБДД: с 1 января 2025 года — 25 % в течение 30 дней
 * с даты вынесения постановления (ст. 32.2 КоАП РФ).
 */
export const DISCOUNT_DEFAULTS = { percent: 25, days: 30 };

export function loadConfig(env = process.env) {
  const checkTime = parseCheckTime(env.CHECK_TIME, "20:00");

  return {
    port: readNumber(env.PORT, 3000, { min: 1, max: 65535 }),
    host: env.HOST || "0.0.0.0",
    timezone: env.TIMEZONE || "Europe/Moscow",
    checkTime,
    checkOnStart: readBoolean(env.CHECK_ON_START, false),
    provider: env.FINES_PROVIDER || "demo",
    concurrency: readNumber(env.CHECK_CONCURRENCY, 2, { min: 1, max: 10 }),
    requestDelayMs: readNumber(env.REQUEST_DELAY_MS, 1500, { min: 0, max: 60_000 }),
    requestTimeoutMs: readNumber(env.REQUEST_TIMEOUT_MS, 20_000, { min: 1000, max: 120_000 }),
    retryAttempts: readNumber(env.RETRY_ATTEMPTS, 3, { min: 1, max: 10 }),
    vehiclesFile: resolvePath(env.VEHICLES_FILE || "config/vehicles.json"),
    dataFile: resolvePath(env.DATA_FILE || "data/state.json"),
    historyLimit: readNumber(env.HISTORY_LIMIT, 60, { min: 1, max: 1000 }),
    apiToken: env.API_TOKEN || "",
    discount: {
      percent: readNumber(env.DISCOUNT_PERCENT, DISCOUNT_DEFAULTS.percent, { min: 0, max: 100 }),
      days: readNumber(env.DISCOUNT_DAYS, DISCOUNT_DEFAULTS.days, { min: 1, max: 365 }),
    },
    gibdd: {
      baseUrl: env.GIBDD_BASE_URL || "https://xn--90adear.xn--p1ai",
      captchaUrl: env.CAPTCHA_SOLVER_URL || "",
      captchaToken: env.CAPTCHA_SOLVER_TOKEN || "",
    },
    api: {
      url: env.FINES_API_URL || "",
      token: env.FINES_API_TOKEN || "",
    },
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN || "",
      chatId: env.TELEGRAM_CHAT_ID || "",
    },
    webhookUrl: env.WEBHOOK_URL || "",
    notifyOnErrors: readBoolean(env.NOTIFY_ON_ERRORS, true),
  };
}

/**
 * Минимальный парсер .env, чтобы не тянуть зависимости.
 * Существующие переменные окружения имеют приоритет над файлом.
 */
export async function loadEnvFile(env = process.env, file = join(rootDir, ".env")) {
  if (!existsSync(file)) return env;

  const contents = await readFile(file, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (key in env) continue;

    env[key] = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return env;
}
