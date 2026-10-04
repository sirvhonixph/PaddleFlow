"use client";

import { useState } from 'react';
import { getCurrentUser, getPlayerId } from '@/lib/session';
import { standingsTieGroups } from '@/lib/tournament-standings';

function TieForm({ group, eventId, divisionId, bracketId, onSaved }) {
  const [ranks, setRanks] = useState({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e) {
    e.preventDefault();
    const values = group.rows.map(r => ranks[r.pairId]);
    if (values.some(v => !v) || new Set(values).size !== values.length) { setError('Choose a different position for every tied pair.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/events/${eventId}/tournament/tie`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: getPlayerId(getCurrentUser()), divisionId, bracketId, tieKey: group.key, reason,
          orderedPairIds: [...group.rows].sort((a,b) => Number(ranks[a.pairId]) - Number(ranks[b.pairId])).map(r => r.pairId) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save the tiebreak.');
      onSaved?.(data.event);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-3 border border-amber-500/40 rounded-lg p-3">
    <p className="font-semibold text-amber-200">Further tiebreak required — positions {group.startRank}–{group.startRank + group.rows.length - 1}</p>
    <p className="text-xs text-slate-300">These pairs have equal tournament points, point differential, and total points scored. Choose only their final order and record the reason.</p>
    {group.rows.map(row => <label key={row.pairId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>{row.name} · {row.tournamentPoints} pts · {row.pointDiff} diff · {row.pointsFor} scored</span>
      <select aria-label={`Finishing position for ${row.name}`} disabled={busy} value={ranks[row.pairId] ?? ''} onChange={e => setRanks(prev => ({ ...prev, [row.pairId]: e.target.value }))} className="bg-slate-800 rounded p-2">
        <option value="">Choose position</option>
        {group.rows.map((_,i) => <option key={i} value={i + 1}>Top {group.startRank + i}</option>)}
      </select>
    </label>)}
    <label className="block text-sm">Reason for the decision
      <textarea required maxLength={500} disabled={busy} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. playoff result or agreed draw" className="block w-full bg-slate-800 rounded p-2 mt-1" />
    </label>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button disabled={busy} className="rounded bg-amber-400 text-black px-3 py-2 text-sm font-semibold">{busy ? 'Saving…' : 'Save tied-pair positions'}</button>
  </form>;
}

export default function BracketTieResolution({ bracket, host, eventId, divisionId, onSaved }) {
  if (!bracket.poolComplete) return null;
  const groups = bracket.unresolvedTies ?? [];
  const resolved = standingsTieGroups(bracket.standings ?? []).filter(g => !groups.some(u => u.key === g.key) && bracket.tieDecisions?.[g.key]);
  return <div className="space-y-3 my-3">
    {groups.map(group => host && eventId ? <TieForm key={group.key} group={group} eventId={eventId} divisionId={divisionId} bracketId={bracket.id} onSaved={onSaved} /> : <p key={group.key} className="text-sm text-amber-200">Further tiebreak required — positions {group.startRank}–{group.startRank + group.rows.length - 1}. Awaiting host decision.</p>)}
    {resolved.map(g => {
      const d = bracket.tieDecisions[g.key];
      return <div key={g.key} className="rounded border border-slate-700 p-3 text-sm">
        <p className="font-semibold">Host tiebreak decision</p>
        <p>{d.orderedPairIds.map((id,i) => `Top ${g.startRank+i}: ${g.rows.find(r => r.pairId === id)?.name}`).join(' · ')}</p>
        <p>Reason: {d.reason}</p>
      </div>;
    })}
  </div>;
}
