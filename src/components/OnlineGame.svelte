<script lang="ts">
  import {language,translate,localMessage} from '../lib/language';
  import { onMount,untrack } from 'svelte';
  import { type OnlineState } from '../lib/online';
  import {multiplayer,type SocialState,type WorldState,type Ranking,type HomeVisit} from '../lib/multiplayer';
  import {drawAdventure} from '../lib/adventure-view';
  import SocialPanel from './SocialPanel.svelte';
  import { drawPou } from '../lib/draw-pou';
  import { getImage,imageUrl } from '../lib/assets';
  import FullscreenButton from './FullscreenButton.svelte';
  let {name,onclose,onfinish,initialTab='rooms'}:{name:string;onclose:()=>void;onfinish:(id:string,score:number)=>void;initialTab?:string}=$props();
  let matchState=$state<OnlineState|null>(null),connection=$state('connecting'),id=$state(''),code=$state(''),playerName=$state(untrack(()=>name)),error=$state('');
  let canvas:HTMLCanvasElement,completed='';
  const client=multiplayer;
  let social=$state<SocialState|null>(null),notice=$state('');
  let world=$state<WorldState|null>(null),ranking=$state<Ranking|null>(null),home=$state<HomeVisit|null>(null),mode=$state('food');
  const held=new Set<string>();
  const foods=['apple','burger','watermelon','strawberry','banana','pizza','egg','carrot'];
  let target=.5,lastInput=0;
  function send(packet:Record<string,unknown>){error='';if(typeof packet.name==='string')client.setName(packet.name);client.send(packet);}
  function input(event:PointerEvent){
    if(matchState?.phase!=='playing')return;
    if(matchState.mode==='adventure'){if(event.type==='pointerdown')client.send({type:'input',jump:true});return;}
    const rect=canvas.getBoundingClientRect();target=Math.max(.025,Math.min(.975,(event.clientX-rect.left)/rect.width));
    if(performance.now()-lastInput>35){client.send({type:'input',x:target});lastInput=performance.now();}
  }
  async function copy(){try{await navigator.clipboard.writeText(matchState!.code);error='Kode ruangan disalin.';}catch{error='Pilih lalu salin kode ruangan di bawah.';}}
  onMount(()=>{
    const unsubscribe=client.subscribe(()=>{
      connection=client.status;id=client.playerId;error=client.error;notice=client.notice;social=client.social;matchState=client.room;world=client.world;ranking=client.ranking;home=client.home;
      if(matchState?.phase==='finished'&&matchState.matchId!==completed){completed=matchState.matchId;const self=matchState.players.find(p=>p.id===id);if(self&&matchState.mode!=='adventure')onfinish(matchState.matchId,self.score);}
    });client.connect(name);
    const c=canvas.getContext('2d')!;let width=0,height=0,frame=0;const positions=new Map<string,number>();
    const observer=new ResizeObserver(([entry])=>{width=entry.contentRect.width;height=entry.contentRect.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);});observer.observe(canvas);
    for(const food of foods)getImage(`food/${food}.png`);
    function text(value:string,x:number,y:number,size=20){c.font=`${size}px Pou`;c.textAlign='center';c.strokeStyle='#303027';c.lineWidth=3;c.strokeText(value,x,y);c.fillStyle='#fff';c.fillText(value,x,y);}
    const draw=()=>{
      if(!document.hidden&&width&&height){
        const dpr=Math.min(devicePixelRatio||1,2);c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#dce49b';c.fillRect(0,0,width,height);c.fillStyle='#abcf77';c.fillRect(0,height*.9,width,height*.1);
        if(matchState?.mode==='adventure')drawAdventure(c,width,height,matchState,id);else{
        for(const item of matchState?.items??[]){const image=getImage(item.kind<8?`food/${foods[item.kind]}.png`:item.kind===8?'games/food/shoe.png':'games/food/horseshoe.png');const size=Math.max(24,Math.min(46,height*.075));if(image)c.drawImage(image,item.x*width-size/2,item.y*height-size/2,size,size);}
        for(const player of matchState?.players??[]){const previous=positions.get(player.id)??player.x,x=previous+(player.x-previous)*.4;positions.set(player.id,x);drawPou(c,x*width,height*.84,Math.max(40,Math.min(80,height*.15)),{body:player.color,mouth:.7,lookY:-1});text(player.name+(player.id===id?translate($language,' (kamu)',' (you)'):''),x*width,height*.95,Math.max(13,Math.min(20,width*.035)));}
        }
        if(matchState?.phase==='countdown')text(String(Math.max(1,Math.ceil(matchState.countdown))),width/2,height*.4,65);
      }
      frame=requestAnimationFrame(draw);
    };frame=requestAnimationFrame(draw);
    const key=(event:KeyboardEvent)=>{
      if(/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((event.target as HTMLElement)?.tagName))return;
      if(matchState?.phase==='playing'&&matchState.mode==='adventure'){
        if(!['ArrowLeft','ArrowRight','ArrowUp','a','d','w',' ','e'].includes(event.key))return;event.preventDefault();held.add(event.key);
        client.send({type:'input',dx:Number(held.has('ArrowRight')||held.has('d'))-Number(held.has('ArrowLeft')||held.has('a')),jump:!event.repeat&&['ArrowUp','w',' '].includes(event.key),help:!event.repeat&&event.key==='e'});return;
      }
      if(matchState?.phase!=='playing'||!['ArrowLeft','ArrowRight','a','d'].includes(event.key))return;event.preventDefault();const current=matchState.players.find(p=>p.id===id)?.x??target;target=Math.max(.025,Math.min(.975,current+(['ArrowLeft','a'].includes(event.key)?-.06:.06)));client.send({type:'input',x:target});
    };window.addEventListener('keydown',key);
    const up=(event:KeyboardEvent)=>{if(!held.has(event.key))return;held.delete(event.key);if(matchState?.mode==='adventure')client.send({type:'input',dx:Number(held.has('ArrowRight')||held.has('d'))-Number(held.has('ArrowLeft')||held.has('a'))});};
    const blur=()=>{held.clear();if(matchState?.mode==='adventure')client.send({type:'input',dx:0});};window.addEventListener('keyup',up);window.addEventListener('blur',blur);
    return()=>{unsubscribe();client.leave();observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('keydown',key);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
  });
</script>

<section class="online-screen" aria-label={translate($language,'Area multiplayer','Multiplayer area')}>
  <header class="game-top"><button class="image-button" aria-label={translate($language,'Tutup multiplayer','Close multiplayer')} onclick={onclose}><img src={imageUrl('dialog/back.png')} alt=""/></button><span class="outlined">{matchState?.phase==='playing'||matchState?.phase==='countdown'?matchState.mode==='adventure'?translate($language,'Petualangan Co-op','Co-op Adventure'):'Food Drop Online':translate($language,'Area Mabar','Multiplayer')}</span><FullscreenButton compact/></header>
  {#if matchState}<div class="online-scores">{#each matchState.players as player}<span style={`--player-color:${player.color}`}>{player.name}: {player.score}</span>{/each}<strong>{Math.ceil(matchState.remaining)}s</strong></div>{/if}
  <canvas bind:this={canvas} class="online-canvas" onpointerdown={input} onpointermove={input} aria-label={translate($language,'Geser Pou untuk menangkap makanan bersama pemain lain','Move Pou to catch food with other players')}></canvas>
  {#if !matchState||matchState.phase==='lobby'||matchState.phase==='finished'}
    <div class="online-overlay"><div class="online-card">
      <SocialPanel {social} {world} {ranking} {home} {initialTab} connected={connection==='connected'} roomCode={matchState?.code??''} onsend={send}>
      <h2>{matchState?.phase==='finished'?matchState.mode==='adventure'?matchState.success?translate($language,'Petualangan selesai!','Adventure complete!'):translate($language,'Waktu petualangan habis','Adventure time is up'):translate($language,'Hasil pertandingan','Match results'):matchState?.mode==='adventure'?translate($language,'Petualangan Co-op','Co-op Adventure'):translate($language,'Mabar bersama','Play together')}</h2>
      {#if !matchState}
        <p>{translate($language,"Buat ruangan dan bagikan kodenya. Dua hingga empat pemain bisa bermain bersama.","Create a room and share its code. Two to four players can play together.")}</p><label class="field">{translate($language,"Mode","Mode")}<select aria-label={translate($language,'Mode multiplayer','Multiplayer mode')} bind:value={mode}><option value="food">{translate($language,"Food Drop · 60 detik","Food Drop · 60 seconds")}</option><option value="adventure">{translate($language,"Petualangan co-op · 3 menit","Co-op adventure · 3 minutes")}</option></select></label>
        <label class="field">{translate($language,"Nama","Name")}<input maxlength="24" bind:value={playerName}/></label>
        <button class="green-button" disabled={connection!=='connected'} onclick={()=>send({type:'create',name:playerName,mode})}>{translate($language,"Buat ruangan","Create room")}</button>
        <label class="field room-code-label">{translate($language,"Kode ruangan","Room code")}<input maxlength="6" placeholder="ABC123" bind:value={code}/></label>
        <button class="cream-button" disabled={connection!=='connected'} onclick={()=>send({type:'join',name:playerName,code})}>{translate($language,"Gabung","Join")}</button>
      {:else}
        {#if matchState.mode==='adventure'}<p>{translate($language,"Kumpulkan minimal 5 permata dan tiba di pintu keluar bersama. A D / ← → untuk bergerak, Spasi untuk melompat, E untuk menolong teman. Checkpoint membantu saat jatuh.","Collect at least 5 gems and reach the exit together. Move with A D / ← →, jump with Space and help a friend with E. Checkpoints help after falls.")}</p>{#if matchState.phase==='finished'&&matchState.success}<p>{translate($language,"Hadiah makanan, 50 koin, dan topi penjelajah pada kemenangan pertamamu dikirim ke inventaris.","Food, 50 coins and a first-win explorer hat are sent to your inventory.")}</p>{/if}{/if}
        <p>{translate($language,"Kode ruangan","Room code")}</p><input class="share-code" value={matchState.code} readonly aria-label={translate($language,'Kode ruangan','Room code')}/>
        <button class="cream-button" onclick={copy}>{translate($language,"Salin kode","Copy code")}</button>
        <ul class="players">{#each [...matchState.players].sort((a,b)=>b.score-a.score) as player}<li>{player.id===matchState.host?'★ ':''}{player.name} <strong>{matchState.phase==='finished'?`${player.score} ${translate($language,'poin','points')}`:translate($language,'Siap','Ready')}</strong></li>{/each}</ul>
        {#if matchState.host===id}<button class="green-button" disabled={matchState.players.length<2} onclick={()=>send({type:'start'})}>{matchState.phase==='finished'?translate($language,'Main lagi','Play again'):translate($language,'Mulai pertandingan','Start match')}</button>{:else}<p>{translate($language,"Tunggu pembuat ruangan memulai.","Wait for the host to start.")}</p>{/if}
        {#if matchState.players.length<2}<p>{translate($language,"Menunggu pemain lain masuk dengan kode di atas.","Waiting for another player to join with the code above.")}</p>{/if}
        <button class="cream-button" onclick={()=>client.leave()}>{translate($language,"Keluar ruangan","Leave room")}</button>
      {/if}
      </SocialPanel>
      {#if connection!=='connected'}<p class="connection-status">{connection==='connecting'?translate($language,'Menghubungkan…','Connecting…'):translate($language,'Server multiplayer belum tersambung.','Multiplayer server is not connected.')}</p><button class="cream-button" onclick={()=>{client.close();client.connect(name);}}>{translate($language,"Coba hubungkan","Reconnect")}</button>{/if}
      {#if notice}<p role="status">{localMessage($language,notice)}</p>{/if}
      {#if error}<p class="inline-error" role="status">{localMessage($language,error)}</p>{/if}
    </div></div>
  {/if}
  {#if (matchState?.phase==='playing'||matchState?.phase==='countdown')&&connection!=='connected'}<p class="connection-banner" role="alert">{translate($language,"Koneksi terputus. Keluar dan masuk kembali setelah ronde selesai.","Disconnected. Leave and rejoin after the round ends.")}</p>{/if}
  {#if matchState?.mode==='adventure'&&matchState.phase==='playing'}<div class="adventure-controls"><button aria-label={translate($language,'Bergerak ke kiri','Move left')} onpointerdown={e=>{e.currentTarget.setPointerCapture(e.pointerId);client.send({type:'input',dx:-1});}} onpointerup={()=>client.send({type:'input',dx:0})} onpointercancel={()=>client.send({type:'input',dx:0})}>←</button><button aria-label={translate($language,'Bergerak ke kanan','Move right')} onpointerdown={e=>{e.currentTarget.setPointerCapture(e.pointerId);client.send({type:'input',dx:1});}} onpointerup={()=>client.send({type:'input',dx:0})} onpointercancel={()=>client.send({type:'input',dx:0})}>→</button><span>{translate($language,"Permata","Gems")} {matchState.teamScore??0}/5</span><button onclick={()=>client.send({type:'input',help:true})}>{translate($language,"Tolong","Help")}</button><button onclick={()=>client.send({type:'input',jump:true})}>{translate($language,"Lompat","Jump")}</button></div>{/if}
</section>

<style>
  .adventure-controls{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:12px;right:12px;display:flex;gap:8px;align-items:center;z-index:4}.adventure-controls button{min-width:48px;min-height:50px;border:2px solid #576643;border-radius:12px;background:#fff3d8dd;font-size:17px;padding:8px;touch-action:none}.adventure-controls span{flex:1;text-align:center;font-size:18px;color:#394d3b}.field select{display:block;width:100%;margin-top:8px;padding:10px;background:#fff5d6;border:2px solid #9caa80;border-radius:8px;font-size:16px}

  .online-screen{position:absolute;inset:0;background:#dce49b;z-index:40;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}.online-canvas{flex:1;min-height:0;width:100%;touch-action:none}.online-scores{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 24px;min-height:40px;padding:8px;background:#f3e7b7;font-size:18px}.online-scores span{border-bottom:3px solid var(--player-color)}.online-scores strong{font-weight:400}.online-overlay{position:absolute;inset:10% 0 0;background:#0005;display:flex;align-items:center;justify-content:center;padding:16px}.online-card{width:min(100%,440px);max-height:100%;overflow:auto;padding:22px;border:3px solid #333;border-radius:16px;background:#f4ecc6;text-align:center}.online-card h2{font-size:30px;font-weight:400;margin-bottom:14px}.online-card p{font:15px/1.5 system-ui,sans-serif;margin:10px 0}.field{text-align:left;margin-top:14px}.share-code{display:block;margin:10px auto;width:200px;border:2px dashed #5a6840;background:#fff8dc;border-radius:8px;padding:10px;text-align:center;font:30px/1.2 monospace}.players{list-style:none;padding:0;margin:16px 0}.players li{display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid #b7ac7c;font-size:19px}.players strong{font-weight:400}.connection-banner{position:absolute;top:20%;left:10%;right:10%;padding:14px;background:#fff4d3;border:2px solid #665a30;border-radius:10px;text-align:center}
</style>
