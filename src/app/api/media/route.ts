import {NextRequest,NextResponse} from 'next/server';
import {checkOrigin,currentProfile,jsonError,token,upstream} from '@/lib/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 if(!checkOrigin(req))return jsonError('Invalid request origin.',403);
 try{
  const access=await token(req.nextUrl.protocol==='https:');
  if(!access||!await currentProfile(access))return jsonError('Please sign in as Main Admin.',401);
  const form=await req.formData(),file=form.get('file');
  if(!(file instanceof File)||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)return jsonError('Choose a PNG, JPG or WebP image up to 5 MB.');
  const body=new FormData();body.set('file',file);
  const r=await upstream('admin/panel/media',{method:'POST',headers:{Authorization:`Bearer ${access}`},body});
  return new NextResponse(await r.arrayBuffer(),{status:r.status,headers:{'Content-Type':r.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});
 }catch{return jsonError('Image upload failed. Check Main Backend media storage or use an image URL.',502);}
}
