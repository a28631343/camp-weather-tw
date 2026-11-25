import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
const assets={};
for(const file of ['index.html','app.js','art.js']){
 const body=readFileSync('web/'+file,'utf8');
 assets['/'+file]={body,type:(file.endsWith('html')?'text/html':'text/javascript')+'; charset=utf-8'};
}
assets['/']=assets['/index.html'];
mkdirSync('dist/server',{recursive:true});
mkdirSync('dist/.openai',{recursive:true});
copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
writeFileSync('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+readFileSync('worker.mjs','utf8'));
