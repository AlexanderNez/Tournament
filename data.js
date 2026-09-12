// Shared tournament constants — used by both the public board and the admin panel.

// Placement points, duos format, 20 teams.
const PLACEMENT_POINTS = {
  1: 60, 2: 52, 3: 48, 4: 44, 5: 40, 6: 36, 7: 33, 8: 30, 9: 27, 10: 24,
  11: 22, 12: 20, 13: 18, 14: 16, 15: 14, 16: 12, 17: 10, 18: 8, 19: 6, 20: 4
};
const POINTS_PER_ELIM = 4;
const GAME_IDS = ["game1", "game2", "game3"];
const GAME_LABELS = { game1: "Game 1", game2: "Game 2", game3: "Game 3" };

// Bounty catalogue. `key` matches the Firestore document id in the `bounties` collection.
const BOUNTIES = [
  {
    key: "headshots",
    icon: "target",
    name: "Headshot Hunter",
    tagline: "Most Headshots",
    rule: "Combine both players' headshots across all 3 games. Highest combined total wins.",
    tiebreak: "Most combined damage.",
    prize: "$20",
    unit: "headshots",
    type: "number"
  },
  {
    key: "accuracy",
    icon: "crosshair",
    name: "Deadeye",
    tagline: "Most Accuracy",
    rule: "Combine both players' accuracy across all 3 games. Highest combined accuracy wins.",
    tiebreak: "Most combined damage.",
    prize: "$20",
    unit: "% accuracy",
    type: "number"
  },
  {
    key: "clip",
    icon: "film",
    name: "Clip of the Tournament",
    tagline: "Best Clip",
    rule: "Each duo submits one clip from an official tournament game. Staff pick the winner.",
    tiebreak: "Staff decision is final.",
    prize: "$20",
    unit: "",
    type: "submission"
  },
  {
    key: "hosts",
    icon: "crown",
    name: "Bounty Hunter",
    tagline: "Hunt the Hosts",
    rule: "Combine both players' host eliminations across all 3 games. Full kills and reboot-and-re-elims both count.",
    tiebreak: "Most combined damage.",
    prize: "$20",
    unit: "host elims",
    type: "number"
  },
  {
    key: "assists",
    icon: "handshake",
    name: "Assist King",
    tagline: "Most Assists",
    rule: "Combine both players' assists across all 3 games. Highest combined total wins.",
    tiebreak: "Most combined damage.",
    prize: "$20",
    unit: "assists",
    type: "number"
  }
];

function placementPoints(place) {
  const p = Number(place);
  if (!p || p < 1) return 0;
  return PLACEMENT_POINTS[p] || 0;
}
