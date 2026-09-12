// Sunset Horizon — staff panel logic.

const TEAM_SLOTS = Array.from({ length: 20 }, (_, i) => `team${i + 1}`);

const state = {
  teams: {},
  games: { game1: { results: {} }, game2: { results: {} }, game3: { results: {} } },
  bounties: {}
};

let currentGameTab = "game1";
let currentBountyTab = BOUNTIES[0].key;

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function orderedTeamIds() {
  // team1..team20 first (in order), then anything else that exists.
  const known = TEAM_SLOTS.filter((id) => state.teams[id]);
  const extra = Object.keys(state.teams).filter((id) => !TEAM_SLOTS.includes(id));
  return [...known, ...extra];
}

/* ---------------- AUTH ---------------- */

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    errEl.textContent = err.message || "Login failed.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged(async (user) => {
  const loginPanel = document.getElementById("loginPanel");
  const dashboard = document.getElementById("dashboard");
  const whoami = document.getElementById("whoami");

  if (!user) {
    loginPanel.style.display = "block";
    dashboard.style.display = "none";
    whoami.style.display = "none";
    return;
  }

  // Confirm this account is on the admin allowlist (Firestore doc: admins/{uid}).
  // Firestore security rules should enforce this server-side too — see README.
  try {
    const adminDoc = await db.collection("admins").doc(user.uid).get();
    if (!adminDoc.exists) {
      document.getElementById("loginError").textContent =
        "This account isn't on the admin list. Ask the organizer to add you.";
      await auth.signOut();
      return;
    }
  } catch (err) {
    document.getElementById("loginError").textContent = "Couldn't verify admin access: " + err.message;
    await auth.signOut();
    return;
  }

  loginPanel.style.display = "none";
  dashboard.style.display = "block";
  whoami.style.display = "flex";
  document.getElementById("whoamiText").textContent = user.email;

  await loadAllData();
  renderTeamsPanel();
  renderGameTabs();
  renderBountyTabs();
});

/* ---------------- DATA LOADING ---------------- */

async function loadAllData() {
  const teamsSnap = await db.collection("teams").get();
  state.teams = {};
  teamsSnap.forEach((doc) => { state.teams[doc.id] = doc.data(); });

  for (const gid of GAME_IDS) {
    const doc = await db.collection("games").doc(gid).get();
    state.games[gid] = doc.exists ? doc.data() : { results: {} };
  }

  for (const b of BOUNTIES) {
    const doc = await db.collection("bounties").doc(b.key).get();
    state.bounties[b.key] = doc.exists ? doc.data() : {};
  }
}

/* ---------------- TAB SWITCHING ---------------- */

document.getElementById("tabBar").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (!btn) return;
  document.querySelectorAll("#tabBar button").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
  document.getElementById(`panel-${btn.dataset.tab}`).classList.add("active");
});

/* ---------------- TEAMS PANEL ---------------- */

function renderTeamsPanel() {
  const list = document.getElementById("teamsList");
  const ids = orderedTeamIds();

  if (!ids.length) {
    list.innerHTML = `<p class="hint">No teams yet. Click "Create 20 empty slots" to get started.</p>`;
    return;
  }

  list.innerHTML = ids.map((id) => {
    const t = state.teams[id] || {};
    return `
      <div class="team-row-card" data-id="${id}">
        <div class="field">
          <label>Team name (${id})</label>
          <input type="text" class="t-name" value="${escapeHtml(t.name)}" placeholder="Team name" />
        </div>
        <div class="field">
          <label>Player 1</label>
          <input type="text" class="t-p1" value="${escapeHtml(t.player1)}" placeholder="Player 1 tag" />
        </div>
        <div class="field">
          <label>Player 2</label>
          <input type="text" class="t-p2" value="${escapeHtml(t.player2)}" placeholder="Player 2 tag" />
        </div>
      </div>
    `;
  }).join("");
}

document.getElementById("seedTeamsBtn").addEventListener("click", () => {
  TEAM_SLOTS.forEach((id) => {
    if (!state.teams[id]) state.teams[id] = { name: "", player1: "", player2: "" };
  });
  renderTeamsPanel();
});

document.getElementById("saveTeamsBtn").addEventListener("click", async () => {
  const rows = document.querySelectorAll("#teamsList .team-row-card");
  const batch = db.batch();
  rows.forEach((row) => {
    const id = row.dataset.id;
    const data = {
      name: row.querySelector(".t-name").value.trim(),
      player1: row.querySelector(".t-p1").value.trim(),
      player2: row.querySelector(".t-p2").value.trim()
    };
    state.teams[id] = data;
    batch.set(db.collection("teams").doc(id), data);
  });
  const msg = document.getElementById("teamsSaveMsg");
  try {
    await batch.commit();
    msg.textContent = "Saved " + rows.length + " teams.";
    renderGameTabs();
    renderBountyTabs();
    setTimeout(() => (msg.textContent = ""), 3000);
  } catch (err) {
    msg.textContent = "Error saving: " + err.message;
  }
});

/* ---------------- GAMES PANEL ---------------- */

function renderGameTabs() {
  const bar = document.getElementById("gameTabBar");
  bar.innerHTML = GAME_IDS.map((gid) =>
    `<button data-game="${gid}" class="${gid === currentGameTab ? "active" : ""}">${GAME_LABELS[gid]}</button>`
  ).join("");
  bar.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentGameTab = btn.dataset.game;
      renderGameTabs();
      renderGameForm();
    });
  });
  renderGameForm();
}

function renderGameForm() {
  const container = document.getElementById("gameForm");
  const ids = orderedTeamIds();
  if (!ids.length) {
    container.innerHTML = `<p class="hint">Add teams first, in the Teams &amp; Rosters tab.</p>`;
    return;
  }
  const results = (state.games[currentGameTab] && state.games[currentGameTab].results) || {};

  const placementOptions = Array.from({ length: 20 }, (_, i) => i + 1)
    .map((n) => `<option value="${n}">#${n} — ${placementPoints(n)} pts</option>`).join("");

  container.innerHTML = `
    <div class="stat-grid-row head" style="--cols:2;">
      <div>Team</div><div>Placement</div><div>Eliminations</div>
    </div>
    ${ids.map((id) => {
      const t = state.teams[id] || {};
      const r = results[id] || {};
      return `
        <div class="stat-grid-row" style="--cols:2;" data-id="${id}">
          <div class="team-label">${escapeHtml(t.name) || id}<span class="players">${escapeHtml(t.player1)} &amp; ${escapeHtml(t.player2)}</span></div>
          <select class="g-place">
            <option value="">—</option>
            ${placementOptions}
          </select>
          <input type="number" min="0" class="g-elim" value="${r.eliminations != null ? r.eliminations : ""}" placeholder="0" />
        </div>
      `;
    }).join("")}
  `;

  // set placement selects to saved values
  ids.forEach((id) => {
    const r = results[id];
    if (r && r.placement) {
      const row = container.querySelector(`.stat-grid-row[data-id="${id}"] .g-place`);
      if (row) row.value = r.placement;
    }
  });
}

document.getElementById("saveGameBtn").addEventListener("click", async () => {
  const rows = document.querySelectorAll("#gameForm .stat-grid-row[data-id]");
  const results = {};
  rows.forEach((row) => {
    const id = row.dataset.id;
    const placement = row.querySelector(".g-place").value;
    const eliminations = row.querySelector(".g-elim").value;
    if (placement || eliminations) {
      results[id] = {
        placement: placement ? Number(placement) : null,
        eliminations: eliminations ? Number(eliminations) : 0
      };
    }
  });
  state.games[currentGameTab] = { results };
  const msg = document.getElementById("gamesSaveMsg");
  try {
    await db.collection("games").doc(currentGameTab).set({ results });
    msg.textContent = `Saved ${GAME_LABELS[currentGameTab]}.`;
    setTimeout(() => (msg.textContent = ""), 3000);
  } catch (err) {
    msg.textContent = "Error saving: " + err.message;
  }
});

/* ---------------- BOUNTIES PANEL ---------------- */

function renderBountyTabs() {
  const bar = document.getElementById("bountyTabBar");
  bar.innerHTML = BOUNTIES.map((b) =>
    `<button data-b="${b.key}" class="${b.key === currentBountyTab ? "active" : ""}">${b.name}</button>`
  ).join("");
  bar.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentBountyTab = btn.dataset.b;
      renderBountyTabs();
      renderBountyForm();
    });
  });
  renderBountyForm();
}

function renderBountyForm() {
  const bounty = BOUNTIES.find((b) => b.key === currentBountyTab);
  const container = document.getElementById("bountyForm");
  const saveBtn = document.getElementById("saveBountyBtn");
  const ids = orderedTeamIds();

  if (!ids.length) {
    container.innerHTML = `<p class="hint">Add teams first, in the Teams &amp; Rosters tab.</p>`;
    saveBtn.style.display = "none";
    return;
  }

  if (bounty.type === "submission") {
    saveBtn.style.display = "inline-block";
    const data = state.bounties[bounty.key] || {};
    const subs = data.submissions || {};
    const winner = data.winner || "";
    container.innerHTML = `
      <p class="hint" style="margin-bottom:14px;">${escapeHtml(bounty.rule)}</p>
      <div class="clip-list">
        ${ids.map((id) => {
          const t = state.teams[id] || {};
          const s = subs[id] || {};
          const isWinner = winner === id;
          return `
            <div class="clip-row" data-id="${id}">
              <div class="team-label" style="min-width:180px;">${escapeHtml(t.name) || id}<span class="players">${escapeHtml(t.player1)} &amp; ${escapeHtml(t.player2)}</span></div>
              <input type="text" class="c-link" style="flex:1; min-width:220px;" placeholder="Clip link (YouTube, Medal, Twitter…)" value="${escapeHtml(s.link)}" />
              <label style="display:flex; align-items:center; gap:6px; font-size:0.82rem; color:var(--ink-muted);">
                <input type="radio" name="clipWinner" class="c-winner" value="${id}" ${isWinner ? "checked" : ""} />
                Winner
              </label>
              ${isWinner ? '<span class="winner-badge">CURRENT WINNER</span>' : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else {
    saveBtn.style.display = "inline-block";
    const data = state.bounties[bounty.key] || {};
    const values = data.values || {};
    container.innerHTML = `
      <p class="hint" style="margin-bottom:14px;">${escapeHtml(bounty.rule)}</p>
      <div class="stat-grid-row head" style="--cols:1;">
        <div>Team</div><div>Combined ${escapeHtml(bounty.unit)}</div>
      </div>
      ${ids.map((id) => {
        const t = state.teams[id] || {};
        const v = values[id];
        return `
          <div class="stat-grid-row" style="--cols:1;" data-id="${id}">
            <div class="team-label">${escapeHtml(t.name) || id}<span class="players">${escapeHtml(t.player1)} &amp; ${escapeHtml(t.player2)}</span></div>
            <input type="number" min="0" class="b-value" value="${v != null ? v : ""}" placeholder="0" />
          </div>
        `;
      }).join("")}
    `;
  }
}

document.getElementById("saveBountyBtn").addEventListener("click", async () => {
  const bounty = BOUNTIES.find((b) => b.key === currentBountyTab);
  const msg = document.getElementById("bountiesSaveMsg");
  let payload;

  if (bounty.type === "submission") {
    const rows = document.querySelectorAll("#bountyForm .clip-row[data-id]");
    const submissions = {};
    let winner = null;
    rows.forEach((row) => {
      const id = row.dataset.id;
      const link = row.querySelector(".c-link").value.trim();
      if (link) submissions[id] = { link };
      if (row.querySelector(".c-winner").checked) winner = id;
    });
    payload = { submissions, winner };
  } else {
    const rows = document.querySelectorAll("#bountyForm .stat-grid-row[data-id]");
    const values = {};
    rows.forEach((row) => {
      const id = row.dataset.id;
      const val = row.querySelector(".b-value").value;
      if (val !== "") values[id] = Number(val);
    });
    payload = { values };
  }

  state.bounties[bounty.key] = payload;
  try {
    await db.collection("bounties").doc(bounty.key).set(payload);
    msg.textContent = `Saved ${bounty.name}.`;
    setTimeout(() => (msg.textContent = ""), 3000);
    renderBountyForm();
  } catch (err) {
    msg.textContent = "Error saving: " + err.message;
  }
});
