import assert from 'node:assert/strict';
import { refreshBracketStandings, applyStandingsTieDecisions, standingsTieGroups } from '../lib/tournament-standings.js';
import { resolveBracketTie } from '../lib/tournament-tie-decisions.js';
import { computeDivisionAdvancement } from '../lib/tournament-advancement.js';
import { mergeConcurrentEventWrites } from '../lib/event-merge.js';
const divisionId='novice_mens_doubles';
const pairs=['a','b','c'].map(id=>({id,divisionId,teamName:id,player1:{name:id+'1'},player2:{name:id+'2'}}));
let bracket={id:'bracket',courtId:'court',label:'Bracket A',pairIds:['a','b','c'],matches:[
 {id:'ab',pairAId:'a',pairBId:'b',scoreA:11,scoreB:5,status:'completed',resultLocked:true,winnerPairId:'a'},
 {id:'bc',pairAId:'b',pairBId:'c',scoreA:11,scoreB:5,status:'completed',resultLocked:true,winnerPairId:'b'},
 {id:'ca',pairAId:'c',pairBId:'a',scoreA:11,scoreB:5,status:'completed',resultLocked:true,winnerPairId:'c'},
]};
bracket=refreshBracketStandings(bracket,new Map(pairs.map(p=>[p.id,p])));
assert.equal(bracket.unresolvedTies.length,1);
assert.deepEqual(bracket.advancedPairIds,[]);
assert.equal(computeDivisionAdvancement({brackets:[bracket]}).ready,false);
const event={hostId:'host',status:'active',type:'tournament',tournamentPhase:'pool_play',pairRegistrations:pairs,courts:[{id:'court'}],tournamentDivisions:{[divisionId]:{brackets:[bracket]}}};
const request={hostId:'host',divisionId,bracketId:'bracket',tieKey:bracket.unresolvedTies[0].key,orderedPairIds:['c','a','b'],reason:'Playoff result'};
const saved=resolveBracketTie(event,request);
const result=saved.tournamentDivisions[divisionId].brackets[0];
assert.deepEqual(result.standings.map(r=>r.pairId),['c','a','b']);
assert.deepEqual(result.advancedPairIds.slice(0,2),['c','a']);
assert.equal(result.unresolvedTies.length,0);
assert.equal(computeDivisionAdvancement({brackets:[result]}).ready,true);
assert.equal(result.tieDecisions[request.tieKey].reason,'Playoff result');
assert.throws(()=>resolveBracketTie(event,{...request,hostId:'visitor'}),/host/);
assert.throws(()=>resolveBracketTie(event,{...request,orderedPairIds:['a','a','c']}),/different position/);
assert.throws(()=>resolveBracketTie(event,{...request,reason:' '}),/reason/);
assert.throws(()=>resolveBracketTie({...event,tournamentDivisions:{[divisionId]:{brackets:[bracket],knockout:{initialized:true}}}},request),/locked/);
assert.throws(()=>resolveBracketTie(event,{...request,tieKey:'outdated'}),/changed/);
const stats=[{pairId:'clear',wins:2,tournamentPoints:4,pointDiff:20,pointsFor:30},{pairId:'x',wins:1,tournamentPoints:2,pointDiff:4,pointsFor:22},{pairId:'y',wins:1,tournamentPoints:2,pointDiff:4,pointsFor:22},{pairId:'lower',wins:0,tournamentPoints:0,pointDiff:-12,pointsFor:10}];
const group=standingsTieGroups(stats)[0];
assert.equal(group.startRank,2);
const ranked=applyStandingsTieDecisions(stats,{[group.key]:{orderedPairIds:['y','x'],reason:'Draw'}});
assert.deepEqual(ranked.standings.map(r=>r.pairId),['clear','y','x','lower']);
assert.equal(standingsTieGroups(stats.map(r=>r.pairId==='y'?{...r,pointsFor:21}:r)).length,0,'PF breaks a tie automatically');
assert.equal(standingsTieGroups(stats.map(r=>r.pairId==='y'?{...r,pointDiff:3}:r)).length,0,'differential breaks a tie automatically');
const changed=stats.map(r=>['x','y'].includes(r.pairId)?{...r,pointsFor:24}:r);
assert.equal(applyStandingsTieDecisions(changed,{[group.key]:{orderedPairIds:['y','x'],reason:'Old decision'}}).unresolved.length,1,'changed stats invalidate the previous decision');
const merged=mergeConcurrentEventWrites(saved,event);
assert.equal(merged.tournamentDivisions[divisionId].brackets[0].tieDecisions[request.tieKey].reason,'Playoff result');
console.log('PASS: unresolved three-way and two-way ties, restricted host ranking, clear automatic breaks, advancement blocking, stale decisions and stale saves.');
