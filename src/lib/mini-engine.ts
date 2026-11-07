import { getImage, GAMES, type GameInfo } from './assets';
import { drawPou } from './draw-pou';
import { audio } from './audio';
import type { PouLook } from './draw-pou';
import { createGameViewport, toGamePoint, responsiveGrid } from './viewport';
import { JUMP_SPEED, JUMP_GRAVITY, JUMP_RADIUS, SHOT_GRAVITY, movementSpeed, nextPlatform, hoopsLaunch, trajectory } from './mini-physics';

const H = 680;
const COLORS = ['#f2675e', '#58a8eb', '#8ac94a', '#f8d34e'];
const FOODS = ['apple', 'burger', 'watermelon', 'strawberry', 'banana', 'pizza', 'egg', 'carrot'];
const random = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) { const j = random(i + 1); [array[i], array[j]] = [array[j], array[i]]; }
  return array;
};
interface Item { x: number; y: number; v?: number; type?: number; w?: number; h?: number; coin?: boolean; coinX?: number; bonus?: boolean; }

export function winningLine(board: number[], columns: number, rows: number, count: number): number {
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const value = board[y * columns + x];
    if (value < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const endX = x + dx * (count - 1), endY = y + dy * (count - 1);
      if (endX < 0 || endX >= columns || endY < 0 || endY >= rows) continue;
      if (Array.from({ length: count }, (_, i) => board[(y + i * dy) * columns + x + i * dx]).every(v => v === value)) return value;
    }
  }
  return -1;
}

export function connectedGroup(board: number[], index: number, columns: number): number[] {
  const result: number[] = [], seen = new Set<number>(), queue = [index], value = board[index];
  while (queue.length) {
    const i = queue.pop()!;
    if (seen.has(i) || board[i] !== value) continue;
    seen.add(i); result.push(i);
    if (i % columns) queue.push(i - 1);
    if (i % columns < columns - 1) queue.push(i + 1);
    if (i >= columns) queue.push(i - columns);
    if (i + columns < board.length) queue.push(i + columns);
  }
  return result;
}

/** A run owns its clock, score, and any coins collected during play. */
export class MiniEngine {
  private W = 480;
  score = 0;
  lives = 3;
  collectedCoins = 0;
  remaining = 60;
  finished = false;
  paused = false;
  message = '';
  private elapsed = 0;
  private tick = 0;
  private player: Item = { x: 240, y: 530, v: 0 };
  private items: Item[] = [];
  private jetCoins: Item[] = [];
  private jetPipeCount = 0;
  private board: number[] = [];
  private selected: number[] = [];
  private matched = new Set<number>();
  private lockUntil = 0;
  private sequence: number[] = [];
  private entered = 0;
  private showing = true;
  private cups = [0, 1, 2];
  private cupProgress = 0;
  private cupRound = 0;
  private cupFrom = [0, 1, 2];
  private cupTo = [0, 1, 2];
  private swaps = 0;
  private revealUntil = 2;
  private targetColor = 0;
  private shot = false;
  private drag?: { x: number; y: number; currentX: number; currentY: number; pointerId: number };
  private moveTarget: number | null = null;
  private effects: {x:number;y:number;text:string;color:string;life:number}[]=[];
  private lastBasket = -10;
  private shotAge = 0;
  private pointerX = 240;
  private keys = new Set<string>();
  private totalHeight = 0;
  private foodUntilCoin = 2;
  private jumpCoinInterval = 5;
  private jumpUntilCoin = 5;
  private lastScore = -1;
  private frame = 0;
  private lastTime = 0;
  private resultMessage = '';
  private resize: ResizeObserver;
  private c: CanvasRenderingContext2D;
  private game: GameInfo;
  private signal = new AbortController();

  constructor(private canvas: HTMLCanvasElement, gameId: string, private look: PouLook,
    private onScore: (score: number, lives: number, time: number, coins: number) => void,
    private onEnd: (score: number, message: string) => void, private localize: (text: string) => string = text => text, private onCoin: (amount: number) => void = () => {}) {
    this.game = GAMES.find(g => g.id === gameId)!;
    this.c = canvas.getContext('2d')!;
    this.board = Array.from({ length: 36 }, () => random(4));
    if (this.game.mode === 'memory') this.board = shuffle(Array.from({ length: 16 }, (_, i) => i % 8));
    if (this.game.mode === 'tic') this.board = Array(9).fill(-1);
    if (this.game.mode === 'four') this.board = Array(42).fill(-1);
    if (this.game.mode === 'jump') this.seedJump();
    if (this.game.mode === 'catch') this.lives = 8;
    if (this.game.mode === 'fall') { this.lives = 5; this.seedFall(); }
    if (this.game.mode === 'fly') { this.player.x = 110; this.player.y = 300; }
    if (this.game.mode === 'run') { this.player.x = 100; this.player.y = 517; }
    if (this.game.mode === 'sounds') { this.sequence = [random(4)]; this.lockUntil = 1.5; }
    if (this.game.mode === 'hoops' || this.game.mode === 'goal') this.resetBall();
    if (this.game.mode === 'swap') this.removeInitialMatches();
    if (this.game.mode === 'sad') this.seedSad();
    if (this.game.mode === 'match') this.ensureMatch();
    if (this.game.mode === 'swap') this.ensureSwap();
    this.resize = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (!r.width || !r.height) return;
      const previousWidth = this.W;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      this.W = createGameViewport(canvas.width,canvas.height).width;
      const ratio = this.W / previousWidth;
      this.player.x *= ratio;
      if (this.shot && this.player.w) this.player.w *= ratio;
      if (this.game.mode === 'hoops' && !this.shot) this.player.x = this.W * .3;
      this.jetCoins.forEach(coin => coin.x *= ratio);
      this.items.forEach(item => {
        if (item.coinX !== undefined) item.coinX *= ratio;
        const oldWidth = item.w ?? 0;
        if (this.game.mode === 'jump') {
          item.w = Math.min(180,Math.max(80,oldWidth*ratio));
          item.x = Math.max(0,Math.min(this.W-item.w,(item.x+oldWidth/2)*ratio-item.w/2));
        } else { item.x *= ratio; if (item.w) item.w *= ratio; }
      });
      this.drag = undefined; this.selected = []; this.lastTime = 0;
      this.moveTarget = null;
      if(this.game.mode==='jump'&&!this.elapsed)this.seedJump();
      if(this.game.mode==='fall'&&!this.elapsed)this.seedFall();
      if (this.game.mode === 'swap' && !this.elapsed) this.removeInitialMatches();
      if(this.game.mode==='swap')this.ensureSwap();
      if(this.game.mode==='match')this.ensureMatch();
    });
    this.resize.observe(canvas);
    const options = { signal: this.signal.signal };
    canvas.addEventListener('pointerdown', this.down, options);
    canvas.addEventListener('pointermove', this.move, options);
    canvas.addEventListener('pointerup', this.up, options);
    canvas.addEventListener('pointercancel', this.cancel, options);
    window.addEventListener('keydown', this.keydown, options);
    window.addEventListener('keyup', this.keyup, options);
    window.addEventListener('blur', this.clearKeys, options);
    this.frame = requestAnimationFrame(this.loop);
  }

  destroy() { cancelAnimationFrame(this.frame); this.resize.disconnect(); this.signal.abort(); }
  private clearKeys = () => this.keys.clear();
  private seedJump() {
    this.jumpCoinInterval = 5; this.jumpUntilCoin = 5;
    const width=Math.min(180,Math.max(100,this.W*.18));
    this.items=[{x:this.W/2-width/2,y:590,w:width}];
    while(this.items.length<10)this.items.push(this.jumpPlatform(this.items.at(-1)!));
    this.player={x:this.W/2,y:590-JUMP_RADIUS,v:-JUMP_SPEED};
  }
  private fallCloud(y: number): Item {
    const width = Math.min(150, this.W * .32), x = Math.random() * (this.W - width);
    const coinX = x + width / 2 < this.W / 2 ? this.W - 45 : 45;
    return { x, y, w: width, coin: true, coinX };
  }
  private seedFall() {
    this.player = { x: this.W / 2, y: 380, v: 0 };
    this.items = Array.from({ length: 5 }, (_, i) => this.fallCloud(500 + i * 150));
  }
  private jumpPlatform(from: Item): Item {
    const coin = --this.jumpUntilCoin <= 0;
    if (coin) this.jumpUntilCoin = this.jumpCoinInterval;
    return { ...nextPlatform(from as {x:number;y:number;w:number}, this.W, Math.random), coin };
  }
  private awardCoin(x: number, y: number, amount = 1) {
    this.collectedCoins += amount; this.onCoin(amount); this.effect(`+${amount}`, x, y, '#fff2a4'); audio.play('coin');
  }
  private effect(text:string,x=this.player.x,y=this.player.y,color='#fff') { this.effects.push({text,x,y,color,life:.8});this.effects=this.effects.slice(-16); }
  private controlKey(key:string){return ({a:'ArrowLeft',d:'ArrowRight',w:'ArrowUp'} as Record<string,string>)[key.toLowerCase()]??key;}
  private keydown = (event: KeyboardEvent) => {
    const target=event.target as HTMLElement|null;
    if(target?.tagName&&/^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(target.tagName))return;
    const key=this.controlKey(event.key);
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(key)) return;
    event.preventDefault(); this.keys.add(key);
    if (!event.repeat && ['ArrowUp', ' '].includes(key)) this.action();
  };
  private keyup = (event: KeyboardEvent) => this.keys.delete(this.controlKey(event.key));
  private point(event: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return toGamePoint(event.clientX - r.left, event.clientY - r.top, r.width, r.height);
  }
  private down = (event: PointerEvent) => {
    event.preventDefault(); if (this.paused || this.finished) return;
    this.canvas.setPointerCapture(event.pointerId);
    const p = this.point(event); this.pointerX = p.x;
    if (['goal', 'hoops'].includes(this.game.mode)) {
      if(this.shot||Math.hypot(p.x-this.player.x,p.y-this.player.y)>48)return;
      this.drag={...p,currentX:p.x,currentY:p.y,pointerId:event.pointerId};
    }
    else if (this.game.mode==='catch') this.player.x=p.x;
    else if (['jump', 'fall'].includes(this.game.mode)) this.moveTarget=p.x;
    else if (['fly', 'run'].includes(this.game.mode)) this.action();
    else this.tap(p.x, p.y);
  };
  private move = (event: PointerEvent) => {
    const p = this.point(event); this.pointerX = p.x;
    if(this.drag&&event.pointerId===this.drag.pointerId){this.drag.currentX=p.x;this.drag.currentY=p.y;}
    if (!this.paused && this.game.mode==='catch') this.player.x = Math.max(28, Math.min(this.W-28, p.x));
    if (!this.paused && ['jump','fall'].includes(this.game.mode)) this.moveTarget=Math.max(28,Math.min(this.W-28,p.x));
  };
  private up = (event: PointerEvent) => {
    if (this.drag && event.pointerId===this.drag.pointerId && !this.shot && !this.paused) {
      const p = this.point(event), dx = p.x - this.drag.x, dy = p.y - this.drag.y;
      if(this.game.mode==='goal'&&dy>=-8){this.drag=undefined;return;}
      if (Math.hypot(dx, dy) > 12) {
        this.shot = true;
        const shot=hoopsLaunch(this.player,p,this.W);
        this.player.w = this.game.mode === 'hoops' ? shot.vx : dx*2.4;
        this.player.v = this.game.mode === 'hoops' ? shot.vy : Math.min(-350,dy*2);
        if (this.game.mode === 'goal' && dy > 0) this.player.v = -550;
        this.shotAge=0;
        audio.play('ball');
      }
    }
    this.drag = undefined;
  };
  private cancel = () => { this.drag = undefined; };
  private action() {
    if (this.paused || this.finished) return;
    if (this.game.mode === 'fly') { this.player.v = -270; audio.play('cloud'); }
    if (this.game.mode === 'run' && Math.abs(this.player.y-517)<1 && this.player.v===0 && !this.items.some(item=>item.type===1&&this.player.x>item.x&&this.player.x<item.x+item.w!)) { this.player.v = -540; audio.play('cloud'); }
  }

  private finish(message = 'Game Over!', win = false) {
    if (this.finished) return;
    this.finished = true; this.resultMessage = message;
    audio.play(win ? 'success' : 'game_over');
    this.onEnd(this.score, message);
  }

  private loop = (time: number) => {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.04) : 0;
    this.lastTime = time;
    if (!this.paused && !document.hidden && !this.finished) this.update(dt);
    this.draw();
    if (this.lastScore !== this.score || Math.floor(this.tick * 5) !== Math.floor((this.tick - dt) * 5)) {
      this.onScore(this.score, this.lives, Math.ceil(this.remaining), this.collectedCoins); this.lastScore = this.score;
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.elapsed += dt; this.tick += dt;
    this.effects.forEach(effect=>{effect.life-=dt;effect.y-=dt*20;});this.effects=this.effects.filter(effect=>effect.life>0);
    const mode = this.game.mode;
    const moveSpeed = movementSpeed(this.W);
    if (this.keys.has('ArrowLeft')) this.player.x -= dt * moveSpeed;
    if (this.keys.has('ArrowRight')) this.player.x += dt * moveSpeed;
    if(this.moveTarget!==null&&!this.keys.has('ArrowLeft')&&!this.keys.has('ArrowRight')&&['jump','fall'].includes(mode)){
      this.player.x+=Math.max(-dt*moveSpeed,Math.min(dt*moveSpeed,this.moveTarget-this.player.x));
    }
    if (!this.shot) this.player.x = Math.max(25, Math.min(this.W - 25, this.player.x));
    if (['color', 'sad', 'match', 'swap', 'goal', 'hoops'].includes(mode)) {
      this.remaining = Math.max(0, this.remaining - dt);
      if (!this.remaining) {this.finish('Time up!');return;}
    }
    if (mode === 'catch') {
      const interval = Math.max(0.2, 2 - this.score * 0.035);
      if (this.tick > interval) {
        this.tick = 0; this.items.push({ x: 30 + random(Math.max(1,this.W-60)), y: -40, type: random(12), v: 140 + this.score * 2 });
      }
      for (const item of this.items) {
        const before = item.y; item.y += dt * item.v!;
        if (before < 560 && item.y >= 560) {
          const caught = Math.abs(item.x - this.player.x) < 46;
          if (item.type! >= 8) {
            if (caught) { this.effect('Ouch!',item.x,560,'#ff8680'); audio.play('no'); this.finish(); }
          } else if (caught) {
            this.score++; audio.play('eat_1');
            if (--this.foodUntilCoin <= 0) { this.awardCoin(item.x, 560); this.foodUntilCoin = interval < .3 ? 3 : 2; }
          } else {
            this.lives--; audio.play('a2mmn');
            if (this.lives <= 0) this.finish();
          }
          item.y = 900;
        }
        if (this.finished) break;
      }
      this.items = this.items.filter(i => i.y < 800);
    }
    if (mode === 'jump') {
      const oldY = this.player.y;
      this.player.v! += dt * JUMP_GRAVITY; this.player.y += this.player.v! * dt;
      if (this.player.v! > 0) for (const platform of this.items) {
        if (oldY + JUMP_RADIUS <= platform.y && this.player.y + JUMP_RADIUS >= platform.y && this.player.x + 22 > platform.x && this.player.x - 22 < platform.x + platform.w!) {
          this.player.v = -JUMP_SPEED; this.player.y = platform.y-JUMP_RADIUS;
          if (platform.coin) { platform.coin = false; this.awardCoin(platform.x + platform.w! / 2, platform.y - 44); this.jumpCoinInterval = Math.max(3, this.jumpCoinInterval - 1); }
          this.effect('↑',this.player.x,platform.y,'#fff2a4');audio.play(Math.random() < .5 ? 'hu2u1' : 'hu2u2');break;
        }
      }
      if (this.player.y < 300) {
        const shift = 300 - this.player.y; this.totalHeight += shift;
        this.player.y = 300; this.items.forEach(i => i.y += shift);
        this.effects.forEach(effect=>effect.y+=shift);
        this.score = Math.floor(this.totalHeight / 10);
      }
      this.items = this.items.filter(i => i.y < H + 30);
      while (this.items.length < 10) {
        const last = this.items.reduce((a,b)=>a.y<b.y?a:b);
        this.items.push(this.jumpPlatform(last));
      }
      if (this.player.y > H + 40) this.finish();
    }
    if (mode === 'fall') {
      const speed = 120 + Math.min(120, this.elapsed * 1.8);
      for (const cloud of this.items) {
        const before = cloud.y; cloud.y -= speed * dt;
        if (before > this.player.y && cloud.y <= this.player.y) {
          if (this.player.x > cloud.x && this.player.x < cloud.x + cloud.w!) {
            this.lives--; this.effect('Ouch!',this.player.x,this.player.y,'#ff8680'); audio.play('a2mmn');
            if (this.lives <= 0) { this.finish(); break; }
          } else { this.score++; audio.play(Math.random() < .5 ? 'cloud' : 'cloud2'); }
        }
        if (cloud.coin && before + 30 > this.player.y && cloud.y + 30 <= this.player.y && Math.abs(this.player.x - cloud.coinX!) < 35) {
          cloud.coin = false; this.awardCoin(cloud.coinX!, this.player.y);
        }
      }
      this.items = this.items.filter(i => i.y > -50);
      while (this.items.length < 5) this.items.push(this.fallCloud(Math.max(H, ...this.items.map(i=>i.y)) + 150));
    }
    if (mode === 'fly') {
      this.player.v! += dt * 650; this.player.y += this.player.v! * dt;
      if (this.tick > 1.6) {
        this.tick = 0;
        const pipe = { x: this.W+40, y: 160 + random(240), type: 0 };
        this.items.push(pipe);
        const index = this.jetPipeCount++;
        if ((index + 1) % 20 === 0) this.jetCoins.push({ x: pipe.x + 32, y: pipe.y, bonus: true });
        else if (index % 2 === 0) this.jetCoins.push({ x: pipe.x + 32, y: pipe.y });
      }
      for (const pipe of this.items) {
        pipe.x -= dt * (150 + this.score * 3) * Math.max(1,Math.sqrt(this.W/480));
        if (!pipe.type && pipe.x + 64 < this.player.x) { pipe.type = 1; this.score++; audio.play('point'); }
        if (Math.abs(this.player.x - (pipe.x + 32)) < 52 && (this.player.y - 23 < pipe.y - 96 || this.player.y + 23 > pipe.y + 96)) this.finish();
      }
      this.items = this.items.filter(i => i.x > -100);
      for (const coin of this.jetCoins) {
        coin.x -= dt * (150 + this.score * 3) * Math.max(1,Math.sqrt(this.W/480));
        if (Math.hypot(coin.x - this.player.x, coin.y - this.player.y) < 36) { this.awardCoin(coin.x, coin.y, coin.bonus ? 5 : 1); coin.x = -1000; }
      }
      this.jetCoins = this.jetCoins.filter(coin => coin.x > -100);
      if (this.player.y < 0 || this.player.y > 620) this.finish();
    }
    if (mode === 'run') {
      const oldY=this.player.y;
      this.player.v! += dt * 1200; this.player.y += this.player.v! * dt;
      if (oldY<=517 && this.player.y > 517 && !this.items.some(i => i.type === 1 && this.player.x > i.x && this.player.x < i.x + i.w!)) { this.player.y = 517; this.player.v = 0; }
      const speedFactor = Math.max(1,Math.sqrt(this.W/480));
      if (this.tick > 1.2 + Math.random() * 0.7) { this.tick = 0; this.items.push({ x: this.W+70, y: 510, type: random(2), w: (70 + random(30))*speedFactor }); }
      this.items.forEach(i => { i.x -= dt * (220 + this.elapsed * 2)*speedFactor; });
      if (this.items.some(i => i.type === 0 && Math.abs(i.x - this.player.x) < 35 && this.player.y > 470) || this.player.y > H) this.finish();
      this.items = this.items.filter(i => i.x > -150); this.score = Math.floor(this.elapsed * 4);
    }
    if (mode === 'memory' && this.selected.length === 2 && this.elapsed > this.lockUntil) this.selected = [];
    if (mode === 'cups') {
      if (this.elapsed > this.revealUntil && this.swaps < 4 + Math.min(6, this.cupRound)) {
        if (this.cupProgress === 0) {
          this.cupFrom = [...this.cups]; this.cupTo = [...this.cups];
          const a = random(3), b = (a + 1 + random(2)) % 3;
          [this.cupTo[a], this.cupTo[b]] = [this.cupTo[b], this.cupTo[a]];
        }
        this.cupProgress += dt * (1.7 + this.cupRound * 0.18);
        if (this.cupProgress >= 1) { this.cupProgress = 0; this.cups = [...this.cupTo]; this.swaps++; audio.play('shuffle', 0.2); }
      }
    }
    if (mode === 'sounds') {
      if (this.showing && this.elapsed > this.lockUntil + this.sequence.length * 0.72) { this.showing = false; this.entered = 0; }
      const step = Math.floor((this.elapsed - this.lockUntil) / 0.72);
      if (this.showing && step >= 0 && step < this.sequence.length && Math.floor((this.elapsed - dt - this.lockUntil) / 0.72) !== step) audio.play(`pitch${this.sequence[step] + 1}`);
    }
    if (mode === 'goal' || mode === 'hoops') this.updateBall(dt);
  }

  private updateBall(dt: number) {
    if (!this.shot) return;
    const oldY = this.player.y;
    this.player.x += this.player.w! * dt;
    this.shotAge+=dt;
    if (this.game.mode === 'hoops') this.player.v! += dt * SHOT_GRAVITY;
    this.player.y += this.player.v! * dt;
    const hoopY = 285;
    if (this.game.mode === 'hoops' && this.player.v! > 0 && oldY < hoopY && this.player.y >= hoopY && Math.abs(this.player.x - this.W*.78) < 40) {
      this.score += 3;this.lastBasket=this.elapsed;this.effect('+3',this.W*.78,260,'#a9f989'); audio.play('point'); this.resetBall();
    } else if (this.game.mode === 'goal' && this.player.y < 210) {
      const goalWidth = this.goalWidth();
      const keeper = this.W/2 + Math.sin(this.elapsed * 2) * goalWidth*.38;
      if (this.player.x > (this.W-goalWidth)/2+15 && this.player.x < (this.W+goalWidth)/2-15 && Math.abs(this.player.x - keeper) > 40) { this.score++;this.effect('GOAL!',this.player.x,190,'#a9f989'); audio.play('point'); }
      else { this.lives--;this.effect('Saved!',this.player.x,190,'#ffaaa0'); audio.play('no'); }
      this.resetBall();
    } else if (this.player.y > H || this.player.x < -50 || this.player.x > this.W + 50 || this.shotAge>3) { this.lives--;this.effect('Miss',this.player.x,560,'#ffaaa0');audio.play('no'); this.resetBall(); }
    if (this.lives <= 0) this.finish();
  }
  private resetBall() { this.shot = false; this.player = { x: this.game.mode==='hoops'?this.W*.3:this.W/2, y: this.game.mode==='hoops'?520:570, v: 0, w: 0 }; }
  private goalWidth() { return Math.min(this.W-60,Math.max(220,Math.min(900,this.W*.65))); }
  private grid() { return responsiveGrid(this.W,H,this.board.length,this.game.mode==='memory'?135:130); }

  private tap(x: number, y: number) {
    const mode = this.game.mode;
    if (mode === 'cups') {
      if (this.elapsed <= this.revealUntil || this.swaps < 4 + Math.min(6, this.cupRound)) return;
      const slot = Math.floor(x/(this.W/3));
      if (slot < 0 || slot > 2 || y < 250 || y > 530) return;
      if (this.cups[0] === slot) {
        this.score += 5; this.cupRound++; audio.play('success'); this.revealUntil = this.elapsed + 1.4; this.swaps = 0;
      } else this.finish('Pou was under another cup!');
      return;
    }
    if (mode === 'sounds') {
      if (this.showing) return;
      const grid = responsiveGrid(this.W,H,4,160);
      const col = Math.floor((x-grid.left)/grid.cell), row = Math.floor((y-grid.top)/grid.cell);
      if (col < 0 || col >= grid.columns || row < 0 || row >= grid.rows) return;
      const i = row * grid.columns + col; audio.play(`pitch${i + 1}`);
      if (i !== this.sequence[this.entered]) { this.finish('Try to remember the sequence!'); return; }
      this.entered++;
      if (this.entered === this.sequence.length) { this.score++; this.sequence.push(random(4)); this.showing = true; this.lockUntil = this.elapsed + 1; }
      return;
    }
    if (mode === 'tic') {
      const grid = responsiveGrid(this.W,H,9,160,3);
      const col = Math.floor((x-grid.left)/grid.cell), row = Math.floor((y-grid.top)/grid.cell), i = row * 3 + col;
      if (col < 0 || col > 2 || row < 0 || row > 2 || this.board[i] !== -1) return;
      this.board[i] = 0; audio.play('click');
      if (this.checkBoard(3, 3, 3)) return;
      const empty = this.board.map((v, j) => v === -1 ? j : -1).filter(v => v >= 0);
      const strategic = (player: number) => empty.find(j => { const copy = [...this.board]; copy[j] = player; return winningLine(copy, 3, 3, 3) === player; });
      const ai = strategic(1) ?? strategic(0) ?? (this.board[4] === -1 ? 4 : empty[random(empty.length)]);
      this.board[ai] = 1; this.checkBoard(3, 3, 3); return;
    }
    if (mode === 'four') {
      const grid = responsiveGrid(this.W,H,42,150,7);
      const col = Math.floor((x-grid.left)/grid.cell);
      if (col < 0 || col > 6 || y < grid.top || y > grid.top+grid.rows*grid.cell) return;
      const drop = (column: number, player: number, board = this.board) => {
        for (let row = 5; row >= 0; row--) if (board[row * 7 + column] === -1) { board[row * 7 + column] = player; return true; }
        return false;
      };
      if (!drop(col, 0)) return;
      audio.play('click'); if (this.checkBoard(7, 6, 4)) return;
      const open = shuffle(Array.from({ length: 7 }, (_, i) => i).filter(i => this.board[i] === -1));
      let ai = open[0];
      for (const player of [0, 1]) for (const candidate of open) { const copy = [...this.board]; drop(candidate, player, copy); if (winningLine(copy, 7, 6, 4) === player) ai = candidate; }
      drop(ai, 1); this.checkBoard(7, 6, 4); return;
    }
    const {columns,cell,left,top} = this.grid();
    const col = Math.floor((x - left) / cell), row = Math.floor((y - top) / cell), index = row * columns + col;
    if (col < 0 || col >= columns || row < 0 || index >= this.board.length) return;
    if (mode === 'memory') {
      if (this.selected.length >= 2 || this.matched.has(index) || this.selected.includes(index)) return;
      this.selected.push(index); audio.play('click');
      if (this.selected.length === 2) {
        if (this.board[this.selected[0]] === this.board[this.selected[1]]) {
          this.selected.forEach(i => this.matched.add(i)); this.selected = []; this.score += 20;this.effect('+20',x,y,'#a9f989'); this.awardCoin(x, y); audio.play('match');
          if (this.matched.size === 16) this.finish('Great memory!', true);
        } else this.lockUntil = this.elapsed + 0.75;
      }
    } else if (mode === 'color') {
      this.board[index] = (this.board[index] + 1) % 4; audio.play('click');
      if (this.board.every(v => v === this.targetColor)) { this.score += 36; this.remaining += 15; this.targetColor = random(4); this.board = this.board.map(() => random(4));this.effect('+36',this.W/2,110,'#a9f989'); audio.play('success'); }
    } else if (mode === 'sad') {
      if (this.board[index] === 0) { this.board[index] = 1 + random(3); this.score++; audio.play('point');
        if (!this.board.includes(0)) { this.seedSad();this.remaining += 3;this.effect('Clear!',this.W/2,100,'#a9f989'); }
      } else { this.remaining = Math.max(0, this.remaining - 2); audio.play('no'); }
    } else if (mode === 'match') {
      const group = connectedGroup(this.board, index, columns);
      if (group.length >= 3) {
        const gain=group.length*(group.length-2);this.score+=gain;group.forEach(i => this.board[i] = -1);this.collapse();this.ensureMatch();this.effect(`+${gain}`,x,y,'#a9f989'); audio.play('match');
      } else audio.play('no');
    } else if (mode === 'swap') {
      if (!this.selected.length) { this.selected = [index]; return; }
      const first = this.selected[0]; this.selected = [];
      if (Math.abs(first % columns - col) + Math.abs(Math.floor(first / columns) - row) !== 1) { this.selected = [index]; return; }
      [this.board[first], this.board[index]] = [this.board[index], this.board[first]];
      const matches = this.findMatches();
      if (!matches.length) { [this.board[first], this.board[index]] = [this.board[index], this.board[first]]; audio.play('no'); }
      else {
        let chain=0,gain=0,current=matches;
        while(current.length&&chain<12){chain++;gain+=current.length*3*chain;current.forEach(i=>this.board[i]=-1);this.collapse();current=this.findMatches();}
        this.score+=gain;if(current.length)this.removeInitialMatches();this.ensureSwap();this.effect(chain>1?`Combo x${chain}! +${gain}`:`+${gain}`,x,y,'#a9f989');audio.play('match');
      }
    }
  }

  private checkBoard(columns: number, rows: number, count: number) {
    const winner = winningLine(this.board, columns, rows, count);
    if (winner >= 0) { this.score = winner === 0 ? 30 : 0; this.finish(winner === 0 ? 'You win!' : 'Pou wins!', winner === 0); return true; }
    if (!this.board.includes(-1)) { this.score = 10; this.finish('Draw!', false); return true; }
    return false;
  }
  private findMatches() {
    const matches = new Set<number>();
    const {columns} = this.grid();
    for (let i = 0; i < this.board.length; i++) for (const step of [1, columns]) {
      if (step === 1 && i % columns > columns-3 || i + step * 2 >= this.board.length) continue;
      if (this.board[i] === this.board[i + step] && this.board[i] === this.board[i + step * 2]) [i, i + step, i + step * 2].forEach(j => matches.add(j));
    }
    return [...matches];
  }
  private removeInitialMatches() {
    const {columns} = this.grid();
    for (let i = 0; i < this.board.length; i++) {
      let attempts = 0;
      while (attempts++ < 20 && ((i % columns > 1 && this.board[i] === this.board[i - 1] && this.board[i] === this.board[i - 2]) || (i >= columns*2 && this.board[i] === this.board[i - columns] && this.board[i] === this.board[i - columns*2]))) this.board[i] = random(4);
    }
  }
  private collapse() {
    const {columns,rows} = this.grid();
    for (let col = 0; col < columns; col++) {
      const values = Array.from({ length: rows }, (_, row) => this.board[row * columns + col]).filter(v => v >= 0);
      while (values.length < rows) values.unshift(random(4));
      values.forEach((value, row) => this.board[row * columns + col] = value);
    }
  }
  private seedSad(){this.board=this.board.map(()=>random(4));if(!this.board.includes(0))this.board[random(this.board.length)]=0;}
  private ensureMatch(){
    const {columns}=this.grid();
    if(this.board.some((_,i)=>connectedGroup(this.board,i,columns).length>=3))return;
    for(let attempt=0;attempt<15;attempt++){shuffle(this.board);if(this.board.some((_,i)=>connectedGroup(this.board,i,columns).length>=3))return;}
    this.board[0]=this.board[1]=this.board[2]=0;
  }
  private hasSwap(){
    const {columns}=this.grid();
    for(let i=0;i<this.board.length;i++)for(const j of [i%columns<columns-1?i+1:-1,i+columns]){
      if(j<0||j>=this.board.length)continue;
      [this.board[i],this.board[j]]=[this.board[j],this.board[i]];
      const found=this.findMatches().length>0;
      [this.board[i],this.board[j]]=[this.board[j],this.board[i]];
      if(found)return true;
    }
    return false;
  }
  private ensureSwap(){
    if(!this.findMatches().length&&this.hasSwap())return;
    for(let attempt=0;attempt<15;attempt++){shuffle(this.board);this.removeInitialMatches();if(!this.findMatches().length&&this.hasSwap())return;}
    const {columns}=this.grid();this.board=this.board.map((_,i)=>(i%columns+Math.floor(i/columns))%4);
    this.board[0]=0;this.board[1]=1;this.board[2]=0;this.board[columns+1]=0;
  }

  private text(text: string, x: number, y: number, size = 26, color = '#fff') {
    text = this.localize(text);
    const c = this.c; c.font = `${size}px Pou, sans-serif`; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#242424'; c.strokeText(text, x, y); c.fillStyle = color; c.fillText(text, x, y);
  }
  private sprite(path: string, x: number, y: number, width: number, height = width) {
    const image = getImage(path);
    if (image) this.c.drawImage(image, x - width / 2, y - height / 2, width, height);
  }
  private rounded(x: number, y: number, w: number, h: number, fill: string, radius = 12) {
    const c = this.c; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill(); c.strokeStyle = '#303026'; c.lineWidth = 3; c.stroke();
  }
  private draw() {
    const c = this.c;
    const mode = this.game.mode;
    const fit = createGameViewport(this.canvas.width, this.canvas.height);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = ['catch', 'memory', 'cups', 'sounds', 'tic', 'four', 'color', 'sad', 'match', 'swap'].includes(mode) ? '#d9df91' : '#91d9f7';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(fit.scale, 0, 0, fit.scale, fit.x, fit.y);
    c.fillRect(0, 0, this.W, H);
    if (['catch', 'fly', 'run', 'jump', 'fall'].includes(mode)) {
      const clouds = Math.max(3,Math.ceil(this.W/180));
      for (let i = 0; i < clouds; i++) this.sprite('games/jump/cloud.png', ((i * this.W/clouds + 50 - this.elapsed * 6) % (this.W+120)+(this.W+120))%(this.W+120)-60, 100 + i % 3 * 110, 100, 40);
    }
    if (mode === 'catch') {
      c.fillStyle = '#a8d178'; c.fillRect(0, 588, this.W, H);
      for (let x = 0; x < this.W; x += 480) this.sprite('games/food/cloth.png', x+240, 605, 480, 130);
      drawPou(c, this.player.x, 558, 88, { ...this.look, mouth: 0.65, lookY: -1 });
      for (const item of this.items) this.sprite(item.type! < 8 ? `food/${FOODS[item.type!]}.png` : ['games/food/shoe.png','games/food/horseshoe.png','games/food/cd.png','games/food/plane.png'][item.type! - 8], item.x, item.y, 48);
    } else if (mode === 'jump') {
      for (const platform of this.items) {
        this.sprite('games/jump/ground1.png', platform.x + platform.w! / 2, platform.y + 10, platform.w!, 28);
        if (platform.coin) this.sprite('coin/coin_sm.png', platform.x + platform.w! / 2, platform.y - 44, 32, 32);
      }
      drawPou(c, this.player.x, this.player.y, 62, this.look);
    } else if (mode === 'fall') {
      for (const cloud of this.items) {
        this.sprite('games/fall/cloud.png', cloud.x + cloud.w! / 2, cloud.y, cloud.w!, 42);
        if (cloud.coin) this.sprite('coin/coin_sm.png', cloud.coinX!, cloud.y + 30, 32, 32);
      }
      drawPou(c, this.player.x, this.player.y, 50, this.look);
    } else if (mode === 'fly') {
      for (const pipe of this.items) {
        const trunk = getImage('games/jetpou/trunk.png');
        if (trunk) { c.drawImage(trunk, pipe.x, pipe.y - 96 - 640, 64, 640); c.save(); c.translate(pipe.x + 64, pipe.y + 96 + 640); c.rotate(Math.PI); c.drawImage(trunk, 0, 0, 64, 640); c.restore(); }
        else { this.rounded(pipe.x, 0, 64, pipe.y - 96, '#a47a4c'); this.rounded(pipe.x, pipe.y + 96, 64, H - pipe.y - 96, '#a47a4c'); }
      }
      for (const coin of this.jetCoins) this.sprite(coin.bonus ? 'coin/coins_5_sm.png' : 'coin/coin_sm.png', coin.x, coin.y, coin.bonus ? 42 : 32, 32);
      this.sprite('games/jetpou/jetpack.png', this.player.x - 18, this.player.y + 10, 24, 50);
      this.sprite('games/jetpou/fire.png', this.player.x - 24, this.player.y + 47, 14, 28);
      drawPou(c, this.player.x, this.player.y, 52, this.look);
      c.fillStyle = '#bc9059'; c.fillRect(0, 640, this.W, 40);
    } else if (mode === 'run') {
      c.fillStyle = '#6d4d39'; c.fillRect(0, 550, this.W, 130); c.fillStyle = '#80b852'; c.fillRect(0, 543, this.W, 14);
      for (const item of this.items) {
        if (item.type === 1) { c.fillStyle = '#91d9f7'; c.fillRect(item.x, 543, item.w!, 137); }
        else this.sprite('games/cliffdash/hayroll.png', item.x, 520, 60);
      }
      drawPou(c, this.player.x, this.player.y, 60, this.look);
    } else if (mode === 'cups') {
      this.text(this.elapsed <= this.revealUntil ? 'Watch Pou!' : this.swaps < 4 + Math.min(6, this.cupRound) ? 'Watch carefully...' : 'Where is Pou?', this.W/2, 160, 30);
      c.fillStyle = '#a87d4a'; c.fillRect(0, 465, this.W, 215);
      for (let i = 0; i < 3; i++) {
        const position = this.cupProgress ? this.cupFrom[i] + (this.cupTo[i] - this.cupFrom[i]) * this.cupProgress : this.cups[i];
        const x = (position+.5)*this.W/3;
        if (i === 0 && this.elapsed <= this.revealUntil) drawPou(c, x, 430, 55, this.look);
        const cupWidth = Math.max(90,Math.min(180,this.W*.22));
        this.sprite('games/cups/cup.png', x, i === 0 && this.elapsed <= this.revealUntil ? 320 : 405, cupWidth, cupWidth*130/105);
      }
    } else if (mode === 'sounds') {
      const step = Math.floor((this.elapsed - this.lockUntil) / 0.72);
      const lit = this.showing && step >= 0 && step < this.sequence.length ? this.sequence[step] : -1;
      this.text(this.showing ? 'Listen...' : 'Your turn!', this.W/2, 100, 34);
      const grid = responsiveGrid(this.W,H,4,160);
      for (let i = 0; i < 4; i++) {
        const x = grid.left+(i%grid.columns+.5)*grid.cell, y = grid.top+(Math.floor(i/grid.columns)+.5)*grid.cell;
        this.rounded(x-grid.cell/2+5,y-grid.cell/2+5,grid.cell-10,grid.cell-10,lit === i ? '#fff' : COLORS[i]);
        drawPou(c, x, y, grid.cell * (lit === i ? .7 : .6), { body: COLORS[i], mouth: lit === i ? 1 : 0 });
      }
      this.text(`Round ${this.sequence.length}`, this.W/2, 650);
    } else if (mode === 'tic' || mode === 'four') {
      const grid = responsiveGrid(this.W,H,this.board.length,mode==='tic'?160:150,mode==='tic'?3:7);
      const {columns,rows,cell,left,top} = grid;
      this.text('Your turn', this.W/2, 95, 32);
      if (this.W > 900) {
        drawPou(c,left*.5,360,140,this.look);this.text('You',left*.5,465,25);
        drawPou(c,this.W-left*.5,360,140,{body:'#f383a9'});this.text('Pou',this.W-left*.5,465,25);
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const x = left + col * cell, y = top + row * cell;
        this.rounded(x + 3, y + 3, cell - 6, cell - 6, '#f4efc9', 8);
        const value = this.board[row * columns + col];
        if (value >= 0) drawPou(c, x + cell / 2, y + cell / 2, cell * 0.73, { body: value === 0 ? this.look.body : '#f383a9' });
      }
    } else if (mode === 'goal' || mode === 'hoops') {
      c.fillStyle = mode === 'goal' ? '#69bc68' : '#edc294'; c.fillRect(0, 0, this.W, H);
      if (mode === 'goal') {
        const goalWidth=this.goalWidth(), goalLeft=(this.W-goalWidth)/2;
        this.rounded(goalLeft,120,goalWidth,125,'#fff',2);this.rounded(goalLeft+10,130,goalWidth-20,110,'#b9cfc3',1);
        c.strokeStyle = '#f5f5f5'; c.lineWidth = 1;
        for (let x = goalLeft+10; x < goalLeft+goalWidth-10; x += 20) { c.beginPath(); c.moveTo(x, 130); c.lineTo(x, 240); c.stroke(); }
        for (let y = 130; y < 240; y += 20) { c.beginPath(); c.moveTo(goalLeft+10, y); c.lineTo(goalLeft+goalWidth-10, y); c.stroke(); }
        drawPou(c, this.W/2 + Math.sin(this.elapsed * 2) * goalWidth*.38, 225, 70, this.look);
      } else {
        const hoopX=this.W*.78;
        this.sprite('games/hoops/netstand.png', hoopX+55, 400, 80, 400);
        const sway=this.elapsed-this.lastBasket<.45?Math.sin((this.elapsed-this.lastBasket)*24)*6:0;
        this.sprite('games/hoops/net.png', hoopX, 305+sway, 95, 80);
        c.strokeStyle = '#b53113'; c.lineWidth = 7; c.beginPath(); c.ellipse(hoopX, 285, 48, 10, 0, 0, Math.PI * 2); c.stroke();
      }
      if(!this.shot){
        c.strokeStyle='#fff9';c.lineWidth=3;c.beginPath();c.arc(this.player.x,this.player.y,35,0,Math.PI*2);c.stroke();
      }
      if(this.drag&&!this.shot){
        const point={x:this.drag.currentX,y:this.drag.currentY};
        const velocity=mode==='hoops'?hoopsLaunch(this.player,point,this.W):{vx:(point.x-this.drag.x)*2.4,vy:Math.min(-350,(point.y-this.drag.y)*2),power:Math.min(1,Math.hypot(point.x-this.drag.x,point.y-this.drag.y)/150)};
        const dots=trajectory(this.player,velocity,mode==='hoops'?SHOT_GRAVITY:0,this.W);
        c.strokeStyle='#ffffffe0';c.lineWidth=2;c.setLineDash([8,7]);c.beginPath();c.moveTo(this.player.x,this.player.y);c.lineTo(point.x,point.y);c.stroke();c.setLineDash([]);
        for(let i=1;i<dots.length;i++){
          c.globalAlpha=Math.max(.2,1-i/dots.length);c.fillStyle='#fff';c.beginPath();c.arc(dots[i].x,dots[i].y,3.5,0,Math.PI*2);c.fill();
        }
        c.globalAlpha=1;
        const barWidth=Math.min(180,this.W*.32),left=this.player.x-barWidth/2;
        this.rounded(left,590,barWidth,13,'#eddec2',6);
        c.fillStyle=velocity.power>.85?'#f1b04f':'#72c77d';c.fillRect(left+2,592,(barWidth-4)*velocity.power,9);
        this.text(`Power ${Math.round(velocity.power*100)}%`,this.player.x,632,20);
      }
      this.sprite(mode === 'hoops' ? 'balls/400/red.png' : 'balls/300/l1.png', this.player.x, this.player.y, 54);
      if (!this.shot&&!this.drag) this.text(mode === 'goal' ? 'Swipe the ball upward!' : 'Drag the ball down-left, then release!', this.W/2, 650, Math.min(24,this.W/22));
    } else {
      const memory = mode === 'memory';
      const {columns,cell,left,top} = this.grid();
      if (mode === 'color') { this.text('Make them all this color:', this.W/2, 64, 24); drawPou(c, this.W/2, 100, 42, { body: COLORS[this.targetColor] }); }
      if (mode === 'sad') this.text('Tap the sad Pous!', this.W/2, 90, 28);
      for (let i = 0; i < this.board.length; i++) {
        const x = left + i % columns * cell + cell / 2, y = top + Math.floor(i / columns) * cell + cell / 2;
        if (memory) {
          const faceUp = this.selected.includes(i) || this.matched.has(i);
          this.sprite(faceUp ? 'games/memory/card_front.png' : 'games/memory/card_back.png', x, y, cell - 8, cell - 8);
          if (faceUp) this.sprite(`food/${FOODS[this.board[i]]}.png`, x, y, cell * 0.58);
        } else {
          this.rounded(x - cell / 2 + 2, y - cell / 2 + 2, cell - 4, cell - 4, this.selected.includes(i) ? '#fff392' : '#f5ecc1', 7);
          if (mode === 'swap') this.sprite(`food/${FOODS[this.board[i]]}.png`, x, y, cell * 0.72);
          else drawPou(c, x, y, cell * 0.76, { body: COLORS[this.board[i]], sad: mode === 'sad' && this.board[i] === 0 });
        }
      }
      if (mode === 'swap') this.text('Swap food to match 3', this.W/2, 90, 26);
      if (mode === 'match') this.text('Tap matching groups of 3+', this.W/2, 90, 25);
    }
    for(const effect of this.effects){c.globalAlpha=Math.min(1,effect.life*2);this.text(effect.text,effect.x,effect.y,27,effect.color);}c.globalAlpha=1;
    if (this.finished && this.resultMessage) this.text(this.resultMessage, this.W/2, 75, 30);
    if (this.paused) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, this.W, H); this.text('Paused', this.W/2, 340, 46); }
  }
}
