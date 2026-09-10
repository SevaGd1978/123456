const statsEl = document.querySelector("#stats");
const bodyEl = document.querySelector("#fleet-body");
const detailEl = document.querySelector("#detail");
const historyEl = document.querySelector("#history");
const nextEl = document.querySelector("#next-check");
const runBtn = document.querySelector("#run-check");
const checkStatus = document.querySelector("#check-status");
const editor = document.querySelector("#editor");
const editorBody = document.querySelector("#editor-body");
const editorError = document.querySelector("#editor-error");

let dashboard = null;
let filter = "all";
let selectedId = null;

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]);

const money = (value) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value || 0);

const when = (value, timeZone) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Ошибка запроса");
  return data;
}

function renderStats(data) {
  const cards = [
    ["Машин в смене", `${data.fleet.enabled} / ${data.fleet.vehicles}`],
    ["С неоплаченными", String(data.fleet.withFines)],
    ["Неоплачено", money(data.fleet.unpaidAmount)],
    ["Постановлений", String(data.fleet.unpaidCount)],
  ];
  statsEl.innerHTML = cards
    .map(([label, value]) => `<article class="stat"><span>${label}</span><b>${value}</b></article>`)
    .join("");
}

function statusBadge(row) {
  if (row.error) return `<span class="badge err">ошибка</span>`;
  if (row.summary.unpaidCount) return `<span class="badge warn">${row.summary.unpaidCount} шт.</span>`;
  return `<span class="badge ok">чисто</span>`;
}

function visibleRows(data) {
  return data.vehicles.filter((row) => {
    if (filter === "unpaid") return row.summary.unpaidCount > 0;
    if (filter === "errors") return Boolean(row.error);
    return true;
  });
}

function renderTable(data) {
  const rows = visibleRows(data);
  if (!rows.length) {
    bodyEl.innerHTML = `<tr><td colspan="6">Нет машин в этом фильтре</td></tr>`;
    return;
  }

  bodyEl.innerHTML = rows
    .map((row) => {
      const discount = row.nextDiscount
        ? `${row.nextDiscount.daysLeft} дн. · ${money(row.nextDiscount.amount)}`
        : "—";
      return `<tr data-id="${escapeHtml(row.id)}" class="${row.id === selectedId ? "selected" : ""}">
        <td><div class="plate">${escapeHtml(row.displayPlate)}</div><div class="sub">СТС ${escapeHtml(row.stsMasked)}</div></td>
        <td>${escapeHtml(row.title || "—")}<div class="sub">${escapeHtml(row.driver || "")}</div></td>
        <td>${row.summary.unpaidCount}</td>
        <td>${money(row.summary.unpaidAmount)}</td>
        <td>${escapeHtml(discount)}</td>
        <td>${statusBadge(row)}</td>
      </tr>`;
    })
    .join("");
}

function renderHistory(data) {
  if (!data.history.length) {
    historyEl.innerHTML = "<li>Проверок ещё не было</li>";
    return;
  }
  historyEl.innerHTML = data.history
    .map((item) => `<li><b>${escapeHtml(when(item.finishedAt, data.timezone))}</b>
      ${item.okCount}/${item.vehiclesChecked} машин · новых ${item.appearedCount} · ${money(item.summary?.unpaidAmount)}</li>`)
    .join("");
}

function renderCountdown(data) {
  if (!data.nextCheckAt) {
    nextEl.textContent = `${data.checkTime} ${data.timezone}`;
    return;
  }
  const diff = new Date(data.nextCheckAt).getTime() - Date.now();
  if (diff <= 0) {
    nextEl.textContent = "скоро";
    return;
  }
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  nextEl.textContent = `${when(data.nextCheckAt, data.timezone)} · через ${hours} ч ${minutes} мин`;
}

async function renderDetail(id) {
  const vehicle = await api(`/api/vehicles/${encodeURIComponent(id)}`);
  const fines = vehicle.snapshot?.fines || [];
  const unpaid = fines.filter((fine) => !fine.paid);
  detailEl.innerHTML = `
    <h2>${escapeHtml(vehicle.displayPlate)}</h2>
    <p class="muted">${escapeHtml(vehicle.title || "")} · ${escapeHtml(vehicle.driver || "")} · СТС ${escapeHtml(vehicle.sts)}</p>
    ${vehicle.snapshot?.error ? `<p class="error">${escapeHtml(vehicle.snapshot.error)}</p>` : ""}
    ${unpaid.length ? unpaid.map((fine) => `
      <div class="fine">
        <b>${money(fine.amount)}</b>
        ${fine.discountAvailable ? ` · со скидкой ${money(fine.discountAmount)} до ${escapeHtml(fine.discountUntil)}` : ""}
        <div class="sub">${escapeHtml(fine.article || "")} ${escapeHtml(fine.description || "")}</div>
        <div class="sub">Постановление ${escapeHtml(fine.decisionDate || "—")} · УИН ${escapeHtml(fine.uin || "—")}</div>
      </div>`).join("") : `<p class="muted">Неоплаченных постановлений нет.</p>`}
  `;
}

function render(data) {
  dashboard = data;
  renderStats(data);
  renderTable(data);
  renderHistory(data);
  renderCountdown(data);
  const line = document.querySelector("#provider-line");
  if (line && data.providerInfo) {
    line.textContent = data.providerInfo.live
      ? `${data.providerInfo.label}${data.providerInfo.quota ? ` · ${data.providerInfo.quota}` : ""}`
      : "Учебные данные · задайте ASSIST_API_KEY для живых штрафов";
  }
  runBtn.disabled = data.checking;
  runBtn.textContent = data.checking ? "Идёт проверка…" : "Проверить сейчас";
  if (data.lastCheck && !data.checking) {
    checkStatus.textContent = `Последняя: ${when(data.lastCheck.finishedAt, data.timezone)}`;
  }
}

async function refresh() {
  const data = await api("/api/dashboard");
  render(data);
  if (selectedId) {
    const still = data.vehicles.some((row) => row.id === selectedId);
    if (still) await renderDetail(selectedId);
  }
  return data;
}

function editorRow(vehicle = {}) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="checkbox" ${vehicle.enabled === false ? "" : "checked"} title="В проверке" /></td>
    <td><input type="text" name="plate" value="${escapeHtml(vehicle.displayPlate || vehicle.plate || "")}" required maxlength="12" /></td>
    <td><input type="text" name="sts" value="${escapeHtml(vehicle.sts || "")}" required maxlength="12" /></td>
    <td><input type="text" name="title" value="${escapeHtml(vehicle.title || "")}" /></td>
    <td><input type="text" name="driver" value="${escapeHtml(vehicle.driver || "")}" /></td>
  `;
  return row;
}

async function openEditor() {
  const data = await api("/api/vehicles");
  editorBody.innerHTML = "";
  data.vehicles.forEach((vehicle) => editorBody.append(editorRow(vehicle)));
  editorError.textContent = "";
  editor.showModal();
}

function collectEditor() {
  return [...editorBody.querySelectorAll("tr")].map((row) => {
    const [enabled, plate, sts, title, driver] = row.querySelectorAll("input");
    return {
      plate: plate.value.trim(),
      sts: sts.value.trim(),
      title: title.value.trim(),
      driver: driver.value.trim(),
      enabled: enabled.checked,
    };
  }).filter((row) => row.plate || row.sts);
}

bodyEl.addEventListener("click", async (event) => {
  const row = event.target.closest("tr[data-id]");
  if (!row) return;
  selectedId = row.dataset.id;
  renderTable(dashboard);
  await renderDetail(selectedId);
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item === chip));
    if (dashboard) renderTable(dashboard);
  });
});

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  runBtn.textContent = "Идёт проверка…";
  checkStatus.textContent = "Опрашиваю 30 машин…";
  try {
    const result = await api("/api/check", { method: "POST" });
    await refresh();
    checkStatus.textContent = `Готово: новых ${result.appeared}, ошибок ${result.errors}`;
  } catch (error) {
    runBtn.disabled = false;
    runBtn.textContent = "Проверить сейчас";
    checkStatus.textContent = error.message;
  }
});

document.querySelector("#open-editor").addEventListener("click", openEditor);
document.querySelector("#open-api-help").addEventListener("click", () => {
  document.querySelector("#api-help").showModal();
});
document.querySelector("#add-vehicle").addEventListener("click", () => {
  if (editorBody.querySelectorAll("tr").length >= 40) {
    editorError.textContent = "Слишком много записей. Оставьте рабочий список около 30 машин.";
    return;
  }
  editorBody.append(editorRow());
});
document.querySelector("#save-vehicles").addEventListener("click", async () => {
  editorError.textContent = "";
  try {
    await api("/api/vehicles", { method: "PUT", body: JSON.stringify(collectEditor()) });
    editor.close();
    await refresh();
  } catch (error) {
    editorError.textContent = error.message;
  }
});

setInterval(() => {
  if (dashboard) renderCountdown(dashboard);
}, 30000);

refresh().then((data) => {
  if (data.checking) {
    const poll = setInterval(async () => {
      const next = await refresh();
      if (!next.checking) clearInterval(poll);
    }, 1500);
  }
});
