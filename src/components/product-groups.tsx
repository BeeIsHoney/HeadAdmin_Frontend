'use client';
import {useState} from 'react';
import Link from 'next/link';
import {FolderOpen,Plus,PenLine,ShieldCheck} from 'lucide-react';
import {api,send} from '@/lib/client';
import {useData,usePanel} from './context';
import {PageTitle} from './views';
import {Badge,Button,Empty,ErrorBox,Field,Form,Loading,Modal,val} from './ui';
type Group={id:number;name:string;enabled:boolean;sortOrder:number};
export function ProductGroups(){
 const {invalidate,notify}=usePanel(),{data,error}=useData('product-groups',()=>api<Group[]>('head/catalog/groups'));
 const [editing,setEditing]=useState<Group|undefined|null>(null);
 return <><PageTitle title="Product groups" sub="Create shared groups such as AB and MLBB for every shop owner." action={<Button variant="primary" onClick={()=>setEditing(undefined)}><Plus size={16}/>Create group</Button>}/>
 <div className="notice"><ShieldCheck size={18}/><p>Owners choose these groups when adding Main games and packages. Optional MLBB ID checking is controlled in each Main product's settings.</p></div>
 {error?<ErrorBox message={error} retry={invalidate}/>:!data?<Loading/>:!data.length?<section className="card"><Empty title="Create your first group" text="For example, create AB for Arena Breakout or MLBB for Mobile Legends."/></section>:<div className="shop-group-grid">{data.map(g=><section className="card shop-group-card" key={g.id}><span className="group-symbol"><FolderOpen size={22}/></span><div><h3>{g.name}</h3><small>Shared with all shop owners · Sort {g.sortOrder}</small></div><Badge value={g.enabled}/><Button onClick={()=>setEditing(g)}><PenLine size={14}/>Edit</Button></section>)}</div>}
 <p className="card-footnote">Disabled groups cannot accept new packages or purchases. Existing shop selections and order history stay available. <Link className="text-link" href="/catalog">Manage games and packages</Link></p>
 {editing!==null&&<Modal title={editing?'Edit group':'Create group'} description="Main Admin manages the group names used by all shops." onClose={()=>setEditing(null)}><Form submit={editing?'Save group':'Create group'} onCancel={()=>setEditing(null)} onSubmit={async f=>{await send(`head/catalog/groups${editing?'/'+editing.id:''}`,{name:val(f,'name'),enabled:f.get('enabled')==='on',sortOrder:Number(val(f,'sortOrder'))},editing?'PUT':'POST');setEditing(null);invalidate();notify('Group saved. Owners can use the active groups immediately.');}}><Field label="Group name"><input name="name" required maxLength={100} defaultValue={editing?.name||''} placeholder="AB / MLBB"/></Field><Field label="Sort order"><input name="sortOrder" type="number" inputMode="decimal" min="0" step="1" defaultValue={editing?.sortOrder??0}/></Field><label className="checkbox"><input name="enabled" type="checkbox" defaultChecked={editing?.enabled??true}/>Active for owners</label></Form></Modal>}
 </>;
}
