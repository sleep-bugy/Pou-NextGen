<script lang="ts">
  import {language,translate,gameInstruction,localMessage} from '../lib/language';
  import { onMount } from 'svelte';
  import type { Save } from '../lib/model';
  import type { GameInfo } from '../lib/assets';
  import { imageUrl, gameHud } from '../lib/assets';
  import { MiniEngine } from '../lib/mini-engine';
  import { lookFromSave } from '../lib/draw-pou';
  import { audio } from '../lib/audio';
  import FullscreenButton from './FullscreenButton.svelte';
  let { game, save, onclose, onfinish }: { game: GameInfo; save: Save; onclose: () => void; onfinish: (id: string, score: number) => number } = $props();
  let canvas: HTMLCanvasElement;
  let started = $state(false), paused = $state(false), result = $state(false);
  let score = $state(0), lives = $state(3), time = $state(60), reward = $state(0), message = $state('');
  let engine: MiniEngine | undefined;
  const hud = $derived(gameHud(game.mode));
  function play() {
    engine?.destroy(); started = true; result = false; paused = false;
    engine = new MiniEngine(canvas, game.id, lookFromSave(save), (s, l, t) => { score = s; lives = l; time = t; }, (s, m) => {
      score = s; message = m; reward = onfinish(game.id, s); result = true; audio.stop();
    }, text => localMessage($language,text));
    audio.setMusic(game.music);
  }
  function pause(value: boolean) { paused = value; if (engine) engine.paused = value; value ? audio.pause() : audio.resume(); }
  onMount(() => {
    if(started&&!result)play();
    const visibility = () => { if (document.hidden && started && !result) pause(true); };
    document.addEventListener('visibilitychange', visibility);
    return () => { engine?.destroy(); audio.stop(); document.removeEventListener('visibilitychange', visibility); };
  });
</script>

<section class="minigame" aria-label={game.name}>
  <header class="game-top">
    <button class="image-button" aria-label={translate($language,'Tutup permainan','Close game')} onclick={onclose}><img src={imageUrl('dialog/back.png')} alt="" /></button>
    <span class="outlined">{game.name}</span>
    <FullscreenButton compact />
    <button class="image-button" aria-label={paused ? translate($language,'Lanjutkan permainan','Resume game') : translate($language,'Jeda permainan','Pause game')} onclick={() => pause(!paused)} disabled={!started || result}><img src={imageUrl(paused?'icons/play.svg':'icons/pause.png')} alt="" /></button>
  </header>
  <div class="game-score" style:grid-template-columns={`repeat(${2+Number(hud.lives)+Number(hud.timed)},minmax(0,1fr))`}><span>{translate($language,"Skor:","Score:")} {score}</span><span>{translate($language,"Terbaik:","Best:")} {save.scores[game.id] ?? 0}</span>{#if hud.lives}<span>♥ {lives}</span>{/if}{#if hud.timed}<span>{time}s</span>{/if}</div>
  <canvas class="game-canvas" bind:this={canvas} aria-label={gameInstruction($language,game.id,game.instructions)}></canvas>
  {#if !started}
    <div class="game-overlay">
      <div class="game-card">
        <img class="game-icon" src={imageUrl(`icons/games/${game.name}.png`)} alt="" />
        <h2>{game.name}</h2><p>{gameInstruction($language,game.id,game.instructions)}</p>
        <p class="control-help">{['catch','jump','fall'].includes(game.mode)?translate($language,'Geser layar / gerakkan mouse. Keyboard: ← → atau A D.','Drag or move the mouse. Keyboard: ← → or A D.'): ['fly','run'].includes(game.mode)?translate($language,'Ketuk, klik, atau tekan Spasi untuk melompat.','Tap, click, or press Space to jump.'):game.mode==='hoops'?translate($language,'Tarik dari bola ke bawah-kiri. Ikuti lintasan dan indikator Power.','Drag the ball down and left. Follow the aim dots and power meter.'):game.mode==='goal'?translate($language,'Mulai dari bola, lalu geser ke atas menuju gawang.','Swipe upward from the ball toward the goal.'):translate($language,'Ketuk atau klik pilihan di papan.','Tap or click a choice on the board.')}</p>
        <p>{translate($language,"Terbaik:","Best:")} {save.scores[game.id] ?? 0}</p>
        <button class="green-button" onclick={play}>{translate($language,"Main!","Play!")}</button>
      </div>
    </div>
  {:else if result}
    <div class="game-overlay"><div class="game-card">
      <h2>{localMessage($language,message)}</h2><p class="large-score">{translate($language,"Skor:","Score:")} {score}</p>
      <p><img class="inline-coin" src={imageUrl('coin/coin_sm.png')} alt="Coins" /> +{reward}</p>
      <p>{translate($language,"Terbaik:","Best:")} {save.scores[game.id] ?? 0}</p>
      <button class="green-button" onclick={play}>{translate($language,"Main lagi","Play again")}</button>
      <button class="cream-button" onclick={onclose}>{translate($language,"Permainan","Games")}</button>
    </div></div>
  {:else if paused}
    <div class="game-overlay"><div class="game-card"><h2>{translate($language,"Dijeda","Paused")}</h2><button class="green-button" onclick={() => pause(false)}>{translate($language,"Lanjutkan","Continue")}</button><button class="cream-button" onclick={onclose}>{translate($language,"Keluar","Exit")}</button></div></div>
  {/if}
</section>
