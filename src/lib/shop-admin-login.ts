import * as panelConfig from './config';

export function shopAdminLogin(code?:string){
 const panels=Reflect.get(panelConfig,'SHOP_PANELS') as Record<string,string>|undefined;
 const configured=code?panels?.[code]:undefined;
 if(configured)return configured.replace(/\/$/,'')+'/login';
 const url=new URL(typeof window==='undefined'?'http://localhost:3001/login':window.location.origin);
 url.port='3001';url.pathname='/login';url.search='';url.hash='';return url.toString();
}
