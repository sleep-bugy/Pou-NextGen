import { randomUUID } from 'node:crypto';
import {startAdventure,stepAdventure,adventureInput,ADVENTURE_PLATFORMS} from './adventure.mjs';

const COLORS=['#f3a4b5','#70bde8','#efcc69','#a3cf72'];
export class RoomHub {
  clients=new Map();rooms=new Map();
  constructor({random=Math.random,now=Date.now,id=randomUUID,onComplete=()=>{}}={}){this.random=random;this.now=now;this.id=id;this.onComplete=onComplete;}
  connect(id,send){this.clients.set(id,{id,send,room:null,window:this.now(),messages:0});}
  error(client,text){client.send({type:'error',message:text});}
  message(id,data){
    const client=this.clients.get(id);if(!client||!data||typeof data!=='object')return;
    const now=this.now();if(now-client.window>1000){client.window=now;client.messages=0;}if(++client.messages>80)return;
    if(data.type==='leave'){this.leave(id);return;}
    if(data.type==='create'||data.type==='join'){
      const name=typeof data.name==='string'?data.name.trim().slice(0,24):'';
      if(!name)return this.error(client,'Isi nama pemain.');
      let room;
      if(data.type==='create'){
        if(this.rooms.size>=100)return this.error(client,'Server sedang penuh. Coba lagi nanti.');
        let code='';for(let attempt=0;attempt<12;attempt++){code=Array.from({length:6},()=> 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(this.random()*29)]).join('');if(!this.rooms.has(code))break;}
        if(this.rooms.has(code))code=this.id().replace(/-/g,'').slice(0,6).toUpperCase();
        room={code,host:id,mode:data.mode==='adventure'?'adventure':'food',players:new Map(),phase:'lobby',remaining:60,countdown:3,items:[],spawn:0,matchId:'',updatedAt:now};this.rooms.set(code,room);
      }else{
        const code=typeof data.code==='string'?data.code.trim().toUpperCase():'';room=this.rooms.get(code);
        if(!room)return this.error(client,'Kode ruangan tidak ditemukan.');
        if(client.room===room.code){client.send({type:'joined',id,code:room.code});this.broadcast(room);return;}
        if(room.phase==='playing'||room.phase==='countdown')return this.error(client,'Pertandingan sedang berjalan. Tunggu ronde berikutnya.');
        if(room.players.size>=4)return this.error(client,'Ruangan sudah berisi empat pemain.');
        if(room.phase==='finished')room.phase='lobby';
      }
      this.leave(id);client.room=room.code;
      const color=COLORS[room.players.size%COLORS.length];
      room.players.set(id,{id,name,profileId:data.profileId??id,color,x:.5,targetX:.5,score:0});room.updatedAt=now;
      client.send({type:'joined',id,code:room.code});this.broadcast(room);return;
    }
    const room=this.rooms.get(client.room);if(!room)return this.error(client,'Buat atau masuk ruangan terlebih dahulu.');
    room.updatedAt=now;
    if(data.type==='start'){
      if(room.host!==id)return this.error(client,'Hanya pembuat ruangan yang bisa memulai.');
      if(room.players.size<2)return this.error(client,'Perlu setidaknya dua pemain.');
      if(new Set([...room.players.values()].map(p=>p.profileId)).size<2)return this.error(client,'Perlu dua profil pemain yang berbeda.');
      if(room.phase==='playing'||room.phase==='countdown')return;
      room.matchId=this.id();room.phase='countdown';room.countdown=3;room.remaining=60;room.items=[];room.spawn=0;room.completed=false;
      let i=0;for(const player of room.players.values()){player.x=player.targetX=(++i)/(room.players.size+1);player.score=0;}
      if(room.mode==='adventure')startAdventure(room);
      this.broadcast(room);
    }else if(data.type==='input'&&room.phase==='playing'){
      if(room.mode==='adventure'){const player=room.players.get(id);if(player)adventureInput(room,player,data);return;}
      if(typeof data.x!=='number'||!Number.isFinite(data.x)||data.x<0||data.x>1)return;
      const player=room.players.get(id);if(player)player.targetX=Math.max(.025,Math.min(.975,data.x));
    }
  }
  snapshot(room){return {type:'state',mode:room.mode,success:room.success??false,checkpoint:room.checkpoint??0,teamScore:room.teamScore??0,platforms:room.mode==='adventure'?ADVENTURE_PLATFORMS:[],code:room.code,host:room.host,phase:room.phase,remaining:room.remaining,countdown:room.countdown,matchId:room.matchId,players:[...room.players.values()].map(({targetX,...player})=>({...player})),items:room.items.map(item=>({...item}))};}
  broadcast(room){const state=this.snapshot(room);for(const id of room.players.keys())this.clients.get(id)?.send(state);}
  tick(dt=.05){
    dt=Math.max(0,Math.min(.1,dt));
    for(const room of this.rooms.values()){
      if(this.now()-room.updatedAt>900000){for(const id of room.players.keys()){const client=this.clients.get(id);if(client){client.room=null;this.error(client,'Ruangan kedaluwarsa. Buat ruangan baru.');}}this.rooms.delete(room.code);continue;}
      if(room.phase==='countdown'){room.countdown-=dt;if(room.countdown<=0)room.phase='playing';this.broadcast(room);continue;}
      if(room.phase!=='playing')continue;
      room.remaining=Math.max(0,room.remaining-dt);
      if(room.mode==='adventure'){
        stepAdventure(room,dt);if(!room.remaining)room.phase='finished';
        if(room.phase==='finished'&&!room.completed){room.completed=true;this.onComplete(room);}this.broadcast(room);continue;
      }
      for(const player of room.players.values())player.x+=Math.max(-dt*.95,Math.min(dt*.95,player.targetX-player.x));
      room.spawn+=dt;
      if(room.spawn>=.45){room.spawn=0;room.items.push({id:this.id(),x:.04+this.random()*.92,y:-.04,kind:Math.floor(this.random()*10)});}
      for(const item of room.items){
        const before=item.y;item.y+=dt*(.19+(60-room.remaining)*.0015);
        if(before<.84&&item.y>=.84){
          const eligible=[...room.players.values()].filter(p=>Math.abs(p.x-item.x)<.04).sort((a,b)=>Math.abs(a.x-item.x)-Math.abs(b.x-item.x));
          if(eligible.length){const player=eligible[0];player.score=Math.max(0,player.score+(item.kind<8?1:-2));item.y=2;}
        }
      }
      room.items=room.items.filter(item=>item.y<1.08);
      if(!room.remaining){room.phase='finished';if(!room.completed){room.completed=true;this.onComplete(room);}}
      this.broadcast(room);
    }
  }
  leave(id){const client=this.clients.get(id);const room=this.rooms.get(client?.room);if(client)client.room=null;if(!room)return;room.players.delete(id);if(!room.players.size){this.rooms.delete(room.code);return;}if(room.host===id)room.host=room.players.keys().next().value;if(room.mode==='adventure'&&room.players.size<2&&['playing','countdown'].includes(room.phase)){room.phase='lobby';room.items=[];for(const player of room.players.values())this.clients.get(player.id)?.send({type:'notice',message:'Teman terputus. Undang pemain lain untuk memulai ulang petualangan.'});}this.broadcast(room);}
  disconnect(id){this.leave(id);this.clients.delete(id);}
}
