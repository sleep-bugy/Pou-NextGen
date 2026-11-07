<script lang="ts">
  import {translate,itemName,foodName,localMessage} from './lib/language';
  import { onMount, tick } from 'svelte';
  import Pou from './components/Pou.svelte';
  import MiniGame from './components/MiniGame.svelte';
  import BathEffects from './components/BathEffects.svelte';
  import FullscreenButton from './components/FullscreenButton.svelte';
  import Experiments from './components/Experiments.svelte';
  import Companion from './components/Companion.svelte';
  import OnlineGame from './components/OnlineGame.svelte';
  import SleepEffects from './components/SleepEffects.svelte';
  import HomeDecor from './components/HomeDecor.svelte';
  import FurnitureLayer from './components/FurnitureLayer.svelte';
  import {care,favoriteFood,personality,claimReward} from './lib/world';
  import { consumePotion,revivePou } from './lib/experiments';
  import { pointOnPou, rinseFoam, type FoamBubble } from './lib/bath';
  import { gazeAt, roomPouGeometry, type Point } from './lib/pou-geometry';
  import { ROOMS, advance, clamp, earn, enforceRest,isExhausted,level, levelProgress, newSave, parseSave, spend, type Save, type Stat } from './lib/model';
  import { emergencySave, exportSave, importSave, loadSave, saveProgress } from './lib/storage';
  import { audio } from './lib/audio';
  import {language} from './lib/language';
  import {multiplayer,type Invitation} from './lib/multiplayer';
  import { foodNutrition, foodPrice, GAMES, imageUrl, POTIONS, potionImage, potionDescription, prettyName, type Catalog, type GameInfo } from './lib/assets';

  let save = $state<Save>(newSave());
  let ready = $state(false), fatal = $state(''), warning = $state('');
  let catalog = $state<Catalog>({ images: {}, sounds: {} });
  let roomIndex = $state(0);
  const room = $derived(ROOMS[roomIndex]);
  const idLang=$derived(save.settings.language==='id');
  const tr=(en:string,id:string)=>idLang?id:en;
  const roomLabel=(value:string)=>idLang?({Kitchen:'Dapur',Bathroom:'Kamar Mandi',Lab:'Lab','Game Room':'Ruang Bermain',Bedroom:'Kamar Tidur',Garden:'Kebun',Playground:'Taman Bermain'} as Record<string,string>)[value]??value:value;
  let modal = $state(''), shopCategory = $state('food');
  let query = $state(''), foodIndex = $state(0), potionIndex = $state(0);
  let eating = $state(0), toast = $state(''), saveStatus = $state('Saved');
  let game = $state<GameInfo | null>(null);
  let online=$state(false),onlineTab=$state('rooms');
  let drainingRewards=false,nextRewardAttempt=0;
  let invitations=$state<Invitation[]>([]);
  let audioUnlocked=$state(false),spinRemaining=$state(0);
  const spinUntil=$derived(save.effects.spinUntil);
  const exhausted=$derived(isExhausted(save));
  let drag = $state<{ kind: string; x: number; y: number; startX: number; startY: number; pointerId: number; moved: boolean } | null>(null);
  let cleanMode = $state(false), rinse = $state(false), bubbles = $state<FoamBubble[]>([]);
  let water = $state<Point | null>(null), foreground = $state(true);
  let gaze = $state<Point>({ x: 0, y: 0 });
  let washPointer: number | null = null;
  let washRewardEligible = false;
  let lastClean = -Infinity, bubbleId = 0;
  const bathActive = $derived(room === 'Bathroom' && foreground && !save.sleeping && !exhausted && save.life.state!=='dead' && !modal && !game && !online);
  let renamed = $state('');
  let importFile = $state<File | null>(null), importPreview = $state<Save | null>(null), importError = $state('');
  let recording = $state(false), microphoneError = $state('');
  let offlineStatus = $state(''), offlineBusy = $state(false);
  let playingField = $state<HTMLElement>(null!);
  let fileInput = $state<HTMLInputElement>(null!);
  let toastTimer: ReturnType<typeof setTimeout>;
  let mediaStream: MediaStream | undefined, mediaRecorder: MediaRecorder | undefined;
  let recordTimer: ReturnType<typeof setTimeout> | undefined, audioContext: AudioContext | undefined;
  const foods = $derived(Object.keys(save.food).filter(k => save.food[k] > 0));
  const food = $derived(foods[foodIndex % (foods.length || 1)] ?? '');
  const potion = $derived(POTIONS[potionIndex % POTIONS.length]);
  const shopItems = $derived(Object.keys(catalog.images).filter(key => {
    if (shopCategory === 'food') return key.startsWith('food/');
    if (shopCategory === 'hats') return key.startsWith('hats/') && !/\/c\d+\.png$/.test(key);
    if (shopCategory === 'glasses') return key.startsWith('eyeglasses/') && !key.includes('/g ');
    if (shopCategory === 'wallpapers') return /^wallpapers\/\d+\.png$/.test(key);
    return false;
  }).filter(key => (prettyName(key)+' '+foodName($language,key)).toLowerCase().includes(query.toLowerCase())));
  const labels = $derived<Record<string,string>>(idLang?{food:'Makanan',potions:'Ramuan',body:'Warna Tubuh',eyes:'Warna Mata',hats:'Topi',glasses:'Kacamata',outfits:'Pakaian',wallpapers:'Wallpaper'}:{food:'Food',potions:'Potions',body:'Body Colors',eyes:'Eye Colors',hats:'Hats',glasses:'Eyeglasses',outfits:'Outfits',wallpapers:'Wallpapers'});
  const palette = ['#d2a057', '#f4d27a', '#f3a4b5', '#e95147', '#f4974c', '#8ac953', '#66cde0', '#6493dd', '#a487ca', '#845435', '#4d4d4d', '#f4f4ef'];
  const stats: { key: Stat; image: string; label: string }[] = [
    { key: 'fullness', image: 'fullness', label: 'Food' }, { key: 'health', image: 'health', label: 'Health' },
    { key: 'fun', image: 'fun', label: 'Fun' }, { key: 'energy', image: 'energy', label: 'Energy' },
  ];

  function notify(message: string) { clearTimeout(toastTimer); toast = message; toastTimer = setTimeout(() => toast = '', 2600); }
  function persist() {
    if (!ready) return;
    saveStatus = 'Saving…';
    void saveProgress($state.snapshot(save)).then(() => saveStatus = 'Saved').catch(() => { saveStatus = 'Save failed'; warning = 'Progress belum tersimpan. Ekspor save sebelum menutup game.'; });
  }
  function commit(mutate: (s: Save) => void) {
    const current = advance(parseSave($state.snapshot(save)));
    mutate(current);enforceRest(current);current.updatedAt = Math.max(current.updatedAt, Date.now()); save = current; persist();
  }
  async function drainRewards(){
    if(drainingRewards||!ready||multiplayer.status!=='connected'||Date.now()<nextRewardAttempt)return;
    drainingRewards=true;
    try{while(multiplayer.rewards.length){const reward=multiplayer.rewards[0],current=advance(parseSave($state.snapshot(save)));const added=claimReward(current,reward);save=current;await saveProgress($state.snapshot(save));if(!multiplayer.acknowledgeReward(reward.id))break;if(added)notify(reward.label+' · Hadiah tersimpan!');}}
    catch{nextRewardAttempt=Date.now()+5000;warning='Hadiah online belum tersimpan. Coba lagi setelah penyimpanan tersedia.';}
    finally{drainingRewards=false;}
  }
  function requireRest(){
    if(!isExhausted(save))return false;
    commit(()=>{});notify('Pou terlalu lelah. Biarkan tidur sampai energi minimal 20%.');audio.play('no');return true;
  }
  function setRoom(index: number) {
    if (drag || recording) return;
    roomIndex = (index + ROOMS.length) % ROOMS.length;
    resetBath(); audio.play('click');
  }
  function navigate(direction: number) { setRoom(roomIndex + direction); }
  function trackGaze(event: PointerEvent) {
    const rect = playingField.getBoundingClientRect();
    gaze = gazeAt({ x: event.clientX - rect.left, y: event.clientY - rect.top }, roomPouGeometry(rect.width, rect.height));
  }
  function resetBath() { cleanMode = false; rinse = false; water = null; bubbles = []; washPointer = null; audio.stopShower(); }
  function open(name: string) { query = ''; modal = name; audio.play('click'); if (name === 'profile') renamed = save.name; }
  function closeMenu() { importFile = null; importPreview = null; importError = ''; modal = ''; }
  function openShop(category: string) { shopCategory = category; open('shop'); }
  function pet() {
    if(requireRest())return false;
    if (cleanMode || drag || save.sleeping || save.life.state==='dead') return false;
    commit(s => { s.stats.fun = clamp(s.stats.fun + 1); s.counters.petted++;care(s,'pet'); });
    audio.play(['hu2', 'miei', 'a7777'][Math.floor(Math.random() * 3)],.6,save.world.lab.effect.kind==='squeak'&&save.world.lab.effect.until>Date.now()?1.65:1);
    return true;
  }
  function feed() {
    if(save.life.state==='dead'){notify('Hidupkan kembali Pou terlebih dahulu.');return;}
    if(requireRest())return;
    if (!food) { openShop('food'); return; }
    if (save.sleeping) { notify('Pou is sleeping!'); audio.play('no'); return; }
    if (save.stats.fullness > 95) { notify('Pou is full!'); audio.play('no'); return; }
    const key = food;
    commit(s => { s.food[key]--; s.stats.fullness = clamp(s.stats.fullness + foodNutrition(key)); s.stats.clean = clamp(s.stats.clean - 2); s.counters.fed++;care(s,'food',key); s.xp += 5; if (key === 'chili_pepper') s.stats.health = clamp(s.stats.health - 10); });
    if(favoriteFood(save)===key)notify(tr(`${foodName('en',key)} is ${save.name}'s favorite!`,`${foodName('id',key)} favorit ${save.name}!`));
    eating = Date.now() + 700; audio.play(`eat_${1 + Math.floor(Math.random() * 3)}`);
  }
  function usePotion() {
    if(save.life.state==='dead'){open('experiments');return;}
    if (!save.potions[potion.id]) { openShop('potions'); return; }
    let error='';commit(s=>{error=consumePotion(s,potion.id);});if(error){notify(error);return;}
    eating = Date.now() + 650; audio.play('potion');
  }
  function toggleSleep() {
    if(save.life.state==='dead'){open('experiments');return;}
    if(requireRest())return;
    commit(s => s.sleeping = !s.sleeping); audio.play('click');
    if (save.sleeping) notify('Good night, Pou!');
  }
  function dragStart(event: PointerEvent, kind: string) {
    if (drag || event.isPrimary === false || event.button > 0) return;
    if(save.life.state==='dead'){open('experiments');return;}
    if(kind!=='potion'&&(requireRest()||save.sleeping)){if(save.sleeping&&!isExhausted(save))notify('Pou sedang tidur. Bangunkan dulu.');return;}
    if (kind === 'food' && !food) { openShop('food'); return; }
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    drag = { kind, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, pointerId: event.pointerId, moved: false };
    if (kind === 'soap') { water = null; if (rinse) { cleanMode = false; rinse = false; } }
    if (kind === 'shower') { if (save.stats.clean < 95) washRewardEligible = true; positionShower(event.clientX, event.clientY); }
  }
  function dragMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) drag.moved = true;
    drag.x = event.clientX; drag.y = event.clientY;
    if (drag.kind === 'soap') cleanAt(event.clientX, event.clientY);
    if (drag.kind === 'shower') positionShower(event.clientX, event.clientY);
  }
  function dragEnd(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const kind = drag.kind, moved = drag.moved, r = playingField.getBoundingClientRect();
    const overPet = event.clientY > r.top + r.height * 0.24 && event.clientY < r.top + r.height * 0.78 && event.clientX > r.left + r.width * 0.12 && event.clientX < r.right - r.width * 0.12;
    drag = null;
    if(kind!=='potion'&&(requireRest()||save.sleeping))return;
    if (kind === 'food' && (!moved || overPet)) feed();
    if (kind === 'potion' && (!moved || overPet)) usePotion();
    if (kind === 'soap' && !moved) { cleanMode = !cleanMode; rinse = false; water = null; notify(cleanMode ? 'Rub Pou to make bubbles!' : ''); }
    if (kind === 'shower') {
      if (moved || cleanMode && rinse) { cleanMode = false; rinse = false; water = null; }
      else if (!save.sleeping) { cleanMode = true; rinse = true; water = { x: 50, y: 30 }; notify('Shower on! Tap Shower again to stop.'); }
    }
    if (kind === 'ball') { commit(s => { s.stats.fun = clamp(s.stats.fun + 4); s.xp += 1; }); ballKick(event.clientX, event.clientY); }
  }
  function cancelDrag(event?: PointerEvent) {
    if (event && drag && event.pointerId !== drag.pointerId) return;
    if (event && !drag && washPointer !== null && event.pointerId !== washPointer) return;
    drag = null; washPointer = null; cleanMode = false; rinse = false; water = null; audio.stopShower();
  }
  function lostDrag(event: PointerEvent) { if (drag?.pointerId === event.pointerId) cancelDrag(event); }
  function positionShower(x: number, y: number) {
    if (!bathActive) { water = null; return; }
    const r = playingField.getBoundingClientRect();
    water = { x: clamp((x - r.left) / r.width * 100, 8, 92), y: clamp((y - r.top) / r.height * 100, 23, 74) };
  }
  function cleanAt(x: number, y: number) {
    if (!bathActive || Date.now() - lastClean < 70) return;
    const r = playingField.getBoundingClientRect();
    const px = (x - r.left) / r.width * 100, py = (y - r.top) / r.height * 100;
    if (!pointOnPou({ x: px, y: py }, r.width, r.height)) return;
    lastClean = Date.now();
    const cluster: FoamBubble[] = [];
    for (let i = 0; i < 3; i++) {
      const point = { x: px + (Math.random() - 0.5) * 4, y: py + (Math.random() - 0.5) * 3 };
      if (pointOnPou(point, r.width, r.height)) cluster.push({ ...point, id: bubbleId++ });
    }
    bubbles = [...bubbles, ...cluster].slice(-48);
  }
  function rinsePou(seconds: number) {
    if (!bathActive || !water || save.sleeping || isExhausted(save)) return;
    bubbles = rinseFoam(bubbles, water);
    if (save.stats.clean >= 100 && !washRewardEligible) return;
    commit(s => {
      s.stats.clean = clamp(s.stats.clean + Math.min(seconds, 0.5) * 12);
      if (s.stats.clean >= 100 && washRewardEligible) {
        washRewardEligible = false; s.counters.washed++;care(s,'bath'); s.xp += 10; earn(s, 5);
        notify('Squeaky clean! +5 coins');
      }
    });
  }
  function washStart(event: PointerEvent) {
    if (event.isPrimary === false || event.button > 0 || washPointer !== null) return;
    washPointer = event.pointerId;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    washMove(event);
  }
  function washMove(event: PointerEvent) {
    if (washPointer !== event.pointerId) return;
    if (rinse) positionShower(event.clientX, event.clientY); else cleanAt(event.clientX, event.clientY);
  }
  function washEnd(event: PointerEvent) {
    if (washPointer === event.pointerId) washPointer = null;
  }
  let ball = $state({ x: 50, y: 79, vx: 0, vy: 0 });
  function ballKick(clientX: number, clientY: number) {
    const r = playingField.getBoundingClientRect();
    ball = { x: clamp((clientX - r.left) / r.width * 100, 8, 92), y: clamp((clientY - r.top) / r.height * 100, 25, 82), vx: (Math.random() - 0.5) * 35, vy: -30 };
    audio.play('ball');
  }
  function buy(key: string) {
    const id = key.replace('food/', '').replace('.png', '');
    const price = shopCategory === 'food' ? foodPrice(id) : shopCategory === 'wallpapers' ? 50 : 100;
    const owned = save.owned.includes(key);
    if (shopCategory !== 'food' && owned) { equip(key); return; }
    if (save.coins < price) { notify('Not enough coins. Play games to earn more!'); audio.play('no'); return; }
    commit(s => { spend(s, price); if (shopCategory === 'food') s.food[id] = (s.food[id] ?? 0) + 1; else s.owned.push(key); });
    if (shopCategory !== 'food') equip(key);
    audio.play('buy');
  }
  function equip(key: string) {
    commit(s => {
      if (shopCategory === 'hats') s.appearance.hat = key;
      else if (shopCategory === 'glasses') s.appearance.glasses = key;
      else if (shopCategory === 'wallpapers') s.wallpapers[room] = key;
    }); audio.play('click');
  }
  function buyColor(color: string) {
    const key = `${shopCategory}/${color}`, owned = save.owned.includes(key) || color === '#d2a057' && shopCategory === 'body' || color === '#111111' && shopCategory === 'eyes';
    if (!owned && save.coins < 100) { notify('Not enough coins!'); return; }
    commit(s => { if (!owned) { spend(s, 100); s.owned.push(key); } if (shopCategory === 'outfits') s.appearance.outfit = color; else if (shopCategory === 'eyes') s.appearance.eyes = color; else s.appearance.body = color; });
    audio.play(owned ? 'click' : 'buy');
  }
  function buyPotion(id: string) {
    const p = POTIONS.find(p => p.id === id)!;
    if (save.coins < p.price) { notify('Not enough coins!'); return; }
    commit(s => { spend(s, p.price); s.potions[id] = (s.potions[id] ?? 0) + 1; }); audio.play('buy');
  }
  function finishGame(id: string, score: number, bonusCoins = 0) {
    if(save.life.state==='dead')return 0;
    const reward = Math.min(200, Math.floor(score / 3)) + Math.max(0, Math.floor(bonusCoins));
    commit(s => { earn(s, reward, Math.min(50, Math.floor(score / 2))); s.scores[id] = Math.max(s.scores[id] ?? 0, score); s.counters.played++;care(s,'game'); s.stats.fun = clamp(s.stats.fun + 15); s.stats.energy = clamp(s.stats.energy - 3); s.stats.fullness = clamp(s.stats.fullness - 2); });
    return reward;
  }
  function openLocalGame(item:GameInfo){if(save.life.state==='dead'){open('experiments');return;}if(requireRest())return;if(save.sleeping){notify('Wake Pou up first!');return;}modal='';game=item;}
  function startOnline(tab='rooms'){if(requireRest())return;if(save.life.state==='dead'||save.sleeping){notify('Bangunkan atau hidupkan kembali Pou dahulu.');return;}modal='';onlineTab=tab;online=true;resetBath();}
  function acceptInvitation(invitation:Invitation){
    if(requireRest())return;
    if(save.sleeping||save.life.state==='dead'){notify('Bangunkan atau hidupkan kembali Pou dahulu.');return;}
    game=null;modal='';onlineTab='rooms';online=true;resetBath();multiplayer.answerInvitation(invitation.id,true);
  }
  function finishOnline(id:string,score:number){
    if(save.onlineRewarded.includes(id))return;
    commit(s=>{s.onlineRewarded=[...s.onlineRewarded,id].slice(-32);earn(s,Math.min(100,score*2),Math.min(40,score));s.scores.online=Math.max(s.scores.online??0,score);s.stats.fun=clamp(s.stats.fun+15);s.counters.played++;});
  }
  async function previewImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    importError = '';
    try {
      if (file.size > 1_000_000) throw new Error('File save terlalu besar.');
      importPreview = parseSave(JSON.parse(await file.text())); importFile = file;
    } catch (error) { importError = error instanceof Error ? error.message : 'File save tidak valid.'; }
    fileInput.value = '';
  }
  async function confirmImport() {
    if (!importFile) return;
    try { save = await importSave(importFile); importFile = null; importPreview = null; modal = 'settings'; notify('Progress restored!'); }
    catch (error) { importError = error instanceof Error ? error.message : 'Impor gagal.'; }
  }
  async function microphone() {
    if (recording) { mediaRecorder?.stop(); return; }
    if(requireRest()||save.sleeping)return;
    microphoneError = '';
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { microphoneError = 'Mikrofon membutuhkan Safari melalui HTTPS atau localhost.'; return; }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if(isExhausted(save)||save.sleeping){mediaStream.getTracks().forEach(track=>track.stop());return;}
      mediaRecorder = new MediaRecorder(mediaStream);
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = event => chunks.push(event.data);
      mediaRecorder.onstop = async () => {
        clearTimeout(recordTimer); recording = false; mediaStream?.getTracks().forEach(track => track.stop());
        if(isExhausted(save)||save.sleeping)return;
        try {
          audioContext ??= new AudioContext(); await audioContext.resume();
          const data = await new Blob(chunks, { type: mediaRecorder?.mimeType }).arrayBuffer();
          const buffer = await audioContext.decodeAudioData(data);
          const source = audioContext.createBufferSource(); source.buffer = buffer; source.playbackRate.value = 1.35; source.connect(audioContext.destination); source.start();
          eating = Date.now() + buffer.duration / 1.35 * 1000;
        } catch { microphoneError = 'Rekaman tidak dapat diputar. Coba lagi.'; }
      };
      mediaRecorder.start(); recording = true;
      recordTimer = setTimeout(() => { if (mediaRecorder?.state === 'recording') mediaRecorder.stop(); }, 5000);
    } catch { microphoneError = 'Izinkan akses mikrofon di Safari untuk berbicara dengan Pou.'; }
  }
  async function downloadOffline() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { offlineStatus = 'Offline tersedia pada build production melalui HTTPS.'; return; }
    offlineBusy = true; offlineStatus = 'Preparing…';
    try {
      const response = await fetch('/offline-assets.json'); if (!response.ok) throw new Error();
      const urls: string[] = await response.json(), cache = await caches.open('pou-extra-v1');
      let completed = 0;
      // Small batches avoid simultaneous decoding/download of the entire APK catalog.
      for (let i = 0; i < urls.length; i += 6) {
        await Promise.all(urls.slice(i, i + 6).map(async url => { if (!await caches.match(url)) await cache.add(url); completed++; }));
        offlineStatus = `${Math.floor(completed / urls.length * 100)}%`;
      }
      offlineStatus = 'All assets ready offline!';
    } catch { offlineStatus = 'Unduhan terhenti. Coba lagi; aset yang sudah tersimpan tetap dipakai.'; }
    offlineBusy = false;
  }
  function waterGarden() {
    const now = Date.now();
    if (save.garden.wateredAt && now - save.garden.wateredAt < 3_600_000) { notify('The flowers are growing!'); return; }
    commit(s => { s.garden.wateredAt = now; s.xp += 2; }); audio.play('water_splash'); notify('Come back in one hour!');
  }
  function harvest() {
    if (!save.garden.wateredAt || Date.now() - save.garden.wateredAt < 3_600_000 || save.garden.harvestedAt >= save.garden.wateredAt) { waterGarden(); return; }
    commit(s => { s.garden.harvestedAt = Date.now(); earn(s, 20, 5); }); audio.play('coin'); notify('+20 coins!');
  }
  const achievementList = $derived([
    { title: 'Feed Pou', count: save.counters.fed, goal: 10, icon: '100.png' },
    { title: 'Clean Pou', count: save.counters.washed, goal: 5, icon: '200.png' },
    { title: 'Play Games', count: save.counters.played, goal: 10, icon: '300.png' },
    { title: 'Pet Pou', count: save.counters.petted, goal: 25, icon: '400.png' },
    { title: 'Collect Coins', count: save.counters.earned, goal: 500, icon: '500.png' },
  ]);

  onMount(() => {
    let alive = true;
    let lastInvitations=multiplayer.invitations;
    const unsubscribe=multiplayer.subscribe(()=>{void drainRewards();if(lastInvitations!==multiplayer.invitations){lastInvitations=multiplayer.invitations;invitations=lastInvitations.filter(inv=>inv.expiresAt>Date.now());}});
    void Promise.all([loadSave(), fetch('/assets/catalog.json').then(r => { if (!r.ok) throw new Error('Assets missing'); return r.json() as Promise<Catalog>; }), document.fonts.load('24px Pou')])
      .then(([loaded, assets]) => { if (!alive) return; save = loaded.save; warning = loaded.warning; catalog = assets; audio.catalog = assets; ready = true; persist();multiplayer.connect(save.name); })
      .catch(() => fatal = 'Game belum dapat dimuat. Periksa koneksi lalu coba lagi.');
    const timer = setInterval(() => { void drainRewards();if(invitations.some(inv=>inv.expiresAt<=Date.now()))invitations=invitations.filter(inv=>inv.expiresAt>Date.now());if (ready&&(save.sleeping||save.stats.energy<15||save.life.state==='poisoned'||save.world.lab.effect.until>0||Date.now()-save.updatedAt>=15000)) { save = advance(parseSave($state.snapshot(save))); persist(); } }, 1000);
    const visibility = () => {
      foreground = !document.hidden;
      if (!ready) return;
      if (document.hidden) { cancelDrag(); emergencySave($state.snapshot(save)); persist(); audio.pause(); }
      else { save = advance(parseSave($state.snapshot(save))); audio.resume();multiplayer.connect(save.name); }
    };
    const hide = () => { if (ready) emergencySave($state.snapshot(save)); };
    const unlock = () => { audio.unlock();audioUnlocked=true;void navigator.storage?.persist?.().catch(() => {}); };
    document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', hide);
    const blur = () => cancelDrag();
    window.addEventListener('blur', blur);
    window.addEventListener('resize', blur);
    document.addEventListener('pointerdown', unlock, { once: true });
    let last = 0, frame = 0;
    const moveBall = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.04) : 0; last = time;
      if (!document.hidden && (ball.vx || ball.vy)) {
        ball.vy += dt * 55; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < 7 || ball.x > 93) { ball.x = clamp(ball.x, 7, 93); ball.vx *= -0.85; }
        if (ball.y > 80) { ball.y = 80; ball.vy *= -0.72; ball.vx *= 0.95; if (Math.abs(ball.vy) < 2) { ball.vy = 0; ball.vx = 0; } }
      }
      frame = requestAnimationFrame(moveBall);
    };
    frame = requestAnimationFrame(moveBall);
    return () => { alive = false;unsubscribe();multiplayer.close();audio.stop(); clearInterval(timer); clearTimeout(toastTimer); clearTimeout(recordTimer); cancelAnimationFrame(frame); mediaStream?.getTracks().forEach(t => t.stop()); void audioContext?.close(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', hide); window.removeEventListener('blur', blur); window.removeEventListener('resize', blur); document.removeEventListener('pointerdown', unlock); };
  });
  $effect(()=>{if(ready){multiplayer.setName(save.name);document.documentElement.lang=save.settings.language;language.set(save.settings.language);}});
  $effect(()=>{if(ready)multiplayer.publishHome($state.snapshot(save.world.home),save.appearance.body,save.appearance.eyes);});
  $effect(() => { audio.setSound(save.settings.sound); audio.music = save.settings.music; });
  $effect(() => { if (bathActive && water && save.settings.sound) audio.startShower(); else audio.stopShower(); });
  $effect(()=>{if(audioUnlocked&&foreground&&save.sleeping&&save.settings.sound&&save.life.state!=='dead'&&!game&&!online)audio.startSnore();else audio.stopSnore();});
  $effect(()=>{
    const until=spinUntil;
    const duration=Math.max(0,Math.min(5000,until-Date.now()));
    spinRemaining=duration;
    if(!duration)return;
    const timeout=setTimeout(()=>{spinRemaining=0;if(save.effects.spinUntil===until)commit(s=>s.effects.spinUntil=0);},duration);
    return()=>clearTimeout(timeout);
  });
  $effect(()=>{if(save.life.state==='dead'){game=null;online=false;}});
  $effect(()=>{
    if(ready&&exhausted){game=null;online=false;modal='';cancelDrag();roomIndex=4;eating=0;ball.vx=0;ball.vy=0;if(mediaRecorder?.state==='recording')mediaRecorder.stop();}
  });
  $effect(() => { if (modal) { void tick().then(() => document.querySelector<HTMLDialogElement>('dialog')?.showModal()); } });
</script>

{#if !ready}
  <main class="loading"><img src={imageUrl('pou/icon150.png')} alt="Pou" /><h1>Pou</h1><p>{fatal ? localMessage($language,fatal) : tr('Loading…','Memuat…')}</p>{#if fatal}<button class="green-button" onclick={() => location.reload()}>{translate($language,"Coba lagi","Try again")}</button>{/if}</main>
{:else}
  <main class:night={save.sleeping && room === 'Bedroom'} class:outside={room === 'Garden' || room === 'Playground'} class="game-shell" style={`--room-color: ${{ Kitchen: '#efd391', Bathroom: '#b8e8e3', Lab: '#d8bee5', 'Game Room': '#ccea80', Bedroom: '#a9cee5', Garden: '#91d9f7', Playground: '#91d9f7' }[room]}; ${save.wallpapers[room] ? `--wallpaper: url("${imageUrl(save.wallpapers[room]!)}")` : ''}`}>
    <section class="playfield" class:poison-spin={spinRemaining>0} class:still-effects={save.settings.reducedMotion} class:bathroom={room === 'Bathroom'} style={`--spin-duration:${spinRemaining}ms`} bind:this={playingField} aria-label={roomLabel(room)} onpointermove={trackGaze} onpointerdowncapture={trackGaze} onpointerleave={() => gaze = { x: 0, y: 0 }}>
      <div class="room-header">
      <header class="hud">
        <button class="coins hud-button" aria-label={`${tr('Coins','Koin')}: ${save.coins}. ${tr('Open shop','Buka toko')}`} onclick={() => openShop('food')}><img src={imageUrl('coin/coin_sm.png')} alt="" /><span class="outlined">{save.coins}</span></button>
        <div class="status-bars">
          {#each stats as stat, index}
            <button class="status" aria-label={`${idLang?({Food:'Makanan',Health:'Kesehatan',Fun:'Kesenangan',Energy:'Energi'} as Record<string,string>)[stat.label]:stat.label}: ${Math.round(save.stats[stat.key])}%`} onclick={() => setRoom([0, 2, 3, 4][index])}>
              <span class="status-icon">
              <span class="status-background"></span><span class="status-fill" style={`--fill: ${save.stats[stat.key]}%; --status-color: ${save.stats[stat.key] > 35 ? '#9cdb74' : '#eb9387'}`}></span>
              <img src={imageUrl(`status/${stat.image}.png`)} alt="" />
              </span><span class="stat-number">{stat.key==='energy'&&save.boosts.unlimitedEnergy?'∞':`${Math.round(save.stats[stat.key])}%`}</span>
            </button>
          {/each}
        </div>
        <button class="level hud-button" aria-label={`Level ${level(save)}. ${tr('Open profile','Buka profil')}`} onclick={() => open('profile')}><img src={imageUrl('star/star.png')} alt="" /><span>{level(save)}</span></button>
      </header>
      <div class="room-title"><button class="image-button" aria-label={tr("Previous room","Ruangan sebelumnya")} onclick={() => navigate(-1)}><img src={imageUrl('icons/prev_naked.png')} alt="" /></button><h1 class="outlined">{roomLabel(room)}</h1><button class="image-button" aria-label={tr("Next room","Ruangan berikutnya")} onclick={() => navigate(1)}><img src={imageUrl('icons/next_naked.png')} alt="" /></button></div>
      </div>
      <button class="phone image-button" aria-label={tr("Phone menu","Menu telepon")} onclick={() => open('phone')}><img src={imageUrl('phones/100/black.png')} alt="" /></button>
      <button class="closet image-button" aria-label={tr("Customize Pou","Ubah penampilan Pou")} onclick={() => openShop('body')}><img src={imageUrl('closets/closet.png')} alt="" /></button>
      {#if room === 'Bedroom'}<div class="pillow" aria-hidden="true">{#each [1,2,3] as layer}<img class={`pillow-layer layer-${layer}`} src={imageUrl(`pillows/100/l${layer}.png`)} alt="" />{/each}</div>{/if}
      {#if room === 'Garden' || room === 'Playground'}<div class="grass"></div>{/if}
      <FurnitureLayer placements={save.world.home.placements} {room}/>
      <div class="pou-position"><Pou {save} {eating} {gaze} onpet={pet} /></div>
      {#if save.sleeping}<SleepEffects reducedMotion={save.settings.reducedMotion} {exhausted} energy={save.stats.energy}/>{/if}
      {#if spinRemaining>0}<div class="spin-status" role="status">{tr('Racun Pusaran · 5 detik','Spin Poison · 5 seconds')} <button onclick={()=>open('experiments')}>{translate($language,"Penawar","Antidote")}</button></div>{/if}
      {#if save.life.state==='poisoned'}<div class="poison-status" role="status">{tr('Racun Alien','Alien Poison')} · {Math.ceil(save.life.poisonSeconds)}s <button onclick={()=>open('experiments')}>{translate($language,"Penawar","Antidote")}</button></div>{/if}
      {#if save.life.state==='dead'}<div class="life-status"><p>{translate($language,"Pou meninggal","Pou has died")}</p><button class="green-button" onclick={()=>commit(revivePou)}>{translate($language,"Hidupkan kembali","Revive")}</button></div>{/if}
      {#if room === 'Bathroom'}
        {#if cleanMode}<button class="wash-surface" aria-label={rinse ? tr('Rinse Pou','Bilas Pou') : tr('Wash Pou','Mandikan Pou')} onpointerdown={washStart} onpointermove={washMove} onpointerup={washEnd} onpointercancel={cancelDrag} onlostpointercapture={(e) => { if (washPointer === e.pointerId) cancelDrag(e); }}></button>{/if}
        <BathEffects {water} {bubbles} active={bathActive} reducedMotion={save.settings.reducedMotion} onrinse={rinsePou} />
        <div class="clean-meter"><span>{translate($language,"Bersih","Clean")} {Math.round(save.stats.clean)}%</span><progress value={save.stats.clean} max="100"></progress></div>
      {/if}
      {#if room === 'Kitchen'}
        <button class="side-object image-button" aria-label={tr("Open fridge","Buka kulkas")} onclick={() => open('fridge')}><img src={imageUrl('fridges/fridge.png')} alt="" /><span class="outlined">{translate($language,"Kulkas","Fridge")}</span></button>
      {:else if room === 'Lab'}
        <button class="side-object image-button" aria-label={tr("Open potion shelf","Buka rak ramuan")} onclick={() => openShop('potions')}><img src={imageUrl('shelves/shelf.png')} alt="" /><span class="outlined">{translate($language,"Rak","Shelf")}</span></button>
        <button class="side-object lab-experiments image-button" aria-label={tr("Open experiments","Buka eksperimen")} onclick={()=>open('experiments')}><img src={imageUrl(potionImage('poison'))} alt=""/><span class="outlined">{translate($language,"Eksperimen","Experiments")}</span></button>
      {:else if room === 'Game Room'}
        <button class="side-object image-button" aria-label={tr("Open games","Buka permainan")} onclick={() => open('games')}><img src={imageUrl('room/joystick.png')} alt="" /><span class="outlined">{translate($language,"Permainan","Games")}</span></button>
      {:else if room === 'Bedroom'}
        <button class="side-object image-button lamp" aria-label={save.sleeping ? tr('Wake Pou up','Bangunkan Pou') : tr('Put Pou to sleep','Tidurkan Pou')} onclick={toggleSleep}><img src={imageUrl(`lamps/100/light_${save.sleeping ? 'off' : 'on'}.png`)} alt="" /><span class="outlined">{exhausted?'Zzz…':save.sleeping ? tr('Wake up','Bangun') : tr('Sleep','Tidur')}</span></button>
      {:else if room === 'Garden'}
        <button class="side-object image-button" aria-label={tr("Water garden","Siram kebun")} onclick={waterGarden}><img src={imageUrl('showers/100/white.png')} alt="" /><span class="outlined">{translate($language,"Siram","Water")}</span></button>
        <button class="garden-flower image-button" aria-label={tr("Harvest flowers","Panen bunga")} onclick={harvest}><img src={imageUrl('flowers/1.png')} alt="" /></button>
      {:else if room === 'Playground'}
        <button class="side-object image-button" aria-label={tr("Play Goal","Main Goal")} onclick={() => openLocalGame(GAMES.find(g => g.id === 'goal')!)}><img src={imageUrl('room/joystick.png')} alt="" /><span class="outlined">Goal</span></button>
      {/if}
      {#if room === 'Kitchen' || room === 'Lab'}
        <div class="item-tray">
          <button class="image-button item-arrow" aria-label={tr("Previous item","Barang sebelumnya")} onclick={() => room === 'Kitchen' ? foodIndex = (foodIndex - 1 + foods.length) % (foods.length || 1) : potionIndex = (potionIndex - 1 + POTIONS.length) % POTIONS.length}><img src={imageUrl('icons/prev_naked.png')} alt="" /></button>
          <div class="current-item">
            <button class="draggable image-button" aria-label={room === 'Kitchen' ? food ? `${tr('Feed','Beri makan')} ${foodName($language,food)}` : tr('Buy food','Beli makanan') : `${tr('Use','Gunakan')} ${itemName($language,potion.name)}`} onpointerdown={(e) => dragStart(e, room === 'Kitchen' ? 'food' : 'potion')} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={cancelDrag} onlostpointercapture={lostDrag}>
              <img src={imageUrl(room === 'Kitchen' ? food ? `food/${food}.png` : 'icons/shops/food.png' : potionImage(potion.id))} alt="" />
            </button>
            <span class="outlined item-label">{room === 'Kitchen' ? food ? foodName($language,food) : tr('Buy food','Beli makanan') : itemName($language,potion.name)}</span>
            <span class="item-count">×{room === 'Kitchen' ? save.food[food] ?? 0 : save.potions[potion.id] ?? 0}</span>
          </div>
          <button class="image-button item-arrow" aria-label={tr("Next item","Barang berikutnya")} onclick={() => room === 'Kitchen' ? foodIndex++ : potionIndex++}><img src={imageUrl('icons/next_naked.png')} alt="" /></button>
        </div>
      {:else if room === 'Bathroom'}
        <div class="bath-tools">
          {#each ['soap', 'shower'] as tool}<button class:tool-active={cleanMode && (tool === 'shower') === rinse || drag?.kind === tool} class="image-button draggable" aria-pressed={cleanMode && (tool === 'shower') === rinse || drag?.kind === tool} aria-label={tool === 'soap' ? tr('Use soap','Gunakan sabun') : tr('Use shower','Gunakan shower')} onpointerdown={(e) => dragStart(e, tool)} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={cancelDrag} onlostpointercapture={lostDrag}><img src={imageUrl(tool === 'soap' ? 'soaps/100/white.png' : 'showers/100/white.png')} alt="" /><span class="outlined">{tool === 'soap' ? tr('Soap','Sabun') : tr('Shower','Shower')}</span></button>{/each}
        </div>
        <p class="bath-hint">{cleanMode ? rinse ? tr('Tap Shower to stop · Drag to aim','Ketuk Shower untuk berhenti · Seret untuk mengarahkan') : tr('Rub Pou, then rinse with Shower','Gosok Pou, lalu bilas dengan Shower') : tr('Soap to lather · Shower to rinse','Sabun untuk busa · Shower untuk membilas')}</p>
      {:else if room === 'Game Room' || room === 'Playground'}
        <button class="ball image-button draggable" style={`left:${ball.x}%;top:${ball.y}%`} aria-label={tr("Play with ball","Main bola")} onpointerdown={(e) => dragStart(e, 'ball')} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={cancelDrag} onlostpointercapture={lostDrag}><img src={imageUrl('balls/300/l1.png')} alt="" /></button>
      {/if}
      <div class="bottom-tools">
        <button class="image-button" aria-label={tr("Shop","Toko")} onclick={() => openShop(room === 'Lab' ? 'potions' : 'food')}><img src={imageUrl('shop/shop.png' in catalog.images ? 'shop/shop.png' : 'icons/shops/food.png')} alt="" /><span class="outlined">{tr("Shop","Toko")}</span></button>
        <button class:recording class="image-button" aria-label={recording ? tr('Stop recording','Hentikan rekaman') : tr('Talk to Pou','Bicara dengan Pou')} onclick={microphone}><img src={imageUrl('room/micro.png')} alt="" /><span class="outlined">{recording ? tr('Stop','Berhenti') : tr('Talk','Bicara')}</span></button>
        <FullscreenButton onhint={notify} />
        <button class="image-button" aria-label={tr("Settings","Pengaturan")} onclick={() => open('settings')}><img src={imageUrl('icons/settings.png')} alt="" /><span class="outlined">{tr("Settings","Pengaturan")}</span></button>
      </div>
      {#if microphoneError}<p class="microphone-error" role="alert">{localMessage($language,microphoneError)}</p>{/if}
      {#if recording}<p class="recording-label outlined">{translate($language,"Mendengarkan…","Listening…")}</p>{/if}
      <nav class="room-dots" aria-label={tr("Rooms","Ruangan")}>{#each ROOMS as name, i}<button class:active={roomIndex === i} aria-label={roomLabel(name)} aria-current={roomIndex === i ? 'page' : undefined} onclick={() => setRoom(i)}></button>{/each}</nav>
      <span class="save-indicator" aria-live="polite">{localMessage($language,saveStatus)}</span>
    </section>
    {#if game}<MiniGame {game} {save} onclose={() => { game = null; modal = 'games'; }} onfinish={finishGame} />{/if}
    {#if online}<OnlineGame initialTab={onlineTab} name={save.name} onclose={()=>{online=false;modal='games';}} onfinish={finishOnline}/>{/if}
  </main>
{/if}

{#if modal && ready}
  <dialog class="pou-dialog" onclose={closeMenu} oncancel={(e) => { if (importPreview) { e.preventDefault(); importPreview = null; importFile = null; } else closeMenu(); }}>
    <div class="dialog-heading"><h2>{modal === 'shop' ? labels[shopCategory] : modal === 'home'?tr('Home decoration','Dekorasi rumah'):modal === 'experiments'?tr('Lab experiments','Eksperimen Lab'):modal==='companion'?tr('Pou partner','Pasangan Pou'):modal === 'games' ? tr('Games','Permainan') : modal === 'profile' ? save.name : modal === 'phone' ? tr('Phone','Telepon') : modal === 'fridge' ? tr('Fridge','Kulkas') : modal === 'achievements' ? tr('Achievements','Pencapaian') : tr('Settings','Pengaturan')}</h2><button class="image-button" aria-label={tr("Close menu","Tutup menu")} onclick={closeMenu}><img src={imageUrl('dialog/close.png')} alt="" /></button></div>
    <div class="dialog-body">
      {#if modal === 'shop'}
        <div class="shop-nav"><select aria-label={tr("Shop category","Kategori toko")} bind:value={shopCategory} onchange={() => query = ''}>{#each Object.entries(labels) as [key, label]}<option value={key}>{label}</option>{/each}</select><span class="shop-balance"><img src={imageUrl('coin/coin_sm.png')} alt="Coins" />{save.coins}</span></div>
        {#if ['food', 'hats', 'glasses', 'wallpapers'].includes(shopCategory)}
          <input class="search" aria-label={tr("Search items","Cari barang")} type="search" placeholder={tr('Search…','Cari…')} bind:value={query} />
          <div class="shop-grid">{#each shopItems as key}<button class="shop-item" aria-label={`${tr('Buy','Beli')} ${shopCategory==='food'?foodName($language,key):prettyName(key)}`} onclick={() => buy(key)}><img loading="lazy" src={imageUrl(key)} alt="" /><span>{shopCategory==='food'?foodName($language,key):prettyName(key)}</span><small>{shopCategory === 'food' ? `${foodPrice(key.replace('food/', '').replace('.png', ''))} ${tr('coins','koin')} · ×${save.food[key.replace('food/', '').replace('.png', '')] ?? 0}` : save.owned.includes(key) ? tr('Owned · Wear','Dimiliki · Pakai') : `${shopCategory === 'wallpapers' ? 50 : 100} ${tr('coins','koin')}`}</small></button>{/each}</div>
          {#if !shopItems.length}<p>{translate($language,"Barang tidak ditemukan.","No items found.")}</p><button class="cream-button" onclick={() => query = ''}>{translate($language,"Hapus pencarian","Clear search")}</button>{/if}
          {#if shopCategory === 'hats' || shopCategory === 'glasses'}<button class="cream-button" onclick={() => commit(s => shopCategory === 'hats' ? s.appearance.hat = '' : s.appearance.glasses = '')}>{translate($language,"Lepas","Remove")}</button>{/if}
        {:else if shopCategory === 'potions'}
          <div class="shop-grid">{#each POTIONS as p}<button class="shop-item" onclick={() => buyPotion(p.id)} disabled={p.id==='infinite'&&save.boosts.unlimitedEnergy}><img src={imageUrl(potionImage(p.id))} alt="" /><span>{itemName($language,p.name)}</span><small>{p.id==='infinite'&&save.boosts.unlimitedEnergy?tr('Permanently active','Aktif permanen'):`${p.price.toLocaleString('id-ID')} ${tr('coins','koin')} · ×${save.potions[p.id] ?? 0}`}</small>{#if potionDescription(p.id)}<small>{localMessage($language,potionDescription(p.id))}</small>{/if}</button>{/each}</div>
        {:else}
          <div class="color-grid">{#each shopCategory === 'eyes' ? ['#111111', ...palette] : palette as color}<button class="color-item" style={`--swatch:${color}`} aria-label={`${tr('Choose','Pilih')} ${color}`} onclick={() => buyColor(color)}><span></span><small>{save.owned.includes(`${shopCategory}/${color}`) || color === '#d2a057' && shopCategory === 'body' || color === '#111111' && shopCategory === 'eyes' ? tr('Wear','Pakai') : '100'}</small></button>{/each}</div>
          {#if shopCategory === 'outfits'}<button class="cream-button" onclick={() => commit(s => s.appearance.outfit = '')}>{translate($language,"Lepas pakaian","Remove outfit")}</button>{/if}
        {/if}
      {:else if modal === 'games'}
        <button class="green-button online-entry" onclick={()=>startOnline()}><img src={imageUrl('icons/phone/online.png')} alt=""/>{translate($language,"Mabar online · Kode ruangan","Play online · Room code")}</button>
        <div class="games-grid">{#each GAMES as item}<button class="game-list-item" onclick={() => openLocalGame(item)}><img loading="lazy" src={imageUrl(`icons/games/${item.name}.png`)} alt="" /><span>{item.name}</span><small>{translate($language,"Terbaik:","Best:")} {save.scores[item.id] ?? 0}</small></button>{/each}</div>
      {:else if modal==='home'}
        <HomeDecor {save} {room} onchange={commit}/>
      {:else if modal==='experiments'}
        <Experiments {save} onchange={commit} onshop={()=>openShop('potions')} onuse={()=>{audio.play('potion');closeMenu();}}/>
      {:else if modal==='companion'}
        <Companion {save} onchange={commit}/>
      {:else if modal === 'fridge'}
        <div class="shop-grid">{#each foods as item, index}<button class="shop-item" onclick={() => { foodIndex = index; roomIndex = 0; modal = ''; }}><img src={imageUrl(`food/${item}.png`)} alt="" /><span>{foodName($language,item)}</span><small>×{save.food[item]}</small></button>{/each}</div><button class="green-button" onclick={() => openShop('food')}>{translate($language,"Beli makanan","Buy food")}</button>
      {:else if modal === 'phone'}
        <div class="phone-grid">{#each [{ name: 'Games', icon: 'games', action: 'games' }, { name: 'Pou', icon: 'account', action: 'profile' }, {name:'Pasangan',icon:'friends',action:'companion'},{name:'Mabar',icon:'online',action:'online'},{name:'Dekorasi',icon:'home',action:'home'},{name:'Kebun',icon:'garden',action:'garden-online'},{name:'Peringkat',icon:'achievements',action:'ranking-online'},{name:'Lab',icon:'help',action:'experiments'}, { name: 'Achievements', icon: 'achievements', action: 'achievements' }, { name: 'Settings', icon: 'settings', action: 'settings' }] as item}<button onclick={() => item.action==='garden-online'?startOnline('garden'):item.action==='ranking-online'?startOnline('ranking'):item.action==='online'?startOnline():open(item.action)}><img src={imageUrl(item.action==='home'?'decor/sofa.svg':item.action==='garden-online'?'decor/plant.svg':item.action==='experiments'?'icons/shops/potions.png':`icons/phone/${item.icon}.png`)} alt="" /><span>{({games:tr('Games','Permainan'),profile:'Pou',companion:tr('Partner','Pasangan'),online:tr('Online','Mabar'),home:tr('Decorate','Dekorasi'),'garden-online':tr('Garden','Kebun'),'ranking-online':tr('Leaderboard','Peringkat'),experiments:'Lab',achievements:tr('Achievements','Pencapaian'),settings:tr('Settings','Pengaturan')} as Record<string,string>)[item.action]}</span></button>{/each}</div>
      {:else if modal === 'profile'}
        <div class="profile"><img src={imageUrl('pou/icon150.png')} alt="Pou" /><h3>Level {level(save)}</h3><progress max="1" value={levelProgress(save)}></progress><p>{save.xp} XP · {save.coins} {tr('coins','koin')}</p></div>
        <div class="personality-card"><img src={imageUrl(`food/${favoriteFood(save)}.png`)} alt=""/><div><strong>{localMessage($language,personality(save))}</strong><p>{translate($language,"Favorit:","Favorite:")} {foodName($language,favoriteFood(save))} {translate($language,"· Kedekatan","· Bond")} {Math.floor(save.world.personality.bond)}%</p><small>{translate($language,"Kebiasaan terbentuk dari makan, bermain, mandi, dan perhatianmu. Makanan favorit menambah kesenangan.","Habits develop from feeding, playing, bathing and care. Favorite food adds happiness.")}</small></div></div>
        <button class="cream-button" onclick={()=>open('home')}>{translate($language,"Dekorasi rumah","Home decoration")}</button>
        {#if save.owned.includes('rewards/explorer-hat.svg')}<button class="cream-button" onclick={()=>commit(s=>s.appearance.hat='rewards/explorer-hat.svg')}>{translate($language,"Pakai topi penjelajah langka","Wear rare explorer hat")}</button>{/if}
        <label class="field">{translate($language,"Nama","Name")}<input bind:value={renamed} maxlength="24" /></label><button class="green-button" onclick={() => { if (renamed.trim()) { commit(s => s.name = renamed.trim()); notify('Name saved!'); } }}>{translate($language,"Simpan nama","Save name")}</button>
        <button class="cream-button" onclick={() => open('achievements')}>{translate($language,"Pencapaian","Achievements")}</button>
        <button class="cream-button" onclick={()=>open('companion')}>{translate($language,"Pasangan Pou","Pou partner")}</button>
      {:else if modal === 'achievements'}
        <div class="achievements">{#each achievementList as a}<div><span class="achievement-badge" class:achieved={a.count>=a.goal}><img src={imageUrl(`achievements/${a.icon}`)} alt=""/>{#if a.count>=a.goal}<span class="achievement-check" aria-label={tr("Completed","Selesai")}>✓</span>{/if}</span><section><strong>{localMessage($language,a.title)}</strong><progress value={Math.min(a.count, a.goal)} max={a.goal}></progress><small>{Math.min(a.count, a.goal)} / {a.goal}</small></section></div>{/each}</div>
      {:else if modal === 'settings'}
        <div class="settings-list">
          <label>{tr('Language','Bahasa')}<select aria-label="Language / Bahasa" value={save.settings.language} onchange={e=>commit(s=>s.settings.language=e.currentTarget.value as 'id'|'en')}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></label>
          <label>{tr("Sound effects","Efek suara")}<input type="checkbox" checked={save.settings.sound} onchange={e => commit(s => s.settings.sound = e.currentTarget.checked)} /></label>
          <label>{tr("Music","Musik")}<input type="checkbox" checked={save.settings.music} onchange={e => { commit(s => s.settings.music = e.currentTarget.checked); if (!save.settings.music) audio.setMusic(''); }} /></label>
          <label>{tr("Reduce motion","Kurangi gerakan")}<input type="checkbox" checked={save.settings.reducedMotion} onchange={e => commit(s => s.settings.reducedMotion = e.currentTarget.checked)} /></label>
        </div>
        <p class="settings-caption">{translate($language,"Progress otomatis tersimpan di iPad ini. Ekspor save untuk cadangan atau pindah perangkat.","Progress is saved on this device. Export your save to back it up or move devices.")}</p>
        <p class="settings-caption">{translate($language,"Kurangi gerakan membuat air shower dan Zzz statis. Matikan untuk menampilkan animasi.","Reduce motion makes shower water and Zzz static. Turn it off to show animations.")}</p>
        <button class="green-button" onclick={() => exportSave($state.snapshot(save))}>{tr("Export save","Ekspor save")}</button>
        <button class="cream-button" onclick={() => fileInput.click()}>{tr("Import save","Impor save")}</button>
        <input class="visually-hidden" type="file" accept=".json,application/json" bind:this={fileInput} onchange={previewImport} />
        {#if importError}<p class="inline-error" role="alert">{localMessage($language,importError)}</p>{/if}
        <button class="cream-button" disabled={offlineBusy} onclick={downloadOffline}>{offlineBusy ? `${tr('Downloading','Mengunduh')} ${offlineStatus}` : tr('Download all offline assets','Unduh semua aset offline')}</button>
        {#if offlineStatus}<p class="settings-caption" aria-live="polite">{localMessage($language,offlineStatus)}</p>{/if}
        <details><summary>{translate($language,"Pasang di iPad","Install on iPad")}</summary><p>{translate($language,"Buka alamat game di Safari, ketuk Bagikan, lalu Tambahkan ke Layar Utama. Save lokal mengikuti alamat game; gunakan ekspor/impor saat pindah alamat atau perangkat.","Open the game in Safari, tap Share, then Add to Home Screen. Local saves belong to the site address; export and import when moving.")}</p></details>
        {#if warning}<p class="inline-error" role="alert">{localMessage($language,warning)}</p>{/if}
        <p class="save-detail">{localMessage($language,saveStatus)} · {new Date(save.updatedAt).toLocaleString(idLang?'id-ID':'en-US')}</p>
      {/if}
    </div>
    {#if importPreview}<div class="import-confirm" role="alertdialog" aria-labelledby="import-title"><h3 id="import-title">{translate($language,"Ganti progress saat ini?","Replace current progress?")}</h3><p>{importPreview.name} · Level {level(importPreview)} · {importPreview.coins} {tr('coins','koin')}</p><p>{translate($language,"Ekspor progress saat ini sebelum menggantinya.","Export your current progress before replacing it.")}</p><button class="cream-button" onclick={() => exportSave($state.snapshot(save))}>{translate($language,"Ekspor save saat ini","Export current save")}</button><button class="green-button" onclick={confirmImport}>{translate($language,"Ganti dengan save ini","Replace with this save")}</button><button class="cream-button" onclick={() => { importFile = null; importPreview = null; }}>{translate($language,"Batal","Cancel")}</button></div>{/if}
  </dialog>
{/if}
{#if drag && drag.moved && drag.kind !== 'shower'}<img class="drag-ghost" style={`left:${drag.x}px;top:${drag.y}px`} src={imageUrl(drag.kind === 'food' ? `food/${food}.png` : drag.kind === 'potion' ? potionImage(potion.id) : drag.kind === 'soap' ? 'soaps/100/white.png' : 'balls/300/l1.png')} alt="" />{/if}
{#if toast}<div class="toast" role="status">{localMessage($language,toast)}</div>{/if}
{#if invitations[0]}{@const invitation=invitations[0]}<aside class="invitation-toast" aria-label={tr("Game invitation","Undangan bermain")}><img src={imageUrl('icons/phone/online.png')} alt=""/><div><strong>{invitation.fromName} {translate($language,"mengundangmu bermain","invites you to play")}</strong><p>{invitation.mode==='adventure'?tr('Co-op adventure','Petualangan co-op'):'Food Drop'} {translate($language,"· Ruangan","· Room")} {invitation.code}</p><div><button onclick={()=>acceptInvitation(invitation)}>{translate($language,"Gabung","Join")}</button><button onclick={()=>multiplayer.answerInvitation(invitation.id,false)}>{translate($language,"Nanti","Later")}</button></div></div></aside>{/if}
