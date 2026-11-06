import { containsPou, roomPouGeometry, type Point } from './pou-geometry.ts';

export type BathTool = 'soap' | 'shower';
export interface FoamBubble extends Point { id: number }
export interface WaterParticle extends Point {
  previousX: number; previousY: number; vx: number; vy: number;
  age: number; life: number; kind: 'drop' | 'splash' | 'runoff';
}

export function pointOnPou(point: Point, width: number, height: number): boolean {
  return containsPou({ x: point.x / 100 * width, y: point.y / 100 * height }, roomPouGeometry(width, height));
}

export function showerHitsPou(water: Point, width: number, height: number): boolean {
  for (let y = Math.max(water.y, 30); y < 72; y += 2) {
    const spread = Math.max(0, y - water.y) * 0.13;
    for (const x of [water.x - spread, water.x, water.x + spread]) if (pointOnPou({ x, y }, width, height)) return true;
  }
  return false;
}

export function rinseFoam(bubbles: FoamBubble[], water: Point): FoamBubble[] {
  let removed = 0;
  return bubbles.filter(bubble => {
    const underStream = bubble.y >= water.y && Math.abs(bubble.x - water.x) < 5 + (bubble.y - water.y) * 0.2;
    if (underStream && removed < 4) { removed++; return false; }
    return true;
  });
}

/** Bounded particle simulation: no timers per drop, no DOM nodes per frame. */
export class BathWater {
  particles: WaterParticle[] = [];
  wetness = 0;
  puddleX = 50;
  private emission = 0;
  private random: () => number;
  constructor(random: () => number = Math.random) { this.random = random; }

  step(seconds: number, water: Point | null, width: number, height: number, reducedMotion = false) {
    const dt = Math.min(Math.max(0, seconds), 0.04);
    if (width <= 0 || height <= 0 || !dt) return;
    this.wetness = Math.min(1, Math.max(0, this.wetness + dt * (water ? 0.65 : -0.8)));
    if (water) this.puddleX = water.x;
    if (reducedMotion) { this.particles = []; this.emission = 0; return; }
    this.emission = water ? this.emission + dt * 115 : 0;
    while (water && this.emission >= 1 && this.particles.length < 130) {
      this.emission--;
      this.add('drop', water.x + (this.random() - 0.5) * 1.6, water.y, (this.random() - 0.5) * 13, 42 + this.random() * 18, 1.2);
    }
    const survivors: WaterParticle[] = [], spawned: WaterParticle[] = [];
    for (const particle of this.particles) {
      particle.previousX = particle.x; particle.previousY = particle.y;
      particle.age += dt; particle.vy += dt * (particle.kind === 'drop' ? 85 : 30);
      particle.x += particle.vx * dt; particle.y += particle.vy * dt;
      if (particle.kind === 'drop' && (pointOnPou(particle, width, height) || particle.y >= 78)) {
        for (let i = 0; i < 2; i++) spawned.push(this.make('splash', particle.x, Math.min(particle.y, 78), (this.random() - 0.5) * 22, -4 - this.random() * 9, 0.22 + this.random() * 0.2));
        if (particle.y < 75) spawned.push(this.make('runoff', particle.x, particle.y, (this.random() - 0.5) * 4, 18 + this.random() * 12, 0.45));
      } else if (particle.age < particle.life && particle.y < 82 && particle.x > 0 && particle.x < 100) survivors.push(particle);
    }
    this.particles = [...survivors, ...spawned].slice(-160);
  }

  private make(kind: WaterParticle['kind'], x: number, y: number, vx: number, vy: number, life: number): WaterParticle {
    return { kind, x, y, previousX: x, previousY: y, vx, vy, age: 0, life };
  }
  private add(kind: WaterParticle['kind'], x: number, y: number, vx: number, vy: number, life: number) { this.particles.push(this.make(kind, x, y, vx, vy, life)); }
}

export function drawBathWater(c: CanvasRenderingContext2D, bath: BathWater, water: Point | null, width: number, height: number, reducedMotion = false) {
  const px = width / 100, py = height / 100;
  c.save();
  if (bath.wetness > 0.01) {
    c.fillStyle = `rgba(76,175,226,${bath.wetness * 0.14})`;
    c.beginPath(); c.ellipse(bath.puddleX * px, 78.5 * py, width * 0.15, height * 0.013, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(233,253,255,${bath.wetness * 0.5})`; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(bath.puddleX * px, 78.5 * py, width * 0.11, height * 0.007, 0, 0, Math.PI * 2); c.stroke();
  }
  c.lineCap = 'round';
  if (water && reducedMotion) {
    c.strokeStyle = 'rgba(133,213,250,.7)'; c.lineWidth = Math.max(1.2, width * 0.003);
    // Broken streams read as droplets even when motion is disabled.
    for (let i = -3; i <= 3; i++) {
      for (let segment = 0; segment < 4; segment++) {
        const start = 1 + segment * 7 + (Math.abs(i) % 2) * 2;
        const end = Math.min(start + 3.5, 74 - water.y);
        if (end <= start) continue;
        c.beginPath(); c.moveTo((water.x + i * (0.3 + start * 0.045)) * px, (water.y + start) * py);
        c.lineTo((water.x + i * (0.3 + end * 0.045)) * px, (water.y + end) * py); c.stroke();
      }
    }
  }
  for (const particle of bath.particles) {
    const alpha = Math.min(1, (particle.life - particle.age) * 5);
    c.strokeStyle = particle.kind === 'splash' ? `rgba(239,253,255,${alpha * 0.85})` : `rgba(113,204,247,${alpha * 0.8})`;
    c.lineWidth = Math.max(1.5, Math.min(width, height) * (particle.kind === 'drop' ? 0.005 : 0.003));
    const tail = particle.kind === 'drop' ? 2.1 : particle.kind === 'runoff' ? 0.85 : 0.5;
    c.beginPath(); c.moveTo(particle.x * px, particle.y * py);
    c.lineTo((particle.x - particle.vx * 0.018) * px, (particle.y - tail) * py); c.stroke();
    if (particle.kind === 'drop') {
      c.fillStyle = `rgba(230,251,255,${alpha * 0.8})`;
      c.beginPath(); c.arc(particle.x * px, particle.y * py, Math.max(1.2, Math.min(width, height) * 0.0025), 0, Math.PI * 2); c.fill();
    }
  }
  c.restore();
}
