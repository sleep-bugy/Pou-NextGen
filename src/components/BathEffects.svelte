<script lang="ts">
  import { onMount } from 'svelte';
  import { BathWater, drawBathWater, showerHitsPou, type FoamBubble } from '../lib/bath';
  import type { Point } from '../lib/pou-geometry';
  import { getImage } from '../lib/assets';

  let { water, bubbles, reducedMotion, active, onrinse, bodySize = 1 }: {
    water: Point | null; bubbles: FoamBubble[]; reducedMotion: boolean; active: boolean; onrinse: (seconds: number) => void; bodySize?: number;
  } = $props();
  let canvas: HTMLCanvasElement;
  let droplets = $state(0);

  onMount(() => {
    const c = canvas.getContext('2d')!;
    const bath = new BathWater();
    let frame = 0, last = 0, width = 0, height = 0, washing = 0, counterTime = 0, painted = false;
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width; height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    });
    resize.observe(canvas);
    const render = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.04) : 0; last = time;
      if (!document.hidden && width && height) {
        const source = active ? water : null;
        const reduced = reducedMotion;
        bath.step(dt, source, width, height, reduced, bodySize);
        if (source && showerHitsPou(source, width, height, bodySize)) {
          washing += dt;
          if (washing >= 0.25) { onrinse(washing); washing = 0; }
        } else washing = 0;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const hasEffect = source || bath.particles.length > 0 || bath.wetness > 0.01 || bubbles.length > 0;
        if (!hasEffect && !painted) { frame = requestAnimationFrame(render); return; }
        c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, width, height);
        painted = !!hasEffect;
        const foam = getImage('soaps/bubble/white.png');
        if (foam) for (const bubble of bubbles) {
          const size = width * (0.035 + bubble.id % 4 * 0.007);
          const bob = reduced || !active ? 0 : Math.sin(time / 650 + bubble.id) * height * 0.0013;
          c.globalAlpha = 0.8;
          c.drawImage(foam, bubble.x / 100 * width - size / 2, bubble.y / 100 * height - size / 2 + bob, size, size);
        }
        c.globalAlpha = 1;
        drawBathWater(c, bath, source, width, height, reduced);
        if (source) {
          const shower = getImage('showers/100/white.png');
          if (shower) {
            const w = width * 0.11, h = w * shower.height / shower.width;
            // The modern nozzle sits at (48,52) on its 128px icon canvas.
            c.drawImage(shower, source.x / 100 * width - w * 0.375, source.y / 100 * height - h * 0.40625, w, h);
          }
        }
        if (time - counterTime > 150) { droplets = bath.particles.length; counterTime = time; }
      } else washing = 0;
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  });
</script>

<canvas class="bath-effects" bind:this={canvas} aria-hidden="true" data-testid="bath-effects" data-water-active={active && !!water} data-foam-count={bubbles.length} data-droplets={droplets}></canvas>

<style>
  .bath-effects { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:15; }
</style>
