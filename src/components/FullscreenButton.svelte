<script lang="ts">
  import {language,translate,localMessage} from '../lib/language';
  import { onMount } from 'svelte';
  import { isFullscreen, toggleFullscreen } from '../lib/fullscreen';
  import { imageUrl } from '../lib/assets';
  let { compact = false, onhint }: { compact?: boolean; onhint?: (message: string) => void } = $props();
  let expanded = $state(false), busy = $state(false), hint = $state('');
  onMount(() => {
    const update = () => expanded = isFullscreen(document);
    update();
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => { document.removeEventListener('fullscreenchange', update); document.removeEventListener('webkitfullscreenchange', update); };
  });
  async function toggle() {
    if (busy) return;
    busy = true; hint = '';
    try {
      const result = await toggleFullscreen(document);
      if (result === 'unsupported') hint = 'Di iPad/iPhone: Safari → Bagikan → Tambahkan ke Layar Utama. Browser ini belum menyediakan tombol fullscreen.';
      expanded = isFullscreen(document);
    } catch { hint = 'Browser menolak layar penuh. Coba buka game langsung di Safari atau Chrome.'; }
    finally { busy = false; }
    if (hint) onhint?.(hint);
  }
</script>

<button class="image-button fullscreen-toggle" class:compact aria-label={expanded ? translate($language,'Keluar layar penuh','Exit fullscreen') : translate($language,'Layar penuh','Enter fullscreen')} aria-pressed={expanded} disabled={busy} onclick={toggle}>
  <img src={imageUrl(expanded?'icons/exit-fullscreen.svg':'icons/fullscreen.svg')} alt=""/>
  {#if !compact}<span class="outlined">{expanded ? translate($language,'Keluar','Exit') : translate($language,'Layar penuh','Fullscreen')}</span>{/if}
</button>
{#if hint && !onhint}<p class="fullscreen-hint" role="status">{localMessage($language,hint)}</p>{/if}

<style>
  .fullscreen-toggle img { width:100%; height:70%; pointer-events:none; }
  .fullscreen-toggle.compact { width:44px; height:44px; }
  .fullscreen-toggle.compact img { width:32px; height:32px; }
  .fullscreen-hint { position:absolute; bottom:18%; left:8%; right:8%; padding:12px; background:#fff4d3; border:2px solid #333; border-radius:10px; font:14px/1.4 system-ui,sans-serif; z-index:50; }
</style>
