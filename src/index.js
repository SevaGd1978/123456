import { loadConfig, loadEnvFile, rootDir } from "./config.js";
import { createApp } from "./app.js";
import { scheduleDailyCheck } from "./notify.js";
import { loadState, saveState } from "./store.js";
import { join } from "node:path";
import { loadVehicles } from "./vehicles.js";

await loadEnvFile();
const config = loadConfig();
const exampleVehicles = join(rootDir, "config", "vehicles.example.json");

async function loadFleet() {
  return loadVehicles(config.vehiclesFile, exampleVehicles);
}

let nextCheck = null;
const app = createApp({
  config,
  loadFleet,
  getNextCheck: () => nextCheck,
  setNextCheck: (value) => {
    nextCheck = value;
  },
});

const { vehicles, warnings } = await loadFleet();
for (const warning of warnings) console.warn(warning);
console.log(`Автопарк: ${vehicles.length} машин · провайдер: ${config.provider}`);

const schedule = scheduleDailyCheck({
  config,
  run: () => app.runCheck(),
  onTick: async (value) => {
    nextCheck = value;
    const state = await loadState(config.dataFile);
    await saveState(config.dataFile, { ...state, nextCheckAt: value.toISOString() });
    console.log(`Следующая проверка: ${value.toISOString()}`);
  },
});
nextCheck = schedule.next;

app.server.listen(config.port, config.host, async () => {
  console.log(`Панель штрафов: http://localhost:${config.port}`);
  const state = await loadState(config.dataFile);
  if (config.checkOnStart || (config.provider === "demo" && !state.lastCheck)) {
    console.log("Запускаю стартовую проверку…");
    await app.runCheck();
  }
});
