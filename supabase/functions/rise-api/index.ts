import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const REWARDS_ENABLED = (Deno.env.get("RISE_REWARDS_ENABLED") ?? "false") === "true";
const REWARD_MIN_SCORE = Number(Deno.env.get("RISE_REWARD_MIN_SCORE") ?? "1800");
const ALLOWED_ORIGIN = Deno.env.get("RISE_ALLOWED_ORIGIN") ?? "*";

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

const validSeason = (value: string) => ["spring", "summer", "autumn", "winter"].includes(value);
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function claimCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function topRows(storeId: string, seasonId: string, dayKey: string, deviceHash = "", limit = 5) {
  const { data, error } = await db
    .from("rise_scores")
    .select("score,device_hash,created_at")
    .eq("store_id", storeId)
    .eq("season_id", seasonId)
    .eq("day_key", dayKey)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 10));
  if (error) throw error;
  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    score: Number(row.score),
    label: index === 0 ? "TODAY'S RECORD" : `TODAY #${index + 1}`,
    mine: Boolean(deviceHash && row.device_hash === deviceHash)
  }));
}

async function bestAllTime(storeId: string, seasonId: string) {
  const { data, error } = await db
    .from("rise_scores")
    .select("score")
    .eq("store_id", storeId)
    .eq("season_id", seasonId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.score ?? 0);
}

async function rankFor(storeId: string, seasonId: string, dayKey: string, deviceHash: string) {
  if (!deviceHash) return null;
  const { data: mine, error: mineError } = await db
    .from("rise_scores")
    .select("score")
    .eq("store_id", storeId)
    .eq("season_id", seasonId)
    .eq("day_key", dayKey)
    .eq("device_hash", deviceHash)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (mineError || !mine) return null;
  const { count, error } = await db
    .from("rise_scores")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("season_id", seasonId)
    .eq("day_key", dayKey)
    .gt("score", Number(mine.score));
  if (error) throw error;
  return Number(count ?? 0) + 1;
}

async function handleGet(url: URL) {
  const storeId = url.searchParams.get("storeId") ?? "";
  const seasonId = url.searchParams.get("seasonId") ?? "";
  const dayKey = url.searchParams.get("date") ?? "";
  const deviceId = url.searchParams.get("deviceId") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? "5");
  if (!storeId || !validSeason(seasonId) || !validDate(dayKey)) return json({ error: "INVALID_QUERY" }, 400);

  const deviceHash = deviceId ? await sha256(deviceId) : "";
  const top = await topRows(storeId, seasonId, dayKey, deviceHash, limit);
  const rank = await rankFor(storeId, seasonId, dayKey, deviceHash);
  const allTimeBest = await bestAllTime(storeId, seasonId);
  return json({ dailyBest: Number(top[0]?.score ?? 0), allTimeBest, rank, top });
}

async function handlePost(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "INVALID_JSON" }, 400);

  const storeId = String(body.storeId ?? "").slice(0, 80);
  const seasonId = String(body.seasonId ?? "");
  const dayKey = String(body.date ?? "");
  const playId = String(body.playId ?? "").slice(0, 160);
  const deviceId = String(body.deviceId ?? "").slice(0, 200);
  const sessionId = String(body.sessionId ?? "").slice(0, 200);
  const score = Math.round(Number(body.score ?? -1));
  const metrics = body.metrics && typeof body.metrics === "object" ? body.metrics : {};

  if (!storeId || !validSeason(seasonId) || !validDate(dayKey) || !playId || !deviceId || !Number.isFinite(score) || score < 0 || score > 20000) {
    return json({ error: "INVALID_SCORE_PAYLOAD" }, 400);
  }

  const perfectRate = Math.round(Number(metrics.perfectRate ?? 0));
  const maxCombo = Math.round(Number(metrics.maxCombo ?? 0));
  const tapCount = Math.round(Number(metrics.tapCount ?? 0));
  const duration = Number(metrics.duration ?? 0);
  if (perfectRate < 0 || perfectRate > 100 || maxCombo < 0 || maxCombo > 100 || tapCount < 0 || tapCount > 200 || duration < 20 || duration > 27) {
    return json({ error: "INVALID_GAME_METRICS" }, 400);
  }

  const deviceHash = await sha256(deviceId);
  const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
  const { data: recent } = await db
    .from("rise_scores")
    .select("id")
    .eq("store_id", storeId)
    .eq("device_hash", deviceHash)
    .gte("created_at", tenSecondsAgo)
    .limit(1);
  if (recent?.length) return json({ error: "TOO_MANY_SUBMISSIONS" }, 429);

  const { data: priorTop, error: priorError } = await db
    .from("rise_scores")
    .select("score")
    .eq("store_id", storeId)
    .eq("season_id", seasonId)
    .eq("day_key", dayKey)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (priorError) throw priorError;

  const previousDailyBest = Number(priorTop?.score ?? 0);
  const previousAllTimeBest = await bestAllTime(storeId, seasonId);

  const { data: inserted, error: insertError } = await db
    .from("rise_scores")
    .insert({
      store_id: storeId,
      season_id: seasonId,
      day_key: dayKey,
      score,
      play_id: playId,
      device_hash: deviceHash,
      session_id: sessionId,
      perfect_rate: perfectRate,
      max_combo: maxCombo,
      tap_count: tapCount,
      metadata: { attribution: body.attribution ?? {}, duration }
    })
    .select("id")
    .single();
  if (insertError) {
    if (String(insertError.code) === "23505") return json({ error: "DUPLICATE_PLAY" }, 409);
    throw insertError;
  }

  const isDailyRecord = score > previousDailyBest;
  const isAllTimeRecord = score > previousAllTimeBest;
  let reward = null;

  if (REWARDS_ENABLED && isDailyRecord && score >= REWARD_MIN_SCORE) {
    const { data: existing } = await db
      .from("rise_reward_claims")
      .select("claim_code,status")
      .eq("store_id", storeId)
      .eq("day_key", dayKey)
      .eq("device_hash", deviceHash)
      .maybeSingle();

    if (existing) {
      reward = { headline: "오늘의 기록 보상", body: "오늘 발급된 기록 코드가 이미 있습니다.", claimCode: existing.claim_code, status: existing.status };
    } else {
      const code = claimCode();
      const { data: claim, error: claimError } = await db
        .from("rise_reward_claims")
        .insert({ store_id: storeId, season_id: seasonId, day_key: dayKey, score_id: inserted.id, device_hash: deviceHash, claim_code: code })
        .select("claim_code,status")
        .single();
      if (!claimError && claim) reward = { headline: "오늘의 기록 보상", body: "직원 확인용 기록 코드가 발급되었습니다.", claimCode: claim.claim_code, status: claim.status };
    }
  }

  const top = await topRows(storeId, seasonId, dayKey, deviceHash, 5);
  const rank = await rankFor(storeId, seasonId, dayKey, deviceHash);
  const allTimeBest = Math.max(previousAllTimeBest, score);
  return json({
    dailyBefore: previousDailyBest,
    dailyBest: Math.max(previousDailyBest, score),
    allTimeBest,
    rank,
    top,
    isDailyRecord,
    isAllTimeRecord,
    reward
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    if (req.method === "GET") return await handleGet(url);
    if (req.method === "POST") return await handlePost(req);
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    console.error(error);
    return json({ error: "SERVER_ERROR" }, 500);
  }
});
