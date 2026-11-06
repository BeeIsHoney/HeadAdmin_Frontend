'use client';
import {createContext,useContext,useEffect,useState,useCallback,useRef,useSyncExternalStore,type ReactNode} from 'react';
import type {Profile} from '@/lib/types';
import {api} from '@/lib/client';
import {QueryCache} from '@/lib/query-cache';
const Context=createContext<{profile:Profile;refresh:number;cache:QueryCache;invalidate:()=>void;notify:(message:string)=>void;logout:()=>Promise<void>}>({} as never);
export const usePanel=()=>useContext(Context);
export function PanelProvider({profile,children,onLogout}:{profile:Profile;children:ReactNode;onLogout:()=>void}){
 const [refresh,setRefresh]=useState(0),[message,setMessage]=useState(''),[current,setCurrent]=useState(profile),[cache]=useState(()=>new QueryCache());const timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const invalidate=useCallback(()=>{cache.invalidate();setRefresh(x=>x+1);},[cache]);
 const notify=useCallback((s:string)=>{setMessage(s);if(timeout.current)clearTimeout(timeout.current);timeout.current=setTimeout(()=>setMessage(''),4500);},[]);
 useEffect(()=>()=>{cache.clear();if(timeout.current)clearTimeout(timeout.current);},[cache]);
 useEffect(()=>{let active=true;if(refresh)api<Profile>('owner/profile').then(p=>{if(active)setCurrent(p);}).catch(()=>{});return()=>{active=false;};},[refresh]);
 async function logout(){cache.clear();try{await fetch('/api/session',{method:'DELETE'});}finally{onLogout();}}
 return <Context.Provider value={{profile:current,refresh,cache,invalidate,notify,logout}}>{children}{message&&<div className="toast" role="status">{message}<button aria-label="Dismiss notification" onClick={()=>setMessage('')}>×</button></div>}</Context.Provider>;
}
export function useData<T>(key:string,loader:()=>Promise<T>){
 const {refresh,cache}=usePanel();const loaderRef=useRef(loader);loaderRef.current=loader;
 const subscribe=useCallback((notify:()=>void)=>cache.subscribe(key,notify),[cache,key]);const get=useCallback(()=>cache.get<T>(key),[cache,key]);
 const snapshot=useSyncExternalStore(subscribe,get,get);
 useEffect(()=>{void cache.load(key,()=>loaderRef.current());},[cache,key,refresh]);
 return {data:snapshot.data,error:snapshot.data===undefined?snapshot.error:'',loading:snapshot.loading,refreshError:snapshot.data===undefined?'':snapshot.error};
}
export function useRealtime(invalidate:()=>void){
 const [state,setState]=useState<'connecting'|'live'|'polling'|'paused'>('connecting');
 useEffect(()=>{
  let source:EventSource|null=null, poll:ReturnType<typeof setInterval>|null=null, debounce:ReturnType<typeof setTimeout>|null=null;
  const changed=()=>{if(debounce)clearTimeout(debounce);debounce=setTimeout(invalidate,350);};
  function connect(){source?.close();if(poll)clearInterval(poll);if(document.hidden){setState('paused');return;}setState('connecting');source=new EventSource('/api/events');source.addEventListener('connected',()=>{setState('live');changed();if(poll){clearInterval(poll);poll=null;}});source.addEventListener('change',changed);source.onerror=()=>{setState('polling');if(!poll)poll=setInterval(()=>{if(!document.hidden)invalidate();},15000);};}
  const visible=()=>{connect();if(!document.hidden)invalidate();};document.addEventListener('visibilitychange',visible);connect();
  return()=>{source?.close();if(poll)clearInterval(poll);if(debounce)clearTimeout(debounce);document.removeEventListener('visibilitychange',visible);};
 },[invalidate]);return state;
}
