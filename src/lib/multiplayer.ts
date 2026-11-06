import {OnlineConnection,type OnlineState} from './online.ts';
import type {WorldReward,WorldSave} from './world-state.ts';
export interface WorldState{type:'world_state';owner:{id:string;name:string};serverNow:number;garden:{crop:string;plantedAt:number;contributors:string[];readyAt:number}[];wallet:Record<string,number>;metrics:Record<string,number>}
export interface Ranking{category:string;scope:string;rows:{id:string;name:string;value:number;rank:number}[];self:{value:number;rank:number}|null}
export interface HomeVisit{owner:{id:string;name:string};home:{home:WorldSave['home'];body:string;eyes:string};reactions:Record<string,number>}

export interface Contact{id:string;name:string;code:string;online:boolean;room:string}
export interface ChatMessage{id:string;author:string;name:string;text:string;at:number}
export interface SocialState{type:'social';self:{id:string;name:string;code:string};friends:Contact[];requests:Contact[];onlineCount:number;chat:ChatMessage[]}
export interface Invitation{id:string;from:string;fromName:string;code:string;expiresAt:number;mode?:string}
type Listener=()=>void;

/** One connection stays alive between the pet room and the multiplayer area. */
export class MultiplayerSession{
  social:SocialState|null=null;
  room:OnlineState|null=null;
  invitations:Invitation[]=[];
  world:WorldState|null=null;ranking:Ranking|null=null;home:HomeVisit|null=null;rewards:WorldReward[]=[];
  private pendingHome:Record<string,unknown>|null=null;private homeSent='';
  status='disconnected';playerId='';error='';notice='';
  private name='Pou';private token='';private listeners=new Set<Listener>();
  private connection:OnlineConnection;
  private retry?:ReturnType<typeof setTimeout>;
  private active=false;
  private hadConnection=false;private retryDelay=5000;
  constructor(){
    this.connection=new OnlineConnection(packet=>this.packet(packet),status=>{
      this.status=status;
      if(status==='connected'){this.hadConnection=true;this.retryDelay=5000;this.connection.send({type:'hello',name:this.name,token:this.token});}
      if(status==='disconnected'){this.room=null;this.social=null;if(this.active&&this.hadConnection&&navigator.onLine&&!document.hidden){clearTimeout(this.retry);this.retry=setTimeout(()=>this.connect(this.name),this.retryDelay);this.retryDelay=Math.min(30000,this.retryDelay*2);}}
      this.emit();
    });
  }
  subscribe(listener:Listener){this.listeners.add(listener);listener();return()=>{this.listeners.delete(listener);};}
  private emit(){for(const listener of this.listeners)listener();}
  connect(name=this.name){
    this.active=true;this.name=name;clearTimeout(this.retry);
    if(this.status==='connected'||this.status==='connecting')return;
    try{this.token=localStorage.getItem('pou-social-token-v1')??this.token;}catch{/* Profile remains usable for this session. */}
    this.error='';this.connection.connect();
  }
  setName(name:string){if(this.name===name)return;this.name=name;if(this.status==='connected')this.send({type:'rename',name});}
  send(packet:unknown){
    this.error='';this.notice='';
    if(!this.connection.send(packet)){this.error='Koneksi belum siap. Hubungkan kembali.';this.emit();return false;}
    this.emit();return true;
  }
  private packet(packet:any){
    if(packet.type==='welcome'&&typeof packet.token==='string'){
      this.homeSent='';
      this.token=packet.token;try{localStorage.setItem('pou-social-token-v1',this.token);}catch{this.error='Profil online hanya tersimpan selama sesi ini; penyimpanan browser tidak tersedia.';}
    }
    if(packet.type==='social'){this.social=packet;this.publishPendingHome();}
    if(packet.type==='world_state')this.world=packet;
    if(packet.type==='leaderboard')this.ranking=packet;
    if(packet.type==='home_visit')this.home=packet;
    if(packet.type==='world_reward'&&!this.rewards.some(r=>r.id===packet.reward.id))this.rewards=[...this.rewards,packet.reward];
    if(packet.type==='joined')this.playerId=packet.id;
    if(packet.type==='state')this.room=packet;
    if(packet.type==='chat_message'&&this.social)this.social={...this.social,chat:[...this.social.chat,packet.message].slice(-60)};
    if(packet.type==='invitation')this.invitations=[...this.invitations.filter(inv=>inv.from!==packet.invitation.from),packet.invitation].slice(-5);
    if(packet.type==='invitation_removed')this.invitations=this.invitations.filter(inv=>inv.id!==packet.id);
    if(packet.type==='error')this.error=packet.message;
    if(packet.type==='notice')this.notice=packet.message;
    this.emit();
  }
  leave(){if(this.room)this.send({type:'leave'});this.room=null;this.emit();}
  publishHome(home:WorldSave['home'],body:string,eyes:string){this.pendingHome={type:'home_publish',home,body,eyes};this.publishPendingHome();}
  private publishPendingHome(){if(!this.pendingHome||!this.social||this.status!=='connected')return;const key=JSON.stringify(this.pendingHome);if(key!==this.homeSent&&this.connection.send(this.pendingHome))this.homeSent=key;}
  acknowledgeReward(id:string){if(!this.connection.send({type:'reward_ack',id}))return false;this.rewards=this.rewards.filter(r=>r.id!==id);this.emit();return true;}
  answerInvitation(id:string,accept:boolean){this.send({type:accept?'invite_accept':'invite_decline',id});this.invitations=this.invitations.filter(inv=>inv.id!==id);this.emit();}
  close(){this.active=false;clearTimeout(this.retry);this.connection.close();this.status='disconnected';this.social=null;this.room=null;this.world=null;this.ranking=null;this.home=null;this.homeSent='';this.emit();}
}
export const multiplayer=new MultiplayerSession();
