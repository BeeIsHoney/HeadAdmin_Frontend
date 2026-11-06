import type {InputField} from './types';
export function canonical(value:string) {
 const key=value.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
 if(['id','uid','userid','playerid','accountid'].includes(key))return 'playerId';
 if(['server','serverid','zone','zoneid'].includes(key))return 'serverId';
 if(['charname','charactername'].includes(key))return 'charname';
 return value;
}
export function inputValue(fields:InputField[],values:Record<string,string>,key:string) {
 const field=fields.find(f=>canonical(f.providerKey||f.id||f.label||'')===key);
 return field?values[field.id!]||'':'';
}
export function checkerInputs(fields:InputField[],values:Record<string,string>) {
 const mapped:Record<string,string>={};
 const explicit=fields.some(f=>!!f.validationKey);
 for(const f of fields)if(values[f.id!]&&(!explicit||f.validationKey))mapped[f.validationKey||f.id!]=values[f.id!];
 return mapped;
}
