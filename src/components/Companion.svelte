<script lang="ts">
  import {language,translate,localMessage} from '../lib/language';
  import { untrack } from 'svelte';
  import type { Save } from '../lib/model';
  import { meetPartner,partnerAction } from '../lib/experiments';
  import Pou from './Pou.svelte';
  let {save,onchange}:{save:Save;onchange:(fn:(s:Save)=>void)=>void}=$props();
  let name=$state(untrack(()=>save.partner.name)),color=$state(untrack(()=>save.partner.body)),message=$state('');
  const partnerSave=$derived({...save,name:save.partner.name,appearance:{body:save.partner.body,eyes:'#111111',hat:'',glasses:'',outfit:''},life:{state:'alive' as const,poisonSeconds:0,deaths:0},sleeping:false,exhausted:false,stats:{...save.stats,energy:100,health:100,clean:100,fun:100}});
  function invite(){onchange(s=>message=meetPartner(s,name,color));}
  function action(type:'talk'|'flower'|'walk'){onchange(s=>message=partnerAction(s,type));if(!message)message=({talk:translate($language,`${save.partner.name} senang diajak ngobrol!`,`${save.partner.name} enjoyed talking!`),flower:translate($language,'Bunganya diterima! ♥','Flowers received! ♥'),walk:translate($language,'Pou dan pasangannya jalan bersama.','Pou and their partner went for a walk.')})[type];}
</script>

{#if !save.partner.unlocked}
  <p class="settings-caption">{translate($language,"Undang pasangan Pou, tingkatkan kedekatan, beri bunga, dan jalan bersama.","Invite a partner, grow your bond, give flowers and go for walks.")}</p>
  <label class="field">{translate($language,"Nama pasangan","Partner name")}<input maxlength="24" bind:value={name}/></label>
  <label class="color-label">{translate($language,"Warna","Color")}<input type="color" bind:value={color}/></label>
  <button class="green-button" onclick={invite}>{translate($language,"Undang pasangan · 50 koin","Invite partner · 50 coins")}</button>
{:else}
  <div class="couple"><div><Pou {save} onpet={()=>false}/></div><span class="heart">♥</span><div><Pou save={partnerSave} onpet={()=>false}/></div></div>
  <h3 class="partner-name">{save.name} ♥ {save.partner.name}</h3>
  <p class="relationship">{save.partner.bond>=60?translate($language,'Pasangan akrab','Close partners'):save.partner.bond>=25?translate($language,'Mulai dekat','Growing closer'):translate($language,'Baru kenalan','Just met')} · {Math.floor(save.partner.bond)}%</p>
  <progress max="100" value={save.partner.bond} aria-label={translate($language,'Kedekatan pasangan','Partner bond')}></progress>
  <button class="green-button" onclick={()=>action('talk')}>{translate($language,"Ngobrol","Talk")}</button><button class="cream-button" onclick={()=>action('flower')}>{translate($language,"Beri bunga · 10 koin","Give flowers · 10 coins")}</button><button class="cream-button" onclick={()=>action('walk')}>{translate($language,"Jalan bersama · 3 energi","Walk together · 3 energy")}</button>
{/if}
{#if message}<p class="settings-caption" role="status">{localMessage($language,message)}</p>{/if}

<style>
  .couple{height:220px;display:grid;grid-template-columns:1fr 28px 1fr;grid-template-rows:220px;align-items:center;overflow:hidden;margin:4px 0 10px}
  .couple>div{height:100%;min-height:0;min-width:0;position:relative}
  .heart{font-size:32px;color:#d84c68;text-align:center;line-height:1;user-select:none}
  .partner-name{text-align:center;font-size:26px;font-weight:400;margin:6px 0}
  .relationship{text-align:center;font-size:18px;margin:10px 0}
  progress{display:block;width:100%;height:16px;accent-color:#df7396}
  .color-label{display:flex;align-items:center;justify-content:space-between;font-size:20px;margin-top:10px}
  .color-label input{width:70px;height:40px}
  .field{margin-top:20px}
</style>
