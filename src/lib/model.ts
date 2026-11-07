import {freshWorld,parseWorld,findMix,type WorldSave} from './world-state.ts';
export const ROOMS = ['Kitchen', 'Bathroom', 'Lab', 'Game Room', 'Bedroom', 'Hall', 'Garden', 'Playground'] as const;
export type Room = typeof ROOMS[number];
export const INDOOR_ROOMS: readonly Room[] = ['Kitchen', 'Bathroom', 'Lab', 'Game Room', 'Bedroom', 'Hall'] as const;
export const OUTDOOR_ROOMS: readonly Room[] = ['Garden', 'Playground'] as const;
export const isOutdoor = (r: string): boolean => r === 'Garden' || r === 'Playground';
export type Stat = 'fullness' | 'health' | 'fun' | 'energy' | 'clean';
export type Stats = Record<Stat, number>;

export interface Save {
  version: 1;
  name: string;
  createdAt: number;
  updatedAt: number;
  coins: number;
  xp: number;
  xpVersion: 2;
  stats: Stats;
  bodySize: number;
  obesity: number;
  potionVersion: 2;
  sleeping: boolean;
  exhausted: boolean;
  food: Record<string, number>;
  potions: Record<string, number>;
  owned: string[];
  appearance: { body: string; eyes: string; hat: string; glasses: string; outfit: string };
  wallpapers: Partial<Record<Room, string>>;
  scores: Record<string, number>;
  counters: { fed: number; washed: number; played: number; petted: number; earned: number };
  settings: { sound: boolean; music: boolean; language: 'en' | 'id'; reducedMotion: boolean };
  garden: { wateredAt: number; harvestedAt: number };
  bathroom: { poops: number; dirtyRemainingMs: number };
  life: { state:'alive'|'poisoned'|'dead'; poisonSeconds:number; deaths:number };
  partner: { unlocked:boolean; name:string; body:string; bond:number; lastInteractionAt:number };
  onlineRewarded: string[];
  effects: { spinUntil:number };
  boosts: { unlimitedEnergy:boolean };
  world:WorldSave;
}

export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
export const MAX_LEVEL=270;
export const levelStartXp=(l:number)=>55*(l*(l+1)/2-1);
export const level = (save: Pick<Save, 'xp'>) => {
  let low=1,high=MAX_LEVEL;
  while(low<high){const mid=Math.ceil((low+high)/2);if(save.xp>=levelStartXp(mid))low=mid;else high=mid-1;}
  return low;
};
export const levelProgress = (save: Save) => {
  const l = level(save);
  if(l>=MAX_LEVEL)return 1;
  return (save.xp-levelStartXp(l))/(levelStartXp(l+1)-levelStartXp(l));
};

export function newSave(now = Date.now()): Save {
  return {
    version: 1, name: 'Pou', createdAt: now, updatedAt: now, coins: 200, xp: 0, xpVersion:2,
    stats: { fullness: 80, health: 100, fun: 80, energy: 90, clean: 80 }, bodySize: 0.5, obesity:0, potionVersion:2, sleeping: false,exhausted:false,
    food: { apple: 3, burger: 2, water: 3 }, potions: { '1': 2, '4': 1, '3': 1 },
    owned: [], appearance: { body: '#d2a057', eyes: '#111111', hat: '', glasses: '', outfit: '' },
    wallpapers: {}, scores: {}, counters: { fed: 0, washed: 0, played: 0, petted: 0, earned: 0 },
    settings: { sound: true, music: true, language: 'en', reducedMotion: false },
    garden: { wateredAt: 0, harvestedAt: 0 },
    bathroom: { poops: 0, dirtyRemainingMs: 1_800_000 },
    life:{state:'alive',poisonSeconds:0,deaths:0},
    partner:{unlocked:false,name:'Mimi',body:'#f3a4b5',bond:0,lastInteractionAt:0},
    onlineRewarded:[],
    effects:{spinUntil:0},boosts:{unlimitedEnergy:false},world:freshWorld(),
  };
}

export const EXHAUSTION_ENERGY=10;
export const REST_RECOVERY_ENERGY=20;
// APK coefficients expressed in 60 update units per second (see LOGIC.md).
export const NEEDS_PER_HOUR={fullness:6.481e-5*216000,fun:4.05e-5*216000,awakeEnergy:5.4e-5*216000,sleepEnergy:3.24e-4*216000,cleanHealth:9.645e-6*216000,dirtyHealth:1.286e-5*216000} as const;
export function isExhausted(save:Save):boolean{
  return save.life.state!=='dead'&&!save.boosts.unlimitedEnergy&&(save.stats.energy<EXHAUSTION_ENERGY||(save.exhausted&&save.stats.energy<REST_RECOVERY_ENERGY));
}
/** Apply after energy changes as well as clock updates; waking cannot bypass rest. */
export function enforceRest(save:Save):void{
  if(save.boosts.unlimitedEnergy)save.stats.energy=100;
  save.exhausted=isExhausted(save);
  if(save.life.state==='dead')save.sleeping=false;
  else if(save.exhausted)save.sleeping=true;
}

/** The original uses a dirt timer and a 50% chance of producing poop. */
export function updateBathroom(save: Save, elapsedMs: number, random = Math.random): void {
  let remaining = save.bathroom.dirtyRemainingMs - Math.max(0, elapsedMs);
  while (remaining <= 0) {
    save.stats.clean = Math.min(save.stats.clean, 79);
    if (random() < 0.5) save.bathroom.poops = Math.min(100, save.bathroom.poops + 1);
    remaining += 21_600_000;
  }
  save.bathroom.dirtyRemainingMs = remaining;
}
export function collectPoop(save: Save): boolean {
  if (save.bathroom.poops < 1) return false;
  save.bathroom.poops--;
  earn(save, 5);
  return true;
}

/** Apply elapsed time exactly once, including time while Safari was suspended. */
export function advance(save: Save, now = Date.now(), random = Math.random): Save {
  const current={...save,stats:{...save.stats},bathroom:{...save.bathroom},counters:{...save.counters}};
  enforceRest(current);
  if (now <= save.updatedAt) return current;
  const hours = Math.min((now - save.updatedAt) / 3_600_000, 48);
  const stats = current.stats;
  stats.fullness = clamp(stats.fullness - hours * NEEDS_PER_HOUR.fullness);
  stats.fun = clamp(stats.fun - hours * NEEDS_PER_HOUR.fun);
  current.obesity=clamp(current.obesity-hours*3.858e-5*216000);
  const dirtyHours = stats.clean < 95 ? hours : Math.max(0,hours - current.bathroom.dirtyRemainingMs/3_600_000);
  stats.health = clamp(stats.health - (hours-dirtyHours)*NEEDS_PER_HOUR.cleanHealth - dirtyHours*NEEDS_PER_HOUR.dirtyHealth);
  if(current.boosts.unlimitedEnergy)stats.energy=100;
  else if(current.life.state!=='dead'){
    let remaining=hours;
    while(remaining>1e-12){
      if(current.sleeping){
        const toFull=Math.max(0,(100-stats.energy)/NEEDS_PER_HOUR.sleepEnergy);
        if(remaining<toFull){stats.energy=clamp(stats.energy+remaining*NEEDS_PER_HOUR.sleepEnergy);break;}
        remaining-=toFull;stats.energy=100;current.sleeping=false;current.exhausted=false;earn(current,0,50);
      }else{
        const toRest=Math.max(0,(stats.energy-EXHAUSTION_ENERGY)/NEEDS_PER_HOUR.awakeEnergy);
        if(remaining<=toRest){stats.energy=clamp(stats.energy-remaining*NEEDS_PER_HOUR.awakeEnergy);break;}
        remaining-=toRest;stats.energy=EXHAUSTION_ENERGY;current.sleeping=true;current.exhausted=true;
      }
    }
  }
  const life={...save.life};
  if(life.state==='poisoned'){
    const seconds=Math.min(life.poisonSeconds,(now-save.updatedAt)/1000);
    stats.health=clamp(stats.health-seconds*.8);life.poisonSeconds=Math.max(0,life.poisonSeconds-seconds);
    if(stats.health<=0){life.state='dead';life.deaths++;life.poisonSeconds=0;}
    else if(!life.poisonSeconds)life.state='alive';
  }
  const result={ ...current, stats, life, effects:{spinUntil:save.effects.spinUntil>now&&life.state!=='dead'?save.effects.spinUntil:0}, partner:{...save.partner,bond:clamp(save.partner.bond-hours*.15)}, updatedAt: now };
  result.world={...save.world,lab:{...save.world.lab,effect:save.world.lab.effect.until>now&&life.state!=='dead'?{...save.world.lab.effect}:{kind:'none',until:0}}};
  if (result.life.state !== 'dead') updateBathroom(result, Math.min(now - save.updatedAt, 48 * 3_600_000), random);
  enforceRest(result);return result;
}

export function spend(save: Save, price: number): boolean {
  if (!Number.isFinite(price) || price < 0 || save.coins < price) return false;
  save.coins -= price;
  return true;
}

export function earn(save: Save, coins: number, xp = 0): void {
  const amount = Math.max(0, Math.floor(coins));
  save.coins += amount;
  save.counters.earned += amount;
  const previousLevel=level(save);
  save.xp=Math.min(levelStartXp(MAX_LEVEL),save.xp+Math.max(0,Math.floor(xp)));
  const newLevel=level(save);
  for(let l=previousLevel+1;l<=newLevel;l++){
    const reward=Math.min(l*10,250);save.coins+=reward;save.counters.earned+=reward;
  }
}

const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const number = (v: unknown, low = 0, high = 1e9): v is number => typeof v === 'number' && Number.isFinite(v) && v >= low && v <= high;
const safeKey = (s: string) => /^[a-zA-Z0-9 /_.#-]{1,160}$/.test(s) && !s.includes('..') && !['__proto__', 'constructor', 'prototype'].includes(s);
const numericMap = (v: unknown) => object(v) && Object.keys(v).length < 10000 && Object.entries(v).every(([k, n]) => safeKey(k) && number(n) && Number.isInteger(n));

/** Reject corrupt/incompatible saves before they can replace a working slot. */
export function parseSave(input: unknown): Save {
  if (!object(input) || input.version !== 1) throw new Error('Format save tidak didukung.');
  const s = input;
  if (typeof s.name !== 'string' || s.name.length < 1 || s.name.length > 24 ||
      !number(s.createdAt, 0, 1e15) || !number(s.updatedAt, 0, 1e15) ||
      !number(s.coins) || !Number.isInteger(s.coins) || !number(s.xp) || !Number.isInteger(s.xp) ||
      typeof s.sleeping !== 'boolean' || !object(s.stats) ||
      !(['fullness', 'health', 'fun', 'energy', 'clean'] as const).every(k => number((s.stats as Record<string, unknown>)[k], 0, 100)) ||
      !numericMap(s.food) || !numericMap(s.potions) || !numericMap(s.scores) ||
      !Array.isArray(s.owned) || s.owned.length > 10000 || !s.owned.every(k => typeof k === 'string' && safeKey(k)) ||
      !object(s.appearance) || !['body', 'eyes'].every(k => /^#[0-9a-f]{6}$/i.test(String((s.appearance as Record<string, unknown>)[k]))) ||
      !['hat', 'glasses', 'outfit'].every(k => typeof (s.appearance as Record<string, unknown>)[k] === 'string' && ((s.appearance as Record<string, unknown>)[k] === '' || safeKey(String((s.appearance as Record<string, unknown>)[k])))) ||
      !object(s.wallpapers) || !Object.entries(s.wallpapers).every(([k,v]) => ROOMS.includes(k as Room) && typeof v === 'string' && safeKey(v)) ||
      !object(s.counters) || !['fed', 'washed', 'played', 'petted', 'earned'].every(k => number((s.counters as Record<string, unknown>)[k])) ||
      !object(s.settings) || !['sound', 'music', 'reducedMotion'].every(k => typeof (s.settings as Record<string, unknown>)[k] === 'boolean') ||
      !['en', 'id'].includes(String(s.settings.language)) ||
      !object(s.garden) || !number(s.garden.wateredAt, 0, 1e15) || !number(s.garden.harvestedAt, 0, 1e15)) {
    throw new Error('Save rusak atau tidak lengkap. Progress saat ini tetap dipakai.');
  }
  const defaults=newSave();
  const life=s.life===undefined?defaults.life:s.life;
  const partner=s.partner===undefined?defaults.partner:s.partner;
  const online=s.onlineRewarded===undefined?[]:s.onlineRewarded;
  const effects=s.effects===undefined?defaults.effects:s.effects;
  const boosts=s.boosts===undefined?defaults.boosts:s.boosts;
  const exhausted=s.exhausted===undefined?false:s.exhausted;
  const bodySize=s.bodySize===undefined?1:s.bodySize;
  if(s.xpVersion!==undefined&&s.xpVersion!==2)throw new Error('Versi XP tidak didukung.');
  let xp=s.xp as number;
  if(s.xpVersion===undefined){
    const oldLevel=Math.floor(Math.sqrt(xp/20))+1;
    if(oldLevel>=MAX_LEVEL)xp=levelStartXp(MAX_LEVEL);
    else{
      const progress=(xp-20*(oldLevel-1)**2)/(20*(2*oldLevel-1));
      xp=levelStartXp(oldLevel)+Math.floor(progress*55*(oldLevel+1));
    }
  }
  const obesity=s.obesity===undefined?0:s.obesity;
  const legacyPotions=s.potionVersion===undefined;
  if(!legacyPotions&&s.potionVersion!==2)throw new Error('Versi ramuan tidak didukung.');
  const bathroom=s.bathroom===undefined?defaults.bathroom:object(s.bathroom)&&s.bathroom.dirtyRemainingMs===undefined?{poops:s.bathroom.poops,dirtyRemainingMs:defaults.bathroom.dirtyRemainingMs}:s.bathroom;
  if(!object(life)||!['alive','poisoned','dead'].includes(String(life.state))||!number(life.poisonSeconds,0,120)||!number(life.deaths)||
     !object(partner)||typeof partner.unlocked!=='boolean'||typeof partner.name!=='string'||!partner.name.trim()||partner.name.length>24||!/^#[0-9a-f]{6}$/i.test(String(partner.body))||!number(partner.bond,0,100)||!number(partner.lastInteractionAt,0,1e15)||
     !Array.isArray(online)||online.length>32||!online.every(id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id))||
     !object(bathroom)||!number(bathroom.poops,0,100)||!Number.isInteger(bathroom.poops)||!number(bathroom.dirtyRemainingMs,0,21_600_000)||
     !object(effects)||!number(effects.spinUntil,0,1e15)||!object(boosts)||typeof boosts.unlimitedEnergy!=='boolean'||typeof exhausted!=='boolean'||!number(bodySize,0.5,1)||!number(obesity,0,100))throw new Error('Data fitur tambahan pada save tidak valid.');
  const oldIds:Record<string,string>={'2':'4','4':'8','8':'fun'};
  const translatePotion=(id:string)=>oldIds[id]??id;
  const potions:Record<string,number>={};
  for(const [id,amount] of Object.entries(s.potions as Record<string,number>)){
    const key=legacyPotions?translatePotion(id):id;potions[key]=(potions[key]??0)+amount;
  }
  let worldInput=s.world;
  if(legacyPotions&&object(worldInput)&&object(worldInput.lab)&&Array.isArray(worldInput.lab.discovered)){
    const discovered=worldInput.lab.discovered.map((id:unknown)=>{
      if(typeof id!=='string'||!id.startsWith('mix_'))return id;
      const parts=id.split('_');if(parts.length!==3)return id;
      return findMix(translatePotion(parts[1]),translatePotion(parts[2]))?.id??id;
    });
    worldInput={...worldInput,lab:{...worldInput.lab,discovered:[...new Set(discovered)]}};
  }
  // Whitelist fields; imported JSON cannot add behavior/prototypes to game state.
  return JSON.parse(JSON.stringify({
    version: 1, name: s.name, createdAt: s.createdAt, updatedAt: s.updatedAt, coins: s.coins, xp, xpVersion:2,
    stats: s.stats, bodySize, obesity, potionVersion:2, sleeping: s.sleeping, exhausted, food: s.food, potions, owned: s.owned,
    appearance: s.appearance, wallpapers: s.wallpapers, scores: s.scores,
    counters: s.counters, settings: s.settings, garden: s.garden,
    life,partner,bathroom,onlineRewarded:online,effects:{spinUntil:effects.spinUntil},boosts:{unlimitedEnergy:boosts.unlimitedEnergy},world:parseWorld(worldInput),
  })) as Save;
}
