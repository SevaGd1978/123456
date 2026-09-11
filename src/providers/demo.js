import { createHash } from "node:crypto";
import { addDays } from "../fines.js";

const ARTICLES = [
  { article: "12.9 ч.2", description: "Превышение скорости на 20–40 км/ч", amount: 500 },
  { article: "12.9 ч.3", description: "Превышение скорости на 40–60 км/ч", amount: 1000 },
  { article: "12.16 ч.1", description: "Несоблюдение требований знаков или разметки", amount: 500 },
  { article: "12.12 ч.1", description: "Проезд на запрещающий сигнал светофора", amount: 1000 },
  { article: "12.15 ч.4", description: "Выезд на полосу встречного движения", amount: 5000 },
  { article: "8.14 КоАП Москвы", description: "Неуплата проезда по платной дороге", amount: 3000 },
];

function hashInt(value) {
  const digest = createHash("sha1").update(String(value)).digest();
  return digest.readUInt32BE(0);
}

function isoDaysAgo(days, today) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Детерминированный провайдер для разработки и демонстрации.
 * Не обращается к ГИБДД: часть машин получает 0–2 «учебных» постановления,
 * чтобы панель и уведомления можно было проверить без внешних сервисов.
 */
export function createDemoProvider({ today } = {}) {
  const resolvedToday = today || new Date().toISOString().slice(0, 10);

  return {
    name: "demo",
    async checkVehicle(vehicle) {
      const seed = hashInt(vehicle.plate);
      const count = seed % 5 === 0 ? 2 : seed % 3 === 0 ? 1 : 0;
      const fines = [];

      for (let index = 0; index < count; index += 1) {
        const article = ARTICLES[(seed + index) % ARTICLES.length];
        const daysAgo = 4 + ((seed >> (index * 3)) % 26);
        const decisionDate = isoDaysAgo(daysAgo, resolvedToday);
        const paid = (seed >> (8 + index)) % 7 === 0;
        const uin = `188101${decisionDate.replaceAll("-", "")}${String((seed + index) % 1_000_000).padStart(8, "0")}`.slice(0, 25);

        fines.push({
          uin,
          amount: article.amount,
          paid,
          decisionDate,
          violationDate: isoDaysAgo(daysAgo + 1, resolvedToday),
          article: article.article,
          description: article.description,
          division: "ЦАФАП ГИБДД ГУ МВД России по г. Москве",
          location: "Москва, МКАД",
          discountUntil: paid ? null : addDays(decisionDate, 30),
          discountAmount: paid ? null : Math.round(article.amount * 0.75),
        });
      }

      return fines;
    },
  };
}
