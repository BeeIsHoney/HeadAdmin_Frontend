import {NextRequest,NextResponse} from 'next/server';
import {checkOrigin,jsonError,upstream} from '@/lib/server';
import {isTelegramChallenge} from '@/lib/telegram-otp';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!checkOrigin(req))return jsonError('Invalid request origin.',403);
 let body:unknown;try{body=await req.json();}catch{return jsonError('Invalid resend request.');}
 const challengeId=body&&typeof body==='object'?(body as Record<string,unknown>).challengeId:null;
 if(typeof challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(challengeId))return jsonError('Invalid login challenge.');
 try{const response=await upstream('auth/login/otp/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId})});const value=await response.json().catch(()=>({message:'Unable to resend code.'}));if(!response.ok)return jsonError(value.message||'Unable to resend code.',response.status);if(!isTelegramChallenge(value))return jsonError('Invalid verification response.',502);return NextResponse.json(value,{headers:{'Cache-Control':'no-store'}});}
 catch{return jsonError('Login service is unavailable. Please try again.',503);}
}
