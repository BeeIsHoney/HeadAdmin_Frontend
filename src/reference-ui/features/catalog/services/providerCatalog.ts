import {api} from '@/lib/client';
import {catalogPath,type ProviderCategory,type ProviderOffer} from '@/lib/product-management';
import type {ValidationProvider} from '@/lib/validation-selection';
export interface ProviderSkuItem{id:string;name:string;amount?:string;priceUsd:number;currency?:string;remainingStock?:number;supportsMultipleQuantity?:boolean;maxQuantity?:number;available?:boolean;stockKnown?:boolean;availabilityKnown?:boolean;}
export interface ProviderGameCategory{id:string;gameName:string;skus:ProviderSkuItem[];}
export interface ValidationFieldSchema{id:string;label:string;type:'Text Input'|'Dropdown';placeholder?:string;required:boolean;providerKey:string;validationKey:string;validationSource:'MLBB'|'G2'|'SmileOne'|'LG';optionSource?:'manual'|'validation_api';options?:Array<{label:string;value:string}>;}
export interface ValidationSchema{provider:'MLBB'|'G2'|'SmileOne'|'LG';code:string;notes?:string;fields:ValidationFieldSchema[];}
export async function fetchProviderCategories(provider:string):Promise<ProviderGameCategory[]>{return (await api<ProviderCategory[]>(catalogPath(provider))).map(p=>({id:String(p.id),gameName:p.name,skus:[]}));}
export async function fetchProviderPackages(provider:string,category:string):Promise<ProviderSkuItem[]>{return (await api<ProviderOffer[]>(catalogPath(provider,category))).map(p=>({...p,id:String(p.id),amount:p.amount==null?undefined:String(p.amount),priceUsd:Number(p.priceUsd??p.amount??0)}));}
export async function fetchValidationSchema(provider:ValidationProvider,code:string):Promise<ValidationSchema>{
 if(!['MLBB','G2','SMILEONE','LG'].includes(provider)||!/^[A-Za-z0-9._~-]+$/.test(code))throw Error('Choose a supported validation category.');
 const schema=await api<ValidationSchema>(`admin/panel/validation/${provider}/${code}/schema`);
 if(!schema||!Array.isArray(schema.fields)||!schema.fields.length)throw Error('This category has no standalone validation fields. Choose another category.');
 return schema;
}
