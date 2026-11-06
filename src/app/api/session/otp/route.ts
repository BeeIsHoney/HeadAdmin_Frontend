import {NextRequest,NextResponse} from 'next/server';
import {checkOrigin,clearTokens,currentProfile,jsonError,saveTokens,upstream} from '@/lib/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!checkOrigin(req))return jsonError('Invalid request origin.',403);
 let body:unknown;try{body=await req.json();}catch{return jsonError('Enter a valid login code.');}
 const {challengeId,otp}=(body&&typeof body==='object'?body:{}) as Record<string,unknown>;
 if(typeof challengeId!=='string'||!/^[a-f0-9-]{36}$/.test(challengeId)||typeof otp!=='string'||!/^[0-9]{6}$/.test(otp))return jsonError('Enter the 6-digit Telegram code.');
 try{
  const response=await upstream('auth/login/otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId,otp})});
  const result=await response.json().catch(()=>({message:'Unable to verify code.'}));if(!response.ok)return jsonError(result.message||'Unable to verify code.',response.status);
  if(typeof result.accessToken!=='string'||typeof result.refreshToken!=='string'||!Number.isFinite(Date.parse(result.accessExpiresAt))||!Number.isFinite(Date.parse(result.refreshExpiresAt)))return jsonError('Invalid verified login response.',502);
  const profile=await currentProfile(result.accessToken);if(!profile){await clearTokens();return jsonError('This account cannot access the Head Admin panel.',403);}
  await saveTokens(result,req.nextUrl.protocol==='https:');
  return NextResponse.json(profile,{headers:{'Cache-Control':'no-store'}});
 }catch{return jsonError('Login service is unavailable. Please try again.',503);}
}
