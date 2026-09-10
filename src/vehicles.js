import { readFile } from "node:fs/promises";

const CYRILLIC_TO_LATIN = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H",
  О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X",
};

/** Госномер в верхнем регистре, латиницей, без разделителей. */
export function normalizePlate(value = "") {
  return String(value)
    .toUpperCase()
    .replace(/[АВЕКМНОРСТУХ]/g, (letter) => CYRILLIC_TO_LATIN[letter])
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeSts(value = "") {
  return String(value).toUpperCase().replace(/[^0-9A-ZА-Я]/g, "");
}

export function formatPlate(value = "") {
  const plate = String(value).toUpperCase().replace(/\s+/g, "");
  const match = /^([А-ЯA-Z])(\d{3})([А-ЯA-Z]{2})(\d{2,3})$/.exec(plate);
  return match ? `${match[1]} ${match[2]} ${match[3]} ${match[4]}` : plate;
}

const STANDARD_PLATE = /^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}\d{2,3}$/;
const STS_PATTERN = /^\d{2}[0-9A-ZА-Я]{2}\d{6}$/;

export function validateVehicle(raw, index) {
  const errors = [];
  const warnings = [];
  const position = `запись №${index + 1}`;

  const plate = normalizePlate(raw?.plate);
  const sts = normalizeSts(raw?.sts);

  if (!plate) errors.push(`${position}: не указан госномер`);
  else if (!STANDARD_PLATE.test(plate)) {
    if (/^[A-Z0-9]{6,9}$/.test(plate)) {
      warnings.push(`${position} (${plate}): нестандартный формат госномера, принят как есть`);
    } else {
      errors.push(`${position}: некорректный госномер «${raw.plate}»`);
    }
  }

  if (!sts) errors.push(`${position}: не указан номер СТС`);
  else if (!STS_PATTERN.test(sts)) {
    errors.push(`${position} (${plate}): некорректный номер СТС «${raw.sts}»`);
  }

  return {
    errors,
    warnings,
    vehicle: {
      id: String(raw?.id || plate).trim(),
      plate,
      displayPlate: formatPlate(raw?.plate ?? plate),
      sts,
      title: String(raw?.title || "").trim(),
      driver: String(raw?.driver || "").trim(),
      enabled: raw?.enabled !== false,
    },
  };
}

export function parseVehicles(list) {
  if (!Array.isArray(list)) {
    throw new Error("Список автомобилей должен быть массивом");
  }

  const vehicles = [];
  const errors = [];
  const warnings = [];
  const seen = new Map();

  list.forEach((raw, index) => {
    const result = validateVehicle(raw, index);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.errors.length) return;

    const previous = seen.get(result.vehicle.id);
    if (previous !== undefined) {
      warnings.push(
        `Дубликат ${result.vehicle.displayPlate}: запись №${index + 1} пропущена (уже добавлена как №${previous + 1})`,
      );
      return;
    }

    seen.set(result.vehicle.id, index);
    vehicles.push(result.vehicle);
  });

  if (errors.length) {
    throw new Error(`Ошибки в списке автомобилей:\n- ${errors.join("\n- ")}`);
  }

  return { vehicles, warnings };
}

export async function loadVehicles(file, fallbackFile) {
  let contents;
  try {
    contents = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" && fallbackFile) {
      return loadVehicles(fallbackFile);
    }
    if (error.code === "ENOENT") {
      throw new Error(
        `Файл со списком автомобилей не найден: ${file}\n` +
          "Скопируйте config/vehicles.example.json в config/vehicles.json и укажите свои машины.",
      );
    }
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Не удалось разобрать ${file}: ${error.message}`);
  }

  return parseVehicles(Array.isArray(parsed) ? parsed : parsed.vehicles);
}
