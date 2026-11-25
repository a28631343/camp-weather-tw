function landscape(){
const c=document.querySelector('#art'),w=c.clientWidth,h=c.clientHeight;if(!w)return;c.width=w*2;c.height=h*2;const g=c.getContext('2d');g.scale(2,2);
const sky=g.createLinearGradient(0,0,w,h);sky.addColorStop(0,'#193f35');sky.addColorStop(.56,'#63806e');sky.addColorStop(1,'#edc78b');g.fillStyle=sky;g.fillRect(0,0,w,h);
g.fillStyle='#f4d793';g.beginPath();g.arc(w*.83,h*.32,h*.15,0,7);g.fill();
function polygon(points,color){g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill()}
for(let j=0;j<3;j++){const pts=[[0,h]];for(let i=0;i<=65;i++){const x=i/65;pts.push([x*w,h*(.54+.12*j+.13*Math.sin(x*15+j*2)+.07*Math.sin(x*31+j)+.023*Math.sin(i*2+j))])}pts.push([w,h]);polygon(pts,['#829783','#526f60','#314f43'][j])}
for(let i=0;i<70;i++){const x=i*w/68,y=h*(.95+.04*Math.sin(i)),s=h*(.09+.12*(1+Math.sin(i*52))/2);for(let j=0;j<3;j++)polygon([[x,y-s+j*s*.20],[x-s*(.12+j*.055),y-s*.48+j*s*.26],[x+s*(.12+j*.055),y-s*.48+j*s*.26]],'#284a3c')}
polygon([[0,h],[w*.66,h*.96],[w*.81,h*.89],[w,h*.94],[w,h]],'#19392e');let x=w*.81,y=h*.92,s=h*.24;polygon([[x-s,y],[x-s*.1,y-s],[x+s*.9,y]],'#e9ae58');polygon([[x-s*.1,y-s],[x+s*.9,y],[x+s*1.55,y-4],[x+s*.55,y-s*.92]],'#be8645');polygon([[x-s*.6,y],[x-s*.1,y-s*.72],[x+s*.48,y]],'#483e2e');const shade=g.createLinearGradient(0,0,w*.7,0);shade.addColorStop(0,'#193c34');shade.addColorStop(1,'transparent');g.fillStyle=shade;g.fillRect(0,0,w,h)}
new ResizeObserver(landscape).observe(document.querySelector('#art'));
