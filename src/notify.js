import { formatDateTime, nextCheckAt } from "./time.js";

export function formatMoney(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function fineLine(item) {
  const { vehicle, fine } = item;
  const article = fine.article ? ` · ${fine.article}` : "";
  const discount = fine.discountAvailable
    ? ` · со скидкой ${formatMoney(fine.discountAmount)} до ${fine.discountUntil}`
    : "";
  return `• ${vehicle.displayPlate}: ${formatMoney(fine.amount)}${article}${discount}`;
}

export function buildDigest({ appeared, paid, settled, errors, summary, entry, nextCheck, timezone }) {
  const lines = [
    `Проверка автопарка ${formatDateTime(entry.finishedAt, timezone)}`,
    `Машин: ${entry.vehiclesChecked} · неоплаченных: ${summary.unpaidCount} на ${formatMoney(summary.unpaidAmount)}`,
  ];

  if (appeared.length) {
    lines.push("", `Новые постановления (${appeared.length}):`, ...appeared.slice(0, 20).map(fineLine));
    if (appeared.length > 20) lines.push(`… и ещё ${appeared.length - 20}`);
  }

  if (paid.length) {
    lines.push("", `Отмечены оплаченными (${paid.length}):`, ...paid.slice(0, 10).map(fineLine));
  }

  if (settled.length) {
    lines.push("", `Больше не приходят в выдаче (${settled.length}):`, ...settled.slice(0, 10).map(fineLine));
  }

  if (summary.expiringSoon) {
    lines.push("", `Скидка истекает в ближайшие 3 дня: ${summary.expiringSoon}`);
  }

  if (errors.length) {
    lines.push("", `Ошибки проверки (${errors.length}):`);
    for (const error of errors.slice(0, 10)) {
      lines.push(`• ${error.vehicle.displayPlate}: ${error.message}`);
    }
  }

  if (!appeared.length && !paid.length && !settled.length && !errors.length) {
    lines.push("", "Новых штрафов нет.");
  }

  if (nextCheck) {
    lines.push("", `Следующая проверка: ${formatDateTime(nextCheck, timezone)}`);
  }

  return lines.join("\n");
}

async function postJson(url, body, { fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyCheck(result, config, { fetchImpl = fetch, nextCheck } = {}) {
  const shouldNotify =
    result.appeared.length > 0 ||
    result.paid.length > 0 ||
    result.settled.length > 0 ||
    (config.notifyOnErrors && result.errors.length > 0);

  if (!shouldNotify) return { sent: false, reason: "no-changes" };

  const text = buildDigest({ ...result, nextCheck, timezone: config.timezone });
  const deliveries = [];

  if (config.telegram.botToken && config.telegram.chatId) {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
    await postJson(
      url,
      { chat_id: config.telegram.chatId, text, disable_web_page_preview: true },
      { fetchImpl },
    );
    deliveries.push("telegram");
  }

  if (config.webhookUrl) {
    await postJson(
      config.webhookUrl,
      {
        text,
        appeared: result.appeared,
        paid: result.paid,
        settled: result.settled,
        errors: result.entry.errors,
        summary: result.summary,
      },
      { fetchImpl },
    );
    deliveries.push("webhook");
  }

  return { sent: deliveries.length > 0, deliveries, text };
}

export function scheduleDailyCheck({ config, run, onTick, clock = { now: () => new Date(), delay: (fn, ms) => setTimeout(fn, ms) } }) {
  let timer;
  let stopped = false;

  const plan = () => {
    if (stopped) return null;
    const next = nextCheckAt(clock.now(), config.checkTime, config.timezone);
    onTick?.(next);
    const wait = Math.max(1000, next.getTime() - clock.now().getTime());
    timer = clock.delay(async () => {
      try {
        await run();
      } finally {
        plan();
      }
    }, wait);
    return next;
  };

  const next = plan();
  return {
    next,
    stop() {
      stopped = true;
      if (timer && typeof timer === "object" && typeof timer.unref === "function") timer.unref();
      clearTimeout(timer);
    },
  };
}
