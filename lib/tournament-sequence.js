import { assertRequestHost } from '@/lib/event-host';
import { getDivisionById } from '@/lib/tournament-divisions';
import { refreshTournamentStandings } from '@/lib/tournament-setup';
export function sequenceLocked(division) {
 return !!division?.knockout?.initialized || (division?.brackets ?? []).some(b => (b.matches ?? []).some(m => m.status === 'live' || m.status === 'completed' || m.startedAt || m.resultLocked));
}
export function setTournamentSequence(event, {hostId, divisionId, knockoutSize}) {
 assertRequestHost(hostId,event);
 if(event.status==='ended') throw new Error('This event has ended.');
 if(!getDivisionById(event,divisionId)) throw new Error('Category not found.');
 if(![8,16].includes(knockoutSize)) throw new Error('Choose quarterfinals or Round of 16.');
 const division=event.tournamentDivisions?.[divisionId];
 if(sequenceLocked(division)) throw new Error('Sequence locked: matches have started in this category.');
 return refreshTournamentStandings({...event,knockoutSizes:{...event.knockoutSizes,[divisionId]:knockoutSize},tournamentDivisions:{...event.tournamentDivisions,...(division?{[divisionId]:{...division,knockoutSize}}:{})}});
}
