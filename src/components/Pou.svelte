<script lang="ts">
  import {language,translate} from '../lib/language';
  import { onMount } from 'svelte';
  import { drawPou, lookFromSave } from '../lib/draw-pou';
  import type { Save } from '../lib/model';
  import { containsPou, pouCanvasGeometry, type Point } from '../lib/pou-geometry';
  let { save, eating = 0, gaze = { x: 0, y: 0 }, onpet }: { save: Save; eating?: number; gaze?: Point; onpet: () => boolean } = $props();
  let canvas: HTMLCanvasElement;
  let bounce = 0;

  onMount(() => {
    let frame = 0;
    let width = 0, height = 0;
    const c = canvas.getContext('2d')!;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width; height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    });
    resize.observe(canvas);
    const render = (time: number) => {
      if (!document.hidden && width) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height);
        const reduced = save.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
        const look=lookFromSave(save);
        const breath = reduced ? 1 : 1 + Math.sin(time / (look.tired?1900:1100)) * (look.tired ? .012 : .008);
        const geometry = pouCanvasGeometry(width, height, save.bodySize * (look.tiny ? .65 : 1));
        const size = Math.min(width * 0.78, height * 0.75) * save.bodySize;
        const y = geometry.y - Math.sin(Math.max(0, bounce - time) / 90) * Math.max(0, bounce - time) / 30;
        c.fillStyle = 'rgba(0,0,0,.1)'; c.beginPath(); c.ellipse(width / 2, geometry.y + geometry.size * 0.47, geometry.size * 0.4, geometry.size * 0.045, 0, 0, Math.PI * 2); c.fill();
        const yawn=look.tired?(reduced ? .35 : Math.max(0,Math.sin((time%4600)/1500*Math.PI))*.7):0;
        drawPou(c, width / 2, y, size * breath, { ...look, lookX: gaze.x, lookY: gaze.y, mouth: Math.max(yawn,eating > Date.now() ? 0.8 : 0), blink: !reduced && time % 4900 < 130 });
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  });
  function touch(event: MouseEvent) {
    const r = canvas.getBoundingClientRect();
    const onBody = containsPou({ x: event.clientX - r.left, y: event.clientY - r.top }, pouCanvasGeometry(r.width, r.height, save.bodySize * (lookFromSave(save).tiny ? .65 : 1)));
    if ((event.detail === 0 || onBody) && onpet()) bounce = performance.now() + 350;
  }
</script>

<button class="pet-target" aria-label={translate($language,'Elus Pou','Pet Pou')} onclick={touch}>
  <canvas bind:this={canvas} aria-hidden="true"></canvas>
</button>

<style>
  .pet-target { width:100%; height:100%; border:0; background:none; padding:0; touch-action:none; }
  canvas { display:block; width:100%; height:100%; }
</style>
