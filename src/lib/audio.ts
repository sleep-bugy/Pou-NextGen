import type { Catalog } from './assets';

export class GameAudio {
  catalog: Catalog = { images: {}, sounds: {} };
  sound = true;
  music = true;
  private tracks = new Map<string, HTMLAudioElement>();
  private background?: HTMLAudioElement;
  private activeMusic = '';
  private unlocked = false;
  private showerContext?: AudioContext;
  private showerSource?: AudioBufferSourceNode;
  private showerGain?: GainNode;
  private showerFilter?: BiquadFilterNode;
  private showerNoise?: AudioBuffer;
  private snoreSource?: AudioBufferSourceNode;
  private snoreGain?: GainNode;
  private snoreBuffer?: AudioBuffer;

  unlock() { this.unlocked = true; }

  setSound(enabled: boolean) {
    this.sound = enabled;
    if (!enabled) { this.tracks.forEach(track => track.pause()); this.stopShower(); this.stopSnore(); }
  }

  play(name: string, volume = 0.6,rate=1) {
    if (!this.sound || !this.unlocked) return;
    const path = this.catalog.sounds[name];
    if (!path) return;
    let track = this.tracks.get(name);
    if (!track) {
      track = new Audio(`/assets/${path}`);
      track.preload = 'auto';
      this.tracks.set(name, track);
    }
    track.volume = volume;
    track.playbackRate=rate;
    track.preservesPitch=rate===1;
    (track as HTMLAudioElement&{webkitPreservesPitch?:boolean}).webkitPreservesPitch=rate===1;
    track.currentTime = 0;
    void track.play().catch(() => {});
  }

  startShower() {
    if (!this.sound || !this.unlocked || this.showerSource || typeof AudioContext === 'undefined') return;
    try {
      this.showerContext ??= new AudioContext();
      const context = this.showerContext;
      void context.resume().catch(() => {});
      if (!this.showerNoise) {
        this.showerNoise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
        const data = this.showerNoise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      }
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = this.showerNoise; source.loop = true;
      filter.type = 'lowpass'; filter.frequency.value = 4200;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.075, context.currentTime + 0.06);
      source.connect(filter); filter.connect(gain); gain.connect(context.destination);
      source.start();
      this.showerSource = source; this.showerFilter = filter; this.showerGain = gain;
    } catch { this.stopShower(); }
  }

  stopShower() {
    try { this.showerSource?.stop(); } catch { /* Already stopped by the audio device. */ }
    this.showerSource?.disconnect(); this.showerFilter?.disconnect(); this.showerGain?.disconnect();
    this.showerSource = undefined; this.showerFilter = undefined; this.showerGain = undefined;
  }

  startSnore() {
    if (!this.sound || !this.unlocked || this.snoreSource || typeof AudioContext === 'undefined') return;
    try {
      this.showerContext ??= new AudioContext();
      const context=this.showerContext;
      void context.resume().catch(()=>{});
      if(!this.snoreBuffer){
        this.snoreBuffer=context.createBuffer(1,Math.round(context.sampleRate*5.2),context.sampleRate);
        const data=this.snoreBuffer.getChannelData(0);let air=0,rumble=0;
        for(let i=0;i<data.length;i++){
          const t=i/context.sampleRate;
          const breath=t<1.6?Math.sin(Math.PI*t/1.6)**2:t>2&&t<3.7?.7*Math.sin(Math.PI*(t-2)/1.7)**2:0;
          air=air*.9+(Math.random()*2-1)*.1;rumble=rumble*.998+air*.002;
          data[i]=breath*(air-rumble)*.7;
        }
      }
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=this.snoreBuffer;source.loop=true;gain.gain.setValueAtTime(.12,context.currentTime);
      source.connect(gain);gain.connect(context.destination);source.start();this.snoreSource=source;this.snoreGain=gain;
    }catch{this.stopSnore();}
  }
  stopSnore(){
    try{this.snoreSource?.stop();}catch{/* Device already stopped the source. */}
    this.snoreSource?.disconnect();this.snoreGain?.disconnect();this.snoreSource=undefined;this.snoreGain=undefined;
  }

  setMusic(name: string) {
    if (name === this.activeMusic && this.background && this.music) return;
    this.background?.pause();
    this.activeMusic = name;
    if (!name || !this.music || !this.unlocked || !this.catalog.sounds[name]) return;
    this.background = new Audio(`/assets/${this.catalog.sounds[name]}`);
    this.background.loop = true;
    this.background.volume = 0.22;
    void this.background.play().catch(() => {});
  }

  pause() { this.background?.pause(); this.tracks.forEach(track => track.pause()); this.stopShower(); this.stopSnore(); }
  resume() { if (this.music) void this.background?.play().catch(() => {}); }
  stop() { this.pause(); this.activeMusic = ''; }
}

export const audio = new GameAudio();
