import { loadConfig, loadEnvFile, rootDir } from "./config.js";
import { checkFleet } from "./checker.js";
import { notifyCheck } from "./notify.js";
import { createProvider } from "./providers/index.js";
import { loadVehicles } from "./vehicles.js";
import { join } from "node:path";

await loadEnvFile();
const config = loadConfig();
const { vehicles, warnings } = await loadVehicles(
  config.vehiclesFile,
  join(rootDir, "config", "vehicles.example.json"),
);
for (const warning of warnings) console.warn(warning);

const provider = createProvider(config);
const result = await checkFleet({ vehicles, provider, config });
const notify = await notifyCheck(result, config);

console.log(
  JSON.stringify(
    {
      checked: result.entry.vehiclesChecked,
      appeared: result.appeared.length,
      unpaid: result.summary.unpaidCount,
      amount: result.summary.unpaidAmount,
      errors: result.entry.errors,
      notified: notify.sent,
    },
    null,
    2,
  ),
);
