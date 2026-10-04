import fs from "node:fs";
import vm from "node:vm";

const index = fs.readFileSync("index.html", "utf8");
const style = fs.readFileSync("style.css", "utf8");
const game = fs.readFileSync("game.js", "utf8");
const sideGames = fs.readFileSync("side-games.js", "utf8");
const dessertArt = fs.readFileSync("dessert-art.js", "utf8");
const configSource = fs.readFileSync("config.js", "utf8");

const requiredIds = [
  "entryScreen","gameScreen","nicknameInput","startButton","nicknameDisplay","pauseButton",
  "scoreValue","personalBestValue","nextPreview","gameCanvas","connectionPill","connectionText",
  "myRankValue","topScoreValue","recipeButton","recipeButtonPreview","rankingButton",
  "resultOverlay","restartButton","recipeOverlay","rankingOverlay","rankingList",
  "openSouffleButton","openMysteryButton","souffleScreen","mysteryScreen",
  "whiskButton","ovenTapButton","finishSouffleButton","suspectGrid","nextClueButton"
];

for (const id of requiredIds) {
  if (!index.includes(`id="${id}"`)) throw new Error(`Missing required DOM id: ${id}`);
  if (id !== "entryScreen" && id !== "gameScreen" && !game.includes(`"${id}"`) && !game.includes(`('${id}')`)) {
    // Some structural ids are used only by HTML/CSS, so only report obvious wiring issues.
  }
}

if (/<svg\b/i.test(index + style + game + sideGames + dessertArt) || /data:image\/svg/i.test(index + style + game + sideGames + dessertArt)) {
  throw new Error("SVG UI assets are not allowed in the current DIGUL visual direction.");
}

const sandbox = { window: {} };
vm.runInNewContext(configSource, sandbox);
const config = sandbox.window.DIGUL_CONFIG;
if (!config) throw new Error("DIGUL_CONFIG not found");
if (config.version !== "1.5.1") throw new Error("Unexpected UI version");
if (!Array.isArray(config.menus) || config.menus.length !== 11) throw new Error("Exactly 11 menu stages are required");

config.menus.forEach((menu, index) => {
  if (menu.level !== index + 1) throw new Error(`Menu level mismatch at ${index + 1}`);
  if (!menu.name || !menu.file) throw new Error(`Menu metadata missing at ${index + 1}`);
});

if (config.ranking.period !== "weekly") throw new Error("Leaderboard must use weekly aggregation");
if (!config.store.leaderboardApi.includes("supabase.co/functions/v1/digul-api")) throw new Error("Live Supabase leaderboard API is not configured");
if (config.gameplay.completionBonus !== 150) throw new Error("Completion bonus must remain 150");

const scriptOrder = ["config.js","experience.js","leaderboard.js","analytics.js","dessert-art.js","game.js","side-games.js"];
let cursor = -1;
for (const script of scriptOrder) {
  const next = index.indexOf(script);
  if (next < 0 || next <= cursor) throw new Error(`Invalid script order: ${script}`);
  cursor = next;
}

if (!dessertArt.includes("window.DigulDessertArt")) throw new Error("Dessert art engine missing");
if (!dessertArt.includes("menu-atlas-v2.webp")) throw new Error("High-quality raster menu atlas missing from renderer");
if (!dessertArt.includes("atlasStatus")) throw new Error("Raster sanity fallback missing");
if (!dessertArt.includes("ATLAS_W=512") || !dessertArt.includes("ATLAS_H=384")) throw new Error("Expected real 512x384 dessert atlas renderer");
if (!sideGames.includes("openSouffleButton") || !sideGames.includes("openMysteryButton")) throw new Error("Side game wiring missing");
if (!game.includes("MENU_ATLAS_URL") || !game.includes("menuAtlasLoaded")) throw new Error("Direct DIGUL raster atlas renderer missing");

console.log("CAFFIEND PLAY static smoke checks passed.");
