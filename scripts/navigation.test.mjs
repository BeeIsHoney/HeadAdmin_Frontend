import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import {SHOP_PANELS} from '../src/lib/config.ts';
const root=fileURLToPath(new URL('../src/',import.meta.url));
function sources(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?sources(path.join(dir,f.name)):/\.(ts|tsx)$/.test(f.name)?[path.join(dir,f.name)]:[]);}
test('shipped Main UI has no default localhost shop-panel destination',()=>{
 assert.deepEqual(SHOP_PANELS,{});
 for(const file of sources(root))assert.doesNotMatch(readFileSync(file,'utf8'),/localhost:3001/,file);
});
test('all visible Register shop links stay on the Main Admin registration route',()=>{
 let checked=0;
 for(const file of sources(root)){
  const tree=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){
   if(ts.isJsxElement(node)&&['Link','a'].includes(node.openingElement.tagName.getText(tree))){
    const label=node.children.filter(ts.isJsxText).map(c=>c.text).join(' ').replace(/\s+/g,' ').trim();
    if(/^register (?:a )?shop(?: here)?$/i.test(label)){
     const href=node.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(tree)==='href');
     assert.ok(href?.initializer&&ts.isStringLiteral(href.initializer),file+' must use an explicit same-origin registration link');
     assert.equal(href.initializer.text,'/shops/register',file);checked++;
    }
   }
   ts.forEachChild(node,visit);
  }visit(tree);
 }
 assert.ok(checked>=3,'Overview, Shops and Shop owners must all expose registration');
});
