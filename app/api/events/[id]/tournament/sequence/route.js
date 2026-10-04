import { NextResponse } from 'next/server';
import { updateEventRecord } from '@/lib/store-server';
import { setTournamentSequence } from '@/lib/tournament-sequence';
export async function PATCH(request,{params}) {
 try {
 const body=await request.json();
 const event=await updateEventRecord(params.id,e=>setTournamentSequence(e,body));
 if(!event) return NextResponse.json({error:'Event not found.'},{status:404});
 return NextResponse.json({event});
 } catch(error) {return NextResponse.json({error:error.message ?? 'Could not save sequence.'},{status:/host/i.test(error.message)?403:400});}
}
