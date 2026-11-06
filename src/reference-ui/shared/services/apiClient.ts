import {api,ApiError as ClientError} from '@/lib/client';
export class ApiError extends Error {constructor(message:string,public status:number,public code?:string){super(message);}}
export async function requestJson<T>(path:string,init:RequestInit={},_timeout?:number,_quiet?:boolean):Promise<T>{
 try{return await api<T>(path.replace(/^\//,''),init);}catch(e){if(e instanceof ClientError)throw new ApiError(e.message,e.status);throw e;}
}
