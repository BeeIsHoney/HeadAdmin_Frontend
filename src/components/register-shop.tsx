'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Check,Store,ShieldCheck} from 'lucide-react';
import {send} from '@/lib/client';
import {CustomerBotFields,OwnerTelegramIdField,readOwnerTelegramId} from './shop-telegram';
import {SubscriptionFields} from './shop-subscription';
import {readPermissions} from '@/lib/shop-subscription';
import {shopAdminLogin} from '@/lib/shop-admin-login';
import type {Profile} from '@/lib/types';
import {usePanel} from './context';
import {Button,Form,Field,val,Detail,CopyButton} from './ui';
type Registered={shopName:string;shopCode:string;ownerName:string;email:string;ownerId:number;ownerTelegramId:number|null};
export function RegisterShopPage(){
 const router=useRouter(),onClose=()=>router.push('/shops');
 const {invalidate,notify}=usePanel(),[created,setCreated]=useState<Registered|null>(null);
 const configuration=shopAdminLogin(created?.shopCode);
 return <><div className="page-title"><div><span className="eyebrow">MAIN ADMIN · SHOP REGISTRATION</span><h1>{created?'Shop registered':'Register shop'}</h1><p>{created?'The shop and its owner login are linked.':'Create a shop and its authorized owner account here in Main Admin.'}</p></div><Link href="/shops" className="btn">Back to shops</Link></div><section className="card registration-card"><div className="registration-location"><ShieldCheck size={16}/><span>Main Admin · Register shop</span></div>
 {created?<><div className="credential-success"><span><Check size={20}/></span><div><b>{created.shopName}</b><p>Registered in Main Service · Owner #{created.ownerId}</p></div></div><dl className="details-grid"><Detail label="Shop name">{created.shopName}</Detail><Detail label="Shop code"><code>{created.shopCode}</code></Detail><Detail label="Owner name">{created.ownerName}</Detail><Detail label="Owner Telegram ID">{created.ownerTelegramId??'Not assigned'}</Detail><Detail label="Authorized Gmail / email">{created.email}</Detail></dl><div className="notice"><ShieldCheck size={18}/><p>The owner signs in with this email and password at the shared Shop Admin login. Their assigned shop opens automatically.</p></div><div className="setup-snippet"><div><b>Shop owner login</b><CopyButton text={configuration} label="Copy login URL"/></div><pre>{configuration}</pre></div><p className="card-footnote">Registration is complete. Every shop owner uses the same login page; each account can access only its assigned shops.</p><div className="form-footer"><Button variant="primary" onClick={onClose}>Done</Button></div></>:<Form submit="Register shop" onCancel={onClose} onSubmit={async f=>{
 const details={shopName:val(f,'shopName'),shopCode:val(f,'shopCode'),ownerName:val(f,'ownerName'),email:val(f,'email').toLowerCase(),ownerTelegramId:readOwnerTelegramId(f)};
 const account=await send<Profile>('head/owners',{userName:details.ownerName,email:details.email,password:String(f.get('password')),shopName:details.shopName,shopCode:details.shopCode,plan:String(f.get('plan')||'DEFAULT'),permissions:readPermissions(f),customerBotToken:val(f,'customerBotToken'),websiteUrl:val(f,'websiteUrl'),ownerTelegramId:details.ownerTelegramId});
 setCreated({...details,ownerId:account.id});invalidate();notify('Shop registered. Its owner account is linked to the shop code.');
 }}><div className="form-grid"><Field label="Shop name"><input required name="shopName" maxLength={120} autoComplete="organization"/></Field><Field label="Shop code" hint="Unique identifier for this shop. Login finds it from the owner account."><input required name="shopCode" pattern="[a-z0-9-]{3,60}" minLength={3} maxLength={60} autoCapitalize="none" spellCheck={false}/></Field></div><Field label="Owner name / username" hint="3–50 letters, numbers or underscores."><input required name="ownerName" pattern="[A-Za-z0-9_]{3,50}" maxLength={50} autoComplete="off"/></Field><Field label="Owner Gmail / email" hint="This account is authorized for the shop code above."><input required type="email" name="email" maxLength={254} autoComplete="off"/></Field><Field label="Owner login password" hint="12–72 characters. Give it directly to the shop owner."><input required type="password" name="password" minLength={12} maxLength={72} autoComplete="new-password"/></Field><OwnerTelegramIdField/><SubscriptionFields/><CustomerBotFields/><div className="notice"><Store size={18}/><p>Registration creates the shop and owner here. The owner then signs in through the shared Shop Admin login.</p></div></Form>}
 </section></>;
}
