import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiplayerSession} from '../src/lib/multiplayer.ts';

test('the shared session authenticates, receives invitations outside a game and keeps presence after leaving',()=>{
  const sockets:FakeSocket[]=[];const storage=new Map<string,string>();
  class FakeSocket{
    static OPEN=1;readyState=0;sent:any[]=[];closed=false;
    onopen:(()=>void)|null=null;onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;onmessage:((event:{data:string})=>void)|null=null;
    constructor(_url:string){sockets.push(this);}send(data:string){this.sent.push(JSON.parse(data));}close(){this.closed=true;this.onclose?.();}
    open(){this.readyState=1;this.onopen?.();}message(packet:unknown){this.onmessage?.({data:JSON.stringify(packet)});}
  }
  const values={WebSocket:FakeSocket,location:{protocol:'https:',host:'pou.test'},localStorage:{getItem:(key:string)=>storage.get(key),setItem:(key:string,value:string)=>storage.set(key,value)}};
  const previous=new Map(Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(values))Object.defineProperty(globalThis,key,{configurable:true,value});
  const session=new MultiplayerSession();let updates=0;const unsubscribe=session.subscribe(()=>updates++);
  try{
    session.connect('Adi');sockets[0].open();assert.equal(sockets[0].sent[0].type,'hello');assert.equal(sockets[0].sent[0].name,'Adi');
    sockets[0].message({type:'welcome',token:'a'.repeat(64)});assert.equal(storage.get('pou-social-token-v1'),'a'.repeat(64));
    sockets[0].message({type:'social',self:{id:'p1',name:'Adi',code:'AB123456'},friends:[],requests:[],onlineCount:2,chat:[]});
    sockets[0].message({type:'invitation',invitation:{id:'i1',from:'p2',fromName:'Mimi',code:'ABCDEF',expiresAt:Date.now()+60000}});
    assert.equal(session.room,null);assert.equal(session.invitations.length,1);session.answerInvitation('i1',true);assert.equal(sockets[0].sent.at(-1).type,'invite_accept');
    sockets[0].message({type:'joined',id:'transport1'});sockets[0].message({type:'state',code:'ABCDEF',phase:'lobby',players:[]});
    assert.equal(session.room?.code,'ABCDEF');session.leave();assert.equal(session.room,null);assert.equal(sockets[0].closed,false);assert.equal(session.status,'connected');assert.ok(session.social);
    session.close();session.connect('Adi');sockets[1].open();assert.equal(sockets[1].sent[0].token,'a'.repeat(64));assert.ok(updates>5);
  }finally{unsubscribe();session.close();for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
