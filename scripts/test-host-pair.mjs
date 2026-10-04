import { addPairRegistration } from "../lib/tournament-pairs.js";

const baseEvent = {
  type: "tournament",
  status: "active",
  tournamentPhase: "registration",
  pairRegistrations: [],
  tournamentDivisions: {},
  divisionPairLimit: 20,
};

let failed = 0;

function assert(name, condition) {
  if (!condition) {
    console.error("FAIL:", name);
    failed++;
    return;
  }
  console.log("OK:", name);
}

const first = addPairRegistration(baseEvent, {
  divisionId: "novice_mens_doubles",
  player1Name: "1A",
  player2Name: "1B",
});

assert("adds first host pair", first.pairRegistrations.length === 1);
assert(
  "pair in correct division",
  first.pairRegistrations[0].divisionId === "novice_mens_doubles"
);

const second = addPairRegistration(first, {
  divisionId: "novice_mens_doubles",
  player1Name: "2A",
  player2Name: "2B",
});

assert("adds second host pair", second.pairRegistrations.length === 2);

let duplicateBlocked = false;
try {
  addPairRegistration(
    addPairRegistration(second, {
      divisionId: "novice_mens_doubles",
      player1Name: "1A",
      player2Name: "3B",
    }),
    {
      divisionId: "novice_mens_doubles",
      player1Name: "1A",
      player2Name: "4B",
    }
  );
} catch (err) {
  duplicateBlocked = /maximum of 2 entries/i.test(err.message);
}
assert("blocks third entry for same player name in category", duplicateBlocked);

let missingNames = false;
try {
  addPairRegistration(baseEvent, {
    divisionId: "novice_mens_doubles",
    player1Name: "",
    player2Name: "X",
  });
} catch (err) {
  missingNames = /required/i.test(err.message);
}
assert("requires both player names", missingNames);

const closedEvent = { ...baseEvent, registrationClosesAt: "2000-01-01T00:00:00Z" };
const walkIn = { divisionId: "novice_mens_doubles", player1Name: "Late A", player2Name: "Late B" };
assert("host walk-in bypasses public deadline", addPairRegistration(closedEvent, walkIn, { allowClosed: true }).pairRegistrations.length === 1);
for (const [label, event, options] of [
  ["public deadline remains enforced", closedEvent, {}],
  ["host cannot add after play starts", { ...closedEvent, tournamentPhase: "pool_play" }, { allowClosed: true }],
  ["host cannot add to ended event", { ...closedEvent, status: "ended" }, { allowClosed: true }],
  ["host cannot add after brackets generated", { ...closedEvent, tournamentDivisions: { novice_mens_doubles: {} } }, { allowClosed: true }],
]) {
  let blocked = false;
  try { addPairRegistration(event, walkIn, options); } catch { blocked = true; }
  assert(label, blocked);
}
console.log(failed ? `\n${failed} test(s) failed` : "\nAll host pair tests passed");
process.exit(failed ? 1 : 0);
