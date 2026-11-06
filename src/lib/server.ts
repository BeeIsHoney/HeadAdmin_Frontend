import 'server-only';
import {sameRequestOrigin,proxyRequestOrigin} from './request-origin';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { PANEL, BACKEND_URL } from './config';
import type { Profile } from './types';
import {productOperation} from './catalog-policy';
type Pair = {accessToken:string;refreshToken:string;accessExpiresAt:string;refreshExpiresAt:string};
const prefix = PANEL.head ? 'jf_head_' : 'jf_owner_';
const refreshes = new Map<string,{promise:Promise<Pair|null>;until:number}>();
export const jsonError = (message:string,status=400) => NextResponse.json({message},{status,headers:{'Cache-Control':'no-store'}});
export function checkOrigin(req:NextRequest) {
 const target=proxyRequestOrigin(req.nextUrl.origin,req.headers.get('host'),req.headers.get('x-forwarded-proto'),req.headers.get('x-forwarded-host'));
 return sameRequestOrigin(req.headers.get('origin'),target.origin,target.host);
}
export async function upstream(path:string, init:RequestInit={}) { return fetch(`${BACKEND_URL}/api/${path}`,{...init,cache:'no-store',signal:init.signal??AbortSignal.timeout(25000)}); }
export async function saveTokens(pair:Pair,secure:boolean) {
 const jar=await cookies();
 for(const [name,value,expiry] of [['access',pair.accessToken,pair.accessExpiresAt],['refresh',pair.refreshToken,pair.refreshExpiresAt]])
  jar.set(prefix+name,value,{httpOnly:true,sameSite:'lax',secure,path:'/',maxAge:Math.max(0,Math.floor((new Date(expiry).getTime()-Date.now())/1000))});
}
export async function clearTokens() {const jar=await cookies(); jar.delete(prefix+'access');jar.delete(prefix+'refresh');}
export async function token(secure:boolean) {
 const jar=await cookies(), access=jar.get(prefix+'access')?.value;
 if(access) {
  try {const payload=JSON.parse(Buffer.from(access.split('.')[1],'base64url').toString()); if(payload.exp*1000>Date.now()+60000)return access;}catch{}
 }
 const refresh=jar.get(prefix+'refresh')?.value;if(!refresh)return null;
 const key=createHash('sha256').update(refresh).digest('hex');const now=Date.now();
 for(const [k,v] of refreshes)if(v.until<now)refreshes.delete(k);
 let task=refreshes.get(key);
 if(!task) {
  const promise=(async()=>{const r=await upstream('auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:refresh})});return r.ok?await r.json() as Pair:null;})();
  task={promise,until:now+30000};refreshes.set(key,task);
 }
 const pair=await task.promise;if(!pair){await clearTokens();return null;}await saveTokens(pair,secure);return pair.accessToken;
}
export async function currentProfile(access:string):Promise<Profile|null> {
 const r=await upstream('owner/profile',{headers:{Authorization:`Bearer ${access}`}});
 if(!r.ok)return null;const p=await r.json() as Profile;return p.role===PANEL.role?p:null;
}
export function permitted(path:string,method:string) {
 if(path.includes('..') || path.includes('\\') || !/^[A-Za-z0-9_./:~-]+$/.test(path))return false;
 if(PANEL.head&&method==='GET'&&/^head\/telegram-accounts\/[1-9]\d{0,15}$/.test(path))return true;
 if(/^owner\/(profile|balance|shops|games|store-products|orders|transactions)(\/|$)/.test(path)) {
  if(method==='GET')return true;
 }
 if(/^owner\/shops\/\d+\/api-keys(\/\d+)?$/.test(path))return ['POST','DELETE'].includes(method);
 if(path==='owner/password')return method==='POST';
 if(PANEL.head&&productOperation(path,method))return true;
 if(!PANEL.head && /^owner\/(game-orders|store-orders|games\/\d+\/check-player)$/.test(path))return method==='POST';
 if(PANEL.head && /^head\/(owners|shops|orders|transactions|catalog|service-clients)(\/|$)/.test(path))return true;
 if(PANEL.head && /^admin\/(store-products|store-orders)(\/|$)/.test(path))return true;
 if(PANEL.head && /^admin\/provider-wallet(\/sync-all)?$/.test(path))return method==='GET';
 return false;
}
