import {api,send} from '@/lib/client';
import {validateFields,sameProviderPackage,topupProviders,voucherProviders,type AdminProduct,type AdminPackage,type ProductField} from '@/lib/product-management';
import type {GameItem,ProductInputField} from '../../features/catalog/types/game.types';
import type {ProductItem} from '../../features/catalog/types/product.types';
import {normalizedValidationCode} from '@/lib/validation-selection';
import {normalizeProductInputFields} from '../../features/catalog/utils/productInputFields';
export function referenceGame(p:AdminProduct):GameItem{return {...p,discount:0,sort:p.sort||0,orderCount:0,totalSold:String((p as unknown as {totalSold?:string}).totalSold||'0'),inputFields:normalizeProductInputFields((p.inputFields||[]) as ProductInputField[],p.provider==='Direct Top-ups')};}
export async function mediaReference(value?:string){
 if(!value)return null;
 if(!value.startsWith('blob:')&&!value.startsWith('data:image/'))return value;
 const blob=await (await fetch(value)).blob();
 if(!['image/jpeg','image/png','image/webp'].includes(blob.type)||blob.size>2*1024*1024)throw Error('Choose JPG, PNG or WEBP up to 2 MB.');
 const data=new FormData();data.append('file',blob,blob.type==='image/png'?'image.png':blob.type==='image/webp'?'image.webp':'image.jpg');
 const r=await fetch('/api/backend/admin/panel/media',{method:'POST',body:data});const saved=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status===401)window.dispatchEvent(new Event('jiafu:expired'));throw Error(saved.message||'Image upload failed. Check Main Backend media storage settings.');}
 if(typeof saved.reference!=='string'||!saved.reference)throw Error('Main Backend returned no image reference.');return saved.reference as string;
}
async function saveProduct(id:string|undefined,p:Record<string,unknown>,previous?:GameItem){
 const source=p.provider as string;
 if(!['Manual','Direct Top-ups','GiftCards & Vouchers'].includes(source))throw Error('Choose a product source.');
 const code=source==='Direct Top-ups'?normalizedValidationCode(p.validationCode):null;
 let fields=Array.isArray(p.inputFields)?p.inputFields as ProductField[]:[];
 fields=source==='GiftCards & Vouchers'?[]:validateFields(fields.map(f=>({...f,required:f.required!==false})),source==='Direct Top-ups');
 const image=previous&&p.image===previous.image&&previous.imageStorageReference?previous.imageStorageReference:await mediaReference(p.image as string|undefined);
 const payload={...p,image,inputFields:fields,validationCode:code};
 const saved=await send<AdminProduct>('admin/panel/products'+(id?'/'+id:''),payload,id?'PUT':'POST');return referenceGame(saved);
}
type CatalogGroup=import('../../features/catalog/types/catalog-group.types').ProductCatalogGroupItem;
const resources=<T extends {id:string}>(type:string)=>({
 list:()=>api<T[]>('admin/panel/resources/'+type),
 create:(value:Omit<T,'id'>)=>send<T>('admin/panel/resources/'+type,value),
 update:(value:T)=>send<T>('admin/panel/resources/'+type+'/'+encodeURIComponent(value.id),value,'PUT'),
 remove:(id:string)=>api<void>('admin/panel/resources/'+type+'/'+encodeURIComponent(id),{method:'DELETE'}),
});
export async function referencePackages(){return (await api<Array<AdminPackage&Partial<ProductItem>>>('admin/panel/packages')).map(p=>({...p,profit:Number(p.profit||0),coinType:p.coinType||'Coins',sortOrder:p.sortOrder||0,coinCost:Number(p.coinCost||0)} as ProductItem));}
const catalogGroups=resources<CatalogGroup>('catalog-groups');
export const adminPanelApi={
 products:{list:async()=> (await api<AdminProduct[]>('admin/panel/products')).map(referenceGame),create:(value:Record<string,unknown>)=>saveProduct(undefined,value),update:(id:string,value:Record<string,unknown>,previous:GameItem)=>saveProduct(id,value,previous),remove:(id:string)=>api<void>('admin/panel/products/'+encodeURIComponent(id),{method:'DELETE'})},
 packages:{
 list:referencePackages,
 create:(value:Omit<ProductItem,'id'>)=>saveReferencePackage(value),
 update:async(id:string,value:Omit<ProductItem,'id'>,previous?:ProductItem|null)=>{const current=(await api<AdminPackage[]>('admin/panel/packages')).find(p=>p.id===id);if(!current)throw Error('Package not found. Refresh the list.');return saveReferencePackage({...previous,...value},current);},
 remove:(id:string)=>api<void>('admin/panel/packages/'+encodeURIComponent(id),{method:'DELETE'}),
 bulkSetStatus:async(ids:string[],active:boolean)=>{const list=await api<Array<AdminPackage&Partial<ProductItem>>>('admin/panel/packages');for(const id of ids){const item=list.find(p=>p.id===id);if(!item)throw Error('Package not found. Refresh the list.');await send('admin/panel/packages/'+encodeURIComponent(id),{...item,isActive:active},'PUT');}},
 bulkRemove:(ids:string[])=>send('admin/panel/packages/bulk-delete',{ids}),
 checkCompatibility:(value:unknown)=>send<{compatible:boolean;warning?:string}>('admin/panel/packages/compatibility-check',value)
 },
 catalogGroups:{...catalogGroups,create:async(value:Omit<CatalogGroup,'id'>)=>catalogGroups.create({...value,logoUrl:(await mediaReference(value.logoUrl))||undefined}),update:async(value:CatalogGroup,previous?:CatalogGroup|null)=>catalogGroups.update({...value,logoUrl:previous&&previous.logoUrl===value.logoUrl?previous.logoStorageReference||value.logoUrl:(await mediaReference(value.logoUrl))||undefined})}
};
export async function saveReferencePackage(value:Omit<ProductItem,'id'>,editing?:AdminPackage){
 if(!value.productId||!value.name.trim()||!Number.isFinite(value.sellingPrice)||value.sellingPrice<=0)throw Error('Choose a product and enter a package name and positive USD price.');
 const provider=value.directProvider||'Manual',direct=provider!=='Manual';
 if(direct&&!(value.productId.startsWith('store-')?voucherProviders:topupProviders).includes(provider))throw Error('Choose a provider source for this product type.');
 if(direct&&(!value.providerCategory||!value.providerSkuId))throw Error('Choose the provider category and package.');
 if(!Number.isFinite(value.profit)||value.profit<0||!Number.isFinite(value.coinCost)||value.coinCost<0)throw Error('Source cost and profit must be zero or greater.');
 const existing=await api<AdminPackage[]>('admin/panel/packages');
 if(direct&&existing.some(p=>p.id!==editing?.id&&sameProviderPackage(p,value.productId!,provider,value.providerCategory!,value.providerSkuId!)))throw Error('This provider package is already in this product. Edit the existing package.');
 const image=await mediaReference(value.url);
 return send<AdminPackage>('admin/panel/packages'+(editing?'/'+editing.id:''),{...value,currency:'USD',directProvider:provider,url:image,icon:image},editing?'PUT':'POST');
}
