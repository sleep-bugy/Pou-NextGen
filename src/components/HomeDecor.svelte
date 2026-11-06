<script lang="ts">
  import {language,translate,itemName,localMessage,roomName} from '../lib/language';
  import {untrack} from 'svelte';
  import {ROOMS,type Save} from '../lib/model';
  import {FURNITURE} from '../lib/world-state';
  import {furnish} from '../lib/world';
  import {imageUrl} from '../lib/assets';
  import FurnitureLayer from './FurnitureLayer.svelte';
  let {save,room,onchange}:{save:Save;room:string;onchange:(fn:(s:Save)=>void)=>void}=$props();
  let current=$state(untrack(()=>room)),message=$state('');
  function place(item:string){onchange(s=>message=furnish(s,item,current));}
</script>
<p class="settings-caption">{translate($language,"Seret furnitur pada pratinjau untuk mengatur posisi. Teman bisa melihat rumahmu melalui Area Mabar.","Drag furniture in the preview to position it. Friends can visit through Multiplayer.")}</p>
<label class="field">{translate($language,"Ruangan","Room")}<select bind:value={current}>{#each ROOMS as r}<option value={r}>{roomName($language,r)}</option>{/each}</select></label>
<div class="home-preview"><span>{roomName($language,current)}</span><div class="floor"></div><FurnitureLayer placements={save.world.home.placements} room={current} editing onmove={(item,x,y)=>onchange(s=>{const p=s.world.home.placements.find(p=>p.item===item);if(p){p.x=x;p.y=y;}})}/></div>
<div class="decor-grid">{#each FURNITURE as f}<div><button class="shop-item" onclick={()=>place(f.id)}><img src={imageUrl(f.icon)} alt=""/><span>{itemName($language,f.name)}</span><small>{save.world.home.owned.includes(f.id)?translate($language,'Taruh di ruangan ini','Place in this room'):`${f.price} ${translate($language,'koin','coins')}`}</small></button>{#if save.world.home.placements.some(p=>p.item===f.id&&p.room===current)}<button class="store" onclick={()=>onchange(s=>s.world.home.placements=s.world.home.placements.filter(p=>p.item!==f.id))}>{translate($language,"Simpan furnitur","Put furniture away")}</button>{/if}</div>{/each}</div>
{#if message}<p role="alert" class="inline-error">{localMessage($language,message)}</p>{/if}
<style>
  .home-preview{position:relative;height:270px;overflow:hidden;border:2px solid #657251;border-radius:14px;background:#c8e0d9;margin:15px 0}.home-preview>span{position:absolute;top:12px;left:16px;font-size:22px;color:#53644e}.floor{position:absolute;inset:55% 0 0;background:#e7d5aa;border-top:2px solid #b2a37f}.decor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.decor-grid .shop-item{width:100%}.decor-grid img{width:65px;height:65px;object-fit:contain}.store{display:block;width:100%;border:0;background:none;text-decoration:underline;padding:8px;font:12px/1.3 system-ui,sans-serif;color:#576743}
</style>
