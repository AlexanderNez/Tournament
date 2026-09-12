// ─────────────────────────────────────────────────────────────────────────
// PASTE YOUR PUBLISHED GOOGLE SHEET LINKS HERE.
// See README.md for how to get each of these (Google Sheets → File → Share →
// Publish to web → pick the tab → CSV → Publish → copy the link it gives you).
// ─────────────────────────────────────────────────────────────────────────
const SHEETS_CONFIG = {
  teams: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd5SUrgN78cSudUTEK5L2xf_IrO31qnew1mXTfz1qsm4hOTVoLyxiJGJc-NPZV_vSYhajjR2SPDQS1/pub?gid=892834467&single=true&output=csv",
  game1: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd5SUrgN78cSudUTEK5L2xf_IrO31qnew1mXTfz1qsm4hOTVoLyxiJGJc-NPZV_vSYhajjR2SPDQS1/pub?gid=1005975442&single=true&output=csv",
  game2: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd5SUrgN78cSudUTEK5L2xf_IrO31qnew1mXTfz1qsm4hOTVoLyxiJGJc-NPZV_vSYhajjR2SPDQS1/pub?gid=1539652566&single=true&output=csv",
  game3: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd5SUrgN78cSudUTEK5L2xf_IrO31qnew1mXTfz1qsm4hOTVoLyxiJGJc-NPZV_vSYhajjR2SPDQS1/pub?gid=88391966&single=true&output=csv",
  bounties: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd5SUrgN78cSudUTEK5L2xf_IrO31qnew1mXTfz1qsm4hOTVoLyxiJGJc-NPZV_vSYhajjR2SPDQS1/pub?gid=919921434&single=true&output=csv",

  // Optional: paste the normal "Share" link to the whole Google Sheet
  // (Share → Copy link) so the Staff page can link straight to it.
  editUrl: "https://docs.google.com/spreadsheets/d/18cE3roZZxJlEIVsGUggPMvvOyK9iInCyDcHl4kXjt_0/edit?gid=892834467#gid=892834467",

  // How often the public page re-checks the sheet for updates, in milliseconds.
  refreshMs: 30000
};
