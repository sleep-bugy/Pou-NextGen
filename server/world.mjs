import {randomUUID} from 'node:crypto';
import {CROPS,DISHES,validHome,freshWorld} from '../src/lib/world-state.ts';
const TYPES=new Set(['world_get','garden_plant','garden_water','garden_harvest','garden_cook','leaderboard','home_publish','home_visit','home_react','reward_ack']);
const integer=n=>Number.isInteger(n)&&n>=0&&n<=1e9;
const emptyPlot=()=>({crop:'',plantedAt:0,contributors:[]});
export const freshFeatures=()=>({home:null,reactions:{},garden:Array.from({length:4},emptyPlot),wallet:{carrot:0,berry:0,wheat:0},metrics:{food:0,adventure:0,harvest:0},deliveries:[],completed:[],explorerUnlocked:false});
export function parseFeatures(data){
  if(data===undefined)return freshFeatures();
  if(!data||typeof data!=='object'||!Array.isArray(data.garden)||data.garden.length!==4||!data.garden.every(p=>p&&['',...Object.keys(CROPS)].includes(p.crop)&&Number.isFinite(p.plantedAt)&&p.plantedAt>=0&&Array.isArray(p.contributors)&&p.contributors.length<=4&&p.contributors.every(id=>typeof id==='string'))||!data.wallet||!Object.keys(CROPS).every(k=>integer(data.wallet[k]))||!data.metrics||!['food','adventure','harvest'].every(k=>integer(data.metrics[k]))||!Array.isArray(data.deliveries)||data.deliveries.length>128||!data.deliveries.every(r=>r&&typeof r.id==='string'&&integer(r.coins)&&integer(r.xp)&&r.food&&Array.isArray(r.owned))||!Array.isArray(data.completed)||data.completed.length>128||!data.completed.every(id=>typeof id==='string')||typeof data.explorerUnlocked!=='boolean'||!data.reactions||Array.isArray(data.reactions)||Object.entries(data.reactions).length>100||!Object.values(data.reactions).every(r=>['heart','wow','cozy'].includes(r))||(data.home!==null&&(!data.home||!validHome(data.home.home)||!/^#[a-f0-9]{6}$/i.test(data.home.body)||!/^#[a-f0-9]{6}$/i.test(data.home.eyes))))throw new Error('Data dunia online rusak.');
  return JSON.parse(JSON.stringify(data));
}
export class WorldHub{
  views=new Map();homeViews=new Map();
  constructor(social,rooms,{now=Date.now,id=randomUUID}={}){this.social=social;this.rooms=rooms;this.now=now;this.id=id;}
  allowed(self,target){return target&&(self.id===target.id||self.friends.includes(target.id));}
  send(id,packet){this.social.connections.get(id)?.send(packet);}
  error(id,message){this.send(id,{type:'error',message});}
  readyAt(plot){return plot.crop?plot.plantedAt+Math.max(30000,CROPS[plot.crop].growMs-Math.max(0,plot.contributors.length-1)*20000):0;}
  state(id){
    const self=this.social.profile(id);if(!self)return;
    let owner=this.social.profiles.get(this.views.get(id))??self;if(!this.allowed(self,owner))owner=self;
    this.send(id,{type:'world_state',owner:{id:owner.id,name:owner.name},serverNow:this.now(),garden:owner.features.garden.map(p=>({...p,readyAt:this.readyAt(p)})),wallet:self.features.wallet,metrics:self.features.metrics});
  }
  sync(id){const p=this.social.profile(id);if(!p)return;this.state(id);for(const reward of p.features.deliveries)this.send(id,{type:'world_reward',reward});}
  changed(){this.social.changed();for(const c of this.social.connections.values())if(c.profile)this.state(c.id);}
  grant(profile,label,{coins=0,xp=0,food={},owned=[]}={}){
    if(profile.features.deliveries.length>=128)return false;
    const reward={id:this.id(),label,coins,xp,food,owned};profile.features.deliveries.push(reward);
    for(const peer of this.social.peers(profile.id))peer.send({type:'world_reward',reward});return true;
  }
  finish(room){
    const seen=new Set();
    for(const player of room.players.values()){
      const p=this.social.profile(player.id);if(!p||seen.has(p.id)||p.features.completed.includes(room.matchId))continue;seen.add(p.id);
      p.features.completed=[...p.features.completed,room.matchId].slice(-128);
      if(room.mode==='adventure'){
        if(room.success){p.features.metrics.adventure=Math.max(p.features.metrics.adventure,room.teamScore*10+Math.floor(room.remaining));const first=!p.features.explorerUnlocked;if(this.grant(p,'Petualangan co-op selesai!',{coins:50,xp:25,food:{apple:2,carrot:2},owned:first?['rewards/explorer-hat.svg']:[]}))p.features.explorerUnlocked=true;}
      }else p.features.metrics.food=Math.max(p.features.metrics.food,player.score);
    }
    this.changed();
  }
  homeState(id,target){this.send(id,{type:'home_visit',owner:{id:target.id,name:target.name},home:target.features.home??{home:freshWorld().home,body:'#d2a057',eyes:'#111111'},reactions:Object.values(target.features.reactions).reduce((all,r)=>(all[r]++,all),{heart:0,wow:0,cozy:0})});}
  message(id,data){
    if(!data||!TYPES.has(data.type))return false;
    const c=this.social.connections.get(id),self=this.social.profile(id);if(!self){this.error(id,'Hubungkan profil terlebih dahulu.');return true;}
    if(this.now()-c.window>=1000){c.window=this.now();c.messages=0;}if(++c.messages>40)return true;
    if(data.type==='reward_ack'){const before=self.features.deliveries.length;self.features.deliveries=self.features.deliveries.filter(r=>r.id!==data.id);if(before!==self.features.deliveries.length)this.social.onchange();return true;}
    if(data.type==='leaderboard'){
      const category=['food','adventure','harvest'].includes(data.category)?data.category:'food',scope=data.scope==='friends'?'friends':'global';
      const rows=[...this.social.profiles.values()].filter(p=>scope==='global'||p.id===self.id||self.friends.includes(p.id)).map(p=>({id:p.id,name:p.name,value:p.features.metrics[category]})).filter(p=>p.value>0).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id)).map((p,i)=>({...p,rank:i+1}));
      this.send(id,{type:'leaderboard',category,scope,rows:rows.slice(0,50),self:rows.find(p=>p.id===self.id)??null});return true;
    }
    if(data.type==='home_publish'){
      if(!validHome(data.home)||!/^#[a-f0-9]{6}$/i.test(data.body)||!/^#[a-f0-9]{6}$/i.test(data.eyes)){this.error(id,'Susunan rumah tidak valid.');return true;}
      self.features.home={home:JSON.parse(JSON.stringify(data.home)),body:data.body,eyes:data.eyes};this.social.onchange();
      for(const [visitor,targetId] of this.homeViews)if(targetId===self.id){const viewer=this.social.profile(visitor);if(viewer&&this.allowed(viewer,self))this.homeState(visitor,self);}return true;
    }
    if(data.type==='home_visit'||data.type==='home_react'){
      const target=this.social.profiles.get(data.target);if(!this.allowed(self,target)){this.error(id,'Rumah hanya bisa dikunjungi oleh teman.');return true;}
      if(data.type==='home_react'){
        if(!['heart','wow','cozy'].includes(data.reaction)||self.id===target.id)return true;
        if(!Object.hasOwn(target.features.reactions,self.id)&&Object.keys(target.features.reactions).length>=100)delete target.features.reactions[Object.keys(target.features.reactions)[0]];
        target.features.reactions[self.id]=data.reaction;this.social.onchange();
      }
      this.homeViews.set(id,target.id);this.homeState(id,target);return true;
    }
    if(data.type==='world_get'){
      const target=data.target?this.social.profiles.get(data.target):self;if(!this.allowed(self,target)){this.error(id,'Kebun hanya bisa dikunjungi oleh teman.');return true;}
      this.views.set(id,target.id);this.sync(id);return true;
    }
    if(data.type==='garden_cook'){
      const recipe=DISHES.find(r=>r.id===data.recipe);if(!recipe||Object.entries(recipe.cost).some(([crop,n])=>self.features.wallet[crop]<n)){this.error(id,'Bahan panen belum cukup untuk memasak.');return true;}
      if(!this.grant(self,`Masakan: ${recipe.name}`,{food:{[recipe.food]:recipe.amount},xp:5})){this.error(id,'Ambil hadiah sebelumnya terlebih dahulu.');return true;}
      for(const [crop,n] of Object.entries(recipe.cost))self.features.wallet[crop]-=n;this.changed();return true;
    }
    const owner=this.social.profiles.get(data.target??self.id);
    if(!this.allowed(self,owner)||!Number.isInteger(data.plot)||data.plot<0||data.plot>=4){this.error(id,'Petak kebun tidak ditemukan.');return true;}
    const plot=owner.features.garden[data.plot];
    if(data.type==='garden_plant'){
      if(plot.crop||!Object.hasOwn(CROPS,data.crop)){this.error(id,'Pilih bibit dan petak yang kosong.');return true;}
      owner.features.garden[data.plot]={crop:data.crop,plantedAt:this.now(),contributors:[self.id]};
    }else if(data.type==='garden_water'){
      if(!plot.crop||plot.contributors.includes(self.id)||plot.contributors.length>=4){this.error(id,'Kamu sudah merawat tanaman ini. Ajak teman menyiramnya.');return true;}
      plot.contributors.push(self.id);
    }else if(data.type==='garden_harvest'){
      if(!plot.crop||this.now()<this.readyAt(plot)){this.error(id,'Tanaman belum siap dipanen.');return true;}
      const recipients=[...new Set([owner.id,self.id,...plot.contributors])].map(id=>this.social.profiles.get(id)).filter(Boolean);
      if(recipients.some(p=>p.features.deliveries.length>=128)){this.error(id,'Ambil hadiah panen sebelumnya terlebih dahulu.');return true;}
      for(const recipient of recipients){recipient.features.wallet[plot.crop]+=2;recipient.features.metrics.harvest++;this.grant(recipient,'Hasil kebun bersama',{food:{[CROPS[plot.crop].food]:1},xp:3});}
      owner.features.garden[data.plot]=emptyPlot();
    }
    this.changed();return true;
  }
  disconnect(id){this.views.delete(id);this.homeViews.delete(id);}
}
