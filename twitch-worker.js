/**
 * K&S FN Tournament — backend Worker
 * -----------------------------------
 * Stores all tournament data (teams, games, scoring settings) in
 * Cloudflare KV, and gates writes behind a password-based admin login.
 * No Twitch integration — this Worker only handles tournament data.
 *
 * SETUP
 * 1. Deploy this file as a Cloudflare Worker.
 * 2. Create a KV namespace and bind it as TOURNAMENT_KV:
 *      wrangler kv:namespace create tournament_kv
 *      (then add the binding in wrangler.toml or the dashboard)
 * 3. Set secrets:
 *      wrangler secret put ADMIN_PASSWORD    <- what admins type in to log in
 *      wrangler secret put SESSION_SECRET     <- any random string, signs login tokens
 * 4. Put this Worker's deployed URL into CONFIG.API_URL near the top of
 *    tournament.html's <script> section.
 *
 * ENDPOINTS
 *   POST /admin/login   { password }             -> { token }
 *   GET  /admin/data     (Authorization: Bearer)  -> { settings, teams, games }
 *   POST /admin/save     (Authorization: Bearer)  <- { settings, teams, games }
 *   GET  /public/data                              -> { leaderboard, bounties }
 *
 * Sessions are stateless: a token is "<timestamp>.<signature>" signed with
 * SESSION_SECRET and valid for 24 hours. There's no server-side session
 * list, so there's no way to force-revoke a token early — if that matters,
 * change ADMIN_PASSWORD to invalidate every outstanding token at once.
 */

const KV_KEY = "tournament_data";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ALLOWED_ORIGIN = "*"; // lock this down to your real site domain before going live

const DEFAULT_DATA = {
  settings: {
    pointsPerKill: 1,
    placementPoints: { 1: 10, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 3, 8: 3, 9: 2, 10: 2, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1 },
  },
  teams: Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
    player1: "", player1Twitch: "",
    player2: "", player2Twitch: "",
    approvedBy: "",
  })),
  games: [], // each: { gameNumber, placements: {teamId: placement}, stats: {teamId: {p1:{kills,assists,accuracy,headshots}, p2:{...}}} }
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

    try {
      if (path === "/admin/login" && request.method === "POST") return await handleLogin(request, env);
      if (path === "/admin/data" && request.method === "GET") return await handleAdminGet(request, env);
      if (path === "/admin/save" && request.method === "POST") return await handleAdminSave(request, env);
      if (path === "/public/data" && request.method === "GET") return await handlePublicGet(env);
      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};

/* ---------------- auth ---------------- */

async function sign(message, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeToken(env) {
  const ts = Date.now().toString();
  const sig = await sign(ts, env.SESSION_SECRET);
  return `${ts}.${sig}`;
}

async function verifyToken(token, env) {
  if (!token) return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  if (Date.now() - Number(ts) > SESSION_TTL_MS) return false;
  const expected = await sign(ts, env.SESSION_SECRET);
  return expected === sig;
}

function getBearer(request) {
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  if (body.password !== env.ADMIN_PASSWORD) return json({ error: "wrong password" }, 401);
  const token = await makeToken(env);
  return json({ token });
}

/* ---------------- data ---------------- */

async function loadData(env) {
  const raw = await env.TOURNAMENT_KV.get(KV_KEY);
  return raw ? JSON.parse(raw) : DEFAULT_DATA;
}

async function handleAdminGet(request, env) {
  const token = getBearer(request);
  if (!(await verifyToken(token, env))) return json({ error: "unauthorized" }, 401);
  return json(await loadData(env));
}

async function handleAdminSave(request, env) {
  const token = getBearer(request);
  if (!(await verifyToken(token, env))) return json({ error: "unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || !body.settings || !body.teams || !body.games) return json({ error: "malformed data" }, 400);
  await env.TOURNAMENT_KV.put(KV_KEY, JSON.stringify(body));
  return json({ ok: true });
}

async function handlePublicGet(env) {
  const data = await loadData(env);
  return json(computeLeaderboardAndBounties(data));
}

function computeLeaderboardAndBounties(data) {
  const { settings, teams, games } = data;
  const pointsPerKill = Number(settings.pointsPerKill) || 0;
  const placementScale = settings.placementPoints || {};

  const leaderboard = [];
  const bounties = [];

  for (const team of teams) {
    let totalKills = 0;
    let placementPoints = 0;
    const agg = {
      p1: { kills: 0, assists: 0, headshots: 0, accSum: 0, accCount: 0 },
      p2: { kills: 0, assists: 0, headshots: 0, accSum: 0, accCount: 0 },
    };

    for (const game of games) {
      const placement = game.placements ? game.placements[team.id] : null;
      if (placement) placementPoints += Number(placementScale[placement]) || 0;

      const stat = game.stats ? game.stats[team.id] : null;
      if (stat) {
        for (const slot of ["p1", "p2"]) {
          const s = stat[slot];
          if (!s) continue;
          const kills = Number(s.kills) || 0;
          const assists = Number(s.assists) || 0;
          const headshots = Number(s.headshots) || 0;
          totalKills += kills;
          agg[slot].kills += kills;
          agg[slot].assists += assists;
          agg[slot].headshots += headshots;
          if (s.accuracy !== null && s.accuracy !== undefined && s.accuracy !== "") {
            agg[slot].accSum += Number(s.accuracy);
            agg[slot].accCount += 1;
          }
        }
      }
    }

    const killsPoints = totalKills * pointsPerKill;
    const totalPoints = killsPoints + placementPoints;

    leaderboard.push({
      team: team.name,
      p1: team.player1, p1twitch: (team.player1Twitch || "").toLowerCase(),
      p2: team.player2, p2twitch: (team.player2Twitch || "").toLowerCase(),
      totalKills, killsPoints, placementPoints, totalPoints,
      approvedBy: team.approvedBy || "",
    });

    for (const [slot, playerName, twitch] of [["p1", team.player1, team.player1Twitch], ["p2", team.player2, team.player2Twitch]]) {
      if (!playerName) continue;
      const a = agg[slot];
      bounties.push({
        team: team.name,
        name: playerName,
        twitch: (twitch || "").toLowerCase(),
        kills: a.kills,
        assists: a.assists,
        accuracy: a.accCount ? a.accSum / a.accCount : 0,
        headshots: a.headshots,
      });
    }
  }

  return { leaderboard, bounties };
}

/* ---------------- helpers ---------------- */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...corsHeaders() } });
}
