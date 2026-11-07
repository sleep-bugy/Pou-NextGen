export interface Point { x: number; y: number }
export interface PouGeometry { x: number; y: number; size: number }

const CURVES = [
  [-46, -148, -92, -84, -128, -15],
  [-154, 34, -160, 78, -135, 104],
  [-112, 133, -64, 141, 0, 141],
  [64, 141, 112, 133, 135, 104],
  [160, 78, 154, 34, 128, -15],
  [92, -84, 46, -148, 0, -148],
] as const;

export function tracePouBody(c: CanvasRenderingContext2D) {
  c.beginPath(); c.moveTo(0, -148);
  for (const curve of CURVES) c.bezierCurveTo(curve[0], curve[1], curve[2], curve[3], curve[4], curve[5]);
  c.closePath();
}

const outline: Point[] = [{ x: 0, y: -148 }];
for (const curve of CURVES) {
  const from = outline.at(-1)!;
  for (let step = 1; step <= 16; step++) {
    const t = step / 16, u = 1 - t;
    outline.push({
      x: u ** 3 * from.x + 3 * u ** 2 * t * curve[0] + 3 * u * t ** 2 * curve[2] + t ** 3 * curve[4],
      y: u ** 3 * from.y + 3 * u ** 2 * t * curve[1] + 3 * u * t ** 2 * curve[3] + t ** 3 * curve[5],
    });
  }
}

/** Hit testing and painting share the same body curves. */
export function containsPou(point: Point, geometry: PouGeometry): boolean {
  if (geometry.size <= 0) return false;
  const x = (point.x - geometry.x) * 300 / geometry.size;
  const y = (point.y - geometry.y) * 300 / geometry.size;
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i], b = outline[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Keep the base of Pou on the same floor as the character grows or shrinks. */
export function pouCanvasGeometry(width: number, height: number, scale = 1): PouGeometry {
  const adultSize = Math.min(width * 0.78, height * 0.75);
  const size = adultSize * scale;
  return { x: width * 0.5, y: height * 0.55 + (adultSize - size) * 141 / 300, size };
}

export function roomPouGeometry(width: number, height: number, scale = 1): PouGeometry {
  const body = pouCanvasGeometry(width * 0.76, height * 0.48, scale);
  return { x: body.x + width * 0.12, y: body.y + height * 0.26, size: body.size };
}

export function gazeAt(point: Point, geometry: PouGeometry): Point {
  if (geometry.size <= 0) return { x: 0, y: 0 };
  const eyeY = geometry.y - geometry.size / 6;
  return {
    x: Math.max(-1, Math.min(1, (point.x - geometry.x) / (geometry.size * 0.6))),
    y: Math.max(-1, Math.min(1, (point.y - eyeY) / (geometry.size * 0.7))),
  };
}
