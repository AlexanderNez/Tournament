// ─────────────────────────────────────────────────────────────────────────
// PASTE YOUR PUBLISHED GOOGLE SHEET LINKS HERE.
// See README.md for how to get each of these (Google Sheets → File → Share →
// Publish to web → pick the tab → CSV → Publish → copy the link it gives you).
// ─────────────────────────────────────────────────────────────────────────
const SHEETS_CONFIG = {
  teams: "PASTE_TEAMS_CSV_LINK_HERE",
  game1: "PASTE_GAME1_CSV_LINK_HERE",
  game2: "PASTE_GAME2_CSV_LINK_HERE",
  game3: "PASTE_GAME3_CSV_LINK_HERE",
  bounties: "PASTE_BOUNTIES_CSV_LINK_HERE",

  // Optional: paste the normal "Share" link to the whole Google Sheet
  // (Share → Copy link) so the Staff page can link straight to it.
  editUrl: "PASTE_YOUR_GOOGLE_SHEET_SHARE_LINK_HERE",

  // How often the public page re-checks the sheet for updates, in milliseconds.
  refreshMs: 30000
};
