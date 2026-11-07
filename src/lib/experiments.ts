import { clamp, spend, earn, enforceRest,isExhausted,type Save } from './model.ts';
import { POTIONS } from './assets.ts';

export function poisonPou(save:Save){
  if(save.life.state==='dead')return false;
  save.life.state='poisoned';save.life.poisonSeconds=120;save.sleeping=false;save.stats.health=clamp(save.stats.health-15);if(!save.stats.health)endPouLife(save);return true;
}
export function antidotePou(save:Save){
  if(save.life.state==='dead')return false;
  save.life.state='alive';save.life.poisonSeconds=0;save.effects.spinUntil=0;save.stats.health=clamp(save.stats.health+25);return true;
}
export function endPouLife(save:Save){
  if(save.life.state==='dead')return false;
  save.life={state:'dead',poisonSeconds:0,deaths:save.life.deaths+1};save.effects.spinUntil=0;save.stats.health=0;save.sleeping=false;save.exhausted=false;return true;
}
export function revivePou(save:Save){
  if(save.life.state!=='dead')return false;
  save.life.state='alive';save.life.poisonSeconds=0;save.stats.health=75;save.stats.energy=Math.max(50,save.stats.energy);enforceRest(save);return true;
}
export function meetPartner(save:Save,name:string,body:string){
  if(save.life.state==='dead')return 'Hidupkan kembali Pou terlebih dahulu.';
  if(!name.trim()||name.trim().length>24||!/^#[0-9a-f]{6}$/i.test(body))return 'Isi nama dan warna pasangan.';
  if(!save.partner.unlocked&&!spend(save,50))return 'Butuh 50 koin untuk mengundang pasangan.';
  save.partner={...save.partner,unlocked:true,name:name.trim(),body};return '';
}
export function partnerAction(save:Save,action:'talk'|'flower'|'walk',now=Date.now()){
  if(!save.partner.unlocked||save.life.state==='dead')return 'Undang pasangan dan pastikan Pou sudah bangun.';
  if(isExhausted(save))return 'Pou terlalu lelah. Biarkan tidur sampai energi minimal 20%.';
  if(save.sleeping)return 'Bangunkan Pou terlebih dahulu.';
  if(now-save.partner.lastInteractionAt<3000)return 'Tunggu sebentar sebelum berinteraksi lagi.';
  if(action==='flower'&&!spend(save,10))return 'Butuh 10 koin untuk memberi bunga.';
  if(action==='walk'&&(save.stats.energy<5||save.stats.fullness<5))return 'Pou perlu makan dan istirahat dulu.';
  if(action==='walk'){if(!save.boosts.unlimitedEnergy)save.stats.energy-=3;save.stats.fullness-=2;}
  save.partner.lastInteractionAt=now;save.partner.bond=clamp(save.partner.bond+({talk:3,flower:8,walk:6}[action]));
  save.stats.fun=clamp(save.stats.fun+5);earn(save,0,2);enforceRest(save);return '';
}

/** Validate before spending stock so rejected actions cannot consume a potion. */
export function consumePotion(save:Save,id:string,now=Date.now()):string{
  const potion=POTIONS.find(p=>p.id===id);
  if(!potion)return 'Ramuan tidak dikenal.';
  if(save.life.state==='dead')return 'Hidupkan kembali Pou terlebih dahulu.';
  if(!(save.potions[id]>0))return 'Ramuan habis. Beli di toko ramuan.';
  if((id==='1'||id==='2')&&save.stats.health>=90)return 'Kesehatan Pou sudah cukup tinggi.';
  if(id==='3'&&save.obesity<=10)return 'Pou tidak membutuhkan pembakar lemak.';
  if(id==='4'&&save.stats.energy>=90)return 'Energi Pou sudah cukup tinggi.';
  if(id==='5'&&save.stats.fullness<=90)return 'Pou belum cukup kenyang.';
  if(id==='8'&&['fullness','health','fun','energy'].every(k=>save.stats[k as keyof Save['stats']]>=90))return 'Kebutuhan Pou sudah cukup tinggi.';
  if(id==='infinite'&&save.boosts.unlimitedEnergy)return 'Energi unlimited sudah aktif permanen.';
  if(id==='6'&&save.bodySize<=0.75)return 'Pou sudah cukup kecil untuk menjadi bayi.';
  if(id==='7'&&save.bodySize>=1)return 'Pou sudah dewasa.';
  if(id==='spin'&&save.effects.spinUntil>now)return 'Racun Pusaran masih aktif. Tunggu lima detik atau gunakan penawar.';
  if(id==='drowsy'&&save.boosts.unlimitedEnergy)return 'Energi unlimited melindungi Pou dari racun kantuk.';
  const recovering=isExhausted(save);
  const energyRemedy=recovering&&['energy','all','infinite'].includes(potion.stat);
  if((save.sleeping||recovering)&&potion.stat!=='antidote'&&!energyRemedy)return recovering?'Pou terlalu lelah. Berikan ramuan energi atau biarkan tidur.':'Bangunkan Pou terlebih dahulu.';
  switch(potion.stat){
    case 'poison':poisonPou(save);break;
    case 'spin':save.effects.spinUntil=now+5000;break;
    case 'drowsy':save.stats.energy=5;save.sleeping=true;break;
    case 'antidote':antidotePou(save);if(id==='antidote-max')save.stats.health=100;save.sleeping=false;break;
    case 'infinite':save.boosts.unlimitedEnergy=true;break;
    case 'all':for(const key of ['fullness','health','fun','energy'] as const)save.stats[key]=100;break;
    case 'fat':save.obesity=0;break;
    case 'baby':save.bodySize=0.5;save.appearance.hat='';save.appearance.glasses='';save.appearance.outfit='';break;
    case 'adult':save.bodySize=1;break;
    default:save.stats[potion.stat]=clamp(save.stats[potion.stat]+potion.amount);
  }
  enforceRest(save);if(recovering&&!save.exhausted)save.sleeping=false;
  save.potions[id]--;earn(save,0,({'1':25,'2':15,'3':25,'4':40,'5':50,'6':100,'7':100,'8':50} as Record<string,number>)[id]??3);return '';
}
