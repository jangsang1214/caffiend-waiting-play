import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("DIGUL_ALLOWED_ORIGIN") ?? "*";
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers:{ ...cors, "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store" }
});

const SCORE_FOR_TARGET_LEVEL: Record<number, number> = {
  2:3, 3:6, 4:10, 5:15, 6:21, 7:28, 8:36, 9:45, 10:55, 11:66
};
const COMPLETION_BONUS = 150;

function currentWeekKeyKst() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  const midnight = new Date(`${p.year}-${p.month}-${p.day}T00:00:00+09:00`);
  const weekday = midnight.getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const monday = new Date(midnight.getTime() - mondayOffset * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const f = (d: Date) => new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit"
  }).format(d);
  return `${f(monday)}_${f(sunday)}`;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function validNickname(value: string) {
  return /^[가-힣A-Za-z0-9]{2,10}$/.test(value);
}

function route(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  return "/" + parts.slice(parts.indexOf("digul-api") + 1).join("/");
}

async function leaderboard(storeId: string, weekKey: string, playerHash: string) {
  const { data: top, error: topError } = await db
    .from("digul_weekly_ranked")
    .select("rank,player_hash,nickname,score,achieved_at")
    .eq("store_id", storeId)
    .eq("week_key", weekKey)
    .order("rank", { ascending:true })
    .limit(20);
  if (topError) throw topError;

  const { data: mine, error: mineError } = await db
    .from("digul_weekly_ranked")
    .select("rank,player_hash,nickname,score,achieved_at")
    .eq("store_id", storeId)
    .eq("week_key", weekKey)
    .eq("player_hash", playerHash)
    .maybeSingle();
  if (mineError) throw mineError;

  const rows = (top ?? []).map((row: any) => ({
    rank:Number(row.rank),
    playerId:"",
    nickname:String(row.nickname),
    score:Number(row.score),
    mine:row.player_hash === playerHash
  }));
  return {
    weekKey,
    myRank:mine ? Number(mine.rank) : null,
    myBest:mine ? Number(mine.score) : 0,
    topScore:rows.length ? Number(rows[0].score) : 0,
    rows
  };
}

async function startGame(body: any) {
  const storeId = String(body?.storeId ?? "").slice(0, 80);
  const gameId = String(body?.gameId ?? "").slice(0, 160);
  const playerId = String(body?.playerId ?? "").slice(0, 200);
  const nickname = String(body?.nickname ?? "").trim();
  const weekKey = currentWeekKeyKst();
  if (!storeId || !gameId || !playerId || !validNickname(nickname)) {
    return json({ error:"INVALID_START" }, 400);
  }
  const playerHash = await hash(playerId);
  const { error } = await db.from("digul_games").upsert({
    game_id:gameId, store_id:storeId, week_key:weekKey,
    player_hash:playerHash, nickname, updated_at:new Date().toISOString()
  }, { onConflict:"game_id", ignoreDuplicates:true });
  if (error) throw error;
  return json({ gameId, weekKey });
}

function validateEvent(event: any) {
  const seq = Math.round(Number(event?.seq ?? 0));
  const type = String(event?.type ?? "");
  const atMs = Math.round(Number(event?.atMs ?? 0));
  if (!Number.isFinite(seq) || seq < 1 || !["drop","merge"].includes(type)) return null;
  if (type === "drop") {
    const level = Math.round(Number(event?.level ?? 0));
    if (level < 1 || level > 5) return null;
    return { seq, type, fromLevel:level, toLevel:null, points:0, atMs };
  }
  const fromLevel = Math.round(Number(event?.fromLevel ?? 0));
  const toLevel = event?.toLevel == null ? null : Math.round(Number(event.toLevel));
  const points = Math.round(Number(event?.points ?? -1));
  if (fromLevel < 1 || fromLevel > 11) return null;
  if (fromLevel === 11) {
    if (toLevel !== null || points !== COMPLETION_BONUS) return null;
  } else {
    if (toLevel !== fromLevel + 1) return null;
    if (points !== SCORE_FOR_TARGET_LEVEL[toLevel]) return null;
  }
  return { seq, type, fromLevel, toLevel, points, atMs };
}

async function updateWeeklyBest(storeId: string, weekKey: string, playerHash: string, nickname: string, score: number) {
  const { data: existing, error: readError } = await db.from("digul_weekly_best")
    .select("score,achieved_at").eq("store_id", storeId).eq("week_key", weekKey)
    .eq("player_hash", playerHash).maybeSingle();
  if (readError) throw readError;

  if (!existing) {
    const { error } = await db.from("digul_weekly_best").insert({
      store_id:storeId, week_key:weekKey, player_hash:playerHash,
      nickname, score, achieved_at:new Date().toISOString(), updated_at:new Date().toISOString()
    });
    if (error) throw error;
  } else if (score > Number(existing.score)) {
    const { error } = await db.from("digul_weekly_best").update({
      nickname, score, achieved_at:new Date().toISOString(), updated_at:new Date().toISOString()
    }).eq("store_id", storeId).eq("week_key", weekKey).eq("player_hash", playerHash);
    if (error) throw error;
  } else {
    await db.from("digul_weekly_best").update({
      nickname, updated_at:new Date().toISOString()
    }).eq("store_id", storeId).eq("week_key", weekKey).eq("player_hash", playerHash);
  }
}

async function pushEvents(body: any) {
  const storeId = String(body?.storeId ?? "").slice(0, 80);
  const gameId = String(body?.gameId ?? "").slice(0, 160);
  const playerId = String(body?.playerId ?? "").slice(0, 200);
  const nickname = String(body?.nickname ?? "").trim();
  const rawEvents = Array.isArray(body?.events) ? body.events.slice(0, 100) : [];
  if (!storeId || !gameId || !playerId || !validNickname(nickname)) {
    return json({ error:"INVALID_EVENTS" }, 400);
  }
  const playerHash = await hash(playerId);
  const { data: game, error: gameError } = await db.from("digul_games")
    .select("*").eq("game_id", gameId).eq("store_id", storeId).eq("player_hash", playerHash).maybeSingle();
  if (gameError) throw gameError;
  if (!game) return json({ error:"GAME_NOT_FOUND" }, 404);
  if (game.finished_at) return json({ error:"GAME_FINISHED" }, 409);

  const weekKey = currentWeekKeyKst();
  if (game.week_key !== weekKey) return json({ error:"WEEK_CHANGED" }, 409);

  const events = rawEvents.map(validateEvent).filter(Boolean) as any[];
  events.sort((a,b) => a.seq - b.seq);
  let expected = Number(game.last_seq) + 1;
  let delta = 0;
  let accepted = 0;
  let maxLevel = Number(game.max_level || 1);
  let drops = Number(game.drop_count || 0);
  let merges = Number(game.merge_count || 0);
  const rows:any[] = [];

  for (const event of events) {
    if (event.seq < expected) continue;
    if (event.seq !== expected) break;
    if (event.type === "drop") drops += 1;
    else {
      merges += 1;
      delta += event.points;
      maxLevel = Math.max(maxLevel, event.toLevel || 11);
    }
    rows.push({
      game_id:gameId, seq:event.seq, event_type:event.type,
      from_level:event.fromLevel, to_level:event.toLevel,
      points:event.points, client_at_ms:event.atMs
    });
    expected += 1;
    accepted += 1;
  }

  if (rows.length) {
    const elapsedMs = Math.max(1, Date.now() - new Date(game.started_at).getTime());
    const maxReasonableDrops = Math.floor(elapsedMs / 350) + 8;
    if (drops > maxReasonableDrops) return json({ error:"DROP_RATE_INVALID" }, 400);

    const { error: insertError } = await db.from("digul_game_events").insert(rows);
    if (insertError && String(insertError.code) !== "23505") throw insertError;

    const score = Number(game.score) + delta;
    const { error: updateError } = await db.from("digul_games").update({
      score, max_level:maxLevel, last_seq:expected - 1,
      drop_count:drops, merge_count:merges,
      nickname, updated_at:new Date().toISOString()
    }).eq("game_id", gameId);
    if (updateError) throw updateError;
    await updateWeeklyBest(storeId, weekKey, playerHash, nickname, score);
  }

  const board = await leaderboard(storeId, weekKey, playerHash);
  return json({ accepted, ...board });
}

async function finishGame(body: any) {
  const storeId = String(body?.storeId ?? "").slice(0, 80);
  const gameId = String(body?.gameId ?? "").slice(0, 160);
  const playerId = String(body?.playerId ?? "").slice(0, 200);
  const nickname = String(body?.nickname ?? "").trim();
  if (!storeId || !gameId || !playerId || !validNickname(nickname)) {
    return json({ error:"INVALID_FINISH" }, 400);
  }
  const playerHash = await hash(playerId);
  const { data: game, error } = await db.from("digul_games").select("score,week_key")
    .eq("game_id", gameId).eq("store_id", storeId).eq("player_hash", playerHash).maybeSingle();
  if (error) throw error;
  if (!game) return json({ error:"GAME_NOT_FOUND" }, 404);

  await db.from("digul_games").update({
    nickname, finished_at:new Date().toISOString(), updated_at:new Date().toISOString()
  }).eq("game_id", gameId);
  await updateWeeklyBest(storeId, String(game.week_key), playerHash, nickname, Number(game.score));
  const board = await leaderboard(storeId, String(game.week_key), playerHash);
  return json(board);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  try {
    const url = new URL(req.url);
    const path = route(url);
    if (req.method === "GET" && path === "/leaderboard") {
      const storeId = String(url.searchParams.get("storeId") ?? "").slice(0, 80);
      const playerId = String(url.searchParams.get("playerId") ?? "").slice(0, 200);
      if (!storeId || !playerId) return json({ error:"INVALID_QUERY" }, 400);
      const playerHash = await hash(playerId);
      return json(await leaderboard(storeId, currentWeekKeyKst(), playerHash));
    }
    const body = await req.json().catch(() => null);
    if (!body) return json({ error:"INVALID_JSON" }, 400);
    if (req.method === "POST" && path === "/game/start") return await startGame(body);
    if (req.method === "POST" && path === "/game/events") return await pushEvents(body);
    if (req.method === "POST" && path === "/game/finish") return await finishGame(body);
    return json({ error:"NOT_FOUND" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error:"SERVER_ERROR" }, 500);
  }
});