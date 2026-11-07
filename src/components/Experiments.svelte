<script lang="ts">
  import {language,translate,itemName,localMessage} from '../lib/language';
  import type { Save } from '../lib/model';
  import { consumePotion,endPouLife,revivePou } from '../lib/experiments';
  import { imageUrl,potionImage,potionDescription,POTIONS } from '../lib/assets';
  import MixingLab from './MixingLab.svelte';
  let {save,onchange,onshop,onuse}:{save:Save;onchange:(fn:(s:Save)=>void)=>void;onshop:()=>void;onuse:(outcome?:'explosion')=>void}=$props();
  let confirm=$state<string|null>(null),message=$state('');
  const items=POTIONS;
  function apply(id:string){
    let error='';
    onchange(s=>{if(id==='death')endPouLife(s);else if(id==='revive')revivePou(s);else error=consumePotion(s,id);});
    message=error;confirm=null;if(!error)onuse();
  }
  function choose(id:string){
    message='';
    if(!(save.potions[id]>0)){message='Ramuan habis. Beli di toko ramuan.';return;}
    if(['poison','spin','drowsy'].includes(id))confirm=id;else apply(id);
  }
</script>

<p class="experiment-status">{save.life.state==='dead'?translate($language,'Pou meninggal. Kamu bisa menghidupkannya kembali.','Pou has died. You can revive them.'):save.life.state==='poisoned'?translate($language,`Terkena Racun Alien · ${Math.ceil(save.life.poisonSeconds)} detik tersisa`,`Alien Poison · ${Math.ceil(save.life.poisonSeconds)} seconds left`):save.effects.spinUntil>Date.now()?translate($language,'Racun Pusaran sedang aktif. Penawar bisa menghentikannya.','Spin Poison is active. An antidote can stop it.'):translate($language,'Pilih ramuan untuk melihat efeknya pada Pou.','Choose a potion to see its effect on Pou.')}</p>
{#if save.boosts.unlimitedEnergy}<p class="energy-active">{translate($language,"∞ Energi unlimited aktif permanen","∞ Unlimited energy permanently active")}</p>{/if}
{#if save.life.state==='dead'}
  <button class="green-button" onclick={()=>apply('revive')}>{translate($language,"Hidupkan kembali · Gratis","Revive · Free")}</button>
  <p class="settings-caption">{translate($language,"Level, koin, pakaian, dan pasangan tetap tersimpan.","Level, coins, clothes and partner are kept.")}</p>
{:else}
  <div class="experiment-cards">
    {#each items as p}<button class="shop-item" onclick={()=>choose(p.id)} disabled={p.id==='infinite'&&save.boosts.unlimitedEnergy}>
      <img src={imageUrl(potionImage(p.id))} alt=""/><span>{itemName($language,p.name)}</span><small>×{save.potions[p.id]??0}</small>{#if potionDescription(p.id)}<small>{localMessage($language,potionDescription(p.id))}</small>{/if}
    </button>{/each}
  </div>
  <button class="cream-button" onclick={onshop}>{translate($language,"Beli ramuan","Buy potions")}</button>
  <MixingLab {save} {onchange} {onuse}/>
  <button class="danger-button" onclick={()=>confirm='death'}>{translate($language,"Akhiri hidup Pou","End Pou’s life")}</button>
{/if}
{#if message}<p class="inline-error" role="alert">{localMessage($language,message)}</p>{/if}
{#if confirm}<div class="experiment-confirm" role="alertdialog" tabindex="-1" aria-labelledby="experiment-confirm-title">
  <h3 id="experiment-confirm-title">{confirm==='death'?translate($language,'Akhiri hidup Pou?','End Pou’s life?'):translate($language,`Gunakan ${itemName($language,POTIONS.find(p=>p.id===confirm)?.name??'')}?`,`Use ${itemName($language,POTIONS.find(p=>p.id===confirm)?.name??'')}?`)}</h3>
  <p>{confirm==='death'?translate($language,'Pou akan mati dan berhenti beraktivitas sampai kamu menghidupkannya kembali. Progress tidak dihapus.','Pou will stop moving until revived. Progress is kept.'):localMessage($language,potionDescription(confirm))}</p>
  <button class="danger-button" onclick={()=>apply(confirm!)}>{translate($language,"Ya, lanjutkan","Yes, continue")}</button><button class="cream-button" onclick={()=>confirm=null}>{translate($language,"Batal","Cancel")}</button>
</div>{/if}

<style>
  .experiment-status{font-size:20px;line-height:1.4;margin-bottom:16px}.energy-active{color:#55701e;margin:0 0 12px;font-size:20px}.experiment-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.experiment-cards .shop-item{height:auto;min-height:185px}.experiment-cards small{white-space:normal;line-height:1.4}.experiment-cards img{height:80px;width:80px;object-fit:contain}.experiment-confirm{border:2px solid #8d573b;border-radius:12px;padding:16px;background:#fff5db;margin-top:18px}.experiment-confirm h3{font-size:23px;font-weight:400}.experiment-confirm p{font:15px/1.5 system-ui,sans-serif;margin-top:10px}.danger-button{display:block;width:100%;padding:11px 16px;border:2px solid #57392b;border-radius:10px;margin-top:14px;background:#eab29b;font-size:20px}button:disabled{opacity:.55}
</style>
