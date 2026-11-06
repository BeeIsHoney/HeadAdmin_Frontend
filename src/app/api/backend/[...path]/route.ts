import { NextRequest,NextResponse } from 'next/server';
import {checkOrigin,jsonError,permitted,token,upstream} from '@/lib/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
async function handle(req:NextRequest,ctx:Context) {
 if(!['GET','HEAD'].includes(req.method)&&!checkOrigin(req))return jsonError('Invalid request origin.',403);
 const {path:parts}=await ctx.params;const path=parts.join('/');
 if(!permitted(path,req.method))return jsonError('This operation is not available in this panel.',403);
 try {
  const access=await token(req.nextUrl.protocol==='https:');if(!access)return jsonError('Please sign in again.',401);
  const headers:Record<string,string>={Authorization:`Bearer ${access}`};
  if(req.headers.get('content-type'))headers['Content-Type']=req.headers.get('content-type')!;
  if(req.headers.get('idempotency-key'))headers['Idempotency-Key']=req.headers.get('idempotency-key')!;
  const r=await upstream(path+req.nextUrl.search,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:path==='admin/panel/media'?await req.arrayBuffer():await req.text()}:{})});
  return new NextResponse(r.status===204?null:await r.arrayBuffer(),{status:r.status,headers:{'Content-Type':r.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});
 }catch{return jsonError('Main Backend did not respond. Check the connection and retry.',502);}
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
