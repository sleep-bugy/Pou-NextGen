import { getImage } from './assets';
import {isExhausted,type Save} from './model';
import { tracePouBody } from './pou-geometry';

export interface PouLook {
  body?: string; eyes?: string; hat?: string; glasses?: string; outfit?: string;
  sleeping?: boolean; sad?: boolean; dirty?: number; mouth?: number; lookX?: number; lookY?: number; blink?: boolean;
  dead?:boolean; poisoned?:boolean;tired?:boolean;tiny?:boolean;ghost?:boolean;rainbow?:boolean;affectionate?:boolean;soot?:boolean;
  bodySize?: number;
}

const outline = (c: CanvasRenderingContext2D, fill: string, width = 3) => {
  c.fillStyle = fill; c.strokeStyle = '#26251f'; c.lineWidth = width;
  c.lineJoin = 'round'; c.lineCap = 'round'; c.fill(); c.stroke();
};

/** Vector character, so retina scaling and eye tracking do not blur the sprites. */
export function drawPou(c: CanvasRenderingContext2D, x: number, y: number, size: number, look: PouLook = {}) {
  c.save(); c.translate(x, y);const actual=size*(look.tiny ? .65 :1);c.scale(actual / 300, actual / 300);if(look.ghost)c.globalAlpha=.4;
  const b = Math.max(0.5, Math.min(1, look.bodySize ?? 1));
  const strokeW = 3.3 / (0.45 + 0.55 * b);
  const bodyColor=look.dead?'#c4c2bf':look.soot?'#625951':look.poisoned?'#b0c36b':look.rainbow?`hsl(${Math.floor(Date.now()/30)%360} 65% 72%)`:look.body??'#d2a057';
  tracePouBody(c); outline(c, bodyColor, strokeW);
  if (look.outfit) {
    c.save(); c.clip();
    c.fillStyle = look.outfit;
    c.fillRect(-155, 12, 310, 135);
    c.strokeStyle = '#242424'; c.lineWidth = strokeW;
    c.beginPath(); c.moveTo(-149, 12); c.lineTo(149, 12); c.stroke();
    c.restore();
  }
  if ((look.dirty ?? 0) > 0.2) {
    const dirt = getImage('pou/dirt.png');
    if (dirt) { c.globalAlpha = Math.min(0.8, look.dirty!)*(look.ghost?.4:1); c.drawImage(dirt, -129, -114, 258, 258); c.globalAlpha = look.ghost?.4:1; }
  }
  const eyeRadiusX = 30 * (1.28 - 0.28 * b);
  const eyeRadiusY = 35 * (1.24 - 0.24 * b);
  const pupilRadius = 10.5 * (1.22 - 0.22 * b);
  const eyesY = -50 + 9 * (1 - b);
  const exOffset = 30 * (1.04 - 0.04 * b);
  for (const ex of [-exOffset, exOffset]) {
    c.beginPath(); c.ellipse(ex, eyesY, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2); outline(c, '#fff', strokeW);
    c.save(); c.clip();
    if(look.dead){
      c.strokeStyle='#333';c.lineWidth=4;c.beginPath();c.moveTo(ex-11,eyesY-11);c.lineTo(ex+11,eyesY+11);c.moveTo(ex+11,eyesY-11);c.lineTo(ex-11,eyesY+11);c.stroke();
    }else if(look.tired){
      c.fillStyle=look.eyes??'#111';c.beginPath();c.arc(ex+(look.lookX??0)*3,eyesY+23,8,0,Math.PI*2);c.fill();
      c.fillStyle=bodyColor;c.fillRect(ex-34,eyesY-36,68,54);
      c.strokeStyle='#26251f';c.lineWidth=strokeW;c.beginPath();c.moveTo(ex-32,eyesY+18);c.quadraticCurveTo(ex,eyesY+26,ex+32,eyesY+18);c.stroke();
    }else if (!look.sleeping && !look.blink) {
      c.fillStyle = look.eyes ?? '#111';
      c.beginPath(); c.arc(ex + (look.lookX ?? 0) * 10, eyesY + (look.lookY ?? 0) * 12, pupilRadius, 0, Math.PI * 2); c.fill();
      if (look.sad) { c.fillStyle = bodyColor; c.fillRect(ex - 34, eyesY - 36, 68, 26); c.strokeStyle = '#26251f'; c.lineWidth = strokeW; c.beginPath(); c.moveTo(ex - 32, eyesY - 10); c.lineTo(ex + 32, eyesY - 10); c.stroke(); }
    } else {
      c.fillStyle = bodyColor; c.fillRect(ex - 34, eyesY - 36, 68, 73);
      c.strokeStyle = '#26251f'; c.lineWidth = strokeW;
      c.beginPath(); c.moveTo(ex - 32, eyesY + 9); c.quadraticCurveTo(ex, eyesY + 20, ex + 32, eyesY + 9); c.stroke();
    }
    c.restore();
    if(look.tired&&!look.dead){c.strokeStyle='#756357';c.lineWidth=2;c.beginPath();c.moveTo(ex-16,eyesY+41);c.quadraticCurveTo(ex,eyesY+47,ex+16,eyesY+41);c.stroke();}
  }
  c.strokeStyle = '#26251f'; c.lineWidth = strokeW;
  if(look.affectionate&&!look.dead&&!look.tired){c.fillStyle='#e18a91';for(const x of [-63,63]){c.beginPath();c.ellipse(x,-4,13,6,0,0,Math.PI*2);c.fill();}}
  c.beginPath();
  const mouthY = 27 - 8 * (1 - b);
  const mouthHalfW = 20 * (0.65 + 0.35 * b);
  if ((look.mouth ?? 0) > 0.2) {
    c.ellipse(0, mouthY, (16 + look.mouth! * 5) * (0.7 + 0.3 * b), (5 + look.mouth! * 15) * (0.7 + 0.3 * b), 0, 0, Math.PI * 2); outline(c, '#471e17');
  } else {
    c.moveTo(-mouthHalfW, mouthY); c.quadraticCurveTo(0, look.tired?mouthY+2:look.sad ? mouthY-21 : mouthY+20, mouthHalfW, mouthY); c.stroke();
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
  return { ...save.appearance,bodySize:save.bodySize,tiny:effect==='tiny',ghost:effect==='ghost',rainbow:effect==='rainbow',soot:save.world.lab.soot,affectionate:save.world.personality.bond>=40, dead:save.life.state==='dead',poisoned:save.life.state==='poisoned',tired:isExhausted(save), sleeping: save.sleeping, sad: Math.min(save.stats.fun, save.stats.health, save.stats.fullness) < 25, dirty: 1 - save.stats.clean / 100 };
}
