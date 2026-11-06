import test from 'node:test';
import assert from 'node:assert/strict';
import {status,total} from '../src/lib/client.ts';
import {canonical,inputValue,checkerInputs} from '../src/lib/inputs.ts';
test('backend SUCCESS is displayed as Completed',()=>assert.equal(status({order:{status:'SUCCESS'}}),'COMPLETED'));
test('failed/refunded orders preserve terminal truth',()=>{for(const s of ['FAILED','REFUNDED'])assert.equal(status({order:{status:s}}),s);});
test('totals respect store total and game total sellPrice',()=>{assert.equal(total({order:{totalPrice:900,sellPrice:200}}),900);assert.equal(total({order:{sellPrice:800}}),800);});
test('custom input mapping uses supplier keys',()=>{const f=[{id:'custom_player',providerKey:'player_id',label:'ID'}];assert.equal(inputValue(f,{custom_player:'123'},'playerId'),'123');assert.equal(canonical('zone_id'),'serverId');});
test('validation keys remain separate from supplier keys',()=>{const f=[{id:'custom',providerKey:'uid',validationKey:'game_user_id'}];assert.deepEqual(checkerInputs(f,{custom:'321'}),{game_user_id:'321'});});

test('checker excludes purchase-only fields when validation bindings are explicit',()=>assert.deepEqual(checkerInputs([{id:'player',validationKey:'user_id'},{id:'email',providerKey:'delivery_email'}],{player:'123',email:'buyer@example.test'}),{user_id:'123'}));
