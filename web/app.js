'use strict';
const el=id=>document.getElementById(id);
const fields=[
 ['wind_speed_10m','蒲福風級','級','≋','#37866e','#e4f1e9'],
 ['rain','雨量','mm','☂','#387caf','#e4eff8'],
 ['temperature_2m','氣溫','°C','☀','#ba762d','#faf0dc'],
 ['relative_humidity_2m','相對濕度','%','◉','#6177a3','#eceff8']
];
let active=null,generation=0,searchId=0,lastRefresh=0;
const today=new Date();
function localDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const end=new Date(today);end.setDate(end.getDate()+4);
el('day').min=localDate(today);el('day').max=localDate(end);
el('day').value=localDate(today);
function stamp(){return new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}
function beaufort(speed){
 if(!Number.isFinite(speed)||speed<0)return '—';
 if(speed>=61.3)return '>17';
 const thresholds=[0.3,1.6,3.4,5.5,8,10.8,13.9,17.2,20.8,24.5,28.5,32.7,37,41.5,46.2,51,56.1];
 return thresholds.filter(limit=>speed>=limit).length;
}
function showMetrics(data={},target='metrics'){el(target).replaceChildren(...fields.map(([key,label,unit,symbol,color,bg])=>{const card=document.createElement('div');card.className='metric';card.style.setProperty('--a',color);card.style.setProperty('--bg',bg);card.innerHTML='<span class="icon"></span><b></b><div><span class="value"></span><span class="unit"></span></div>';[symbol,label,key==='wind_speed_10m'?beaufort(data[key]):num(data[key]),unit].forEach((v,i)=>card.querySelectorAll('.icon,b,.value,.unit')[i].textContent=v);return card}))}
function num(v){return Number.isFinite(v)?String(v):'—'}
async function json(url,params){const u=new URL(url);u.search=new URLSearchParams(params);const r=await fetch(u,{signal:AbortSignal.timeout(16000)});if(!r.ok)throw Error(r.status);return r.json()}
function parseCoords(s){const match=s.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*[,，]\s*([+-]?\d+(?:\.\d+)?)$/);if(!match)return null;const lat=Number(match[1]),lon=Number(match[2]);if(Math.abs(lat)>90||Math.abs(lon)>180)throw Error('緯度需介於 −90～90，經度需介於 −180～180。');return {lat,lon,name:s.trim()}}
function distance(lat,lon,a,b){const rad=Math.PI/180,x=Math.sin((a-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(a*rad)*Math.sin((b-lon)*rad/2)**2;return Math.round(12742*Math.asin(Math.min(1,Math.sqrt(x))))}
el('editPlace').onclick=()=>{
 el('form').hidden=!el('form').hidden;
 el('editPlace').textContent=el('form').hidden?'更換營區':'收起搜尋';
 if(!el('form').hidden){el('place').focus();el('place').select()}
 else{searchId++;el('choices').replaceChildren();el('searchInfo').textContent='';el('place').value=active.name}
};
function choose(p){
 if(active?.lat!==p.lat||active?.lon!==p.lon)selectedTime='';
 active=p;
 document.body.classList.add('hasCamp');
 el('results').hidden=false;el('locationBar').hidden=false;el('form').hidden=true;
 el('campName').textContent=p.name;el('editPlace').textContent='更換營區';
 el('place').value=p.name;el('choices').replaceChildren();el('searchInfo').textContent='';try{localStorage.setItem('camp-trip',JSON.stringify({...p,date:el('day').value}))}catch{}refresh()}
function mapURL(text){
 const token=text.match(/https?:\/\/[^\s<>"「」]+/i)?.[0];
 if(!token)return null;
 const u=new URL(token);
 const host=u.hostname;
 const short=host==='maps.app.goo.gl'||(host==='goo.gl'&&u.pathname.startsWith('/maps/'));
 const google=/^(?:(?:maps|www)\.)?google\.(?:com|com\.tw|[a-z]{2}|co\.(?:jp|uk|nz)|com\.au)$/.test(host);
 if(u.username||u.password||u.port||(!short&&!(google&&(host.startsWith('maps.')||/^\/maps(?:\/|$)/.test(u.pathname)))))throw Error('地圖網址請使用 Google 地圖的分享連結。');
 u.protocol='https:';
 return {u,short};
}
function mapLocation(u){
 const path=decodeURIComponent(u.pathname);
 const title=path.match(/\/maps\/(?:place|search)\/([^/]+)/)?.[1]?.replace(/\+/g,' ');
 const pin=Array.from((path+u.searchParams.get('data')).matchAll(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g)).at(-1);
 const query=u.searchParams.get('query')||u.searchParams.get('q')||u.searchParams.get('destination');
 const coords=pin?parseCoords(pin[1]+','+pin[2]):parseCoords((query||title||'').replace(/^loc:/,''));
 if(coords)return {coords:{...coords,name:title||coords.name}};
 if(query||title)return {query:query||title};
 const center=path.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
 if(center)return {center:parseCoords(center[1]+','+center[2])};
 throw Error('地圖連結沒有可辨識的營區位置。請在 Google 地圖點選營區圖釘後重新分享，或貼上座標。');
}
el('maps').onclick=()=>{
 const q=el('place').value.trim();
 try{
  const map=mapURL(q);
  const target=new URL('https://www.google.com/maps/search/');
  target.search=new URLSearchParams({api:'1',query:q||'露營區'});
  window.open(map?map.u.href:target.href,'_blank','noopener,noreferrer');
  el('searchInfo').textContent='在 Google 地圖選好營區後，點「分享」複製連結，再貼回營區位置欄。';
 }catch{el('searchInfo').textContent='請輸入營區名稱，或貼上 Google 地圖分享連結。'}
};

async function search(e){e.preventDefault();const id=++searchId;let q=el('place').value.trim();el('choices').replaceChildren();try{
 const map=mapURL(q);
 if(map){
  let u=map.u;
  if(map.short){
   el('searchInfo').textContent='正在讀取 Google 地圖分享連結…';
   try{const r=await json(location.origin+'/api/map-link',{url:u.href});u=mapURL(r.url).u}
   catch{throw Error('地圖短網址暫時無法展開。請開啟 Google 地圖後複製完整網址，或貼上營區座標。')}
   if(id!==searchId)return;
  }
  const point=mapLocation(u);
  if(point.coords)return choose(point.coords);
  if(point.center){
   el('searchInfo').textContent='這個網址只包含地圖中心。請確認此處就是營區。';
   const b=document.createElement('button');b.textContent='使用地圖中心 '+point.center.name;b.onclick=()=>choose(point.center);el('choices').append(b);return;
  }
  q=point.query;
 }
 const coords=parseCoords(q);if(coords)return choose(coords);if(active?.name===q)return choose(active);el('searchInfo').textContent='正在尋找營區…';const data=await json('https://nominatim.openstreetmap.org/search',{q,format:'jsonv2',limit:5,'accept-language':'zh-TW'});if(id!==searchId)return;el('searchInfo').textContent=data.length?'請選擇正確的營區位置。':'找不到這個地點。請貼上地圖上的緯度、經度，或使用目前位置。';data.forEach(v=>{const b=document.createElement('button');b.textContent=v.display_name;b.onclick=()=>choose({name:v.display_name,lat:+v.lat,lon:+v.lon});el('choices').append(b)})}catch(err){if(id===searchId)el('searchInfo').textContent=/^(緯度|地圖)/.test(err.message)?err.message:'地名搜尋暫時無法連線。可直接貼上緯度、經度查詢。'}}
let hourlySamples=[];
let selectedTime='';
let trendKey='temperature_2m';
function drawTrend(){
 const svg=el('trend');
 const index=Number(el('hour').value);
 const values=hourlySamples.map(sample=>{
  const v=sample[trendKey];
  if(trendKey!=='wind_speed_10m'||!Number.isFinite(v))return v;
  const grade=beaufort(v);return grade==='>17'?18:grade;
 });
 const finite=values.filter(Number.isFinite);
 svg.replaceChildren();
 if(!finite.length)return;
 const min=Math.min(...finite),span=Math.max(1,Math.max(...finite)-min);
 const x=i=>8+584*i/Math.max(1,values.length-1);
 const y=v=>75-51*(v-min)/span;
 function shape(name,attrs){
  const node=document.createElementNS('http://www.w3.org/2000/svg',name);
  for(const [key,val] of Object.entries(attrs))node.setAttribute(key,val);
  svg.append(node);return node;
 }
 let path='';
 values.forEach((v,i)=>{if(Number.isFinite(v))path+=(Number.isFinite(values[i-1])?' L':' M')+x(i)+' '+y(v)});
 shape('path',{d:path,fill:'none',stroke:'currentColor','stroke-width':3,'vector-effect':'non-scaling-stroke'});
 if(Number.isFinite(values[index])){
  shape('line',{x1:x(index),x2:x(index),y1:4,y2:87,stroke:'currentColor','stroke-dasharray':'3 4'});
  shape('circle',{cx:x(index),cy:y(values[index]),r:4,fill:'currentColor'});
 }

}
for(const b of el('trendTabs').children){
 b.onclick=()=>{
  trendKey=b.dataset.key;
  for(const option of el('trendTabs').children)option.setAttribute('aria-pressed',String(option===b));
  drawTrend();
 };
}
function displayHour(){
 const sample=hourlySamples[Number(el('hour').value)];
 if(!sample)return;
 selectedTime=sample.time;
 const hour=selectedTime.replace('T',' ');

 el('earlier').disabled=Number(el('hour').value)===0;
 el('later').disabled=Number(el('hour').value)===hourlySamples.length-1;
 el('hourText').textContent=hour;
 el('phase').textContent=sample.daylight===1?'☀ 白天':sample.daylight===0?'☾ 夜晚':'日夜資料待更新';
 el('phase').className=sample.daylight===1?'sun':sample.daylight===0?'moon':'';
 drawTrend();
 el('hour').setAttribute('aria-valuetext',hour);
 for(const button of el('trendTabs').children){
  const field=fields.find(f=>f[0]===button.dataset.key);
  let readout=button.querySelector('strong');
  if(!readout){readout=document.createElement('strong');button.append(readout)}
  const value=field[0]==='wind_speed_10m'?beaufort(sample[field[0]]):num(sample[field[0]]);
  readout.textContent=value+' '+field[2];
 }
}
el('hour').addEventListener('input',displayHour);
for(const [button,delta] of [['earlier',-1],['later',1]]){
 el(button).onclick=()=>{el('hour').value=Number(el('hour').value)+delta;displayHour()};
}
function setForecast(hourly,date,currentTime){
 const todayKey=currentTime.slice(0,10);
 const dates=[...new Set(hourly.time.map(time=>time.slice(0,10)))].filter(key=>key>=todayKey);
 if(!dates.length)return false;
 el('day').min=dates[0];
 el('day').max=dates.at(-1);
 if(!dates.includes(date))return false;
 el('dates').replaceChildren();
 for(const dateKey of dates){
  const button=document.createElement('button');
  button.type='button';
  button.dataset.date=dateKey;
  const temps=hourly.temperature_2m.filter((v,i)=>hourly.time[i].startsWith(dateKey)&&Number.isFinite(v));
  const weekday=new Intl.DateTimeFormat('zh-TW',{weekday:'short',timeZone:'UTC'}).format(new Date(dateKey+'T12:00:00Z'));
  button.textContent=(dateKey===todayKey?'今天':weekday)+' '+dateKey.slice(5).replace('-','/');
  const range=document.createElement('small');
  range.textContent=temps.length?Math.round(Math.max(...temps))+'° / '+Math.round(Math.min(...temps))+'°':'—';
  button.append(range);
  button.setAttribute('aria-pressed',String(dateKey===date));
  button.onclick=()=>{
   el('day').value=dateKey;
   try{localStorage.setItem('camp-trip',JSON.stringify({...active,date:dateKey}))}catch{}
   selectedTime='';
   setForecast(hourly,dateKey,currentTime);
  };
  el('dates').append(button);
 }
 const isToday=date===todayKey;
 const anchor=isToday?currentTime.slice(0,13)+':00':date+'T00:00';
 let center=hourly.time.indexOf(anchor);
 if(center<0)center=hourly.time.findIndex(time=>time.startsWith(date)&&time>=anchor);
 if(center<0)return false;
 const start=isToday?Math.max(0,center-3):center;
 const lastDate=isToday?(dates[1]||todayKey):date;
 const after=hourly.time.findIndex(time=>time.slice(0,10)>lastDate);
 hourlySamples=hourly.time.slice(start,after<0?undefined:after).map((time,i)=>{
  const sample={time,daylight:hourly.is_day?.[start+i]};
  for(const [key] of fields)sample[key]=hourly[key][start+i];
  return sample;
 });
 el('forecastInfo').textContent=hourlySamples[0].time.replace('T',' ')+' 至 '+hourlySamples.at(-1).time.replace('T',' ')+' · 營區當地時間';
 const last=hourlySamples.length-1;
 const saved=hourlySamples.findIndex(s=>s.time===selectedTime);
 el('hour').max=last;
 el('hour').value=saved>=0?saved:center-start;
 el('shortcuts').replaceChildren();
 if(isToday){
  for(const [label,target] of [['今晚 20:00',todayKey+'T20:00'],['明早 08:00',lastDate+'T08:00']]){
   const index=hourlySamples.findIndex(s=>s.time===target);
   if(index<0)continue;
   const shortcut=document.createElement('button');
   shortcut.textContent=label;shortcut.type='button';
   shortcut.onclick=()=>{el('hour').value=index;displayHour()};
   el('shortcuts').append(shortcut);
  }
 }
 el('bands').replaceChildren();
 el('ticks').replaceChildren();
 hourlySamples.forEach((sample,i)=>{
  const segment=document.createElement('i');
  segment.className=sample.daylight===1?'sun':sample.daylight===0?'moon':'';
  if(sample.time.endsWith('T00:00'))segment.style.borderLeft='2px solid white';
  el('bands').append(segment);
  if(i!==0&&i!==last&&(i%6!==0||last-i<3))return;
  const tick=document.createElement('small');
  tick.textContent=sample.time.slice(11,13)+'時';
  tick.style.left=(100*i/Math.max(last,1))+'%';
  el('ticks').append(tick);
 });
 displayHour();
 el('timeline').hidden=false;
 return true;
}
async function refresh(){
 if(!active)return;const id=++generation,{lat,lon,name}=active,date=el('day').value;lastRefresh=Date.now();
 el('coords').textContent=lat.toFixed(4)+', '+lon.toFixed(4);showMetrics();el('timeline').hidden=true;el('events').textContent='查詢地震目錄中…';el('quake').classList.remove('alert');el('weatherStatus').textContent='正在取得最新天氣…';el('forecastInfo').textContent=date+' · 查詢中…';
 const vars=fields.map(f=>f[0]).join(',');
 await Promise.allSettled([weather(),quakes()]);
 async function weather(){try{const d=await json('https://api.open-meteo.com/v1/forecast',{latitude:lat,longitude:lon,current:vars,hourly:vars+',is_day',wind_speed_unit:'ms',past_days:1,forecast_days:5,timezone:'auto'});if(id!==generation)return;const h=d.hourly;const localToday=d.current.time.slice(0,10);const chosen=h.time.some(t=>t.startsWith(date))&&date>=localToday?date:localToday;el('day').value=chosen;const count=setForecast(h,chosen,d.current.time);showMetrics(d.current);el('weatherStatus').textContent='模式估計時間 '+d.current.time.replace('T',' ')+'（'+d.timezone+'） · 雨量為前 '+Math.round(d.current.interval/60)+' 分鐘累積 · '+stamp()+' 已查詢';if(!count)el('forecastInfo').textContent=date+' 超出可查詢期間。可用預報為 '+el('day').min+' 至 '+h.time.at(-1).slice(0,10)+'。'}catch{if(id!==generation)return;el('weatherStatus').textContent='天氣資料暫時無法取得。';const retry=document.createElement('button');retry.textContent='重新整理';retry.onclick=refresh;el('weatherStatus').append(retry);el('forecastInfo').textContent='逐時預報暫時無法取得。'}}
 async function quakes(){try{const d=await json('https://earthquake.usgs.gov/fdsnws/event/1/query',{format:'geojson',latitude:lat,longitude:lon,maxradiuskm:100,eventtype:'earthquake',starttime:new Date(Date.now()-7*86400000).toISOString(),orderby:'time'});if(id!==generation)return;const list=d.features;el('events').textContent=list.length?'附近有 '+list.length+' 起地震紀錄，最新事件如下。':'近 7 天查無符合範圍的 USGS 地震紀錄。';el('quake').classList.toggle('alert',list.length>0);list.slice(0,5).forEach(f=>{const p=document.createElement('p'),[x,y,z]=f.geometry.coordinates,v=f.properties;p.textContent='M '+num(v.mag)+'　距營區 '+distance(lat,lon,y,x)+' 公里 · 深度 '+num(z)+' 公里 · '+new Date(v.time).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})+'（台灣時間）';el('events').append(p)});el('events').append(document.createElement('br'),'查詢時間 '+stamp()+'。實際災情請查閱官方告警。')}catch{if(id===generation)el('events').textContent='地震服務暫時無法連線，周邊狀況未知。請查看下方官方報告。'}}
}
el('form').onsubmit=search;el('place').oninput=()=>{searchId++;el('choices').replaceChildren();el('searchInfo').textContent=''};
el('day').onchange=()=>{selectedTime='';if(active&&el('place').value===active.name&&el('day').value)choose(active)};
el('gps').onclick=()=>{const id=++searchId;el('choices').replaceChildren();el('searchInfo').textContent='正在定位…';const fail=()=>{if(id===searchId)el('searchInfo').textContent='無法取得定位，請輸入營區名稱或座標。'};if(!navigator.geolocation)return fail();navigator.geolocation.getCurrentPosition(p=>{if(id===searchId)choose({lat:p.coords.latitude,lon:p.coords.longitude,name:'目前位置'})},fail,{timeout:12000})};
showMetrics();try{const p=JSON.parse(localStorage.getItem('camp-trip'));if(p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)){if(p.date>=el('day').min&&p.date<=el('day').max)el('day').value=p.date;choose(p)}}catch{}
function tick(){if(!document.hidden&&Date.now()-lastRefresh>=300000)refresh()}setInterval(tick,30000);document.addEventListener('visibilitychange',tick);
