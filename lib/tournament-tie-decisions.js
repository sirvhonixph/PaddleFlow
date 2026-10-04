import { refreshBracketStandings } from '@/lib/tournament-standings';
import { refreshTournamentStandings } from '@/lib/tournament-setup';
import { assertRequestHost } from '@/lib/event-host';

export function resolveBracketTie(event, { hostId, divisionId, bracketId, tieKey, orderedPairIds, reason }) {
  assertRequestHost(hostId, event);
  if (event.status === 'ended') throw new Error('This event has ended.');
  const division = event.tournamentDivisions?.[divisionId];
  if (division?.knockout?.initialized) throw new Error('Tiebreak decisions are locked after knockout play is created.');
  const bracket = division?.brackets?.find(b => b.id === bracketId);
  if (!bracket) throw new Error('Bracket not found.');
  const refreshed = refreshBracketStandings(bracket, new Map((event.pairRegistrations ?? []).map(p => [p.id,p])), { scheduleResetAt: division.scheduleResetAt });
  if (!refreshed.poolComplete) throw new Error('Finish all bracket matches before resolving a tie.');
  const group = refreshed.unresolvedTies.find(g => g.key === tieKey);
  if (!group) throw new Error('This tie is already resolved or the standings have changed. Refresh the bracket.');
  if (!Array.isArray(orderedPairIds) || orderedPairIds.length !== group.rows.length || new Set(orderedPairIds).size !== orderedPairIds.length || !group.rows.every(r => orderedPairIds.includes(r.pairId))) {
    throw new Error('Choose a different position for every pair in this flagged tie.');
  }
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) throw new Error('Enter a reason of 1–500 characters.');
  const updated = { ...refreshed, tieDecisions: { ...(refreshed.tieDecisions ?? {}), [tieKey]: { orderedPairIds, reason: reason.trim(), decidedBy: hostId, decidedAt: Date.now() } } };
  return refreshTournamentStandings({ ...event, tournamentDivisions: { ...event.tournamentDivisions, [divisionId]: { ...division, brackets: division.brackets.map(b => b.id === bracketId ? updated : b) } } });
}
