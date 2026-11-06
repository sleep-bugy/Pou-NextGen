/** Height sets sprite scale; the playable world expands across the complete width. */
export function createGameViewport(width: number, height: number) {
  const scale = height > 0 ? height / 680 : 1;
  return { scale, width: Math.max(1,width / scale), height: 680, x: 0, y: 0 };
}

export function toGamePoint(x: number, y: number, width: number, height: number) {
  const fit = createGameViewport(width, height);
  return { x: (x - fit.x) / fit.scale, y: (y - fit.y) / fit.scale };
}

export function responsiveGrid(width: number, height: number, count: number, top = 130, fixedColumns?: number) {
  const availableWidth = Math.max(1,width - 72), availableHeight = Math.max(1,height - top - 40);
  let columns = fixedColumns ?? 1, cell = 0;
  const candidates = fixedColumns ? [fixedColumns] : Array.from({length:count},(_,i)=>i+1).filter(n=>count%n===0);
  for (const candidate of candidates) {
    const candidateCell = Math.min(availableWidth / candidate, availableHeight / (count / candidate));
    if (candidateCell > cell) { cell = candidateCell; columns = candidate; }
  }
  return { columns, rows: count / columns, cell, left: (width - columns * cell) / 2, top };
}
