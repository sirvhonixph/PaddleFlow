import assert from 'node:assert/strict';
import {computeDivisionAdvancement} from '../lib/tournament-advancement.js';
import {buildKnockoutBracket,applyKnockoutMatchPatch} from '../lib/tournament-knockout.js';
import {setTournamentSequence} from '../lib/tournament-sequence.js';
const divisionId='novice_mens_doubles';
const brackets=Array.from({length:4},(_,b)=>({id:'b'+b,label:'Bracket '+b,poolComplete:true,unresolvedTies:[],standings:Array.from({length:6},(_,i)=>({pairId:`p${b}-${i}`,name:`Pair ${b}-${i}`,wins:5-i,losses:i,tournamentPoints:(5-i)*2,pointDiff:20-i,pointsFor:50-i}))}));
const a16=computeDivisionAdvancement({brackets,knockoutSize:16});assert.equal(a16.ready,true);assert.equal(a16.allQualified.length,16);
for(let b=0;b<4;b++)assert.equal(a16.allQualified.filter(p=>p.pairId.startsWith('p'+b+'-')).length,4);
const a8=computeDivisionAdvancement({brackets,knockoutSize:8});assert.equal(a8.allQualified.length,8);
const courts=Array.from({length:5},(_,i)=>({id:'c'+i,name:'Court '+i}));
let knockout=buildKnockoutBracket(a16,courts);assert.deepEqual(knockout.rounds.map(r=>r.id),['r16','qf','sf','final','bronze']);
const first=knockout.rounds[0].matches;assert.equal(new Set(first.flatMap(m=>[m.pairAId,m.pairBId])).size,16);
for(const roundId of ['r16','qf','sf','final','bronze']) {
 const matches=knockout.rounds.find(r=>r.id===roundId).matches;
 for(const m of matches){assert.ok(m.pairAId&&m.pairBId,roundId+' populated');knockout=applyKnockoutMatchPatch(knockout,roundId,m.id,{status:'completed',scoreA:11,scoreB:5},new Map(),divisionId,{courts,tournamentDivisions:{[divisionId]:{knockout}}});}
}
assert.equal(knockout.phase,'complete');
assert.deepEqual(buildKnockoutBracket(a8,courts).rounds.map(r=>r.id),['qf','sf','final','bronze']);
const event={id:'test',hostId:'host',status:'active',pairRegistrations:[],courts:[],tournamentDivisions:{}};
const configured=setTournamentSequence(event,{hostId:'host',divisionId,knockoutSize:16});assert.equal(configured.knockoutSizes[divisionId],16);
assert.throws(()=>setTournamentSequence(event,{hostId:'other',divisionId,knockoutSize:16}),/host/);
assert.throws(()=>setTournamentSequence({...event,tournamentDivisions:{[divisionId]:{brackets:[{matches:[{status:'live'}]}]}}},{hostId:'host',divisionId,knockoutSize:16}),/locked/);
assert.throws(()=>setTournamentSequence(event,{hostId:'host',divisionId,knockoutSize:12}),/Choose/);
console.log('PASS: both sequences, 16 unique qualifiers, full winner progression, host-only settings and lock after first match.');
