export function sleep(ms, clock = { now: Date.now, delay: (fn, wait) => setTimeout(fn, wait) }) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => clock.delay(resolve, ms));
}

export async function withRetry(task, { attempts, delayMs, clock } = {}) {
  let lastError;
  for (let tryIndex = 1; tryIndex <= attempts; tryIndex += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (tryIndex === attempts) break;
      await sleep(delayMs * tryIndex, clock);
    }
  }
  throw lastError;
}

export async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) || 1 }, () => run());
  await Promise.all(workers);
  return results;
}

export function todayInTimeZone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** UTC-момент, который в указанной зоне выглядит как локальная дата и время. */
export function zonedDate(timeZone, year, month, day, hour, minute, second = 0) {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let index = 0; index < 4; index += 1) {
    const shown = zonedParts(new Date(utc), timeZone);
    const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second);
    const wantedUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    utc += wantedUtc - shownUtc;
  }
  return new Date(utc);
}

export function nextCheckAt(now, { hour, minute }, timeZone) {
  const current = zonedParts(now, timeZone);
  let candidate = zonedDate(timeZone, current.year, current.month, current.day, hour, minute);
  if (candidate.getTime() <= now.getTime()) {
    const tomorrow = zonedDate(timeZone, current.year, current.month, current.day, 12, 0);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const next = zonedParts(tomorrow, timeZone);
    candidate = zonedDate(timeZone, next.year, next.month, next.day, hour, minute);
  }
  return candidate;
}

export function formatDateTime(value, timeZone) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
