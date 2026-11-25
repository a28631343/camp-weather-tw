const shortHosts=new Set(['maps.app.goo.gl','goo.gl']);
function isShort(u){
 return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&shortHosts.has(u.hostname)&&
 (u.hostname==='goo.gl'?/^\/maps\/[\w-]+\/?$/:/^\/[\w-]+\/?$/).test(u.pathname);
}
async function expand(value){
 let u=new URL(value);
 for(let i=0;i<4;i++){
  if(!isShort(u))throw Error();
  const response=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(5000)});
  const dest=response.headers.get('location');
  if(!dest||response.status<300||response.status>=400)throw Error();
  u=new URL(dest,u);
  if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^(?:www\.|maps\.)?google\.(?:com|com\.tw|[a-z]{2}|co\.jp|co\.uk|com\.au)$/.test(u.hostname)&&(/^\/maps(?:\/|$)/.test(u.pathname)||u.hostname.startsWith('maps.')))return u.href;
 }
 throw Error();
}
export default {async fetch(request){
 const u=new URL(request.url);
 if(request.method!=='GET')return new Response(null,{status:405});
 if(u.pathname==='/api/map-link'){
  try{return Response.json({url:await expand(u.searchParams.get('url'))})}
  catch{return Response.json({error:'無法展開地圖連結'},{status:400})}
 }
 const asset=Object.hasOwn(assets,u.pathname)&&assets[u.pathname];
 return asset?new Response(asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache'}}):new Response(null,{status:404});
}};
