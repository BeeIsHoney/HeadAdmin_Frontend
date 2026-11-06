// Next dev may put its bind address (0.0.0.0) in nextUrl. The browser uses
// the actual request Host, such as the PC's LAN address, for its Origin.
export function sameRequestOrigin(origin:string|null,requestOrigin:string,host:string|null){
 if(!origin)return true;
 try{
  const request=new URL(requestOrigin),actualHost=host??request.host;
  if(!actualHost||/[\s/\\?#@,]/.test(actualHost)||!['http:','https:'].includes(request.protocol))return false;
  const expected=new URL(`${request.protocol}//${actualHost}`),supplied=new URL(origin);
  return supplied.origin===origin&&supplied.origin===expected.origin;
 }catch{return false;}
}

// Cloudflare terminates HTTPS before forwarding the request to the local server.
// Keep the origin check tied to this request's public host, including its port.
export function proxyRequestOrigin(requestOrigin:string,host:string|null,forwardedProto:string|null,forwardedHost:string|null){
 const protocol=forwardedProto?.split(',')[0]?.trim();
 const publicHost=forwardedHost?.split(',')[0]?.trim()||host;
 return {host:publicHost,origin:(protocol==='https'||protocol==='http')&&publicHost?`${protocol}://${publicHost}`:requestOrigin};
}
