import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("SOUFFLE_ALLOWED_ORIGIN") ?? "*";
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

const MENUS = new Set(["lotus","chestnut","sesame","peach","dubai","injeolmi","brulee"]);
const SEASONS = new Set(["spring","summer","autumn","winter"]);
const TARGET_MS = 270000;
const FIXED: Record<number, { points:number, quality:string }> = {
  1:{points:100,quality:"PERFECT"},
  2:{points:100,quality:"PERFECT"},
  3:{points:100,quality:"PERFECT"},
  4:{points:100,quality:"PERFECT"},
  5:{points:90,quality:"GOOD"},
  6:{points:130,quality:"PERFECT"},
  7:{points:100,quality:"PERFECT"},
  10:{points:110,quality:"PERFECT"},
  11:{points:120,quality:"PERFECT"}
};

function route(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  return "/" + parts.slice(parts.indexOf("souffle-api") + 1).join("/");
}

function validNickname(value: string) {
  return /^[가-힣A-Za-z0-9]{2,10}$/.test(value);
}

function validSessionId(value: string) {
  return /^[A-Za-z0-9-]{12,160}$/.test(value);
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function validStepResults(raw: unknown, timingScore: number) {
  if (!Array.isArray(raw) || raw.length !== 12) return null;
  const results = raw.map((item:any) => ({
    step:Math.round(Number(item?.step ?? 0)),
    quality:String(item?.quality ?? ""),
    points:Math.round(Number(item?.points ?? -1))
  }));

  for (let index = 0; index < 12; index++) {
    const item = results[index];
    const step = index + 1;
    if (item.step !== step || !Number.isFinite(item.points)) return null;

    if (FIXED[step]) {
      if (item.points !== FIXED[step].points || item.quality !== FIXED[step].quality) return null;
      continue;
    }

    if (step === 8) {
      const allowed = (item.points === 120 && item.quality === "PERFECT") ||
        (item.points === 75 && item.quality === "GOOD");
      if (!allowed) return null;
      continue;
    }

    if (step === 9) {
      const allowed = (item.points === 140 && item.quality === "PERFECT") ||
        (item.points === 80 && item.quality === "GOOD");
      if (!allowed) return null;
      continue;
    }

    if (step === 12) {
      const expectedPoints = 120 + timingScore;
      const expectedQuality = timingScore >= 82 ? "PERFECT" : timingScore >= 55 ? "GOOD" : "OK";
      if (item.points !== expectedPoints || item.quality !== expectedQuality) return null;
    }
  }
  return results;
}

async function rateLimited(storeId: string, playerHash: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count, error } = await db.from("souffle_runs")
    .select("session_id", { count:"exact", head:true })
    .eq("store_id", storeId)
    .eq("player_hash", playerHash)
    .gte("completed_at", since);
  if (error) throw error;
  return Number(count || 0) >= 20;
}

async function saveRun(body: any) {
  const storeId = String(body?.storeId ?? "").slice(0,80);
  const playerId = String(body?.playerId ?? "").slice(0,200);
  const nickname = String(body?.nickname ?? "").trim();
  const sessionId = String(body?.sessionId ?? "").trim();
  const menuId = String(body?.menuId ?? "");
  const season = String(body?.season ?? "");
  const elapsedMs = Math.round(Number(body?.elapsedMs ?? 0));
  const timingScore = Math.round(Number(body?.timingScore ?? -1));

  if (!storeId || !playerId || !validNickname(nickname) || !validSessionId(sessionId) ||
      !MENUS.has(menuId) || !SEASONS.has(season) ||
      !Number.isFinite(elapsedMs) || elapsedMs < 30000 || elapsedMs > 1800000 ||
      timingScore < 0 || timingScore > 100) {
    return json({ error:"INVALID_RUN" }, 400);
  }

  const steps = validStepResults(body?.stepResults, timingScore);
  if (!steps) return json({ error:"INVALID_STEPS" }, 400);

  const playerHash = await hash(playerId);
  const { data: existing, error: existingError } = await db.from("souffle_runs")
    .select("session_id,player_hash,score,elapsed_ms")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    if (existing.player_hash !== playerHash) return json({ error:"SESSION_CONFLICT" }, 409);
    return json({ sessionId, score:Number(existing.score), elapsedMs:Number(existing.elapsed_ms), duplicate:true });
  }

  if (await rateLimited(storeId, playerHash)) return json({ error:"RATE_LIMITED" }, 429);

  const overtimeMs = Math.max(0, elapsedMs - TARGET_MS);
  const rawScore = steps.reduce((sum,item) => sum + item.points, 0);
  const penalty = Math.round(overtimeMs / 1000 * 2);
  const score = Math.max(0, rawScore - penalty);

  const { error } = await db.from("souffle_runs").insert({
    session_id:sessionId,
    store_id:storeId,
    player_hash:playerHash,
    nickname,
    menu_id:menuId,
    season,
    elapsed_ms:elapsedMs,
    overtime_ms:overtimeMs,
    score,
    timing_score:timingScore,
    step_results:steps,
    completed_at:new Date().toISOString()
  });
  if (error) throw error;

  return json({ sessionId, score, elapsedMs, overtimeMs, duplicate:false });
}

async function saveFeedback(body: any) {
  const storeId = String(body?.storeId ?? "").slice(0,80);
  const playerId = String(body?.playerId ?? "").slice(0,200);
  const sessionId = String(body?.sessionId ?? "").trim();
  const fun = Math.round(Number(body?.fun ?? 0));
  const wait = Math.round(Number(body?.wait ?? 0));
  const anticipation = Math.round(Number(body?.anticipation ?? 0));

  if (!storeId || !playerId || !validSessionId(sessionId) ||
      [fun,wait,anticipation].some(value => value < 1 || value > 5)) {
    return json({ error:"INVALID_FEEDBACK" }, 400);
  }

  const playerHash = await hash(playerId);
  const { data: run, error: runError } = await db.from("souffle_runs")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("store_id", storeId)
    .eq("player_hash", playerHash)
    .maybeSingle();
  if (runError) throw runError;
  if (!run) return json({ error:"RUN_NOT_FOUND" }, 404);

  const now = new Date().toISOString();
  const { error } = await db.from("souffle_feedback").upsert({
    session_id:sessionId,
    store_id:storeId,
    player_hash:playerHash,
    fun_rating:fun,
    wait_rating:wait,
    anticipation_rating:anticipation,
    updated_at:now
  }, { onConflict:"session_id" });
  if (error) throw error;

  return json({ ok:true, sessionId });
}

async function summary(storeId: string) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data:runs, error:runError } = await db.from("souffle_runs")
    .select("score,elapsed_ms,overtime_ms,menu_id,season")
    .eq("store_id", storeId)
    .gte("completed_at", since)
    .limit(5000);
  if (runError) throw runError;

  const { data:feedback, error:feedbackError } = await db.from("souffle_feedback")
    .select("fun_rating,wait_rating,anticipation_rating")
    .eq("store_id", storeId)
    .gte("created_at", since)
    .limit(5000);
  if (feedbackError) throw feedbackError;

  const list = runs ?? [];
  const fb = feedback ?? [];
  const avg = (values:number[]) => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length*100)/100 : null;
  const menuCounts:Record<string,number> = {};
  for (const row of list) menuCounts[String(row.menu_id)] = (menuCounts[String(row.menu_id)] || 0) + 1;

  return json({
    windowDays:30,
    runs:list.length,
    avgScore:avg(list.map((x:any)=>Number(x.score))),
    avgElapsedSec:avg(list.map((x:any)=>Number(x.elapsed_ms)/1000)),
    overtimeRate:list.length ? Math.round(list.filter((x:any)=>Number(x.overtime_ms)>0).length/list.length*1000)/10 : 0,
    feedback:fb.length,
    avgFun:avg(fb.map((x:any)=>Number(x.fun_rating))),
    avgWait:avg(fb.map((x:any)=>Number(x.wait_rating))),
    avgAnticipation:avg(fb.map((x:any)=>Number(x.anticipation_rating))),
    menuCounts
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  try {
    const url = new URL(req.url);
    const path = route(url);

    if (req.method === "GET" && path === "/health") return json({ ok:true, service:"souffle-api", version:2 });
    if (req.method === "GET" && path === "/summary") {
      const storeId = String(url.searchParams.get("storeId") ?? "").slice(0,80);
      if (!storeId) return json({ error:"INVALID_QUERY" }, 400);
      return await summary(storeId);
    }

    const body = await req.json().catch(() => null);
    if (!body) return json({ error:"INVALID_JSON" }, 400);
    if (req.method === "POST" && path === "/run") return await saveRun(body);
    if (req.method === "POST" && path === "/feedback") return await saveFeedback(body);
    return json({ error:"NOT_FOUND" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error:"SERVER_ERROR" }, 500);
  }
});