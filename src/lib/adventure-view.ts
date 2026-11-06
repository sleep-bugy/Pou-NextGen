import {drawPou} from './draw-pou';
import type {OnlineState} from './online';
export function drawAdventure(c:CanvasRenderingContext2D,width:number,height:number,state:OnlineState,selfId:string){
  const scale=height/600,visible=width/scale,self=state.players.find(p=>p.id===selfId);
  const camera=Math.max(0,Math.min(Math.max(0,2100-visible),(self?.x??60)-visible*.4));
  c.fillStyle='#b8dfe8';c.fillRect(0,0,width,height);c.save();c.scale(scale,scale);c.translate(-camera,0);
  for(const p of state.platforms??[]){c.fillStyle='#b48e60';c.fillRect(p.x,p.y,p.w,130);c.fillStyle='#8bc68c';c.fillRect(p.x,p.y,p.w,12);c.strokeStyle='#4e6047';c.lineWidth=3;c.strokeRect(p.x,p.y,p.w,130);}
  for(const x of [520,1000,1470,1910]){c.strokeStyle='#52614c';c.lineWidth=4;c.beginPath();c.moveTo(x,490);c.lineTo(x,367);c.stroke();c.fillStyle=(state.checkpoint??0)>=x?'#efd26a':'#f7f0d4';c.beginPath();c.moveTo(x,367);c.lineTo(x+51,384);c.lineTo(x,404);c.fill();}
  for(const item of state.items){c.fillStyle='#eacb70';c.strokeStyle='#72583f';c.lineWidth=3;c.beginPath();c.moveTo(item.x,item.y-14);c.lineTo(item.x+11,item.y);c.lineTo(item.x,item.y+14);c.lineTo(item.x-11,item.y);c.closePath();c.fill();c.stroke();}
  c.fillStyle='#687d73';c.fillRect(1990,375,65,115);c.fillStyle='#fff0c4';c.fillRect(2001,388,43,102);
  for(const player of state.players){drawPou(c,player.x,player.y??462,58,{body:player.color,sleeping:player.down,sad:player.down,lookX:0});c.font='16px Pou';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#334237';c.strokeText(player.down?'Tolong!':player.name,player.x,(player.y??462)-42);c.fillStyle='#fff5d9';c.fillText(player.down?'Tolong!':player.name,player.x,(player.y??462)-42);}
  c.restore();
}
