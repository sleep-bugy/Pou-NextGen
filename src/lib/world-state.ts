export const FURNITURE=[
  {id:'sofa',name:'Sofa',price:65,icon:'decor/sofa.svg'},
  {id:'plant',name:'Tanaman',price:20,icon:'decor/plant.svg'},
  {id:'rug',name:'Karpet',price:30,icon:'decor/rug.svg'},
  {id:'table',name:'Meja',price:40,icon:'decor/table.svg'},
  {id:'bookcase',name:'Rak buku',price:55,icon:'decor/bookcase.svg'},
  {id:'aquarium',name:'Akuarium',price:80,icon:'decor/aquarium.svg'},
] as const;
export const ROOM_NAMES=['Kitchen','Bathroom','Lab','Game Room','Bedroom','Garden','Playground'];
export interface Placement{item:string;room:string;x:number;y:number}
export const MIXES=[
  {id:'tiny',name:'Ramuan Mini',ingredients:['2','8'],hint:'Energi bertemu kesenangan',seconds:15},
  {id:'ghost',name:'Ramuan Transparan',ingredients:['1','4'],hint:'Kesehatan bertemu kekuatan maksimal',seconds:15},
  {id:'rainbow',name:'Ramuan Pelangi',ingredients:['8','antidote'],hint:'Kesenangan bertemu penawar',seconds:15},
  {id:'squeak',name:'Suara Cempreng',ingredients:['2','spin'],hint:'Energi bertemu pusaran',seconds:15},
] as const;
export interface WorldSave{
  home:{owned:string[];placements:Placement[]};
  personality:{food:Record<string,number>;pets:number;games:number;baths:number;bond:number};
  lab:{discovered:string[];effect:{kind:string;until:number}};
  claimed:string[];
}
export const freshWorld=():WorldSave=>({home:{owned:[],placements:[]},personality:{food:{},pets:0,games:0,baths:0,bond:0},lab:{discovered:[],effect:{kind:'none',until:0}},claimed:[]});
const obj=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const n=(v:unknown,max=1e9):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
export function validHome(home:unknown):home is WorldSave['home']{
  return obj(home)&&Array.isArray(home.owned)&&home.owned.length<=6&&new Set(home.owned).size===home.owned.length&&home.owned.every((id:string)=>FURNITURE.some(f=>f.id===id))&&Array.isArray(home.placements)&&home.placements.length<=6&&new Set(home.placements.map((p:any)=>p.item)).size===home.placements.length&&home.placements.every((p:any)=>obj(p)&&home.owned.includes(p.item)&&ROOM_NAMES.includes(p.room)&&n(p.x,100)&&n(p.y,100));
}
export function parseWorld(value:unknown):WorldSave{
  if(value===undefined)return freshWorld();
  if(!obj(value)||!validHome(value.home)||!obj(value.personality)||!obj(value.personality.food)||Object.keys(value.personality.food).length>120||!Object.entries(value.personality.food).every(([k,v])=>/^[a-z_]{1,40}$/.test(k)&&n(v)&&Number.isInteger(v))||!['pets','games','baths','bond'].every(k=>n(value.personality[k],k==='bond'?100:1e9))||!obj(value.lab)||!Array.isArray(value.lab.discovered)||value.lab.discovered.length>4||!value.lab.discovered.every((id:string)=>MIXES.some(m=>m.id===id))||!obj(value.lab.effect)||!['none',...MIXES.map(m=>m.id)].includes(value.lab.effect.kind)||!n(value.lab.effect.until,1e15)||!Array.isArray(value.claimed)||value.claimed.length>128||!value.claimed.every((id:unknown)=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(id)))throw new Error('Data rumah, kepribadian, atau ramuan tidak valid.');
  if(new Set(value.lab.discovered).size!==value.lab.discovered.length)throw new Error('Daftar resep tidak valid.');
  return JSON.parse(JSON.stringify(value)) as WorldSave;
}
export const CROPS={carrot:{name:'Wortel',food:'carrot',growMs:120000},berry:{name:'Beri',food:'strawberry',growMs:180000},wheat:{name:'Gandum',food:'salty_cracker',growMs:150000}};
export const DISHES=[{id:'salad',name:'Sup sayur',cost:{carrot:2,wheat:1,berry:0},food:'vegetable_soup',amount:2},{id:'cake',name:'Kue beri',cost:{berry:2,wheat:2,carrot:0},food:'strawberry_cake',amount:2},{id:'soup',name:'Sup panen',cost:{carrot:1,berry:1,wheat:1},food:'pumpkin_soup',amount:3}] as const;
export interface WorldReward{id:string;label:string;coins:number;xp:number;food:Record<string,number>;owned:string[]}
