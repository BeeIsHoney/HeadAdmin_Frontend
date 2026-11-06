import {isTelegramChallenge} from '@/lib/telegram-otp';
import { NextRequest,NextResponse } from 'next/server';
import { PANEL } from '@/lib/config';
import {checkOrigin,clearTokens,currentProfile,jsonError,saveTokens,token,upstream} from '@/lib/server';
export const runtime='nodejs'; export const dynamic='force-dynamic';
export async function GET(req:NextRequest) {try {const t=await token(req.nextUrl.protocol==='https:');if(!t)return jsonError('Please sign in.',401);const p=await currentProfile(t);if(!p){await clearTokens();return jsonError('Your session has ended.',401);}return NextResponse.json(p,{headers:{'Cache-Control':'no-store'}});}catch{return jsonError('Main Backend is unavailable. Check that it is running at localhost:8080.',502);}}
export async function POST(req:NextRequest) {
 if(!checkOrigin(req))return jsonError('Invalid request origin.',403);
 try {
  const body=await req.json();if(typeof body.email!=='string'||typeof body.password!=='string')return jsonError('Email and password are required.');
  const r=await upstream('auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:body.email.trim(),password:body.password})});
  const result=await r.json().catch(()=>({message:'Unable to sign in.'}));
  if(!r.ok)return jsonError(r.status===401?'Email or password is incorrect.':result.message||'Unable to sign in.',r.status);
  if(isTelegramChallenge(result)){await clearTokens();return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});}
  const p=await currentProfile(result.accessToken);
  if(!p){await upstream('auth/logout',{method:'POST',headers:{Authorization:`Bearer ${result.accessToken}`}});return jsonError(`This account cannot access the ${PANEL.title} panel.`,403);}
  await saveTokens(result,req.nextUrl.protocol==='https:');return NextResponse.json(p,{headers:{'Cache-Control':'no-store'}});
 }catch{return jsonError('Cannot connect to Main Backend. Start it at localhost:8080 and try again.',502);}
}
export async function DELETE(req:NextRequest) {if(!checkOrigin(req))return jsonError('Invalid request origin.',403);try{const t=await token(req.nextUrl.protocol==='https:');if(t)await upstream('auth/logout',{method:'POST',headers:{Authorization:`Bearer ${t}`}});}catch{}await clearTokens();return NextResponse.json({ok:true});}
