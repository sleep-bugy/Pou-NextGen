import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {parseFeatures,freshFeatures} from './world.mjs';

const digest=token=>createHash('sha256').update(token).digest('hex');
const cleanName=name=>typeof name==='string'?name.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24):'';
const SOCIAL_TYPES=new Set(['hello','rename','chat','friend_request','friend_accept','friend_decline','friend_remove','invite','invite_accept','invite_decline']);

/** Social identity survives reconnects; transport IDs and room membership do not. */
export class SocialHub{
  profiles=new Map();connections=new Map();chat=[];invitations=new Map();
  constructor(rooms,{state={version:1,profiles:[]},now=Date.now,id=randomUUID,token=()=>randomBytes(32).toString('hex'),onchange=()=>{}}={}){
    this.rooms=rooms;this.now=now;this.id=id;this.token=token;this.onchange=onchange;
    if(state.version!==1||!Array.isArray(state.profiles)||state.profiles.length>5000)throw new Error('Data sosial tidak valid.');
    const codes=new Set(),tokens=new Set();
    for(const p of state.profiles){
      if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(p.id)||!cleanName(p.name)||!/^[A-F0-9]{8}$/.test(p.code)||!/^[a-f0-9]{64}$/.test(p.tokenHash)||!Array.isArray(p.friends)||p.friends.length>100||!Array.isArray(p.requests)||p.requests.length>50||![...p.friends,...p.requests].every(v=>typeof v==='string')||codes.has(p.code)||tokens.has(p.tokenHash)||this.profiles.has(p.id))throw new Error('Profil sosial rusak.');
      this.profiles.set(p.id,{id:p.id,name:cleanName(p.name),code:p.code,tokenHash:p.tokenHash,friends:[...new Set(p.friends)],requests:[...new Set(p.requests)],features:parseFeatures(p.features)});codes.add(p.code);tokens.add(p.tokenHash);
    }
    for(const p of this.profiles.values())if([...p.friends,...p.requests].some(id=>!this.profiles.has(id)||id===p.id)||p.friends.some(id=>!this.profiles.get(id).friends.includes(p.id)))throw new Error('Relasi pertemanan rusak.');
  }
  dump(){return {version:1,profiles:[...this.profiles.values()].map(({id,name,code,tokenHash,friends,requests,features})=>({id,name,code,tokenHash,friends:[...friends],requests:[...requests],features:JSON.parse(JSON.stringify(features))}))};}
  connect(id,send){this.connections.set(id,{id,send,profile:null,window:this.now(),messages:0});}
  profile(id){return this.profiles.get(this.connections.get(id)?.profile);}
  ready(id){return !!this.profile(id);}
  error(client,message){client.send({type:'error',message});}
  room(id){return this.rooms.rooms.get(this.rooms.clients.get(id)?.room);}
  peers(profileId){return [...this.connections.values()].filter(c=>c.profile===profileId);}
  contact(profile){const peers=this.peers(profile.id);return {id:profile.id,name:profile.name,code:profile.code,online:!!peers.length,room:peers.map(c=>this.room(c.id)?.code).find(Boolean)??''};}
  snapshot(id){const self=this.profile(id);if(!self)return null;return {type:'social',self:{id:self.id,name:self.name,code:self.code},friends:self.friends.map(id=>this.contact(this.profiles.get(id))),requests:self.requests.map(id=>this.contact(this.profiles.get(id))),onlineCount:new Set([...this.connections.values()].map(c=>c.profile).filter(Boolean)).size,chat:this.chat};}
  broadcast(){for(const c of this.connections.values())if(c.profile)c.send(this.snapshot(c.id));}
  changed(){this.onchange();this.broadcast();}
  message(id,data){
    if(!data||typeof data!=='object'||!SOCIAL_TYPES.has(data.type))return false;
    const c=this.connections.get(id);if(!c)return true;
    const now=this.now();if(now-c.window>=1000){c.window=now;c.messages=0;}if(++c.messages>40)return true;
    if(data.type==='hello'){
      const name=cleanName(data.name);if(!name){this.error(c,'Isi nama pemain.');return true;}
      let profile=typeof data.token==='string'&&/^[a-f0-9]{64}$/.test(data.token)?[...this.profiles.values()].find(p=>p.tokenHash===digest(data.token)):null;
      let token;
      if(!profile){
        if(this.profiles.size>=5000){this.error(c,'Server profil penuh.');return true;}
        token=this.token();let code;
        do{code=this.token().slice(0,8).toUpperCase();}while([...this.profiles.values()].some(p=>p.code===code));
        profile={id:this.id(),name,code,tokenHash:digest(token),friends:[],requests:[],features:freshFeatures()};this.profiles.set(profile.id,profile);
      }
      profile.name=name;c.profile=profile.id;
      c.send({type:'welcome',token:token??data.token});this.changed();return true;
    }
    const self=this.profile(id);if(!self){this.error(c,'Hubungkan profil terlebih dahulu.');return true;}
    if(data.type==='rename'){
      const name=cleanName(data.name);if(name){self.name=name;const room=this.room(id);if(room?.players.has(id))room.players.get(id).name=name;this.changed();}return true;
    }
    if(data.type==='chat'){
      const text=typeof data.text==='string'?data.text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim():'';
      if(!text||text.length>240){this.error(c,'Pesan harus berisi 1–240 karakter.');return true;}
      if(self.lastChat!==undefined&&now-self.lastChat<1500){this.error(c,'Tunggu sebentar sebelum mengirim pesan lagi.');return true;}
      self.lastChat=now;const message={id:this.id(),author:self.id,name:self.name,text,at:now};this.chat=[...this.chat,message].slice(-60);
      for(const client of this.connections.values())if(client.profile)client.send({type:'chat_message',message});return true;
    }
    if(data.type==='friend_request'){
      const code=typeof data.code==='string'?data.code.trim().toUpperCase():'';
      const target=[...this.profiles.values()].find(p=>p.code===code);
      if(!target||target.id===self.id){this.error(c,'Kode teman tidak ditemukan atau milikmu sendiri.');return true;}
      if(self.friends.includes(target.id)){this.error(c,'Kalian sudah berteman.');return true;}
      if(target.requests.includes(self.id)){this.error(c,'Permintaanmu masih menunggu persetujuan.');return true;}
      if(target.requests.length>=50||target.friends.length>=100||self.friends.length>=100){this.error(c,'Daftar teman atau permintaan sudah penuh.');return true;}
      target.requests.push(self.id);c.send({type:'notice',message:'Permintaan pertemanan terkirim.'});this.changed();return true;
    }
    const target=this.profiles.get(data.target);
    if(['friend_accept','friend_decline','friend_remove'].includes(data.type)){
      if(!target){this.error(c,'Profil teman tidak ditemukan.');return true;}
      if(data.type==='friend_remove'){self.friends=self.friends.filter(v=>v!==target.id);target.friends=target.friends.filter(v=>v!==self.id);}
      else{
        if(!self.requests.includes(target.id)){this.error(c,'Permintaan pertemanan sudah tidak ada.');return true;}
        if(data.type==='friend_accept'){
          if(self.friends.length>=100||target.friends.length>=100){this.error(c,'Daftar teman sudah penuh.');return true;}
          if(!self.friends.includes(target.id))self.friends.push(target.id);if(!target.friends.includes(self.id))target.friends.push(self.id);
          target.requests=target.requests.filter(v=>v!==self.id);
        }
        self.requests=self.requests.filter(v=>v!==target.id);
      }
      this.changed();return true;
    }
    if(data.type==='invite'){
      if(!target||!self.friends.includes(target.id)){this.error(c,'Tambahkan sebagai teman terlebih dahulu.');return true;}
      const recipients=this.peers(target.id);if(!recipients.length){this.error(c,'Teman sedang offline.');return true;}
      if(c.lastInvite!==undefined&&now-c.lastInvite<3000){this.error(c,'Tunggu sebentar sebelum mengundang lagi.');return true;}
      let room=this.room(id);
      if(!room){this.rooms.message(id,{type:'create',name:self.name,profileId:self.id});room=this.room(id);}
      if(!room||!['lobby','finished'].includes(room.phase)||room.players.size>=4){this.error(c,'Ruangan penuh atau pertandingan sedang berjalan.');return true;}
      c.lastInvite=now;
      for(const [key,inv] of this.invitations)if(inv.from===self.id&&inv.to===target.id)this.invitations.delete(key);
      const invitation={id:this.id(),from:self.id,fromName:self.name,to:target.id,mode:room.mode,code:room.code,expiresAt:now+60000};this.invitations.set(invitation.id,invitation);
      for(const recipient of recipients)recipient.send({type:'invitation',invitation});c.send({type:'notice',message:`Undangan dikirim ke ${target.name}.`});this.broadcast();return true;
    }
    if(data.type==='invite_accept'||data.type==='invite_decline'){
      const invitation=this.invitations.get(data.id);
      if(!invitation||invitation.to!==self.id||invitation.expiresAt<=now){this.error(c,'Undangan sudah kedaluwarsa.');return true;}
      this.invitations.delete(invitation.id);
      for(const peer of this.peers(self.id))peer.send({type:'invitation_removed',id:invitation.id});
      if(data.type==='invite_accept'){
        if(!self.friends.includes(invitation.from)){this.error(c,'Kalian sudah tidak berteman.');return true;}
        this.rooms.message(id,{type:'join',name:self.name,profileId:self.id,code:invitation.code});this.broadcast();
      }
      return true;
    }
    return true;
  }
  maintenance(){for(const [id,inv] of this.invitations)if(inv.expiresAt<=this.now()){this.invitations.delete(id);for(const c of this.peers(inv.to))c.send({type:'invitation_removed',id});}}
  disconnect(id){this.connections.delete(id);this.broadcast();}
}
