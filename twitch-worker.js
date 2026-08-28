/**
 * Storm Watch — Twitch live-status proxy
 * ----------------------------------------
 * Twitch's Helix API requires an App Access Token generated with your
 * Client ID + Client Secret. The secret can never be exposed in frontend
 * JS, so this Worker holds it and does the token dance server-side —
 * same pattern as your OliTracker/StreamElements overlay Worker.
 *
 * SETUP
 * 1. Register an app at https://dev.twitch.tv/console/apps to get a
 *    Client ID and Client Secret.
 * 2. Deploy this file as a Cloudflare Worker (wrangler deploy, or paste
 *    into the dashboard editor).
 * 3. Set secrets (never hardcode them):
 *      wrangler secret put TWITCH_CLIENT_ID
 *      wrangler secret put TWITCH_CLIENT_SECRET
 * 4. Optionally bind a KV namespace called TOKEN_KV to cache the app
 *    token across requests (recommended — avoids re-authing on every
 *    page load). Without KV it just re-fetches a token each cold start,
 *    which still works fine at tournament scale.
 * 5. Put the deployed Worker URL into CONFIG.TWITCH_WORKER_URL in index.html.
 *
 * USAGE
 *   GET https://your-worker.workers.dev/?logins=riggs,zephyrfn,novaclutch
 *   -> { "streams": [ { user_login, title, viewer_count, thumbnail_url, game_name }, ... ] }
 *   (Only currently-live channels are returned — same behavior Twitch's
 *   /streams endpoint gives you natively.)
 */

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const STREAMS_URL = "https://api.twitch.tv/helix/streams";

// CORS: lock this down to your actual site domain before going live.
const ALLOWED_ORIGIN = "*";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const loginsParam = url.searchParams.get("logins") || "";
    const logins = loginsParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 100); // Helix allows up to 100 user_login params per call

    if (!logins.length) {
      return json({ streams: [] });
    }

    try {
      const token = await getAppToken(env);
      const streams = await getLiveStreams(logins, token, env);
      return json({ streams });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};

async function getAppToken(env) {
  // Try cached token first (if KV binding exists)
  if (env.TOKEN_KV) {
    const cached = await env.TOKEN_KV.get("twitch_app_token");
    if (cached) return cached;
  }

  const params = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch(TOKEN_URL, { method: "POST", body: params });
  if (!res.ok) throw new Error("token request failed: " + res.status);
  const data = await res.json();

  if (env.TOKEN_KV) {
    // Cache for slightly less than the token's real lifetime
    await env.TOKEN_KV.put("twitch_app_token", data.access_token, {
      expirationTtl: Math.max(60, (data.expires_in || 3600) - 120),
    });
  }

  return data.access_token;
}

async function getLiveStreams(logins, token, env) {
  const qs = new URLSearchParams();
  logins.forEach((l) => qs.append("user_login", l));

  const res = await fetch(`${STREAMS_URL}?${qs.toString()}`, {
    headers: {
      "Client-Id": env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 && env.TOKEN_KV) {
    // token expired/invalid — clear cache and let the caller retry next request
    await env.TOKEN_KV.delete("twitch_app_token");
  }
  if (!res.ok) throw new Error("streams request failed: " + res.status);

  const data = await res.json();
  return (data.data || []).map((s) => ({
    user_login: s.user_login,
    title: s.title,
    viewer_count: s.viewer_count,
    thumbnail_url: s.thumbnail_url,
    game_name: s.game_name,
  }));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
