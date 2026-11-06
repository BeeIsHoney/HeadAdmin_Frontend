export interface QuerySnapshot<T>{readonly data:T|undefined;readonly error:string;readonly loading:boolean;readonly version:number}
const EMPTY:QuerySnapshot<unknown>=Object.freeze({data:undefined,error:'',loading:true,version:-1});
export class QueryCache{
 private records=new Map<string,QuerySnapshot<unknown>>();private pending=new Map<string,Promise<void>>();private listeners=new Map<string,Set<()=>void>>();private version=0;private generation=0;
 get<T>(key:string):QuerySnapshot<T>{return (this.records.get(key)??EMPTY) as QuerySnapshot<T>;}
 subscribe(key:string,notify:()=>void){let group=this.listeners.get(key);if(!group){group=new Set();this.listeners.set(key,group);}group.add(notify);return()=>{group.delete(notify);if(!group.size)this.listeners.delete(key);};}
 private publish<T>(key:string,value:QuerySnapshot<T>){this.records.set(key,value);this.listeners.get(key)?.forEach(fn=>fn());}
 invalidate(){this.version++;}
 clear(){this.generation++;this.version++;this.records.clear();this.pending.clear();this.listeners.forEach(group=>group.forEach(fn=>fn()));}
 load<T>(key:string,loader:()=>Promise<T>):Promise<void>{
  const pending=this.pending.get(key);if(pending)return pending;const before=this.get<T>(key);if(before.data!==undefined&&before.version===this.version)return Promise.resolve();
  const version=this.version,generation=this.generation;this.publish(key,{...before,error:'',loading:before.data===undefined});
  const job=Promise.resolve().then(loader).then(data=>{if(generation===this.generation)this.publish(key,{data,error:'',loading:false,version});},error=>{if(generation===this.generation)this.publish(key,{...this.get<T>(key),loading:false,error:error instanceof Error?error.message:'Could not update this data.'});}).then(()=>{if(generation!==this.generation)return;this.pending.delete(key);if(version!==this.version&&this.listeners.get(key)?.size)return this.load(key,loader);});
  this.pending.set(key,job);return job;
 }
}
