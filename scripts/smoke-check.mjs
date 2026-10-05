import fs from "node:fs";
import vm from "node:vm";

const index = fs.readFileSync("index.html", "utf8");
const style = fs.readFileSync("style.css", "utf8");
const souffleStyle = fs.readFileSync("souffle.css", "utf8");
const game = fs.readFileSync("game.js", "utf8");
const sideGames = fs.readFileSync("side-games.js", "utf8");
const souffleGame = fs.readFileSync("souffle-game.js", "utf8");
const dessertArt = fs.readFileSync("dessert-art.js", "utf8");
const spriteRenderer = fs.readFileSync("sprite-renderer.js", "utf8");
const configSource = fs.readFileSync("config.js", "utf8");

const requiredIds = [
  "entryScreen","gameScreen","nicknameInput","startButton","nicknameDisplay","pauseButton",
  "scoreValue","personalBestValue","nextPreview","gameCanvas","connectionPill","connectionText",
  "myRankValue","topScoreValue","recipeButton","recipeButtonPreview","rankingButton",
  "resultOverlay","restartButton","recipeOverlay","rankingOverlay","rankingList",
  "openSouffleButton","openMysteryButton","souffleScreen","mysteryScreen","suspectGrid","nextClueButton",
  "spriteLayer","dropSprite","souffleSelectPanel","souffleTutorialPanel","soufflePlayPanel","souffleResultPanel",
  "souffleMenuGrid","souffleContinueButton","souffleTutorialStart","souffleTimer","souffleStepBadge",
  "souffleStepTitle","souffleStepHint","souffleScoreLive","souffleProgressFill","souffleWorkArea",
  "souffleResultArt","souffleFinalScore","souffleRetryButton","souffleReselectButton","souffleSoundButton"
];

for (const id of requiredIds) {
  if (!index.includes(`id="${id}"`)) throw new Error(`Missing required DOM id: ${id}`);
}

if (/<svg\b/i.test(index + style + souffleStyle + game + sideGames + souffleGame + dessertArt) || /data:image\/svg/i.test(index + style + souffleStyle + game + sideGames + souffleGame + dessertArt)) {
  throw new Error("SVG UI assets are not allowed in the current CAFFIEND visual direction.");
}

const sandbox = { window: {} };
vm.runInNewContext(configSource, sandbox);
const config = sandbox.window.DIGUL_CONFIG;
if (!config) throw new Error("DIGUL_CONFIG not found");
if (config.version !== "1.8.0") throw new Error("Unexpected UI version");
if (!Array.isArray(config.menus) || config.menus.length !== 11) throw new Error("Exactly 11 menu stages are required");
if (!config.souffle || config.souffle.steps !== 12) throw new Error("Souffle maker must expose 12 cooking steps");
if (config.souffle.targetSeconds !== 270) throw new Error("Souffle target timer must be 4:30");
if (!Array.isArray(config.souffle.interactions) || config.souffle.interactions.length !== 4) throw new Error("Souffle maker must use four common interaction systems");

config.menus.forEach((menu, index) => {
  if (menu.level !== index + 1) throw new Error(`Menu level mismatch at ${index + 1}`);
  if (!menu.name || !menu.file) throw new Error(`Menu metadata missing at ${index + 1}`);
});

if (config.ranking.period !== "weekly") throw new Error("Leaderboard must use weekly aggregation");
if (!config.store.leaderboardApi.includes("supabase.co/functions/v1/digul-api")) throw new Error("Live Supabase leaderboard API is not configured");
if (config.gameplay.completionBonus !== 150) throw new Error("Completion bonus must remain 150");
if (config.assets.renderer !== "dom-procedural-raster-v1") throw new Error("DOM raster renderer must be active");

const scriptOrder = ["config.js","experience.js","leaderboard.js","analytics.js","dessert-art.js","sprite-renderer.js","game.js","side-games.js","souffle-game.js"];
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
if (!sideGames.includes("souffle.css?v=1.8.0")) throw new Error("Souffle stylesheet loader missing");
if (!souffleGame.includes("openSouffleButton")) throw new Error("Souffle entry wiring missing");
if (!souffleGame.includes("case 12:return stepFinishBake")) throw new Error("12-step souffle flow missing");
if (!souffleGame.includes("stepMeringue") || !souffleGame.includes("stepFirstBake") || !souffleGame.includes("stepFinalFold")) throw new Error("Core souffle cooking interactions missing");
if (!souffleGame.includes("souffle_game_finish")) throw new Error("Souffle completion analytics missing");
if (!spriteRenderer.includes("window.DigulSpriteRenderer")) throw new Error("Unified DIGUL sprite renderer missing");
if (!spriteRenderer.includes("selfTest")) throw new Error("Sprite renderer self-test missing");
if (!game.includes("requestAnimationFrame(frame)")) throw new Error("Render loop missing");
if (!game.includes("window.__DIGUL_DIAGNOSTICS__")) throw new Error("Runtime diagnostics missing");
if (!game.includes("physics-dessert") || !game.includes("syncSprites")) throw new Error("DOM physics sprite layer missing");
if (game.indexOf("requestAnimationFrame(frame)") > game.lastIndexOf("refreshLeaderboard(true).catch")) {
  throw new Error("Render loop must start before network leaderboard refresh");
}

console.log("CAFFIEND PLAY static smoke checks passed.");
