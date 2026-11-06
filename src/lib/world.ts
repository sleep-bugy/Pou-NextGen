import {clamp,spend,earn,isExhausted,type Save} from './model.ts';
import {FURNITURE,MIXES,ROOM_NAMES,type WorldReward} from './world-state.ts';
export function furnish(save:Save,item:string,room:string){
  const f=FURNITURE.find(f=>f.id===item);if(!f||!ROOM_NAMES.includes(room))return 'Furnitur atau ruangan tidak dikenal.';
  if(!save.world.home.owned.includes(item)){if(!spend(save,f.price))return 'Koin belum cukup.';save.world.home.owned.push(item);}
  save.world.home.placements=save.world.home.placements.filter(p=>p.item!==item);
  save.world.home.placements.push({item,room,x:25+save.world.home.placements.length*9,y:65});return '';
}
export function care(save:Save,kind:'food'|'pet'|'game'|'bath',food=''){
  const p=save.world.personality;
  if(kind==='food'&&/^[a-z_]{1,40}$/.test(food)){const favorite=favoriteFood(save);p.food[food]=(p.food[food]??0)+1;if(favorite===food)save.stats.fun=clamp(save.stats.fun+3);}
  if(kind==='pet')p.pets++;if(kind==='game')p.games++;if(kind==='bath')p.baths++;
  p.bond=clamp(p.bond+(kind==='pet'?1:.7));
}
export function favoriteFood(save:Save){const top=Object.entries(save.world.personality.food).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];return top&&top[1]>=3?top[0]:'apple';}
export function personality(save:Save){const p=save.world.personality;return p.games>p.pets&&p.games>p.baths?'Petualang':p.pets>=5&&p.pets>p.games?'Manja':Object.values(p.food).reduce((a,b)=>a+b,0)>p.games+5?'Pencinta makanan':p.baths>=3?'Suka bersih':'Penasaran';}
export function mixPotions(save:Save,a:string,b:string,now=Date.now()){
  if(save.life.state==='dead'||save.sleeping||isExhausted(save))return 'Pou perlu bangun dan sehat untuk bereksperimen.';
  const needed:Record<string,number>={};for(const id of [a,b])needed[id]=(needed[id]??0)+1;
  if(Object.entries(needed).some(([id,n])=>(save.potions[id]??0)<n))return 'Stok bahan belum cukup.';
  const recipe=MIXES.find(m=>[...m.ingredients].sort().join('|')===[a,b].sort().join('|'));
  if(!recipe)return 'Kombinasi belum cocok. Coba petunjuk resep; bahan tidak terpakai.';
  for(const [id,n] of Object.entries(needed))save.potions[id]-=n;
  if(!save.world.lab.discovered.includes(recipe.id))save.world.lab.discovered.push(recipe.id);
  save.world.lab.effect={kind:recipe.id,until:now+recipe.seconds*1000};save.xp+=5;return '';
}
export function claimReward(save:Save,reward:WorldReward){
  if(save.world.claimed.includes(reward.id))return false;
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(reward.id)||!Number.isInteger(reward.coins)||reward.coins<0||reward.coins>500||!Number.isInteger(reward.xp)||reward.xp<0||reward.xp>100||Object.entries(reward.food).some(([id,n])=>!/^[a-z_]{1,40}$/.test(id)||!Number.isInteger(n)||n<0||n>20)||reward.owned.some(id=>id!=='rewards/explorer-hat.svg'))throw new Error('Hadiah server tidak valid.');
  earn(save,reward.coins,reward.xp);for(const [id,n] of Object.entries(reward.food))save.food[id]=(save.food[id]??0)+n;
  for(const id of reward.owned)if(!save.owned.includes(id))save.owned.push(id);
  save.world.claimed=[...save.world.claimed,reward.id].slice(-128);return true;
}
