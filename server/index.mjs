import { createServer } from 'node:http';
import { readFile,stat,mkdir,writeFile,rename } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer,WebSocket } from 'ws';
import { RoomHub } from './rooms.mjs';
import { SocialHub } from './social.mjs';
import {WorldHub} from './world.mjs';

const root=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.mp3':'audio/mpeg','.m4a':'audio/mp4'};
const hub=new RoomHub();
const dataDirectory=resolve(process.env.POU_DATA_DIR??'.pou-data'),socialFile=resolve(dataDirectory,'social.json');
let stored;
try{stored=JSON.parse(await readFile(socialFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
let writeQueue=Promise.resolve(),persistTimer;
function persistSocial(){
  clearTimeout(persistTimer);
  const data=JSON.stringify(social.dump());
  writeQueue=writeQueue.catch(()=>{}).then(async()=>{await mkdir(dataDirectory,{recursive:true});await writeFile(socialFile+'.tmp',data,{mode:0o600});await rename(socialFile+'.tmp',socialFile);});
  void writeQueue.catch(()=>console.error('Daftar teman belum tersimpan. Periksa izin direktori data server.'));
  return writeQueue;
}
const social=new SocialHub(hub,{state:stored,onchange:()=>{clearTimeout(persistTimer);persistTimer=setTimeout(()=>void persistSocial(),200);}});
const world=new WorldHub(social,hub);hub.onComplete=room=>world.finish(room);
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true,rooms:hub.rooms.size}));return;}
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const pathname=decodeURIComponent(url.pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    let target=file;
    try{if(!(await stat(target)).isFile())throw new Error();}catch{if(extname(pathname)){res.writeHead(404);res.end();return;}target=resolve(root,'index.html');}
    const data=await readFile(target);
    const cache=target.endsWith('index.html')||target.endsWith('sw.js')?'no-cache':/index-[\w-]+\.(js|css)$/.test(target)?'public, max-age=31536000, immutable':'public, max-age=3600';
    res.writeHead(200,{'Content-Type':mime[extname(target)]??'application/octet-stream','Content-Length':data.length,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(500);res.end('Game belum dibuild atau file tidak dapat dimuat.');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
  try{
    if(new URL(req.url,'http://localhost').pathname!=='/multiplayer'){socket.destroy();return;}
    if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  }catch{socket.destroy();}
});
wss.on('connection',ws=>{
  if(wss.clients.size>200){ws.close(1013,'Server penuh');return;}
  const id=randomUUID();ws.alive=true;
  const send=packet=>{if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>512000){ws.terminate();return;}ws.send(JSON.stringify(packet));}};
  hub.connect(id,send);social.connect(id,send);
  ws.on('pong',()=>ws.alive=true);
  ws.on('message',raw=>{
    try{
      const packet=JSON.parse(raw.toString());
      if(social.message(id,packet)){if(packet?.type==='hello')world.sync(id);return;}
      if(world.message(id,packet))return;
      const profile=social.profile(id);if(!profile){send({type:'error',message:'Profil belum terhubung. Coba hubungkan kembali.'});return;}
      hub.message(id,{...packet,name:profile.name,profileId:profile.id});if(packet.type!=='input')social.broadcast();
    }catch{send({type:'error',message:'Pesan tidak valid.'});}
  });
  const disconnect=()=>{hub.disconnect(id);world.disconnect(id);social.disconnect(id);};ws.on('close',disconnect);ws.on('error',disconnect);
});
const gameTimer=setInterval(()=>hub.tick(.05),50);
const socialTimer=setInterval(()=>social.maintenance(),5000);
const pingTimer=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
const port=Number(process.env.PORT??process.env.MULTIPLAYER_PORT??3001);
server.on('error',error=>{console.error(`Server multiplayer gagal: ${error.code??error.message}`);clearInterval(gameTimer);clearInterval(pingTimer);clearInterval(socialTimer);process.exitCode=1;});
server.listen(port,'0.0.0.0',()=>console.log(`Pou multiplayer: http://localhost:${port}`));
async function stop(){clearInterval(gameTimer);clearInterval(pingTimer);clearInterval(socialTimer);clearTimeout(persistTimer);if(social.profiles.size)await persistSocial().catch(()=>{});for(const ws of wss.clients)ws.close();wss.close();server.close();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
