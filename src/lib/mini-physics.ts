export const JUMP_SPEED = 420;
export const JUMP_GRAVITY = 700;
export const JUMP_RADIUS = 29;
export const SHOT_GRAVITY = 900;
export const movementSpeed = (width: number) => Math.max(320,width*.67);

export function jumpFlight(rise: number) {
  const discriminant = JUMP_SPEED**2-2*JUMP_GRAVITY*rise;
  return discriminant < 0 ? 0 : (JUMP_SPEED+Math.sqrt(discriminant))/JUMP_GRAVITY;
}

export function nextPlatform(from: {x:number;y:number;w:number},width:number,rng:()=>number=Math.random) {
  const rise = 70+Math.floor(rng()*16), w = Math.min(180,Math.max(100,width*.18));
  const reach = Math.min(200, movementSpeed(width)*jumpFlight(rise)*.55);
  const center = Math.max(w/2+8,Math.min(width-w/2-8,from.x+from.w/2+(rng()*2-1)*reach));
  return {x:center-w/2,y:from.y-rise,w};
}

export function hoopsLaunch(ball:{x:number;y:number},pull:{x:number;y:number},width:number) {
  const dx=ball.x-pull.x,dy=Math.max(-30,Math.min(120,pull.y-ball.y));
  return {vx:dx*4*Math.max(1,Math.sqrt(width/480)),vy:-(380+dy*5.5),power:Math.min(1,Math.hypot(dx,dy)/150)};
}

export function trajectory(ball:{x:number;y:number},velocity:{vx:number;vy:number},gravity:number,width:number) {
  const points:{x:number;y:number}[]=[];
  for(let i=0;i<=50;i++){
    const t=i*.045,x=ball.x+velocity.vx*t,y=ball.y+velocity.vy*t+.5*gravity*t*t;
    if(i>0&&(y>690||x<0||x>width))break;
    points.push({x,y});
  }
  return points;
}
