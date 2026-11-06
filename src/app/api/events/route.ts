import { NextRequest,NextResponse } from 'next/server';
import {PANEL} from '@/lib/config';
import {jsonError,token,upstream} from '@/lib/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest) {
 try {
  const access=await token(req.nextUrl.protocol==='https:');if(!access)return jsonError('Please sign in again.',401);
  const r=await upstream(`${PANEL.head?'head':'owner'}/events`,{headers:{Authorization:`Bearer ${access}`,Accept:'text/event-stream'},signal:req.signal});
  if(!r.ok||!r.body)return jsonError('Realtime bridge is unavailable.',r.status);
  return new NextResponse(r.body,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'}});
 }catch{return jsonError('Realtime connection interrupted.',503);}
}
