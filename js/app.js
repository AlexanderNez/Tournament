// Sunset Horizon — public board logic.
// Reads three Firestore collections (teams, games, bounties) and renders
// everything live. If Firebase isn't configured yet, falls back to demo data
// so the page never looks broken while you're setting things up.

const state = {
  teams: {},      // teamId -> {name, player1, player2}
  games: {},      // gameId -> { results: { teamId: {placement, eliminations} } }
  bounties: {},   // bountyKey -> {values:{teamId:num}} or {submissions, winner}
  live: false
};

let spotlightIndex = 0;
let spotlightTimer = null;

function setStatus(live) {
  const pill = document.getElementById("statusPill");
  const text = document.getElementById("statusText");
  if (live) {
    pill.classList.add("live");
    text.textContent = "Live — connected to tournament backend";
  } else {
    pill.classList.remove("live");
    text.textContent = "Demo data — connect the tournament backend to go live";
  }
}

function computeLeaderboard() {
  const teamIds = Object.keys(state.teams);
  const totals = {};
  teamIds.forEach((id) => { totals[id] = 0; });

  GAME_IDS.forEach((gid) => {
    const game = state.games[gid];
    if (!game || !game.results) return;
    Object.entries(game.results).forEach(([teamId, r]) => {
      if (!(teamId in totals)) return;
      const placePts = placementPoints(r.placement);
      const elimPts = (Number(r.eliminations) || 0) * POINTS_PER_ELIM;
      totals[teamId] += placePts + elimPts;
    });
  });

  return teamIds
    .map((id) => ({ id, ...state.teams[id], points: totals[id] || 0 }))
    .sort((a, b) => b.points - a.points);
}

function renderLeaderboard() {
  const rows = computeLeaderboard();
  const body = document.getElementById("leaderboardBody");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="4" class="empty-state">No teams added yet — add rosters in the staff panel.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map((team, i) => `
    <tr class="rank-${i + 1}">
      <td class="rank">#${i + 1}</td>
      <td class="team"><span class="name">${escapeHtml(team.name || "TBD")}</span></td>
      <td class="roster">${escapeHtml(team.player1 || "—")}<br>${escapeHtml(team.player2 || "—")}</td>
      <td class="points">${team.points}</td>
    </tr>
  `).join("");
}

function bountyLeader(bounty) {
  const data = state.bounties[bounty.key];
  if (!data) return null;

  if (bounty.type === "submission") {
    if (!data.winner || !state.teams[data.winner]) return null;
    return { teamId: data.winner, label: "Winning clip" };
  }

  const values = data.values || {};
  let bestId = null, bestVal = -Infinity;
  Object.entries(values).forEach(([teamId, val]) => {
    const n = Number(val) || 0;
    if (state.teams[teamId] && n > bestVal) { bestVal = n; bestId = teamId; }
  });
  if (!bestId) return null;
  return { teamId: bestId, value: bestVal };
}

function teamLabel(teamId) {
  const t = state.teams[teamId];
  if (!t) return "—";
  return `${t.player1 || "?"} & ${t.player2 || "?"} (${t.name || teamId})`;
}

function renderBounties() {
  const grid = document.getElementById("bountyGrid");
  grid.innerHTML = BOUNTIES.map((b) => {
    const leader = bountyLeader(b);
    let leaderHtml;
    if (!leader) {
      leaderHtml = `<span class="empty">No entries yet</span>`;
    } else if (b.type === "submission") {
      leaderHtml = `<span class="name">${escapeHtml(teamLabel(leader.teamId))}</span><span class="value">Winner</span>`;
    } else {
      leaderHtml = `<span class="name">${escapeHtml(teamLabel(leader.teamId))}</span><span class="value">${leader.value} ${escapeHtml(b.unit)}</span>`;
    }
    return `
      <div class="bounty-card">
        <div class="top-row">
          <h3>${escapeHtml(b.name)}</h3>
          <span class="prize">${escapeHtml(b.prize)}</span>
        </div>
        <p class="tagline">${escapeHtml(b.tagline)}</p>
        <p class="rule">${escapeHtml(b.rule)}</p>
        <div class="leader">${leaderHtml}</div>
      </div>
    `;
  }).join("");
}

function renderSpotlight() {
  const dotsEl = document.getElementById("spotlightDots");
  dotsEl.innerHTML = BOUNTIES.map((_, i) =>
    `<button data-i="${i}" class="${i === spotlightIndex ? "active" : ""}" aria-label="Show bounty ${i + 1}"></button>`
  ).join("");
  dotsEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      spotlightIndex = Number(btn.dataset.i);
      renderSpotlight();
      resetSpotlightTimer();
    });
  });

  const b = BOUNTIES[spotlightIndex];
  const leader = bountyLeader(b);
  document.getElementById("spotlightLabel").textContent = b.tagline.toUpperCase();

  const whoEl = document.getElementById("spotlightWho");
  const metricEl = document.getElementById("spotlightMetric");

  if (!leader) {
    whoEl.textContent = "No entries yet";
    metricEl.textContent = b.name;
  } else if (b.type === "submission") {
    whoEl.textContent = teamLabel(leader.teamId);
    metricEl.textContent = `${b.name} winner`;
  } else {
    whoEl.textContent = teamLabel(leader.teamId);
    metricEl.textContent = `${leader.value} ${b.unit}`;
  }
}

function resetSpotlightTimer() {
  if (spotlightTimer) clearInterval(spotlightTimer);
  spotlightTimer = setInterval(() => {
    spotlightIndex = (spotlightIndex + 1) % BOUNTIES.length;
    renderSpotlight();
  }, 5000);
}

function renderUpdatedMeta() {
  const el = document.getElementById("updatedMeta");
  el.textContent = "updated " + new Date().toLocaleTimeString();
}

function renderAll() {
  renderLeaderboard();
  renderBounties();
  renderSpotlight();
  renderUpdatedMeta();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- demo fallback ----------
function loadDemoData() {
  state.teams = {
    team1: { name: "Team Alpha", player1: "WhoIsMike416", player2: "IFolf" },
    team2: { name: "Team Bravo", player1: "Emip", player2: "TeammateTwo" }
  };
  state.games = {
    game1: { results: { team1: { placement: 1, eliminations: 4 }, team2: { placement: 5, eliminations: 2 } } }
  };
  state.bounties = { headshots: { values: { team1: 5, team2: 2 } } };
  setStatus(false);
  renderAll();
}

// ---------- Firebase wiring ----------
function startLiveListeners() {
  let gotAnyData = false;
  const markLive = () => {
    if (!gotAnyData) { gotAnyData = true; setStatus(true); }
    renderAll();
  };

  db.collection("teams").onSnapshot((snap) => {
    const teams = {};
    snap.forEach((doc) => { teams[doc.id] = doc.data(); });
    state.teams = teams;
    markLive();
  }, (err) => { console.error("teams listener failed", err); loadDemoData(); });

  GAME_IDS.forEach((gid) => {
    db.collection("games").doc(gid).onSnapshot((doc) => {
      state.games[gid] = doc.exists ? doc.data() : { results: {} };
      markLive();
    }, (err) => console.error(`${gid} listener failed`, err));
  });

  BOUNTIES.forEach((b) => {
    db.collection("bounties").doc(b.key).onSnapshot((doc) => {
      state.bounties[b.key] = doc.exists ? doc.data() : {};
      markLive();
    }, (err) => console.error(`bounty ${b.key} listener failed`, err));
  });
}

(function init() {
  loadDemoData(); // show something immediately
  try {
    if (typeof db === "undefined" || firebaseConfig.apiKey === "PASTE_ME") {
      throw new Error("Firebase not configured yet");
    }
    startLiveListeners();
  } catch (e) {
    console.warn("Running in demo mode:", e.message);
  }
})();
