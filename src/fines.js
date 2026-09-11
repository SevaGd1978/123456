import { createHash } from "node:crypto";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Приводит дату из разных форматов (12.03.2026, 2026-03-12, ISO) к YYYY-MM-DD. */
export function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const dotted = /^(\d{2})[.\-/](\d{2})[.\-/](\d{4})/.exec(text);
  if (dotted) return `${dotted[3]}-${dotted[2]}-${dotted[1]}`;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

/** Сумма в рублях. Строки вида "1 500,50 ₽" поддерживаются. */
export function parseAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const normalized = String(value ?? "")
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso) {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / DAY_MS);
}

/**
 * Льготный период по ст. 32.2 КоАП РФ.
 * Провайдер может прислать собственные значения — они имеют приоритет.
 */
export function computeDiscount(fine, discount, today) {
  if (fine.paid || !fine.decisionDate) {
    return { discountUntil: null, discountAmount: null, discountAvailable: false, discountDaysLeft: null };
  }

  const discountUntil = fine.discountUntil || addDays(fine.decisionDate, discount.days);
  if (!discountUntil) {
    return { discountUntil: null, discountAmount: null, discountAvailable: false, discountDaysLeft: null };
  }

  const daysLeft = daysBetween(today, discountUntil);
  const discountAmount =
    fine.discountAmount ?? Math.round(fine.amount * (1 - discount.percent / 100) * 100) / 100;

  return {
    discountUntil,
    discountAmount,
    discountAvailable: daysLeft !== null && daysLeft >= 0,
    discountDaysLeft: daysLeft,
  };
}

function fallbackKey(fine) {
  return createHash("sha1")
    .update([fine.decisionDate, fine.violationDate, fine.amount, fine.article].join("|"))
    .digest("hex")
    .slice(0, 16);
}

/** УИН — 20–25 цифр, основной идентификатор постановления. */
export function normalizeUin(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 15 ? digits : "";
}

export function normalizeFine(raw, { discount, today = new Date().toISOString().slice(0, 10) } = {}) {
  const amount = parseAmount(raw.amount ?? raw.sum ?? raw.summa ?? raw.Summa);
  const base = {
    uin: normalizeUin(raw.uin ?? raw.billId ?? raw.supplierBillID ?? raw.number ?? raw.num_post ?? raw.NumPost),
    amount,
    paid: Boolean(raw.paid ?? raw.isPaid ?? false),
    decisionDate: parseDate(
      raw.decisionDate ?? raw.datePostanovlenie ?? raw.date_post ?? raw.DatePost ?? raw.dateDecis,
    ),
    violationDate: parseDate(
      raw.violationDate ?? raw.dateDecision ?? raw.dateViolation ?? raw.DateDecis,
    ),
    article: String(raw.article ?? raw.koapCode ?? raw.kopArticle ?? raw.KoAPcode ?? "").trim(),
    description: String(
      raw.description ?? raw.offenceName ?? raw.violation ?? raw.KoAPtext ?? "",
    ).trim(),
    division: String(raw.division ?? raw.divisionName ?? raw.department ?? raw.division_name ?? "").trim(),
    location: String(raw.location ?? raw.place ?? raw.division_address ?? "").trim(),
    photoUrl: typeof raw.photoUrl === "string" ? raw.photoUrl : "",
    discountUntil: parseDate(raw.discountUntil ?? raw.discountDate ?? raw.date_discount ?? raw.DateDiscount),
    discountAmount:
      raw.discountAmount === undefined || raw.discountAmount === null
        ? null
        : parseAmount(raw.discountAmount),
  };

  const withDiscount = discount ? computeDiscount(base, discount, today) : {};
  if (raw.enable_discount === false) {
    withDiscount.discountAvailable = false;
  }
  const fine = { ...base, ...withDiscount };
  fine.key = fine.uin || fallbackKey(fine);
  return fine;
}

export function normalizeFines(list, options) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((raw) => normalizeFine(raw, options))
    .filter((fine) => {
      if (seen.has(fine.key)) return false;
      seen.add(fine.key);
      return true;
    })
    .sort((a, b) => String(b.decisionDate).localeCompare(String(a.decisionDate)));
}

/** Сравнивает результат проверки с сохранённым состоянием. */
export function diffFines(previousFines = [], currentFines = []) {
  const previousByKey = new Map(previousFines.map((fine) => [fine.key, fine]));
  const currentByKey = new Map(currentFines.map((fine) => [fine.key, fine]));

  const appeared = currentFines.filter((fine) => !previousByKey.has(fine.key));
  const paid = currentFines.filter((fine) => fine.paid && previousByKey.get(fine.key)?.paid === false);
  const settled = previousFines.filter(
    (fine) => !fine.paid && !currentByKey.has(fine.key),
  );

  return { appeared, paid, settled };
}

export function summarize(fines = []) {
  const unpaid = fines.filter((fine) => !fine.paid);
  const withDiscount = unpaid.filter((fine) => fine.discountAvailable);

  return {
    total: fines.length,
    unpaidCount: unpaid.length,
    unpaidAmount: Math.round(unpaid.reduce((sum, fine) => sum + fine.amount, 0) * 100) / 100,
    discountCount: withDiscount.length,
    discountAmount:
      Math.round(
        withDiscount.reduce((sum, fine) => sum + (fine.discountAmount ?? fine.amount), 0) * 100,
      ) / 100,
    expiringSoon: withDiscount.filter((fine) => (fine.discountDaysLeft ?? 99) <= 3).length,
  };
}
