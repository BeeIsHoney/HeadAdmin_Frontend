'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Plus,Gamepad2,Layers,ArrowRight,Package,PenLine,ShieldCheck} from 'lucide-react';
import {api,send,money} from '@/lib/client';
import type {AdminProduct,AdminPackage} from '@/lib/product-management';
import {useData,usePanel} from './context';
import {PageTitle} from './views';
import {Badge,Button,Empty,ErrorBox,Field,Form,Loading,Modal,SearchBox,val,Pager} from './ui';
import {PackageEditor} from './package-editor';

export function Catalog({productId}:{productId?:string}){
 const {invalidate,notify}=usePanel();
 const {data:capabilities,error:capabilityError}=useData('catalog-capabilities',()=>api<{currency:string}>('head/catalog/capabilities'));
 const {data:products,error,loading,refreshError}=useData('managed-products',()=>api<AdminProduct[]>('admin/panel/products'));
 const {data:packages,error:packageError}=useData('managed-packages',()=>api<AdminPackage[]>('admin/panel/packages'));
 const [query,setQuery]=useState(''),[source,setSource]=useState('ALL'),[selected,setSelected]=useState<string|null>(productId||null),[page,setPage]=useState(0);
 const [editor,setEditor]=useState<{product:AdminProduct;pack?:AdminPackage}|null>(null),[codes,setCodes]=useState<AdminPackage|null>(null);
 useEffect(()=>{setSelected(productId||null);},[productId]);
 const list=(products??[]).filter(p=>(source==='ALL'||p.provider===source)&&`${p.name} ${p.id} ${p.category||''}`.toLowerCase().includes(query.toLowerCase()));
 const current=Math.min(page,Math.max(0,Math.ceil(list.length/25)-1)),visible=list.slice(current*25,(current+1)*25);
 const product=products?.find(p=>p.id===selected),items=(packages??[]).filter(p=>p.productId===selected);
 if(capabilityError)return <ErrorBox message="Update MainServiceBackend to the Product Catalog v1.3 build, then refresh this page." retry={invalidate}/>;
 if(!capabilities)return <Loading/>;
 return <>
  <PageTitle title="Product catalog" sub="Products and packages managed centrally for your shops." action={<div className="row-actions"><Link className="btn" href="/catalog/groups">Owner shared groups</Link><Link className="btn primary" href="/catalog/add"><Plus size={16}/>Create product</Link><Link className="btn" href="/packages/create"><Plus size={16}/>Create package</Link></div>}/>
  <div className="catalog-toolbar"><div className="segmented">{[['ALL','All products'],['Direct Top-ups','Direct top-ups'],['Manual','Manual'],['GiftCards & Vouchers','Gift cards']].map(([v,label])=><button key={v} className={source===v?'active':''} onClick={()=>{setSource(v);setPage(0);}}>{label}</button>)}</div><SearchBox value={query} onChange={v=>{setQuery(v);setPage(0);}} placeholder="Search products…"/></div>
  {error||packageError?<ErrorBox message={error||packageError} retry={invalidate}/>:!products||!packages?<Loading/>:!list.length?<section className="card"><Empty title="No products found" text="Add a product, then set up its provider or manual packages."/></section>:<section className="card owner-catalog-table"><div className="table-wrap" role="region" aria-label="Main products, scroll horizontally for actions" tabIndex={0}><table><thead><tr><th>Name</th><th>Source</th><th>Packages</th><th>From · USD</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(p=>{const packs=packages.filter(k=>k.productId===p.id),active=packs.filter(k=>k.isActive),usd=active.filter(k=>(k.currency||'USD')==='USD'),price=usd.length?Math.min(...usd.map(k=>Number(k.sellingPrice))):null;return <tr key={p.id}><td><button className="text-button" onClick={()=>setSelected(p.id)}><b>{p.name}</b></button><small>{p.category||'Games'} · {p.id}</small></td><td><span className="provider-tag">{p.provider}</span></td><td>{packs.length}<small>{active.length} active</small></td><td className="numeric">{price!==null?'$'+money(price):'—'}</td><td>{p.sort||0}</td><td><Badge value={p.isActive?'Active':'Inactive'}/></td><td><div className="owner-row-actions"><button className="owner-table-action add" onClick={()=>setSelected(p.id)}><Package size={13}/>Packages</button><Link href={'/catalog/edit/'+p.id} className="owner-table-action"><PenLine size={13}/>Edit</Link></div></td></tr>;})}</tbody></table></div><div className="head-table-pager"><Pager page={current} totalPages={Math.max(1,Math.ceil(list.length/25))} total={list.length} onChange={setPage}/></div></section>}

  {refreshError&&<ErrorBox message={refreshError} retry={invalidate}/>}
  {product&&!editor&&!codes&&<Modal title={product.name} description={`${product.provider} · ${product.id}`} onClose={()=>setSelected(null)} wide>
   <div className="modal-toolbar"><Badge value={product.isActive?'Active':'Inactive'}/><div className="row-actions"><Link href={'/catalog/edit/'+product.id} className="btn"><PenLine size={14}/>Edit product</Link><Link className="btn primary" href={'/packages/create'+'?product='+encodeURIComponent(product.id)}><Plus size={15}/>Create package</Link></div></div>
   {product.note&&<p className="product-note">{product.note}</p>}
   {!items.length?<Empty title="Add your first package" text="Choose an API provider, game and package, or use manual fulfillment."/>:<div className="table-wrap head-package-table" role="region" aria-label="Main packages, scroll horizontally for actions" tabIndex={0}><table><thead><tr><th>Name</th><th>Provider / SKU</th><th>Main selling price</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td><span className="provider-tag">{p.directProvider||'Manual'}</span>{p.providerSkuId&&<small>{p.providerSkuId}</small>}</td><td className="numeric">{money(p.sellingPrice)}<small>{p.currency||'USD'}</small></td><td>{p.sortOrder||0}</td><td><Badge value={p.isActive?'Active':'Inactive'}/></td><td><div className="row-actions"><Button onClick={()=>setEditor({product,pack:p})}><PenLine size={13}/>Edit</Button>{p.deliveryMode==='AUTO_STOCK'&&<Button onClick={()=>setCodes(p)}>Add codes</Button>}</div></td></tr>)}</tbody></table></div>}

   <div className="catalog-caption"><ShieldCheck size={14}/>One catalog record is shared across your shops.</div>
  </Modal>}
  {editor&&<PackageEditor key={editor.pack?.id||editor.product.id} product={editor.product} existing={packages??[]} editing={editor.pack} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);invalidate();notify('Package saved.');}}/>}
  {codes&&<Modal title="Add inventory codes" description={codes.name} onClose={()=>setCodes(null)}><Form submit="Add codes" onCancel={()=>setCodes(null)} onSubmit={async f=>{await send(`admin/store-products/packages/${codes.id.replace('store-package-','')}/codes`,{codes:val(f,'codes').split('\n').map(s=>s.trim()).filter(Boolean)});setCodes(null);invalidate();notify('Inventory codes added.');}}><Field label="Inventory codes" hint="One code per line."><textarea name="codes" required rows={8} spellCheck={false}/></Field></Form></Modal>}
 </>;
}
