export class ApiError extends Error { status:number;constructor(message:string,status:number) { super(message);this.status=status; } }
export async function api<T>(path:string, init:RequestInit = {}):Promise<T> {
 const r = await fetch(`/api/backend/${path.replace(/^\//,'')}`, {...init, cache:'no-store',headers:{...(init.body?{'Content-Type':'application/json'}:{}), ...init.headers}});
 const data = r.status===204 ? undefined : await r.json().catch(()=>({message:'The server returned an unreadable response.'}));
 if(!r.ok) { if(r.status===401) window.dispatchEvent(new Event('jiafu:expired')); throw new ApiError(data?.message || `Request failed (${r.status}).`,r.status); }
 return data as T;
}
export const send = <T>(path:string, body:unknown, method='POST',headers?:HeadersInit) => api<T>(path,{method,body:JSON.stringify(body),headers});
export function money(n:number | string | undefined | null) { return Number(n??0).toLocaleString('en-US',{maximumFractionDigits:4}); }
export function date(value:string|undefined) { if(!value) return '—'; const d=new Date(value); return Number.isNaN(d.valueOf())?'—':d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
export const total = (p:import('./types').Purchase) => p.order.totalPrice ?? p.order.sellPrice ?? 0;
export const status = (p:import('./types').Purchase) => { const value=p.order.status?.toUpperCase()||'PENDING';return value==='SUCCESS'?'COMPLETED':value; };
export function csv(name:string, rows:Record<string,unknown>[]) {
 if(!rows.length) return;
 const keys=Object.keys(rows[0]);
 const escape=(v:unknown)=>{let s=String(v??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const b=new Blob(['\ufeff'+[keys.map(escape).join(','),...rows.map(r=>keys.map(k=>escape(r[k])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8;'});
 const url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
