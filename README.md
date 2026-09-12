# Sunset Horizon — Tournament Ops Board

A live leaderboard + bounty tracker for your 20-team duos cup, built as a static
site for GitHub Pages with a small free Firebase backend so 4 staff accounts can
log in and update results from anywhere, with the public board updating instantly.

## What's in here

```
index.html         → public leaderboard + bounty board (no login needed)
admin.html          → staff login + panel to enter results
css/style.css       → all styling
js/data.js          → points table + bounty definitions (edit here if rules change)
js/firebase-config.js → your Firebase project keys go here
js/app.js           → public page logic
js/admin.js         → staff panel logic
firestore.rules     → security rules to paste into Firebase
```

GitHub Pages only serves static files — it can't run a login system or a shared
database by itself. Firebase (Google's app backend, free at this scale) supplies
both: **Authentication** for the 4 staff logins, and **Firestore** as the live
database both pages read/write.

---

## 1. Create your Firebase project (~5 minutes)

1. Go to <https://console.firebase.google.com> and click **Add project**. Name it
   anything (e.g. "sunset-horizon"). You can skip Google Analytics.
2. Once created, click the **</> (web)** icon on the project overview page to
   register a web app. Name it "Sunset Horizon" and click **Register app**.
3. Firebase shows you a `firebaseConfig` object. Copy it into
   `js/firebase-config.js`, replacing the `PASTE_ME` placeholders, e.g.:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "sunset-horizon-xxxx.firebaseapp.com",
     projectId: "sunset-horizon-xxxx",
     storageBucket: "sunset-horizon-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

## 2. Turn on Firestore (the database)

1. In the left sidebar: **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we'll paste our own rules next), pick any
   region close to you, and click **Enable**.
3. Go to the **Rules** tab, delete what's there, paste in the contents of
   `firestore.rules` from this folder, and click **Publish**.

## 3. Turn on Authentication and create your 4 admin logins

1. **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user**, and create one login per staff member
   (their email + a password you set — they can be plain, e.g.
   `staff1@sunsethorizon.gg`, since these aren't public-facing). Do this 4 times.
4. For each user, copy their **User UID** (shown in the Users table).
5. Go back to **Firestore Database → Data**, click **Start collection**, name it
   `admins`, and for **Document ID** paste the first admin's UID. Add any field
   (e.g. `email: "staff1@sunsethorizon.gg"`) and save. Repeat for all 4 UIDs —
   each becomes its own document in the `admins` collection.
   > This `admins` collection is what the security rules check before allowing
   > any writes — an account that's *not* listed here can log in but the panel
   > will immediately sign them back out.

That's the whole backend. No servers, no billing required at this scale (Firebase's
free "Spark" plan comfortably covers a 20-team weekend tournament).

## 4. Publish to GitHub Pages

1. Create a new GitHub repo and push everything in this folder to it (keep the
   folder structure as-is — `index.html` must be at the repo root).
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from
   a branch**, pick `main` and `/ (root)`, then **Save**.
3. GitHub gives you a URL like `https://yourname.github.io/sunset-horizon/` —
   that's your public board. Staff go to the same URL + `admin.html`.

## 5. Add your teams

1. Open `admin.html`, log in with one of the 4 staff accounts.
2. On the **Teams & Rosters** tab, click **Create 20 empty slots**, fill in each
   team's name and both player tags, then **Save all teams**. You can come back
   and edit these any time (e.g. if a sub joins).

## 6. Running the tournament

- **Game Results tab**: after each of the 3 games, pick the game, set every
  team's placement and elimination count, then **Save this game**. Points are
  calculated automatically using the placement table in `js/data.js` (60 pts
  for the win down to 4 pts for 20th, plus 4 pts per elimination) and the public
  leaderboard updates within a second or two.
- **Bounties tab**: for Headshot Hunter, Deadeye, Bounty Hunter, and Assist King,
  enter each duo's *combined* total (both players, summed across all 3 games) —
  the board automatically shows whoever currently has the highest number as the
  leader. For **Clip of the Tournament**, paste each duo's clip link as it comes
  in, then mark the winning row once staff have decided — the public board shows
  that duo as the winner.
- Everything is live: multiple staff can have the panel open at once, and the
  public board (and the bounty spotlight widget) update instantly for anyone
  watching, with no page refresh needed.

## Changing the rules later

If the point values, bounty prizes, or number of games ever change, edit the
constants at the top of `js/data.js` — both pages read from that one file, so
nothing else needs to change.

## Troubleshooting

- **Public board shows "Demo data — connect the tournament backend to go live"**:
  `js/firebase-config.js` still has `PASTE_ME` placeholders, or the values are
  wrong. Double check step 1.
- **Staff login says "not on the admin list"**: their UID hasn't been added as a
  document in the `admins` Firestore collection yet — see step 3.5 above.
- **Nothing saves from the admin panel**: check the Firestore Rules tab was
  published (step 2.3), and that you're logged in as an account listed under
  `admins`.
