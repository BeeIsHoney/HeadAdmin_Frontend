export type TelegramChallenge={status:'OTP_REQUIRED';challengeId:string;expiresAt:string;resendAvailableAt:string;deliveryBot:string};
export function isTelegramChallenge(value:unknown):value is TelegramChallenge{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return v.status==='OTP_REQUIRED'&&typeof v.challengeId==='string'&&/^[a-f0-9-]{36}$/.test(v.challengeId)
  &&typeof v.expiresAt==='string'&&Number.isFinite(Date.parse(v.expiresAt))
  &&typeof v.resendAvailableAt==='string'&&Number.isFinite(Date.parse(v.resendAvailableAt))
  &&typeof v.deliveryBot==='string'&&v.deliveryBot.length>0&&v.deliveryBot.length<81;
}
