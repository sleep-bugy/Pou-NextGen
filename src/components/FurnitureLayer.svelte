<script lang="ts">
  import {language,translate,itemName} from '../lib/language';
  import {FURNITURE,type Placement} from '../lib/world-state';
  import {imageUrl} from '../lib/assets';
  let {placements,room,editing=false,onmove}:{placements:Placement[];room:string;editing?:boolean;onmove?:(item:string,x:number,y:number)=>void}=$props();
  let layer:HTMLDivElement;
  let drag=$state<{item:string;x:number;y:number;pointer:number}|null>(null);
  function move(e:PointerEvent){if(!drag||e.pointerId!==drag.pointer)return;const r=layer.getBoundingClientRect();drag.x=Math.max(8,Math.min(92,(e.clientX-r.left)/r.width*100));drag.y=Math.max(12,Math.min(88,(e.clientY-r.top)/r.height*100));}
  function end(e:PointerEvent){if(!drag||e.pointerId!==drag.pointer)return;onmove?.(drag.item,drag.x,drag.y);drag=null;}
</script>
<div class="furniture-layer" class:editing bind:this={layer}>
  {#each placements.filter(p=>p.room===room) as p(p.item)}{@const f=FURNITURE.find(f=>f.id===p.item)!}
    {#if editing}<button class="furniture" aria-label={`${translate($language,'Geser','Move')} ${itemName($language,f.name)}`} style={`left:${drag?.item===p.item?drag.x:p.x}%;top:${drag?.item===p.item?drag.y:p.y}%`} onpointerdown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag={item:p.item,x:p.x,y:p.y,pointer:e.pointerId};}} onpointermove={move} onpointerup={end} onpointercancel={()=>drag=null}><img src={imageUrl(f.icon)} alt=""/></button>
    {:else}<img class="furniture" src={imageUrl(f.icon)} alt={f.name} style={`left:${p.x}%;top:${p.y}%`}/>{/if}
  {/each}
</div>
<style>
  .furniture-layer{position:absolute;inset:30% 12% 23%;pointer-events:none;z-index:1}.furniture{position:absolute;width:clamp(48px,11cqw,100px);height:clamp(48px,11cqw,100px);object-fit:contain;transform:translate(-50%,-50%);filter:drop-shadow(0 4px 1px #30302020)}.editing{inset:0;pointer-events:auto;z-index:3}.editing .furniture{width:76px;height:76px;background:#fff4;border:1.5px dashed #667347;border-radius:12px;padding:4px;touch-action:none;cursor:grab}.editing .furniture:active{cursor:grabbing;background:#fff8}.furniture img{display:block;width:100%;height:100%;object-fit:contain}
</style>
