/** Loopback-only server for the complete built app and an actual cookie-authenticated CP. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const buildRoot=resolve(process.env.CRM_AUTH_BUILD_PATH||'/tmp/hivemind-crm-auth-fe-build');
const cp=new URL(process.env.CRM_AUTH_CP_ORIGIN||'http://127.0.0.1:62642');
if(cp.protocol!=='http:'||!['127.0.0.1','localhost'].includes(cp.hostname))throw new Error('Only a local isolated Control Plane preview is accepted');
const port=Number(process.env.CRM_AUTH_FE_PORT||62911);
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(/^\/(?:v1|auth|demo-login|__demo)(?:\/|$)/.test(url.pathname)){
      const headers=new Headers();
      for(const [key,value]of Object.entries(req.headers))if(value&&!['host','connection','content-length','accept-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);
      let body;
      if(!['GET','HEAD'].includes(req.method)){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw new Error('Preview request exceeds limit');chunks.push(chunk);}body=Buffer.concat(chunks);}
      const upstream=await fetch(new URL(req.url,cp),{method:req.method,headers,body,redirect:'manual'});
      const responseHeaders={};
      for(const [key,value]of upstream.headers)if(!['content-encoding','content-length','set-cookie','transfer-encoding'].includes(key))responseHeaders[key]=value;
      const cookies=upstream.headers.getSetCookie();if(cookies.length)responseHeaders['set-cookie']=cookies;
      if(responseHeaders.location){const location=new URL(responseHeaders.location,cp);if(location.origin===cp.origin)responseHeaders.location=`${location.pathname}${location.search}`;}
      res.writeHead(upstream.status,responseHeaders);res.end(Buffer.from(await upstream.arrayBuffer()));return;
    }
    const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
    let file=resolve(buildRoot,relative||'index.html');
    if(file!==buildRoot&&!file.startsWith(buildRoot+sep)){res.writeHead(400);res.end();return;}
    try{if(!(await stat(file)).isFile())file=resolve(buildRoot,'index.html');}catch{file=resolve(buildRoot,'index.html');}
    const bytes=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
  }catch{res.writeHead(503,{'content-type':'text/plain'});res.end('Local authenticated preview is starting.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Actual full app preview: http://127.0.0.1:${port}/hivemind/app/crm`));
process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());
