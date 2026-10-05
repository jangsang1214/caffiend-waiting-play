import fs from "node:fs";
import vm from "node:vm";

const read = path => fs.readFileSync(path, "utf8");
const index = read("index.html");
const style = read("style.css");
const souffleStyle = read("souffle.css");
const souffleV2Style = read("souffle-v2.css");
const game = read("game.js");
const sideGames = read("side-games.js");
const souffleGame = read("souffle-game.js");
const souffleService = read("souffle-service.js");
const dessertArt = read("dessert-art.js");
const spriteRenderer = read("sprite-renderer.js");
const configSource = read("config.js");
const souffleMigration = read("supabase/migrations/004_souffle_mvp.sql");
const souffleApi = read("supabase/functions/souffle-api/index.ts");

const requiredIds = [
  "entryScreen","gameScreen","nicknameInput","startButton","nicknameDisplay","pauseButton",
  "scoreValue","personalBestValue","nextPreview","gameCanvas","connectionPill","connectionText",
  "myRankValue","topScoreValue","recipeButton","recipeButtonPreview","rankingButton",
  "resultOverlay","restartButton","recipeOverlay","rankingOverlay","rankingList",
  "openSouffleButton","openMysteryButton","souffleScreen","mysteryScreen","suspectGrid","nextClueButton",
  "spriteLayer","dropSprite","souffleSelectPanel","souffleTutorialPanel","soufflePlayPanel","souffleResultPanel",
  "souffleMenuGrid","souffleContinueButton","souffleTutorialStart","souffleTimer","souffleStepBadge",
  "souffleStepTitle","souffleStepHint","souffleScoreLive","souffleProgressFill","souffleProgressTrack",
  "souffleWorkArea","souffleResultArt","souffleFinalScore","souffleRetryButton","souffleReselectButton",
  "souffleSoundButton","souffleSeasonWindow","souffleSeasonLabel","souffleSeasonMessage","souffleSyncState",
  "soufflePerfectCount","souffleCareCount","souffleTimingValue","souffleFeedback","souffleFeedbackSubmit",
  "souffleFeedbackStatus"
];

for (const id of requiredIds) {
  if (!index.includes(`id="${id}"`)) throw new Error(`Missing required DOM id: ${id}`);
}

const combinedUi = index + style + souffleStyle + souffleV2Style + game + sideGames + souffleGame + dessertArt;
if (/<svg\b/i.test(combinedUi) || /data:image\/svg/i.test(combinedUi)) {
  throw new Error("SVG UI assets are not allowed in the current CAFFIEND visual direction.");
}

const sandbox = { window:{} };
vm.runInNewContext(configSource, sandbox);
const config = sandbox.window.DIGUL_CONFIG;
if (!config) throw new Error("DIGUL_CONFIG not found");
if (config.version !== "2.0.0") throw new Error("Unexpected UI version");
if (!Array.isArray(config.menus) || config.menus.length !== 11) throw new Error("Exactly 11 DIGUL menu stages are required");
if (!config.souffle || config.souffle.steps !== 12) throw new Error("Souffle maker must expose 12 cooking steps");
if (config.souffle.targetSeconds !== 270) throw new Error("Souffle target timer must be 4:30");
if (config.souffle.season !== "auto") throw new Error("Souffle season should follow KST automatically");
if (!Array.isArray(config.souffle.interactions) || config.souffle.interactions.length !== 4) throw new Error("Souffle maker must use four common interaction systems");
if (Object.keys(config.souffle.seasons || {}).length !== 4) throw new Error("Four seasonal visual modes are required");
if (!config.souffle.feedback?.enabled) throw new Error("MVP validation feedback must stay enabled");
if (!config.souffle.remoteSync) throw new Error("Souffle remote sync must stay enabled");
if (!config.store.souffleApi?.includes("supabase.co/functions/v1/souffle-api")) throw new Error("Souffle API is not configured");

config.menus.forEach((menu, index) => {
  if (menu.level !== index + 1) throw new Error(`Menu level mismatch at ${index + 1}`);
  if (!menu.name || !menu.file) throw new Error(`Menu metadata missing at ${index + 1}`);
});
const souffleMenus = config.menus.filter(menu => menu.name.includes("수플레"));
if (souffleMenus.length !== 7) throw new Error("Souffle maker currently expects seven configured souffle menus");

if (config.ranking.period !== "weekly") throw new Error("Leaderboard must use weekly aggregation");
if (!config.store.leaderboardApi.includes("supabase.co/functions/v1/digul-api")) throw new Error("Live Supabase leaderboard API is not configured");
if (config.gameplay.completionBonus !== 150) throw new Error("Completion bonus must remain 150");
if (config.assets.renderer !== "dom-procedural-raster-v1") throw new Error("DOM raster renderer must be active");

const scriptOrder = ["config.js","experience.js","leaderboard.js","analytics.js","dessert-art.js","sprite-renderer.js","game.js","side-games.js","souffle-service.js","souffle-game.js"];
let cursor = -1;
for (const script of scriptOrder) {
  const next = index.indexOf(script);
  if (next < 0 || next <= cursor) throw new Error(`Invalid script order: ${script}`);
  cursor = next;
}

if (!dessertArt.includes("window.DigulDessertArt")) throw new Error("Dessert art engine missing");
if (!dessertArt.includes("proceduralRender")) throw new Error("Procedural raster dessert renderer missing");
if (dessertArt.includes("menu-atlas-v2.webp")) throw new Error("Broken fish atlas must not be referenced by dessert renderer");
if (!dessertArt.includes('atlasStatus:()=>"disabled"')) throw new Error("Legacy atlas path must stay disabled");
if (!sideGames.includes("window.CaffiendScreens") || !sideGames.includes("openMysteryButton")) throw new Error("Shared side-game navigation missing");
if (!sideGames.includes("souffle.css?v=2.0.0") || !sideGames.includes("souffle-v2.css?v=2.0.0")) throw new Error("Souffle stylesheet loaders missing");
if (!souffleService.includes("window.CaffiendSouffleService")) throw new Error("Souffle remote service missing");
if (!souffleService.includes("QUEUE_KEY") || !souffleService.includes("flushQueue")) throw new Error("Offline souffle sync queue missing");
if (!souffleGame.includes("openSouffleButton")) throw new Error("Souffle entry wiring missing");
if (!souffleGame.includes("case 12:return stepFinishBake")) throw new Error("12-step souffle flow missing");
if (!souffleGame.includes("CONFIG.menus") || !souffleGame.includes('includes("수플레")')) throw new Error("Souffle menu selection must derive from shared menu config");
if (!souffleGame.includes('let left=20') || !souffleGame.includes('let left=12')) throw new Error("Two-stage compressed baking flow missing");
if (!souffleGame.includes("souffle_game_abort") || !souffleGame.includes("souffle_game_finish")) throw new Error("Souffle lifecycle analytics missing");
if (!souffleGame.includes("souffle_feedback_submit")) throw new Error("MVP feedback analytics missing");
if (!souffleGame.includes("실제 주문 준비 상황과 연동되지 않습니다") && !index.includes("실제 주문 준비 상황과 연동되지 않습니다")) throw new Error("Order-progress disclaimer missing");

const feedbackButtons = [...index.matchAll(/data-feedback-question="(fun|wait|anticipation)" data-feedback-value="([1-5])"/g)];
if (feedbackButtons.length !== 15) throw new Error("Feedback UI must expose 3 questions × 5 points");

if (!souffleMigration.includes("create table if not exists public.souffle_runs")) throw new Error("Souffle run migration missing");
if (!souffleMigration.includes("create table if not exists public.souffle_feedback")) throw new Error("Souffle feedback migration missing");
if (!souffleMigration.includes("enable row level security")) throw new Error("Souffle RLS missing");
if (!souffleApi.includes('path === "/run"') || !souffleApi.includes('path === "/feedback"')) throw new Error("Souffle API write routes missing");
if (!souffleApi.includes('path === "/summary"') || !souffleApi.includes('path === "/health"')) throw new Error("Souffle API ops routes missing");
if (!souffleApi.includes("validStepResults") || !souffleApi.includes("RATE_LIMITED")) throw new Error("Souffle API validation/rate limit missing");
if (souffleApi.includes("SUPABASE_SERVICE_ROLE_KEY") && index.includes("SUPABASE_SERVICE_ROLE_KEY")) throw new Error("Service-role key must never appear in client HTML");

if (!spriteRenderer.includes("window.DigulSpriteRenderer")) throw new Error("Unified DIGUL sprite renderer missing");
if (!spriteRenderer.includes("selfTest")) throw new Error("Sprite renderer self-test missing");
if (!game.includes("requestAnimationFrame(frame)")) throw new Error("Render loop missing");
if (!game.includes("window.__DIGUL_DIAGNOSTICS__")) throw new Error("Runtime diagnostics missing");
if (!game.includes("physics-dessert") || !game.includes("syncSprites")) throw new Error("DOM physics sprite layer missing");
if (game.indexOf("requestAnimationFrame(frame)") > game.lastIndexOf("refreshLeaderboard(true).catch")) {
  throw new Error("Render loop must start before network leaderboard refresh");
}

console.log("CAFFIEND PLAY v2 static smoke checks passed.");
