'use client';
import {useState} from 'react';
import {send} from '@/lib/client';
import type {Shop} from '@/lib/types';
import {SHOP_PLANS,SHOP_FEATURES,readPermissions,type ShopSubscription} from '@/lib/shop-subscription';
import {usePanel} from './context';
import {Button,Field,Form,Modal} from './ui';

export function SubscriptionFields({subscription}:{subscription?:ShopSubscription}){
 return <><Field label="Shop owner plan" hint="Every plan lasts one calendar month. Changing the plan does not reset its expiry."><select name="plan" defaultValue={subscription?.plan??'DEFAULT'}>{SHOP_PLANS.map(p=><option key={p.id} value={p.id}>{p.label} · 1 month</option>)}</select></Field><fieldset className="subscription-permissions"><legend>Features allowed by Main Admin</legend><p className="muted-text">Only checked features can be enabled by the shop owner. All features start locked.</p><div className="form-grid">{SHOP_FEATURES.map(feature=><label className="checkbox" key={feature.id}><input type="checkbox" name={'feature-'+feature.id} defaultChecked={subscription?.permissions[feature.id]===true}/>{feature.label}</label>)}</div></fieldset></>;
}

export function ShopSubscriptionControls({shop}:{shop:Shop}){
 const {invalidate,notify}=usePanel(),[modal,setModal]=useState<'plan'|'renew'|null>(null);
 const subscription=shop.subscription;
 const label=SHOP_PLANS.find(p=>p.id===subscription?.plan)?.label??'Default';
 return <div className="shop-subscription-controls"><p><strong>{label}</strong> · 1 month</p><p className="muted-text">{subscription?.expiresAt?`${subscription.expired?'Expired':'Expires'}: ${new Date(subscription.expiresAt).toLocaleString()}`:'Subscription setup required'}</p><div className="row-actions"><Button onClick={()=>setModal('plan')}>Plan & features</Button><Button onClick={()=>setModal('renew')}>Renew 1 month</Button></div>
 {modal==='plan'&&<Modal title={'Plan & features · '+shop.name} onClose={()=>setModal(null)}><Form submit="Save permissions" onCancel={()=>setModal(null)} onSubmit={async form=>{await send(`head/shops/${shop.id}/subscription`,{plan:String(form.get('plan')),permissions:readPermissions(form)},'PUT');setModal(null);invalidate();notify('Shop plan and permissions updated. Expiry is unchanged.');}}><SubscriptionFields subscription={subscription}/></Form></Modal>}
 {modal==='renew'&&<Modal title={'Renew '+shop.name} onClose={()=>setModal(null)}><Form submit="Renew for 1 month" onCancel={()=>setModal(null)} onSubmit={async form=>{await send(`head/shops/${shop.id}/subscription/renew`,{reactivate:form.get('reactivate')==='on'});setModal(null);invalidate();notify('Shop subscription renewed for one month.');}}><p>Active subscriptions extend from their current expiry. Expired subscriptions restart from now.</p><label className="checkbox"><input name="reactivate" type="checkbox" defaultChecked/> Enable the shop after renewal</label></Form></Modal>}
 </div>;
}
