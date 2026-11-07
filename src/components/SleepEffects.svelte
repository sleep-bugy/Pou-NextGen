<script lang="ts">
  import {language,translate} from '../lib/language';
  let {reducedMotion=false,exhausted=false,energy=0}:{reducedMotion?:boolean;exhausted?:boolean;energy?:number}=$props();
</script>
<div class="sleep-effects" class:still={reducedMotion} aria-label={translate($language,'Pou sedang tidur','Pou is sleeping')}>
  {#each [0,1,2] as i}<span style={`--i:${i}`} aria-hidden="true">Z</span>{/each}
  <small aria-live="off">{#if exhausted}<strong>{translate($language,"Ngantuk berat · Istirahat dulu","Very sleepy · Time to rest")}</strong><br/>{Math.floor(energy)}{translate($language,"% energi · Bisa bangun di 20%","% energy · Can wake at 20%")}{:else}{translate($language,"Memulihkan energi · ~70%/jam","Restoring energy · ~70%/hour")}{/if}</small>
</div>
<style>
  .sleep-effects{position:absolute;inset:0;pointer-events:none;z-index:5}
  span{position:absolute;left:calc(50% + var(--pou-size)*.4);top:39%;font-size:clamp(25px,5.5cqh,42px);color:#fff8dd;-webkit-text-stroke:1.5px #303b52;paint-order:stroke fill;opacity:0;animation:float-z 2.8s ease-out infinite;animation-delay:calc(var(--i)*-.93s);will-change:transform,opacity}
  small{position:absolute;top:74.5%;left:50%;transform:translateX(-50%);font-size:clamp(12px,2cqh,17px);line-height:1.4;color:#fff4d6;white-space:nowrap;text-align:center;text-shadow:0 1px 2px #25324a}strong{font-weight:400}
  @keyframes float-z{0%{opacity:0;transform:translate(0,20px) scale(.55) rotate(-8deg)}15%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translate(54px,-80px) scale(1.25) rotate(8deg)}}
  .still span{animation:none;opacity:1;transform:translate(calc(var(--i)*22px),calc(var(--i)*-12px));font-size:24px;will-change:auto}
</style>
