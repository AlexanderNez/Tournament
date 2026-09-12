// Sunset Horizon — public board logic (Google Sheets edition).
// Fetches 5 published CSV exports (Teams, Game1-3, Bounties), turns them into
// the leaderboard + bounty cards, and re-checks the sheet every `refreshMs`
// so the board stays close to live without needing any backend.

const state = {
  teams: {},      // teamId -> {name, player1, player2}
  games: {},      // gameId -> { teamId: {placement, eliminations} }
  bounties: {},   // key -> {values:{teamId:num}} or {winner}
  live: false
};

let spotlightIndex = 0;
let spotlightTimer = null;
let pollTimer = null;

function setStatus(live) {
  const pill = document.getElementById("statusPill");
  const text = document.getElementById("statusText");
  if (live) {
    pill.classList.add("live");
    text.textContent = "Connected to the tournament sheet";
  } else {
    pill.classList.remove("live");
    text.textContent = "Demo data — connect the Google Sheet to go live";
  }
}

function computeLeaderboard() {
  const teamIds = Object.keys(state.teams);
  const totals = {};
  teamIds.forEach((id) => { totals[id] = 0; });

  GAME_IDS.forEach((gid) => {
    const results = state.games[gid] || {};
    Object.entries(results).forEach(([teamId, r]) => {
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
    body.innerHTML = `<tr><td colspan="4" class="empty-state">No teams found yet — check the Teams tab in the sheet.</td></tr>`;
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
    return { teamId: data.winner };
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
  document.getElementById("updatedMeta").textContent = "updated " + new Date().toLocaleTimeString();
}

function renderAll() {
  renderLeaderboard();
  renderBounties();
  renderSpotlight();
  renderUpdatedMeta();
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ---------------- demo fallback ---------------- */

function loadDemoData() {
  state.teams = {
    team1: { name: "Team Alpha", player1: "WhoIsMike416", player2: "IFolf" },
    team2: { name: "Team Bravo", player1: "Emip", player2: "TeammateTwo" }
  };
  state.games = { game1: { team1: { placement: 1, eliminations: 4 }, team2: { placement: 5, eliminations: 2 } } };
  state.bounties = { headshots: { values: { team1: 5, team2: 2 } } };
  setStatus(false);
  renderAll();
}

/* ---------------- Google Sheets fetch ---------------- */

function isConfigured() {
  return SHEETS_CONFIG.teams && !SHEETS_CONFIG.teams.startsWith("PASTE_");
}

async function loadFromSheets() {
  const [teamRows, g1Rows, g2Rows, g3Rows, bountyRows] = await Promise.all([
    fetchCSV(SHEETS_CONFIG.teams),
    fetchCSV(SHEETS_CONFIG.game1),
    fetchCSV(SHEETS_CONFIG.game2),
    fetchCSV(SHEETS_CONFIG.game3),
    fetchCSV(SHEETS_CONFIG.bounties)
  ]);

  const teams = {};
  teamRows.forEach((r) => {
    if (!r.TeamID) return;
    teams[r.TeamID] = {
      name: r.TeamName || r.TeamID,
      player1: r.Player1 || "",
      player2: r.Player2 || ""
    };
  });
  state.teams = teams;

  const games = {};
  [["game1", g1Rows], ["game2", g2Rows], ["game3", g3Rows]].forEach(([gid, rows]) => {
    const results = {};
    rows.forEach((r) => {
      if (!r.TeamID) return;
      if (r.Placement || r.Eliminations) {
        results[r.TeamID] = {
          placement: r.Placement ? Number(r.Placement) : null,
          eliminations: r.Eliminations ? Number(r.Eliminations) : 0
        };
      }
    });
    games[gid] = results;
  });
  state.games = games;

  const bounties = {};
  const statFields = { headshots: "Headshots", accuracy: "Accuracy", hosts: "HostElims", assists: "Assists" };
  Object.entries(statFields).forEach(([key, col]) => {
    const values = {};
    bountyRows.forEach((r) => {
      if (r.TeamID && r[col] !== "") values[r.TeamID] = Number(r[col]);
    });
    bounties[key] = { values };
  });
  let winner = null;
  bountyRows.forEach((r) => {
    if (r.ClipWinner && /^(y|yes|true|1)$/i.test(r.ClipWinner.trim())) winner = r.TeamID;
  });
  bounties.clip = { winner };
  state.bounties = bounties;

  setStatus(true);
  renderAll();
}

async function pollSheets() {
  try {
    await loadFromSheets();
  } catch (e) {
    console.warn("Couldn't load the Google Sheet, showing demo data:", e.message);
    loadDemoData();
  }
}

(function init() {
  loadDemoData(); // show something immediately
  if (isConfigured()) {
    pollSheets();
    pollTimer = setInterval(pollSheets, SHEETS_CONFIG.refreshMs || 30000);
  }
})();
