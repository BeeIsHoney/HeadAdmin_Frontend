import test from 'node:test';
import assert from 'node:assert/strict';
import {productOperation} from '../src/lib/catalog-policy.ts';
import {catalogPath,parsedOptions,productPayload,sameProviderPackage,isMlbbProduct} from '../src/lib/product-management.ts';

test('catalog proxy limits paths and methods to the product workflow',()=>{
 for(const [path,method] of [['admin/panel/products','POST'],['admin/panel/packages','GET'],['admin/panel/products/game-12','PUT'],['admin/panel/packages/store-package-2','PUT'],['admin/panel/provider-catalog/G2B~GCV/categories/abc/packages','GET'],['admin/panel/validation/G2/mlbb/schema','GET']])assert.equal(productOperation(path,method),true,path);
 for(const [path,method] of [['admin/panel/users','GET'],['admin/panel/products','DELETE'],['admin/panel/products/game-1','POST'],['admin/panel/provider-catalog/G2B/categories','POST'],['admin/panel/products/../users','PUT']])assert.equal(productOperation(path,method),false,path);
});
test('provider category routes preserve aliases and reject path injection',()=>{
 assert.equal(catalogPath('G2B:GCV','steam-us'),'admin/panel/provider-catalog/G2B~GCV/categories/steam-us/packages');
 assert.throws(()=>catalogPath('G2B','../users'));
 assert.throws(()=>catalogPath('HEAD_ADMIN'));
});
test('direct product payload preserves purchase and validation field mappings',()=>{
 const result=productPayload({id:'',name:' Arena Breakout ',provider:'Direct Top-ups',isActive:true,validationCode:'mlbb',inputFields:[{id:'playerId',label:'Player ID',type:'Text Input',required:true,providerKey:'player_id',validationKey:'uid',validationSource:'G2'}]});
 assert.equal(result.name,'Arena Breakout');assert.equal(result.inputFields[0].providerKey,'player_id');assert.equal(result.inputFields[0].validationKey,'uid');
 assert.throws(()=>productPayload({id:'',name:'Bad',provider:'Direct Top-ups',isActive:true,inputFields:[{id:'id',label:'ID',type:'Text Input',required:true}]}));
});
test('dropdown values keep separate provider values and display labels',()=>{
 assert.deepEqual(parsedOptions('asia|Asia Server\n123|Server 123\n'),[{value:'asia',label:'Asia Server'},{value:'123',label:'Server 123'}]);
});
test('package duplicate detection keeps providers distinct within one shared product',()=>{
 const p={productId:'game-1',directProvider:'G2B',providerCategory:'ab',providerSkuId:'65'};
 assert.equal(sameProviderPackage(p,'game-1','G2B','ab','65'),true);
 assert.equal(sameProviderPackage(p,'game-1','FZC','ab','65'),false);
 assert.equal(sameProviderPackage(p,'game-2','G2B','ab','65'),false);
});
test('only the explicit Main Admin checker setting enables purchase-time checking',()=>{
 assert.equal(isMlbbProduct({name:'Mobile Legends: Bang Bang'}),false);
 assert.equal(isMlbbProduct({name:'Mobile Legends: Bang Bang',validationCode:'mlbb'}),true);
 assert.equal(isMlbbProduct({name:'MLBB Philippines',validationCode:''}),false);
 assert.equal(isMlbbProduct({name:'PUBG Mobile',validationCode:'pubgm'}),false);
 assert.equal(productPayload({id:'',name:'Arena Breakout',provider:'Direct Top-ups',isActive:true,validationCode:'ab',inputFields:[]}).validationCode,null);
});
