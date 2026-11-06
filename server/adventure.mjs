export const ADVENTURE_PLATFORMS=[{x:0,y:490,w:350},{x:470,y:490,w:330},{x:930,y:490,w:340},{x:1400,y:490,w:350},{x:1860,y:490,w:240}];
export function startAdventure(room){
  room.teamScore=0;room.checkpoint=60;room.success=false;room.remaining=180;
  room.items=Array.from({length:20},(_,i)=>({id:`gem-${i}`,kind:0,x:100+i*96,y:340+(i%2)*90}));
  let i=0;for(const p of room.players.values())Object.assign(p,{x:60+i++*35,y:462,vy:0,dx:0,grounded:true,down:false,downFor:0,helps:0,score:0});
}
export function adventureInput(room,player,data){
  if(typeof data.dx==='number'&&Number.isFinite(data.dx))player.dx=Math.max(-1,Math.min(1,data.dx));
  if(data.jump===true&&player.grounded&&!player.down){player.vy=-520;player.grounded=false;}
  if(data.help===true&&!player.down){for(const other of room.players.values())if(other.down&&Math.abs(other.x-player.x)<110){other.down=false;other.downFor=0;other.x=player.x;other.y=player.y-20;other.vy=-100;player.helps++;}}
}
export function stepAdventure(room,dt){
  for(const p of room.players.values()){
    if(p.down){p.downFor+=dt;if(p.downFor>=8)Object.assign(p,{down:false,downFor:0,x:room.checkpoint,y:430,vy:0});continue;}
    const oldY=p.y;p.x=Math.max(25,Math.min(2070,p.x+p.dx*260*dt));p.vy+=1000*dt;p.y+=p.vy*dt;p.grounded=false;
    if(p.vy>=0)for(const platform of ADVENTURE_PLATFORMS)if(oldY+28<=platform.y+.01&&p.y+28>=platform.y&&p.x+20>platform.x&&p.x-20<platform.x+platform.w){p.y=platform.y-28;p.vy=0;p.grounded=true;break;}
    if(p.y>650){p.down=true;p.downFor=0;p.x=Math.max(room.checkpoint,Math.min(2050,p.x));p.y=540;p.dx=0;}
    if(!p.down){
      for(const item of room.items)if(!item.collected&&Math.hypot(item.x-p.x,item.y-p.y)<45){room.teamScore+=1;item.collected=true;}
      for(const checkpoint of [520,1000,1470,1910])if(p.x>=checkpoint&&p.grounded)room.checkpoint=Math.max(room.checkpoint,checkpoint);
    }
  }
  room.items=room.items.filter(i=>!i.collected);
  for(const p of room.players.values())p.score=room.teamScore;
  if(room.players.size>=2&&room.teamScore>=5&&[...room.players.values()].every(p=>!p.down&&p.x>=1910)){room.success=true;room.phase='finished';}
}
