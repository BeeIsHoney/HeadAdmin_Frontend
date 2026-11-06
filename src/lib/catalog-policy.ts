export function productOperation(path:string,method:string){
 if(/^admin\/panel\/resources\/catalog-groups$/.test(path))return ['GET','POST'].includes(method);
 if(/^admin\/panel\/resources\/catalog-groups\/[A-Za-z0-9_~-]+$/.test(path))return ['PUT','DELETE'].includes(method);
 if(path==='admin/panel/packages/bulk-delete')return method==='POST';
 if(path==='admin/panel/media')return method==='POST';
 if(path==='admin/panel/products'||path==='admin/panel/packages')return ['GET','POST'].includes(method);
 if(/^admin\/panel\/products\/(?:game|store)-[1-9][0-9]*$/.test(path))return ['PUT','DELETE'].includes(method);
 if(/^admin\/panel\/packages\/(?:game|store)-package-[1-9][0-9]*$/.test(path))return ['PUT','DELETE'].includes(method);
 if(path==='admin/panel/packages/compatibility-check')return method==='POST';
 if(/^admin\/panel\/provider-catalog\/[A-Za-z0-9_~:-]+\/categories(?:\/[A-Za-z0-9._~-]+\/packages)?$/.test(path))return method==='GET';
 if(/^admin\/panel\/validation\/[A-Za-z0-9_-]+\/[A-Za-z0-9._~-]+\/schema$/.test(path))return method==='GET';
 return false;
}
