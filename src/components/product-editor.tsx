'use client';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/client';
import type {AdminProduct} from '@/lib/product-management';
import {useData,usePanel} from './context';
import {ErrorBox,Loading} from './ui';
import {CreateProductView} from '@/reference-ui/features/catalog/CreateProductView';
import {referenceGame} from '@/reference-ui/shared/services/adminPanelApi';
export function ProductEditor({editId,giftCard=false}:{editId?:string;giftCard?:boolean}){
 const router=useRouter(),{invalidate,notify}=usePanel();
 const {data,error}=useData('managed-products',()=>api<AdminProduct[]>('admin/panel/products'));
 if(error)return <ErrorBox message={error} retry={invalidate}/>;
 if(!data)return <Loading/>;
 const product=editId?data.find(p=>p.id===editId):undefined;
 if(editId&&!product)return <ErrorBox message="Product not found."/>;
 return <div id="reference-create" className="reference-create"><CreateProductView key={editId||String(giftCard)} giftCard={giftCard} editingProduct={product?referenceGame(product):undefined} defaultSortOrder={Math.max(0,...data.map(p=>p.sort||0))+1} onCancel={()=>router.push('/catalog')} onSaved={()=>{invalidate();notify('Product saved.');router.push('/products');}}/></div>;
}
