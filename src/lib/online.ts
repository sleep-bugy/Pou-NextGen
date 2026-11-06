export interface OnlinePlayer {id:string;name:string;color:string;x:number;score:number;y?:number;down?:boolean;helps?:number}
export interface OnlineState {
  type:'state';code:string;host:string;phase:'lobby'|'countdown'|'playing'|'finished';remaining:number;countdown:number;matchId:string;
  players:OnlinePlayer[];items:{id:string;x:number;y:number;kind:number}[];
  mode?:'food'|'adventure';success?:boolean;teamScore?:number;checkpoint?:number;platforms?:{x:number;y:number;w:number}[];
}
export class OnlineConnection {
  private socket?:WebSocket;
  private timeout?:ReturnType<typeof setTimeout>;
  private onpacket:(packet:any)=>void;
  private onstatus:(status:string)=>void;
  constructor(onpacket:(packet:any)=>void,onstatus:(status:string)=>void){this.onpacket=onpacket;this.onstatus=onstatus;}
  connect(){
    this.close();this.onstatus('connecting');
    try{
      const socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/multiplayer`);this.socket=socket;
      this.timeout=setTimeout(()=>{socket.close();this.onstatus('unavailable');},6000);
      socket.onopen=()=>{clearTimeout(this.timeout);this.onstatus('connected');};
      socket.onmessage=event=>{try{this.onpacket(JSON.parse(event.data));}catch{/* Ignore invalid packets. */}};
      socket.onerror=()=>{clearTimeout(this.timeout);this.onstatus('unavailable');};
      socket.onclose=()=>{clearTimeout(this.timeout);this.onstatus('disconnected');};
    }catch{this.onstatus('unavailable');}
  }
  send(packet:unknown){if(this.socket?.readyState!==WebSocket.OPEN)return false;this.socket.send(JSON.stringify(packet));return true;}
  close(){clearTimeout(this.timeout);if(this.socket){this.socket.onclose=null;this.socket.onerror=null;this.socket.onmessage=null;this.socket.onopen=null;this.socket.close();this.socket=undefined;}}
}
