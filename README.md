# Sunset Horizon — Tournament Ops Board (Google Sheets edition)

A public leaderboard + bounty tracker for your 20-team duos cup, built as a
plain static site for GitHub Pages. All the scoring data lives in one Google
Sheet — no logins to build, no backend service to set up. Your 4 admins just
edit spreadsheet cells; the public site checks the sheet automatically and
updates itself, no page refresh needed.

## What's in here

```
index.html            → the public leaderboard + bounty board
admin.html             → staff guide page (links to the sheet, explains columns)
css/style.css          → all styling
js/data.js             → points table + bounty definitions (edit if rules change)
js/sheets-config.js    → your published Google Sheet links go here
js/csv.js              → tiny CSV reader, no setup needed
js/app.js              → public page logic
templates/*.csv        → starter spreadsheet tabs, already filled with your roster
```

---

## 1. Create the Google Sheet

1. Go to <https://sheets.google.com> and create a **new blank spreadsheet**.
   Name it "Sunset Horizon Scoring" or similar.
2. You need **5 tabs**, named *exactly* (case matters): `Teams`, `Game1`,
   `Game2`, `Game3`, `Bounties`. By default a new sheet only has one tab
   ("Sheet1") — right-click its tab at the bottom and rename it to `Teams`,
   then use the **+** button to add the other 4 and rename each one.

3. For each tab, import the matching starter file from the `templates/`
   folder in this project so the columns and your real roster are already
   filled in:
   - **Teams** tab → import `templates/teams.csv` (already has your 20 real
     teams, hosts excluded — the two rows in your original list that were
     hosts aren't included since they don't compete)
   - **Game1** tab → import `templates/game1.csv`
   - **Game2** tab → import `templates/game2.csv`
   - **Game3** tab → import `templates/game3.csv`
   - **Bounties** tab → import `templates/bounties.csv`

   To import into a tab: click the tab to select it, then **File → Import →
   Upload**, choose the `.csv` file, and pick **"Replace current sheet"** as
   the import location, then **Import data**.

4. Double check two rows in the Teams tab that had a missing name in your
   original list — **Team 11** (`Player1` is blank, only "Mask VanishRM" was
   given) and **Team 20** (`Player2` is blank, only "Prg-ykethantt" was given).
   Fill in whatever the correct second tag is.

## 2. Publish each tab so the website can read it

Google Sheets can publish any single tab as a plain CSV link that anyone can
read (view-only, they still can't edit anything). You need to do this once
per tab — 5 times total.

1. With the Sheet open, go to **File → Share → Publish to web**.
2. In the first dropdown, instead of "Entire Document," pick the specific tab
   (e.g. **Teams**).
3. In the second dropdown, choose **Comma-separated values (.csv)**.
4. Click **Publish**, confirm, and copy the link it gives you.
5. Repeat for **Game1**, **Game2**, **Game3**, and **Bounties** — each tab
   gets its own published link.

## 3. Paste the links into the site

Open `js/sheets-config.js` and paste each published link into the matching
slot:

```js
const SHEETS_CONFIG = {
  teams: "https://docs.google.com/.../pub?gid=0&single=true&output=csv",
  game1: "https://docs.google.com/.../pub?gid=123456&single=true&output=csv",
  game2: "https://docs.google.com/.../pub?gid=234567&single=true&output=csv",
  game3: "https://docs.google.com/.../pub?gid=345678&single=true&output=csv",
  bounties: "https://docs.google.com/.../pub?gid=456789&single=true&output=csv",
  editUrl: "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit",
  refreshMs: 30000
};
```

`editUrl` is just the normal sheet URL from your browser's address bar (used
by the Staff page's "Open the tournament sheet" button) — different from the
published CSV links.

## 4. Share edit access with your 4 admins

Click **Share** (top right of the Sheet, not "Publish to web" this time),
add each admin's email address, and set their permission to **Editor**. That's
the entire "admin login" — anyone you've shared it with can open the sheet
from their phone or laptop and type in results.

## 5. Publish to GitHub Pages

1. Push everything in this folder to a GitHub repo (keep the folder structure
   as-is — `index.html` must be at the repo root).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   pick `main` / `/ (root)`, **Save**.
3. Your public board is live at the URL GitHub gives you. `admin.html` on the
   same site is the staff guide page.

---

## Running the tournament

- **After each game**: open the Sheet, go to the `Game1` (or 2 / 3) tab, and
  fill in every team's `Placement` (1–20) and `Eliminations`. Points are
  calculated automatically by the website (60 pts for 1st down to 4 pts for
  20th, plus 4 pts per elimination) — you never type a point total yourself.
- **Bounties**: on the `Bounties` tab, fill in each duo's *combined* total
  across all 3 games for `Headshots`, `Accuracy`, `HostElims`, and `Assists`.
  The site automatically shows whoever has the highest number as the leader.
  For the clip bounty, paste links into `ClipLink` as they come in, and once
  staff pick a winner, type `YES` in that team's `ClipWinner` cell.
- The public page rechecks the sheet every 30 seconds by default (change
  `refreshMs` in `sheets-config.js` if you want it faster or slower).

## Changing the rules later

Point values, bounty prizes, or number of games live in `js/data.js` — the
public page reads from that one file.

## Troubleshooting

- **Site shows "Demo data — connect the Google Sheet to go live"**: one or
  more links in `js/sheets-config.js` still say `PASTE_...`, or a link is
  wrong. Re-check step 3.
- **A team is missing or shows 0 points**: check its row exists in the
  `Teams` tab with the right `TeamID`, and that the same `TeamID` is used in
  the `Game1`/`Game2`/`Game3`/`Bounties` tabs — the site matches rows by that
  ID, not by name.
- **Numbers look wrong after you type them**: give it up to `refreshMs`
  (default 30 seconds) to pick up the change, and make sure you're editing
  the same Sheet the links in `sheets-config.js` point to.
