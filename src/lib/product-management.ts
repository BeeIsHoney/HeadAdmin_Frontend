import {normalizedValidationCode} from './validation-selection';
export type ProductSource='Manual'|'Direct Top-ups'|'GiftCards & Vouchers';
export type ProductField={id:string;label:string;type:string;placeholder?:string;required:boolean;providerKey?:string;validationKey?:string;validationSource?:string;optionSource?:string;options?:Array<string|{label:string;value:string}>};
export type AdminProduct={id:string;name:string;provider:ProductSource;isActive:boolean;category?:string;image?:string;imageStorageReference?:string;note?:string;sort?:number;validationCode?:string;inputFields?:ProductField[];deliveryEstimate?:string};
export type AdminPackage={id:string;productId:string;gameType:string;name:string;sellingPrice:number;currency?:string;coinCost:number;directProvider:string;providerCategory?:string;providerSkuId?:string;isActive:boolean;sortOrder?:number;note?:string;url?:string;icon?:string;multipleQuantityEnabled?:boolean;stockModeEnabled?:boolean;totalStockLimit?:number;stockUsage?:number;remainingStock?:number;deliveryMode?:string};
export type ProviderCategory={id:string|number;name:string;code?:string};
export type ProviderOffer={id:string|number;name:string;priceUsd?:number;amount?:number;currency?:string;supportsMultipleQuantity?:boolean;maxQuantity?:number;remainingStock?:number;fields?:Array<{key:string;label:string;required:boolean}>};
export const productSources:ProductSource[]=['Manual','Direct Top-ups','GiftCards & Vouchers'];
export const topupProviders=['G2B','FZC','GXL','TPN','LTB','B2','SMILEONE','LG'];
export const voucherProviders=['G2B:GCV','FZC:GCV','LG:GCV'];
export function catalogPath(provider:string,category?:string){
 if(![...topupProviders,...voucherProviders,'LG:VALIDATION'].includes(provider))throw Error('Choose a supported provider.');
 if(category!==undefined&&!/^[A-Za-z0-9._~-]+$/.test(category))throw Error('This provider category is not supported by the backend.');
 return `admin/panel/provider-catalog/${provider.replaceAll(':','~')}/categories${category===undefined?'':`/${category}/packages`}`;
}
export function parsedOptions(text:string){return text.split('\n').map(s=>s.trim()).filter(Boolean).map(s=>{const [value,...label]=s.split('|');return {value:value.trim(),label:(label.join('|')||value).trim()};});}
export function optionsText(options:ProductField['options']){return (options??[]).map(o=>typeof o==='string'?o:o.label===o.value?o.value:`${o.value}|${o.label}`).join('\n');}
export function validateFields(fields:ProductField[],direct:boolean){
 if(fields.length>20)throw Error('Keep up to 20 input fields.');
 const ids=new Set<string>();
 for(const f of fields){
  if(!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(f.id)||ids.has(f.id))throw Error('Input field IDs must be unique letters, numbers, underscores or hyphens.');
  ids.add(f.id);
  if(!f.label.trim())throw Error('Give every input field a label.');
  if(f.type==='Dropdown'&&!(f.options?.length))throw Error('Add at least one option to each dropdown.');
  if(direct&&!f.providerKey?.trim())throw Error('Set the provider field key for every purchase input.');
 }
 return fields;
}
export function sameProviderPackage(pack:AdminPackage,productId:string,provider:string,category:string,sku:string){return pack.productId===productId&&pack.directProvider===provider&&pack.providerCategory===category&&String(pack.providerSkuId)===sku;}
export function productPayload(p:AdminProduct){return {name:p.name.trim(),provider:p.provider,category:p.category||'Games',image:p.imageStorageReference||p.image||null,note:p.note||'',sort:p.sort||0,isActive:p.isActive,validationCode:p.provider==='Direct Top-ups'?normalizedValidationCode(p.validationCode):null,inputFields:p.provider==='GiftCards & Vouchers'?[]:validateFields(p.inputFields??[],p.provider==='Direct Top-ups'),deliveryEstimate:p.deliveryEstimate||''};}

export function isMlbbProduct(p:Pick<AdminProduct,'name'|'validationCode'>){return p.validationCode?.trim().toLowerCase()==='mlbb';}
