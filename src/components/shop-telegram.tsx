'use client';
import {useEffect,useRef,useState} from 'react';
import type {Shop} from '@/lib/types';
import {api,send} from '@/lib/client';
import {Field,Form,ErrorBox,Loading,Badge,Button} from './ui';
interface BotStatus {configured:boolean;username:string;websiteUrl:string;webhookReady:boolean;setupError:string}
interface OwnerStatus {telegramId:number|null;linked:boolean;botUsername:string}
export function readOwnerTelegramId(form:FormData):number|null{
 const value=String(form.get('ownerTelegramId')||'').trim();if(!value)return null;
 const id=Number(value);if(!/^[1-9][0-9]{0,15}$/.test(value)||!Number.isSafeInteger(id)||id>4503599627370495)throw new Error('Enter a positive numeric Telegram user ID.');
 return id;
}
interface TelegramCheck {registered:boolean;telegramId:number;displayName:string;username:string;assigned:boolean;role?:'USER'|'ADMIN_USER'|'HEAD_ADMIN'}
export function OwnerTelegramIdField({value}:{value?:number|null}){
 const [id,setId]=useState(String(value??'')),[checking,setChecking]=useState(false),[result,setResult]=useState<TelegramCheck|null>(null),[error,setError]=useState('');
 const check=async()=>{
  setError('');setResult(null);const n=Number(id);
  if(!/^[1-9][0-9]{0,15}$/.test(id)||!Number.isSafeInteger(n)||n>4503599627370495){setError('Enter a numeric Telegram user ID.');return;}
  setChecking(true);try{setResult(await api<TelegramCheck>(`head/telegram-accounts/${id}`));}catch(e){setError((e as Error).message);}finally{setChecking(false);}
 };
 return <><Field label="Owner Telegram ID" hint="The user first presses Start in TornadoServiceBot. Check their registered Telegram account, then save this owner assignment."><input name="ownerTelegramId" inputMode="numeric" pattern="[1-9][0-9]{0,15}" maxLength={16} value={id} onChange={e=>{setId(e.target.value);setResult(null);setError('');}} placeholder="123456789" autoComplete="off"/></Field><Button disabled={checking||!id} onClick={()=>void check()}>{checking?'Checking…':'Check Telegram account'}</Button>{error&&<p role="alert" className="form-error">{error}</p>}{result&&<div className="notice"><p>{result.registered?<><strong>{result.displayName||'Registered Telegram account'}</strong>{result.username&&<> · @{result.username}</>}<br/>Telegram ID: {result.telegramId}<br/>Role: {result.telegramId===value?'ADMIN_USER':result.role??'USER'}<br/>{result.role==='HEAD_ADMIN'?'Head Admin account · Use the Gateway bot.':(result.assigned||result.telegramId===value)?'Assigned to an owner account.':'Registered · Pending owner approval.'}</>:'This user has not registered yet. Ask them to press Start in TornadoServiceBot, then Check again.'}</p></div>}</>;
}

function OwnerTelegramSettings({shop}:{shop:Shop}){
 const [status,setStatus]=useState<OwnerStatus|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;void api<OwnerStatus>(`head/shops/${shop.id}/owner-telegram`).then(value=>{if(active)setStatus(value);}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false;};},[shop.id]);
 useEffect(()=>{if(!status?.telegramId||status.linked)return;let active=true;const timer=setInterval(()=>{void api<OwnerStatus>(`head/shops/${shop.id}/owner-telegram`).then(value=>{if(active)setStatus(value);}).catch(()=>{});},5000);return()=>{active=false;clearInterval(timer);};},[shop.id,status?.telegramId,status?.linked]);
 if(error)return <ErrorBox message={error}/>;if(!status)return <Loading/>;
 return <><div className="notice"><p><strong>Shop owner · Admin bot</strong><br/>{status.linked?'Owner Telegram connected.':status.telegramId?'Owner assignment saved. Use Check approval in TornadoServiceBot.':'Enter the owner’s numeric Telegram user ID.'}</p></div><Form submit="Save owner Telegram ID" onSubmit={async form=>{setStatus(await send<OwnerStatus>(`head/shops/${shop.id}/owner-telegram`,{telegramId:readOwnerTelegramId(form)},'PUT'));}}><OwnerTelegramIdField value={status.telegramId}/>{status.botUsername&&<p className="muted-text"><a className="text-link" href={`https://t.me/${status.botUsername}`} target="_blank" rel="noreferrer">Open shared Admin bot · @{status.botUsername} ↗</a></p>}<p className="muted-text">Leaving the ID blank removes its assignment and disconnects the owner’s Telegram alerts.</p></Form></>;
}
export function CustomerBotFields(){return <><Field label="Customer Telegram bot token" hint="Optional. Use a separate BotFather bot for this shop’s customers. The backend verifies and securely stores the token."><input type="password" name="customerBotToken" maxLength={130} autoComplete="new-password" placeholder="123456789:…" spellCheck={false}/></Field><Field label="Customer website URL" hint="Used by View details buttons in this shop’s bot."><input type="url" name="websiteUrl" maxLength={2048} placeholder="https://your-shop.example"/></Field></>;}
function CustomerBotSettings({shop}:{shop:Shop}){
 const [status,setStatus]=useState<BotStatus|null>(null),[error,setError]=useState('');
 const tokenInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{let active=true;void api<BotStatus>(`head/shops/${shop.id}/telegram-bot`).then(value=>{if(active)setStatus(value);}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false;};},[shop.id]);
 useEffect(()=>{if(!status?.configured||status.webhookReady)return;let active=true;const timer=setInterval(()=>{void api<BotStatus>(`head/shops/${shop.id}/telegram-bot`).then(value=>{if(active)setStatus(value);}).catch(()=>{});},5000);return()=>{active=false;clearInterval(timer);};},[shop.id,status?.configured,status?.webhookReady]);
 if(error)return <ErrorBox message={error}/>;if(!status)return <Loading/>;
 return <><div className="notice"><p>{status.configured?<>Customer bot: <strong>@{status.username}</strong> · <Badge value={status.webhookReady?'Connected':'Setup pending'}/></>:'No customer bot configured for this shop.'}</p></div>{status.setupError&&<ErrorBox message={status.setupError}/>}<Form submit={status.configured?'Update customer bot':'Connect customer bot'} onSubmit={async form=>{
 const result=await send<BotStatus>(`head/shops/${shop.id}/telegram-bot`,{botToken:String(form.get('customerBotToken')||'').trim(),websiteUrl:String(form.get('websiteUrl')||'').trim()},'PUT');setStatus(result);if(tokenInput.current)tokenInput.current.value='';
 }}><Field label="Customer Telegram bot token" hint={status.configured?'Leave blank to keep the current token. Enter a new token to replace it.':'Create a dedicated customer bot with BotFather and paste its token here.'}><input ref={tokenInput} required={!status.configured} type="password" name="customerBotToken" maxLength={130} autoComplete="new-password" spellCheck={false}/></Field><Field label="Customer website URL"><input type="url" name="websiteUrl" maxLength={2048} defaultValue={status.websiteUrl} placeholder="https://your-shop.example"/></Field><p className="muted-text">Customers register automatically when they press Start in this shop’s bot. Shop owners register in TornadoServiceBot and receive access after Head Admin approval.</p></Form></>;
}

export function ShopTelegramSettings({shop}:{shop:Shop}){return <><CustomerBotSettings key={`customer-${shop.id}`} shop={shop}/><OwnerTelegramSettings key={`owner-${shop.id}`} shop={shop}/></>;}
