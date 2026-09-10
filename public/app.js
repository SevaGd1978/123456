const form = document.querySelector("#search-form");
const input = document.querySelector("#query");
const label = document.querySelector("#query-label");
const hint = document.querySelector("#input-hint");
const countryTag = document.querySelector("#country-tag");
const status = document.querySelector("#status");
const result = document.querySelector("#result");
const submitButton = form.querySelector("button[type='submit']");
const tabs = [...document.querySelectorAll(".tab")];

let mode = "plate";

const escapeHtml = (value) =>
  String(value ?? "—").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ],
  );

function setMode(nextMode) {
  mode = nextMode;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  input.value = "";
  status.textContent = "";
  status.className = "status";
  result.hidden = true;

  if (mode === "plate") {
    label.textContent = "Государственный номер";
    input.placeholder = "А 001 АА 77";
    input.maxLength = 12;
    hint.textContent = "Например: А001АА77 — доступны публичные записи организаций";
    countryTag.textContent = "RUS";
  } else {
    label.textContent = "Идентификационный номер";
    input.placeholder = "1HGCM82633A004352";
    input.maxLength = 17;
    hint.textContent = "17 символов, без I, O и Q";
    countryTag.textContent = "VIN";
  }
  input.focus();
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.className = `status${isError ? " error" : ""}`;
}

function renderRecord(record) {
  result.innerHTML = `
    <div class="result-header">
      <div>
        <span class="result-kicker">Найдена публичная запись</span>
        <h3>${escapeHtml(record.vehicle)}</h3>
      </div>
      <span class="result-status">${escapeHtml(record.status)}</span>
    </div>
    <dl class="result-grid">
      <div><dt>Госномер</dt><dd>${escapeHtml(record.plate)}</dd></div>
      <div><dt>Год выпуска</dt><dd>${escapeHtml(record.year)}</dd></div>
      <div><dt>Владелец</dt><dd>${escapeHtml(record.owner)}</dd></div>
      <div><dt>Тип владельца</dt><dd>${escapeHtml(record.ownerType)}</dd></div>
      <div><dt>Опубликовано</dt><dd>${escapeHtml(record.publishedAt)}</dd></div>
      <div><dt>Примечание</dt><dd>${escapeHtml(record.note)}</dd></div>
    </dl>
    <p class="source-line">
      Источник: ${escapeHtml(record.source)}
      ${record.sourceUrl ? ` · <a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">Открыть публикацию</a>` : ""}
    </p>
  `;
  result.hidden = false;
}

function vinValue(value) {
  return value && value !== "Not Applicable" ? value : "—";
}

function renderVin(vin, data) {
  const fields = [
    ["Марка", vinValue(data.Make)],
    ["Модель", vinValue(data.Model)],
    ["Модельный год", vinValue(data.ModelYear)],
    ["Страна производства", vinValue(data.PlantCountry)],
    ["Тип кузова", vinValue(data.BodyClass)],
    ["Тип топлива", vinValue(data.FuelTypePrimary)],
  ];

  result.innerHTML = `
    <div class="result-header">
      <div>
        <span class="result-kicker">VIN расшифрован</span>
        <h3>${escapeHtml(fields[0][1])} ${escapeHtml(fields[1][1])}</h3>
      </div>
      <span class="result-status">Официальный API</span>
    </div>
    <dl class="result-grid">
      ${fields.map(([name, value]) => `<div><dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
    </dl>
    <p class="source-line">
      VIN: ${escapeHtml(vin)} · Источник:
      <a href="https://vpic.nhtsa.dot.gov/" target="_blank" rel="noopener noreferrer">NHTSA vPIC</a>.
      Сервис предоставляет технические данные и не раскрывает владельца.
    </p>
  `;
  result.hidden = false;
}

async function searchPlate(query) {
  const response = await fetch(`/api/search?plate=${encodeURIComponent(query)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Не удалось выполнить поиск");

  if (!data.results.length) {
    showStatus(
      "В подключённом открытом наборе совпадений нет. Это не означает, что номер не зарегистрирован.",
    );
    return;
  }

  showStatus("");
  renderRecord(data.results[0]);
}

async function searchVin(vin) {
  const normalized = vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
    throw new Error("VIN должен содержать 17 допустимых символов");
  }

  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(normalized)}?format=json`,
  );
  if (!response.ok) throw new Error("Открытый VIN-сервис временно недоступен");
  const data = await response.json();
  const decoded = data.Results?.[0];

  if (!decoded || (decoded.ErrorCode && decoded.ErrorCode !== "0")) {
    throw new Error(decoded?.ErrorText || "VIN не удалось расшифровать");
  }

  showStatus("");
  renderVin(normalized, decoded);
}

tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  result.hidden = true;

  if (!query) {
    showStatus(mode === "plate" ? "Введите государственный номер" : "Введите VIN", true);
    input.focus();
    return;
  }

  submitButton.disabled = true;
  showStatus("Проверяем открытые источники…");

  try {
    if (mode === "plate") await searchPlate(query);
    else await searchVin(query);
  } catch (error) {
    showStatus(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});
