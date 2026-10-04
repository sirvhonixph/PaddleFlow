import assert from 'node:assert/strict';
import {addPairRegistration} from '../lib/tournament-pairs.js';
import {applyDivisionSetup, updateTournamentMatch, refreshTournamentStandings} from '../lib/tournament-setup.js';
import {mergeConcurrentEventWrites} from '../lib/event-merge.js';
import {mergePreferredRoundRobinRow} from '../lib/tournament-brackets.js';
const divisionId='novice_mens_doubles';
let event={type:'tournament',status:'active',tournamentPhase:'registration',divisionPairLimit:24,pairRegistrations:[],tournamentDivisions:{},courts:[{id:'court-1',name:'Court 1',status:'idle',currentMatch:null,queue:[]}]};
for(let i=1;i<=6;i++) event=addPairRegistration(event,{divisionId,player1Name:`P${i}A`,player2Name:`P${i}B`});
event=applyDivisionSetup(event,divisionId);
const bracketId=event.tournamentDivisions[divisionId].brackets[0].id;
const matches=e=>e.tournamentDivisions[divisionId].brackets[0].matches;
const completed=[];
for(let i=0;i<15;i++) {
 const stale=structuredClone(event), m=matches(event).find(m=>m.status==='scheduled');
 assert(m,'unfinished match is available');
 event=mergeConcurrentEventWrites(event,updateTournamentMatch(event,divisionId,bracketId,m.id,{status:'live',scoreA:0,scoreB:0}));
 assert.equal(matches(event).find(x=>x.id===m.id).status,'live','new 0–0 start survives server merge');
 const liveSnapshot=structuredClone(event);
 event=updateTournamentMatch(event,divisionId,bracketId,m.id,{status:'live',scoreA:11,scoreB:5});
 event=mergeConcurrentEventWrites(liveSnapshot,event);
 event=updateTournamentMatch(event,divisionId,bracketId,m.id,{status:'completed',scoreA:11,scoreB:5});
 event=mergeConcurrentEventWrites(stale,event);
 for(const snapshot of [stale,liveSnapshot]) event=mergeConcurrentEventWrites(event,snapshot);
 event=refreshTournamentStandings(event);
 completed.push(m.id);
 for(const id of completed) {
  const row=matches(event).find(x=>x.id===id);
  assert.equal(row.status,'completed','completed match cannot reopen after stale save');
  assert(row.resultLocked,'completed result stays locked');
 }
 assert.equal(new Set(matches(event).map(x=>[x.pairAId,x.pairBId].sort().join('|'))).size,15);
}
const scheduled={id:'match',pairAId:'a',pairBId:'b',status:'scheduled',scoreA:0,scoreB:0};
const live={...scheduled,status:'live',startedAt:100};
const released={...scheduled,courtReleasedAt:101};
assert.equal(mergePreferredRoundRobinRow(live,released).status,'scheduled');
assert.equal(mergePreferredRoundRobinRow(released,{...live,startedAt:102}).status,'live');
console.log('PASS: 15 starts and completions survive server merges; finished matches stay locked under stale scheduled/live saves; intentional releases still win over older starts.');
