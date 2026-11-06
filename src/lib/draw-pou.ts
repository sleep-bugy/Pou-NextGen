import { getImage } from './assets';
import {isExhausted,type Save} from './model';
import { tracePouBody } from './pou-geometry';

export interface PouLook {
  body?: string; eyes?: string; hat?: string; glasses?: string; outfit?: string;
  sleeping?: boolean; sad?: boolean; dirty?: number; mouth?: number; lookX?: number; lookY?: number; blink?: boolean;
  dead?:boolean; poisoned?:boolean;tired?:boolean;tiny?:boolean;ghost?:boolean;rainbow?:boolean;affectionate?:boolean;
}

const outline = (c: CanvasRenderingContext2D, fill: string, width = 3) => {
  c.fillStyle = fill; c.strokeStyle = '#26251f'; c.lineWidth = width;
  c.lineJoin = 'round'; c.lineCap = 'round'; c.fill(); c.stroke();
};

/** Vector character, so retina scaling and eye tracking do not blur the sprites. */
export function drawPou(c: CanvasRenderingContext2D, x: number, y: number, size: number, look: PouLook = {}) {
  c.save(); c.translate(x, y);const actual=size*(look.tiny ? .65 :1);c.scale(actual / 300, actual / 300);if(look.ghost)c.globalAlpha=.4;
  const bodyColor=look.dead?'#c4c2bf':look.poisoned?'#b0c36b':look.rainbow?`hsl(${Math.floor(Date.now()/30)%360} 65% 72%)`:look.body??'#d2a057';
  tracePouBody(c); outline(c, bodyColor, 3.3);
  if (look.outfit) {
    c.save(); c.clip();
    c.fillStyle = look.outfit;
    c.fillRect(-155, 12, 310, 135);
    c.strokeStyle = '#242424'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-149, 12); c.lineTo(149, 12); c.stroke();
    c.restore();
  }
  if ((look.dirty ?? 0) > 0.2) {
    const dirt = getImage('pou/dirt.png');
    if (dirt) { c.globalAlpha = Math.min(0.8, look.dirty!)*(look.ghost?.4:1); c.drawImage(dirt, -129, -114, 258, 258); c.globalAlpha = look.ghost?.4:1; }
  }
  const eyesY = -50;
  for (const ex of [-30, 30]) {
    c.beginPath(); c.ellipse(ex, eyesY, 30, 35, 0, 0, Math.PI * 2); outline(c, '#fff', 3);
    c.save(); c.clip();
    if(look.dead){
      c.strokeStyle='#333';c.lineWidth=4;c.beginPath();c.moveTo(ex-11,eyesY-11);c.lineTo(ex+11,eyesY+11);c.moveTo(ex+11,eyesY-11);c.lineTo(ex-11,eyesY+11);c.stroke();
    }else if(look.tired){
      c.fillStyle=look.eyes??'#111';c.beginPath();c.arc(ex+(look.lookX??0)*3,eyesY+23,8,0,Math.PI*2);c.fill();
      c.fillStyle=bodyColor;c.fillRect(ex-32,eyesY-36,64,54);
      c.strokeStyle='#26251f';c.lineWidth=3;c.beginPath();c.moveTo(ex-29,eyesY+18);c.quadraticCurveTo(ex,eyesY+26,ex+29,eyesY+18);c.stroke();
    }else if (!look.sleeping && !look.blink) {
      c.fillStyle = look.eyes ?? '#111';
      c.beginPath(); c.arc(ex + (look.lookX ?? 0) * 10, eyesY + (look.lookY ?? 0) * 12, 10.5, 0, Math.PI * 2); c.fill();
      if (look.sad) { c.fillStyle = bodyColor; c.fillRect(ex - 31, eyesY - 36, 62, 26); c.strokeStyle = '#26251f'; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 29, eyesY - 10); c.lineTo(ex + 29, eyesY - 10); c.stroke(); }
    } else {
      c.fillStyle = bodyColor; c.fillRect(ex - 32, eyesY - 36, 64, 73);
      c.strokeStyle = '#26251f'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(ex - 28, eyesY + 9); c.quadraticCurveTo(ex, eyesY + 20, ex + 28, eyesY + 9); c.stroke();
    }
    c.restore();
    if(look.tired&&!look.dead){c.strokeStyle='#756357';c.lineWidth=2;c.beginPath();c.moveTo(ex-16,eyesY+41);c.quadraticCurveTo(ex,eyesY+47,ex+16,eyesY+41);c.stroke();}
  }
  c.strokeStyle = '#26251f'; c.lineWidth = 3;
  if(look.affectionate&&!look.dead&&!look.tired){c.fillStyle='#e18a91';for(const x of [-63,63]){c.beginPath();c.ellipse(x,-4,13,6,0,0,Math.PI*2);c.fill();}}
  c.beginPath();
  if ((look.mouth ?? 0) > 0.2) {
    c.ellipse(0, 27, 16 + look.mouth! * 5, 5 + look.mouth! * 15, 0, 0, Math.PI * 2); outline(c, '#471e17');
  } else {
    c.moveTo(-20, 27); c.quadraticCurveTo(0, look.tired?29:look.sad ? 6 : 47, 20, 27); c.stroke();
  }
  if (look.glasses) {
    const glasses = getImage(look.glasses);
    if (glasses) c.drawImage(glasses, -74, -90, 148, glasses.height * 148 / glasses.width);
  }
  if (look.hat) {
    const hat = getImage(look.hat);
    if (hat) c.drawImage(hat, -85, -195, 170, hat.height * 170 / hat.width);
  }
  c.restore();
}

export function lookFromSave(save: Save): PouLook {
  const effect=save.life.state!=='dead'&&save.world.lab.effect.until>Date.now()?save.world.lab.effect.kind:'none';
  return { ...save.appearance,tiny:effect==='tiny',ghost:effect==='ghost',rainbow:effect==='rainbow',affectionate:save.world.personality.bond>=40, dead:save.life.state==='dead',poisoned:save.life.state==='poisoned',tired:isExhausted(save), sleeping: save.sleeping, sad: Math.min(save.stats.fun, save.stats.health, save.stats.fullness) < 25, dirty: 1 - save.stats.clean / 100 };
}
