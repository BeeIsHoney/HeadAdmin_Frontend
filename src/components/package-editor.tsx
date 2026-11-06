'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {Package,RefreshCw} from 'lucide-react';
import {api,send,money} from '@/lib/client';
import {catalogPath,sameProviderPackage,topupProviders,voucherProviders,type AdminProduct,type AdminPackage,type ProviderCategory,type ProviderOffer} from '@/lib/product-management';
import {SearchSelect} from './search-select';
import {Button,ErrorBox,Field,Form,Loading,Modal,val} from './ui';

export function PackageEditor({product,existing,editing,onClose,onSaved,embedded=false}:{product:AdminProduct;existing:AdminPackage[];editing?:AdminPackage;onClose:()=>void;onSaved:()=>void;embedded?:boolean}){
 const store=product.id.startsWith('store-');
 const [provider,setProvider]=useState(editing?.directProvider||'Manual'),[category,setCategory]=useState(editing?.providerCategory||''),[sku,setSku]=useState(editing?.providerSkuId||'');
 const [categories,setCategories]=useState<ProviderCategory[]>([]),[offers,setOffers]=useState<ProviderOffer[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[reload,setReload]=useState(0);
 const [name,setName]=useState(editing?.name||''),[price,setPrice]=useState(String(editing?.sellingPrice??'')),[cost,setCost]=useState(String(editing?.coinCost??0));
 const [warning,setWarning]=useState(''),[acknowledged,setAcknowledged]=useState(false),[stock,setStock]=useState(editing?.stockModeEnabled??false);
 const direct=provider!=='Manual',currency=editing?.currency||'USD',offer=offers.find(o=>String(o.id)===sku);
 const choices=store?voucherProviders:topupProviders;
 useEffect(()=>{
  if(!direct){setCategories([]);setError('');return;}
  let live=true;setLoading(true);setError('');
  api<ProviderCategory[]>(catalogPath(provider)).then(v=>{if(live)setCategories(v);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[provider,direct,reload]);
 useEffect(()=>{
  setWarning('');setAcknowledged(false);
  if(!direct||!category){setOffers([]);return;}
  let live=true;setLoading(true);setError('');
  Promise.all([api<ProviderOffer[]>(catalogPath(provider,category)),send<{compatible:boolean;warning:string}>('admin/panel/packages/compatibility-check',{productId:product.id,gameType:product.name,directProvider:provider,providerCategory:category,packageId:editing?.id})])
   .then(([v,c])=>{if(live){setOffers(v);setWarning(c.compatible?'':c.warning);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[provider,category,direct,reload,product.id,product.name,editing?.id]);
 function choose(value:string){setSku(value);const p=offers.find(o=>String(o.id)===value);if(p){setName(p.name);setCost(String(p.priceUsd??p.amount??0));}}
 return <PackageFrame embedded={embedded} title={editing?'Edit package':'Add package'} description={`${product.name} · ${currency} selling prices`} onClose={onClose} wide>
  <Form onCancel={onClose} submit={editing?'Save package':'Create package'} onSubmit={async f=>{
   if(direct&&(!category||!sku))throw Error('Choose the provider game and package.');
   if(direct&&existing.some(p=>p.id!==editing?.id&&sameProviderPackage(p,product.id,provider,category,sku)))throw Error('This provider package is already in this product. Edit the existing package instead.');
   if(warning&&!acknowledged)throw Error('Check the category warning and confirm the mapping before saving.');
   if(!Number.isFinite(Number(price))||Number(price)<=0)throw Error('Enter a selling price greater than zero.');
   await send(`admin/panel/packages${editing?'/'+editing.id:''}`,{
    productId:product.id,gameType:product.name,name:name.trim(),directProvider:provider,
    providerCategory:direct?category:null,providerSkuId:direct?sku:null,
    sellingPrice:Number(price),currency,coinCost:Number(cost),isActive:f.get('active')==='on',
    sortOrder:Number(val(f,'sort')),note:val(f,'note'),url:editing?.url||null,icon:editing?.icon||null,
    multipleQuantityEnabled:direct&&f.get('multiple')==='on',stockModeEnabled:!direct&&stock,
    totalStockLimit:!direct&&stock?Number(val(f,'stock')):0
   },editing?'PUT':'POST');onSaved();
  }}>
   <div className="editor-context"><span className="editor-context-icon"><Package size={19}/></span><div><b>{product.name}</b><small>{product.provider} · Shared catalog</small></div></div>
   <Field label="API provider"><select value={provider} onChange={e=>{setProvider(e.target.value);setCategory('');setSku('');setOffers([]);setCategories([]);setCost('0');}}><option value="Manual">Manual fulfillment</option>{choices.map(p=><option key={p} value={p}>{p==='FZC'?'FZC · FazerCards':p==='G2B'?'G2B · G2Bulk':p}</option>)}</select></Field>
   {direct&&<>
    <div className="form-grid"><SearchSelect label={store?'Provider gift card / category':'Provider game / category'} value={category} required onChange={value=>{setCategory(value);setSku('');setOffers([]);}} placeholder={store?'Type gift card name…':'Type game name…'} options={[...(category&&!categories.some(c=>String(c.id)===category)?[{value:category,label:'Saved category · '+category}]:[]),...categories.map(c=>({value:String(c.id),label:c.name}))]}/>
    <SearchSelect label="Provider package" value={sku} required onChange={choose} disabled={!category} placeholder="Type package name…" options={[...(sku&&!offers.some(p=>String(p.id)===sku)?[{value:sku,label:'Saved package · '+sku}]:[]),...offers.map(p=>({value:String(p.id),label:p.name}))]}/></div>

    {loading&&<Loading/>}{error&&<ErrorBox message={error} retry={()=>setReload(v=>v+1)}/>}
    {offer&&<div className="mapping-summary"><span>Source cost <b>{money(offer.priceUsd??offer.amount)} {offer.currency||'provider units'}</b></span><span>Provider SKU <code>{sku}</code></span>{offer.fields?.length?<p>Provider inputs: {offer.fields.map(f=>`${f.label} (${f.key})${f.required?' *':''}`).join(', ')}. Set matching fields on the product.</p>:null}</div>}
    {warning&&<div className="mapping-warning"><p>{warning}</p><label className="checkbox"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/>I checked this provider category.</label></div>}
   </>}
   <Field label="Package name"><input required value={name} maxLength={128} onChange={e=>setName(e.target.value)} placeholder="65 Bonds"/></Field>
   <div className="form-grid"><Field label={`Selling price · ${currency}`} hint="The amount charged to the shop owner's balance."><input required type="number" inputMode="decimal" min="0.0001" step="0.0001" value={price} onChange={e=>setPrice(e.target.value)}/></Field><Field label={`Source cost${direct?' · provider currency':' · '+currency}`}><input required type="number" inputMode="decimal" min="0" step="0.0001" value={cost} onChange={e=>setCost(e.target.value)}/></Field></div>
   {direct&&<p className="card-footnote">Source cost keeps the provider's units. Set the {currency} selling price yourself; no currency conversion is applied.</p>}
   <div className="form-grid"><Field label="Sort order"><input name="sort" type="number" inputMode="decimal" min="0" defaultValue={editing?.sortOrder||0}/></Field></div>
   <Field label="Package note (optional)"><textarea name="note" maxLength={1000} defaultValue={editing?.note||''}/></Field>
   <label className="checkbox"><input name="active" type="checkbox" defaultChecked={editing?.isActive??true}/>Active package</label>
   {direct&&!store&&<label className="checkbox"><input name="multiple" type="checkbox" defaultChecked={editing?.multipleQuantityEnabled??false} disabled={!offer?.supportsMultipleQuantity&&!editing?.multipleQuantityEnabled}/>Allow multiple quantity when supported by the provider</label>}
   {!direct&&<><label className="checkbox"><input type="checkbox" checked={stock} onChange={e=>setStock(e.target.checked)}/>{store?'Deliver inventory codes automatically':'Limit available stock'}</label>{stock&&!store&&<Field label="Total stock limit" hint={`Already used: ${editing?.stockUsage||0}`}><input name="stock" type="number" inputMode="decimal" min={editing?.stockUsage||0} defaultValue={editing?.totalStockLimit||0} required/></Field>}{store&&stock&&<p className="card-footnote">Add inventory codes from the package list after saving.</p>}</>}
  </Form>
 </PackageFrame>;
}

function PackageFrame({embedded,title,description,onClose,children}:{embedded:boolean;title:string;description:string;onClose:()=>void;wide?:boolean;children:ReactNode}){return embedded?<section className="card product-editor-form head-package-create">{children}</section>:<Modal title={title} description={description} onClose={onClose} wide>{children}</Modal>;}
