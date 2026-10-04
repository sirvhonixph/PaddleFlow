import assert from 'node:assert/strict';
import { assignPairsToBrackets } from '../lib/tournament-brackets.js';
const pairs = Array.from({ length: 24 }, (_, i) => ({
  id: `pair-${i}`, teamName: `Team ${i}`, registeredAt: i,
  player1: { name: `Player ${i} A` }, player2: { name: `Player ${i} B` },
}));
const original = JSON.stringify(pairs);
const courts = Array.from({ length: 4 }, (_, i) => ({ id: `court-${i}`, name: `Court ${i+1}` }));
const random = Math.random;
let brackets;
try {
  Math.random = () => 0;
  brackets = assignPairsToBrackets(pairs, courts, [6,6,6,6], 'novice_mens_doubles');
} finally { Math.random = random; }
const drawnIds = brackets.flatMap(b => b.pairIds);
assert.equal(new Set(drawnIds).size, 24);
assert.deepEqual([...drawnIds].sort(), pairs.map(p=>p.id).sort());
assert.notDeepEqual(drawnIds, pairs.map(p=>p.id));
assert.equal(JSON.stringify(pairs), original, 'registered partners and original records stay fixed');
for (const bracket of brackets) {
  assert.equal(bracket.pairIds.length, 6);
  assert.equal(bracket.matches.length, 15);
  assert.equal(new Set(bracket.matches.map(m=>[m.pairAId,m.pairBId].sort().join('|'))).size, 15);
}
console.log('PASS: randomized draw preserves 24 fixed pairs, four brackets of six, and unique round-robin matches.');
