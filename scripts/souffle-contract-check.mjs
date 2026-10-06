import fs from "node:fs";
import vm from "node:vm";

const read = path => fs.readFileSync(path, "utf8");
const configSource = read("config.js");
const game = read("souffle-game.js");
const service = read("souffle-service.js");
const api = read("supabase/functions/souffle-api/index.ts");
const migration = read("supabase/migrations/004_souffle_mvp.sql");

const sandbox = { window:{} };
vm.runInNewContext(configSource, sandbox);
const config = sandbox.window.DIGUL_CONFIG;
if (!config?.souffle) throw new Error("souffle config missing");

const scoring = config.souffle.scoring;
const expectedFixed = { 1:100, 2:100, 3:100, 4:100, 5:90, 6:130, 7:100, 10:110, 11:120 };
for (const [step, points] of Object.entries(expectedFixed)) {
  if (Number(scoring.fixed?.[step]) !== points) throw new Error(`client fixed score drift at step ${step}`);
  if (!api.includes(`${step}:{points:${points}`)) throw new Error(`server fixed score drift at step ${step}`);
}

if (config.souffle.targetSeconds !== 270 || !api.includes("const TARGET_MS = 270000")) {
  throw new Error("client/server timer contract drift");
}
if (scoring.fold8.perfect !== 120 || scoring.fold8.good !== 75) throw new Error("step 8 score contract drift");
if (scoring.fold9.perfect !== 140 || scoring.fold9.good !== 80) throw new Error("step 9 score contract drift");
if (scoring.finalBase !== 120) throw new Error("step 12 base score drift");
if (scoring.overtimePenaltyPerSecond !== 2) throw new Error("overtime penalty drift");
if (!api.includes("const expectedPoints = 120 + timingScore") && !api.includes("const expectedPoints=120+timingScore")) {
  throw new Error("server final timing score validation missing");
}
if (!api.includes("overtimeMs / 1000 * 2") && !api.includes("overtimeMs/1000*2")) {
  throw new Error("server overtime penalty validation missing");
}

const fixedTotal = Object.values(expectedFixed).reduce((sum, value) => sum + value, 0);
const minScore = fixedTotal + scoring.fold8.good + scoring.fold9.good + scoring.finalBase;
const maxScore = fixedTotal + scoring.fold8.perfect + scoring.fold9.perfect + scoring.finalBase + 100;
if (minScore !== 1225 || maxScore !== 1430) {
  throw new Error(`unexpected souffle score envelope ${minScore}-${maxScore}`);
}

const menuIds = ["lotus","chestnut","sesame","peach","dubai","injeolmi","brulee"];
for (const id of menuIds) {
  if (!game.includes(`\"${id}\"`) && !game.includes(`:${id}`)) throw new Error(`client menu id missing: ${id}`);
  if (!api.includes(`\"${id}\"`)) throw new Error(`server menu id missing: ${id}`);
  if (!migration.includes(`'${id}'`)) throw new Error(`database menu id missing: ${id}`);
}

if (!migration.includes("elapsed_ms between 30000 and 1800000")) throw new Error("elapsed-time database guard missing");
if (!api.includes("elapsedMs < 30000") && !api.includes("elapsedMs<30000")) throw new Error("elapsed-time API guard missing");
if (!migration.includes("fun_rating between 1 and 5") || !migration.includes("wait_rating between 1 and 5") || !migration.includes("anticipation_rating between 1 and 5")) {
  throw new Error("feedback database bounds missing");
}
if (!service.includes("probeHealth") || !service.includes("ARCHIVE_KEY") || !service.includes("COOLDOWN_MS")) {
  throw new Error("resilient souffle sync service missing");
}
if (!service.includes("Runs must") && service.includes("SUPABASE_SERVICE_ROLE_KEY")) {
  throw new Error("service-role secret must not appear in client service");
}

console.log(`Souffle contract checks passed. score envelope=${minScore}-${maxScore}, menus=${menuIds.length}`);
