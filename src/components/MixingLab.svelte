<script lang="ts">
  import {language,translate,itemName,localMessage} from '../lib/language';
  import type {Save} from '../lib/model';
  import {MIXES} from '../lib/world-state';
  import {mixPotions} from '../lib/world';
  import {POTIONS,imageUrl,potionImage} from '../lib/assets';
  let {save,onchange,onuse}:{save:Save;onchange:(fn:(s:Save)=>void)=>void;onuse:()=>void}=$props();
  let a=$state('2'),b=$state('8'),message=$state('');
  function mix(){onchange(s=>message=mixPotions(s,a,b));if(!message)onuse();}
</script>
<section class="mixing"><h3>{translate($language,"Meja campur ramuan","Potion mixing table")}</h3><p>{translate($language,"Dua bahan, satu penemuan. Efek berlangsung 15 detik.","Two ingredients, one discovery. Effects last 15 seconds.")}</p><div class="ingredients">{#each [0,1] as slot}<div><img src={imageUrl(potionImage(slot?b:a))} alt=""/><select aria-label={`${translate($language,'Bahan ramuan','Potion ingredient')} ${slot+1}`} value={slot?b:a} onchange={e=>slot?b=e.currentTarget.value:a=e.currentTarget.value}>{#each POTIONS as p}<option value={p.id}>{itemName($language,p.name)} · ×{save.potions[p.id]??0}</option>{/each}</select></div>{/each}</div><button class="green-button" onclick={mix}>{translate($language,"Campur dan coba","Mix and try")}</button>{#if message}<p class="inline-error" role="alert">{localMessage($language,message)}</p>{/if}<ul>{#each MIXES as recipe}<li><strong>{save.world.lab.discovered.includes(recipe.id)?itemName($language,recipe.name):translate($language,'Resep misterius','Mystery recipe')}</strong><span>{itemName($language,recipe.hint)}</span></li>{/each}</ul></section>
<style>.mixing{margin-top:20px;border-top:2px dashed #c0b58b;padding-top:16px}.mixing h3{font-size:25px;font-weight:400}.mixing p{font:14px/1.5 system-ui,sans-serif;margin:8px 0}.ingredients{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}.ingredients img{display:block;width:75px;height:75px;margin:auto}.ingredients select{width:100%;min-width:0;font:13px/1.4 system-ui,sans-serif;padding:9px 4px;margin-top:8px}.mixing ul{list-style:none;padding:0}.mixing li{padding:10px 0;border-bottom:1px solid #c4b68d}.mixing strong{font-size:19px;font-weight:400}.mixing span{display:block;font:12px/1.4 system-ui,sans-serif;color:#686250}</style>
