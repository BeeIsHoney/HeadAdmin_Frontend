"use client";
import {useEffect,useState} from 'react';
import {Button,ErrorBox,Field} from './ui';
import {isTelegramChallenge,type TelegramChallenge} from '@/lib/telegram-otp';
export function TelegramLoginOtp<T>({challenge,onVerified,onBack}:{challenge:TelegramChallenge;onVerified:(profile:T)=>void;onBack:()=>void}){
 const [current,setCurrent]=useState(challenge),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const wait=Math.max(0,Math.ceil((Date.parse(current.resendAvailableAt)-now)/1000)),expired=Date.parse(current.expiresAt)<=now;
 const resend=async()=>{
  if(busy||wait||expired)return;setBusy(true);setError('');
  try{const response=await fetch('/api/session/otp/resend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:current.challengeId})});const value=await response.json();if(!response.ok)throw Error(value.message||'Unable to resend code.');if(!isTelegramChallenge(value))throw Error('Invalid verification response.');setCurrent(value);setCode('');setNow(Date.now());}
  catch(failure){setError(failure instanceof Error?failure.message:'Unable to resend code.');}finally{setBusy(false);}
 };
 return <div><h2>Telegram verification</h2><p className="login-description">Enter the 6-digit code sent to <b>{current.deliveryBot}</b>.</p><form aria-busy={busy} onSubmit={async event=>{
  event.preventDefault();if(busy||expired||!/^[0-9]{6}$/.test(code))return;setBusy(true);setError('');
  try{const response=await fetch('/api/session/otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:current.challengeId,otp:code})});const value=await response.json();if(!response.ok)throw Error(value.message||'Invalid verification code.');onVerified(value as T);}
  catch(failure){setError(failure instanceof Error?failure.message:'Unable to verify code.');}finally{setBusy(false);}
 }}><Field label="Telegram code"><div className="login-input"><input autoFocus required type="text" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event=>setCode(event.target.value.replace(/[^0-9]/g,''))} disabled={busy||expired} placeholder="000000"/></div></Field>
 {error&&<ErrorBox message={error}/>}<Button type="submit" variant="primary" className="login-submit" disabled={busy||expired||code.length!==6}>{busy?'Verifying…':'Verify and sign in'}</Button></form>
 <p className="login-help">{expired?'Code expired. Return to sign in for a new code.':'Code expires in 5 minutes.'}</p><div className="form-footer"><Button disabled={busy} onClick={onBack}>Back</Button><Button disabled={busy||wait>0||expired} onClick={()=>void resend()}>{wait?`Resend in ${wait}s`:'Resend code'}</Button></div></div>;
}
