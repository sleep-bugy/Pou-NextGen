import {freshWorld,parseWorld,type WorldSave} from './world-state.ts';
export const ROOMS = ['Kitchen', 'Bathroom', 'Lab', 'Game Room', 'Bedroom', 'Garden', 'Playground'] as const;
export type Room = typeof ROOMS[number];
export type Stat = 'fullness' | 'health' | 'fun' | 'energy' | 'clean';
export type Stats = Record<Stat, number>;

export interface Save {
  version: 1;
  name: string;
  createdAt: number;
  updatedAt: number;
  coins: number;
  xp: number;
  stats: Stats;
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
  life: { state:'alive'|'poisoned'|'dead'; poisonSeconds:number; deaths:number };
  partner: { unlocked:boolean; name:string; body:string; bond:number; lastInteractionAt:number };
  onlineRewarded: string[];
  effects: { spinUntil:number };
  boosts: { unlimitedEnergy:boolean };
  world:WorldSave;
}

export const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
export const level = (save: Pick<Save, 'xp'>) => Math.floor(Math.sqrt(save.xp / 20)) + 1;
export const levelProgress = (save: Save) => {
  const l = level(save);
  return (save.xp - (l - 1) ** 2 * 20) / ((l ** 2 - (l - 1) ** 2) * 20);
};

export function newSave(now = Date.now()): Save {
  return {
    version: 1, name: 'Pou', createdAt: now, updatedAt: now, coins: 200, xp: 0,
    stats: { fullness: 80, health: 100, fun: 80, energy: 90, clean: 80 }, sleeping: false,exhausted:false,
    food: { apple: 3, burger: 2, water: 3 }, potions: { '1': 2, '2': 1, '3': 1 },
    owned: [], appearance: { body: '#d2a057', eyes: '#111111', hat: '', glasses: '', outfit: '' },
    wallpapers: {}, scores: {}, counters: { fed: 0, washed: 0, played: 0, petted: 0, earned: 0 },
    settings: { sound: true, music: true, language: 'en', reducedMotion: false },
    garden: { wateredAt: 0, harvestedAt: 0 },
    life:{state:'alive',poisonSeconds:0,deaths:0},
    partner:{unlocked:false,name:'Mimi',body:'#f3a4b5',bond:0,lastInteractionAt:0},
    onlineRewarded:[],
    effects:{spinUntil:0},boosts:{unlimitedEnergy:false},world:freshWorld(),
  };
}

export const EXHAUSTION_ENERGY=10;
export const REST_RECOVERY_ENERGY=20;
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

/** Apply elapsed time exactly once, including time while Safari was suspended. */
export function advance(save: Save, now = Date.now()): Save {
  const current={...save,stats:{...save.stats}};
  enforceRest(current);
  if (now <= save.updatedAt) return current;
  const hours = Math.min((now - save.updatedAt) / 3_600_000, 48);
  const stats = current.stats;
  stats.fullness = clamp(stats.fullness - hours * 4);
  stats.fun = clamp(stats.fun - hours * 3);
  stats.clean = clamp(stats.clean - hours * 2);
  const awakeHours=Math.max(0,(stats.energy-EXHAUSTION_ENERGY)/2.5);
  if(!current.sleeping&&!current.boosts.unlimitedEnergy&&current.life.state!=='dead'&&hours>awakeHours){
    // Spend only the time before exhaustion awake, then sleep for the remainder.
    stats.energy=clamp(EXHAUSTION_ENERGY+(hours-awakeHours)*2880);
    current.sleeping=true;current.exhausted=true;
  }else stats.energy=current.boosts.unlimitedEnergy?100:clamp(stats.energy+hours*(current.sleeping?2880:-2.5));
  const before = save.stats.fullness < 15 || save.stats.clean < 15;
  const after = stats.fullness < 15 || stats.clean < 15;
  if (before || after) {
    const untilHungry = Math.max(0, (save.stats.fullness - 15) / 4);
    const untilDirty = Math.max(0, (save.stats.clean - 15) / 2);
    stats.health = clamp(stats.health - Math.max(0, hours - Math.min(untilHungry, untilDirty)) * 2);
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
  save.xp += Math.max(0, Math.floor(xp));
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
  if(!object(life)||!['alive','poisoned','dead'].includes(String(life.state))||!number(life.poisonSeconds,0,120)||!number(life.deaths)||
     !object(partner)||typeof partner.unlocked!=='boolean'||typeof partner.name!=='string'||!partner.name.trim()||partner.name.length>24||!/^#[0-9a-f]{6}$/i.test(String(partner.body))||!number(partner.bond,0,100)||!number(partner.lastInteractionAt,0,1e15)||
     !Array.isArray(online)||online.length>32||!online.every(id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(id))||
     !object(effects)||!number(effects.spinUntil,0,1e15)||!object(boosts)||typeof boosts.unlimitedEnergy!=='boolean'||typeof exhausted!=='boolean')throw new Error('Data fitur tambahan pada save tidak valid.');
  // Whitelist fields; imported JSON cannot add behavior/prototypes to game state.
  return JSON.parse(JSON.stringify({
    version: 1, name: s.name, createdAt: s.createdAt, updatedAt: s.updatedAt, coins: s.coins, xp: s.xp,
    stats: s.stats, sleeping: s.sleeping, exhausted, food: s.food, potions: s.potions, owned: s.owned,
    appearance: s.appearance, wallpapers: s.wallpapers, scores: s.scores,
    counters: s.counters, settings: s.settings, garden: s.garden,
    life,partner,onlineRewarded:online,effects:{spinUntil:effects.spinUntil},boosts:{unlimitedEnergy:boosts.unlimitedEnergy},world:parseWorld(s.world),
  })) as Save;
}
