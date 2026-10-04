"use client";
import { useState } from 'react';
import { getCurrentUser,getPlayerId } from '@/lib/session';
export default function TournamentSequence({event,divisionId,host,onSaved}) {
 const [busy,setBusy]=useState(false), [error,setError]=useState('');
 const division=event.tournamentDivisions?.[divisionId];
 const locked=event.status==='ended' || !!division?.knockout?.initialized || (division?.brackets ?? []).some(b=>(b.matches ?? []).some(m=>m.status==='live'||m.status==='completed'||m.startedAt||m.resultLocked));
 const size=division?.knockoutSize ?? event.knockoutSizes?.[divisionId] ?? 8;
 async function save(value) {
 setBusy(true);setError('');
 try {
 const response=await fetch('/api/events/'+event.id+'/tournament/sequence',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({hostId:getPlayerId(getCurrentUser()),divisionId,knockoutSize:Number(value)})});
 const data=await response.json();if(!response.ok)throw new Error(data.error ?? 'Could not save sequence.');onSaved(data.event);
 } catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(!divisionId)return null;
 return <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2">
 <label className="block font-semibold" htmlFor={'sequence-'+divisionId}>Tournament sequence</label>
 <select id={'sequence-'+divisionId} value={size} disabled={!host||locked||busy} onChange={e=>save(e.target.value)} className="w-full rounded-lg bg-slate-800 p-3 disabled:opacity-70">
 <option value={8}>Elimination → Quarterfinals (Round of 8) → Semifinals → Final</option>
 <option value={16}>Elimination → Round of 16 → Quarterfinals (Round of 8) → Semifinals → Final</option>
 </select>
 <p className="text-sm text-slate-400">Elimination uses round-robin brackets. {locked?'Sequence locked: matches have started.':'Choose before the first match in this category.'} {size===16?'With four brackets, the top four pairs in each advance.':'With four brackets, the top two pairs in each advance.'}</p>
 {busy&&<p role="status">Saving sequence…</p>}{error&&<p role="alert" className="text-red-400">{error}</p>}
 </section>;
}
