'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {CreatePackageView} from '@/reference-ui/features/catalog/CreatePackageView';
import {saveReferencePackage} from '@/reference-ui/shared/services/adminPanelApi';
import {usePanel} from './context';
export function CreatePackagePage({giftCards=false}:{giftCards?:boolean}){
 const router=useRouter(),params=useSearchParams(),{invalidate,notify}=usePanel();
 return <div id="reference-create" className="reference-create"><CreatePackageView key={(params.get('product')||'')+String(giftCards)} giftCardsOnly={giftCards} defaultProductId={params.get('product')||''} onCancel={()=>router.push('/catalog')} onSave={async value=>{await saveReferencePackage(value);invalidate();notify('Package created.');router.push('/catalog/'+value.productId);}}/></div>;
}
