import { mkdir,readFile,writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { MODERN_ICON_NAMES,FOOD_ICON_NAMES } from '../src/lib/icon-theme.ts';
import {createFoodIcons} from './food-icons.mjs';

// The potion set establishes the shared 128px canvas, 4px ink, glass and gradients.
const ink='#191b22';
const colors={gold:['#ffe987','#d6972f'],pink:['#ffbed0','#d9779b'],red:['#ffb1a1','#d76367'],green:['#b9ef92','#53a87b'],teal:['#a1f1df','#489fa8'],blue:['#b5e5ff','#6c95cf'],purple:['#e0baf9','#936db8'],cream:['#fff8df','#d5bd8d'],metal:['#ecf3f2','#92abb2'],dark:['#66738b','#303e53'],cocoa:['#c5987c','#765347'],orange:['#ffd09b','#dd8945']};
const fill=name=>`url(#${name})`;
const path=(d,color='none',extra='')=>`<path d="${d}" fill="${colors[color]?fill(color):color}" ${extra}/>`;
const circle=(x,y,r,color='cream',extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${colors[color]?fill(color):color}" ${extra}/>`;
const rect=(x,y,w,h,r,color='cream',extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${colors[color]?fill(color):color}" ${extra}/>`;
const line=d=>path(d);
const gleam=d=>path(d,'none','stroke="#fff" stroke-opacity=".65" stroke-width="4"');
const cross=path('M56 36h16v20h20v16H72v20H56V72H36V56h20Z','#fff5df');
const bolt=path('m70 24-29 43h22l-9 37 34-49H66l13-31Z','gold');
const heart=path('M64 104 24 64C1 38 35 13 64 41 93 13 127 38 104 64Z','pink');
const star=path('m64 13 15 32 36 5-26 26 6 36-31-17-31 17 6-36-26-26 36-5Z','gold');
function face(color='gold',sad=false){return circle(64,64,43,color)+circle(49,55,5,ink,'stroke="none"')+circle(79,55,5,ink,'stroke="none"')+line(sad?'M47 84q17-17 34 0':'M45 76q19 23 38 0')+gleam('M35 47q9-17 25-18');}
function pou(color='gold',sad=false){return path('M64 13c-15 0-48 59-48 80 0 20 21 23 48 23s48-3 48-23c0-21-33-80-48-80Z',color)+circle(51,58,14,'#fff8e9')+circle(78,58,14,'#fff8e9')+circle(54,61,5,ink,'stroke="none"')+circle(75,61,5,ink,'stroke="none"')+line(sad?'M54 92q10-12 20 0':'M54 87q10 12 20 0')+gleam('M30 87q3-14 9-24');}
function bottle(color,symbol){
  const body='M49 29h30v20c0 9 20 17 21 39 1 21-11 30-24 30H52c-13 0-25-9-24-30 1-22 21-30 21-39Z';
  return `<defs><clipPath id="bottle"><path d="${body}"/></clipPath></defs>`+path(body,'metal')+`<g clip-path="url(#bottle)">`+path('M20 61q23-11 44 0t44 0v62H20Z',color,'stroke="none"')+gleam('M35 76q-10 18 1 28M54 41v9')+circle(86,104,3,'#fff5cf','stroke="none"')+'</g>'+path(body)+`<g transform="translate(24 36) scale(.63)">${symbol}</g>`+rect(45,20,38,12,2,'gold')+gleam('M49 35h30')+line('M52 16V9m24 7V9');
}
function gameTile(content,color='blue'){return rect(7,7,114,114,23,color)+gleam('M21 37v-6q0-10 11-10h30')+content;}
const smallPou=(x,y,size=45,color='gold',sad=false)=>`<g transform="translate(${x} ${y}) scale(${size/128})">${pou(color,sad)}</g>`;
const cloud=(x,y,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">${path('M16 44C-4 43-5 17 15 15 19-6 47-6 53 14c24-5 31 29 7 30Z','#fff8e7')}</g>`;
const platform=(x,y,width=73)=>rect(x,y,width,13,6,'gold')+path(`M${x} ${y+3}q${width/4} -9 ${width/2} 0t${width/2} 0`,'none','stroke="#4f946b" stroke-width="6"');
const basketball=()=>circle(64,64,45,'gold')+line('M19 64h90M64 19v90M31 33q60 30 65 63M96 32Q35 42 33 97')+gleam('M34 46q7-14 20-16');
const soccer=()=>circle(64,64,45,'cream')+path('m64 43 21 16-8 25H51l-8-25Z','dark')+path('m27 39 17 2 8-17m49 17-17 1-9-18M23 79l20 5 8 20m54-26-20 7-8 19','none')+gleam('M36 39q9-10 20-12');
const trophy=()=>path('M39 22h50v38c0 31-50 31-50 0Z','gold')+path('M38 30H21v19c0 19 18 24 25 22m44-41h17v19c0 19-18 24-25 22')+path('M58 82v20H41v13h46v-13H70V82','gold')+`<g transform="translate(40 29) scale(.38)">${star}</g>`+gleam('M48 31v20');
const controller=()=>path('M30 35c-17 0-24 47-17 61 7 13 23-7 31-17h40c8 10 24 30 31 17 7-14 0-61-17-61H82l-6 7H52l-6-7Z','purple')+path('M31 48h10v11h11v10H41v11H31V69H20V59h11Z','cream')+circle(91,55,6,'pink')+circle(104,70,6,'gold')+circle(78,70,6,'teal')+gleam('M57 53h17');
const flower=()=>line('M64 115V65m-1 29Q32 101 28 77q25-3 35 17m1-9q12-20 34-20-1 26-34 20')+path('M64 76c-28 9-41-15-22-31-13-24 11-39 26-21 20-17 40 2 26 22 22 16 8 40-18 29Z','pink')+circle(65,49,14,'gold');
const food=()=>path('M22 59h84v14H22Z','green')+path('M19 53c0-48 90-48 90 0Z','gold')+path('M20 79h88v19c-21 16-67 16-88 0Z','gold')+path('M20 73h88v14H20Z','red')+line('m42 31 2 4m20-11 2 4m19 4 2 4')+gleam('M30 48q4-9 11-13');
const gear=()=>{
  const points=Array.from({length:32},(_,i)=>{const angle=(i/32)*Math.PI*2-Math.PI/2,r=[52,52,42,42][i%4];return `${64+Math.cos(angle)*r},${64+Math.sin(angle)*r}`;}).join(' ');
  return `<polygon points="${points}" fill="${fill('metal')}"/>`+circle(64,64,27,'cream')+circle(64,64,12,'teal')+gleam('M36 57q4-17 20-22');
};
const arrow=direction=>`<g transform="${direction==='next'?'translate(128 0) scale(-1 1)':''}">`+path('m78 20-43 38q-6 6 0 12l43 38 13-16-31-28 31-28Z','cream')+gleam('m77 31-37 33')+'</g>';
const definitions={
  app:pou(),coin:circle(64,64,48,'gold')+circle(64,64,36,'gold')+path('m64 38 8 17 19 3-14 14 3 19-16-9-16 9 3-19-14-14 19-3Z','#fff5bc')+gleam('M29 48q8-20 26-22'),
  level:star+gleam('m39 54 15-2 8-18'),previous:arrow('previous'),next:arrow('next'),
  back:path('M61 22 16 64l45 42V82h50V46H61Z','cream')+gleam('M45 50 28 64'),
  close:circle(64,64,48,'pink')+path('m46 35 18 18 18-18 11 11-18 18 18 18-11 11-18-18-18 18-11-11 18-18-18-18Z','cream'),
  pause:circle(64,64,48,'cream')+rect(43,38,14,52,4,'dark')+rect(71,38,14,52,4,'dark')+gleam('M29 49q5-17 22-23'),
  play:circle(64,64,48,'green')+path('m52 36 37 28-37 28Z','cream')+gleam('M29 49q5-17 22-23'),
  fullscreen:rect(13,13,102,102,19,'cream')+line('M34 52V34h18m24 0h18v18M34 76v18h18m24 0h18V76')+gleam('M24 34q0-10 11-10h21'),
  'exit-fullscreen':rect(13,13,102,102,19,'cream')+line('M52 34v18H34m42-18v18h18M34 76h18v18m24 0V76h18')+gleam('M24 34q0-10 11-10h21'),
  shop:rect(22,54,84,62,5,'cream')+rect(37,77,23,39,3,'teal')+rect(73,75,20,19,3,'blue')+path('M13 48 26 22h76l13 26v12c-7 9-17 9-24 0-7 9-17 9-25 0-8 9-17 9-25 0-7 9-19 9-28 0Z','pink')+path('m43 22-6 27v11m27-38v37m21-37 7 28v11')+gleam('M31 29h15'),
  microphone:rect(45,13,38,67,19,'metal')+line('M34 61v8c0 41 60 41 60 0v-8M64 100v15m-22 0h44M46 37h13m-13 13h13m10-13h13m-13 13h13')+gleam('M56 26v30'),
  settings:gear(),
  phone:rect(34,9,60,110,14,'dark')+rect(42,20,44,65,6,'blue')+line('M56 14h16')+circle(64,101,7,'cream')+gleam('m51 32 17-5m-17 16 24-9'),
  closet:path('M19 21 98 12l13 10v89l-79 7-13-9Z','gold')+path('m19 21 13 10 79-9M32 31v87m39-91v87')+line('M59 68v13m21-15v13')+gleam('M40 39v48'),
  fridge:rect(27,11,74,106,12,'teal')+line('M28 53h72M40 32v11m0 23v19')+gleam('M37 25h25')+path('M39 117v5m48-5v5'),
  shelf:rect(22,12,84,108,6,'gold')+rect(31,22,66,87,2,'cream')+line('M31 64h66M31 106h66')+rect(41,43,15,18,3,'pink')+rect(72,36,15,25,3,'teal')+line('M46 36h5v7m26-14h5v7')+rect(42,83,15,19,3,'blue')+rect(73,83,13,19,3,'purple')+line('M47 76h5v7m25-8h5v8'),
  games:controller(),
  online:smallPou(12,57,49,'blue')+smallPou(67,57,49,'pink')+path('M30 31q34-30 68 0m-55 13q21-19 42 0m-28 12q7-7 14 0','none','stroke="#509a9e" stroke-width="7"')+circle(64,66,3,'teal'),
  partner:heart+smallPou(5,61,56,'gold')+smallPou(67,61,56,'pink'),
  trophy:trophy(),help:circle(64,64,48,'blue')+path('M48 45c0-26 41-24 35 2-2 10-20 12-20 26','none','stroke="#fff5d8" stroke-width="10"')+circle(63,92,5,'#fff5d8','stroke="none"'),
  'lamp-on':path('M58 73v26H39v15h50V99H70V73','metal')+path('m36 20-21 54h98L92 20Z','gold')+gleam('M43 29 29 66')+line('M9 21 4 15m115 6 5-6M64 9V3'),
  'lamp-off':path('M58 73v26H39v15h50V99H70V73','metal')+path('m36 20-21 54h98L92 20Z','purple')+gleam('M43 29 29 66'),
  soap:`<g transform="rotate(-16 64 70)">`+rect(17,43,94,59,22,'teal')+rect(27,52,74,38,16,'cream')+gleam('M38 60h35')+'</g>'+circle(88,27,12,'blue')+circle(109,48,8,'cream')+circle(72,10,5,'teal'),
  shower:path('M104 119V72c0-17-7-28-23-28H60V29h21c27 0 36 18 36 43v47Z','metal')+path('M24 43c0-31 48-31 48 0Z','blue')+path('M19 43h58v9H19Z','metal')+path('m29 63-6 13m23-13-3 15m23-14 1 14m-40 11-6 13m25-12-3 15m24-14 1 14','none','stroke="#68b7cc" stroke-width="5"')+gleam('M36 27q8-6 16-4'),
  flower:flower(),ball:soccer(),basketball:basketball(),
  food:food(),heart,happy:face('green'),
  palette:path('M64 16c-60 0-64 96-3 96 24 0 13-19 26-24 44-1 38-72-23-72Z','cream')+circle(40,40,9,'pink')+circle(68,32,9,'gold')+circle(91,51,9,'teal')+circle(91,76,9,'purple')+circle(39,79,12,'none')+gleam('M24 60q0-10 5-16'),
  eyes:path('M9 65q55-78 110 0-55 73-110 0Z','cream')+circle(64,64,28,'teal')+circle(64,64,13,'dark')+circle(73,52,6,'#fff','stroke="none"'),
  hat:path('M34 79V35c0-18 60-18 60 0v44Z','purple')+path('M34 61h60v19H34Z','pink')+path('M15 80q49-9 98 0v18q-49 15-98 0Z','purple')+gleam('M44 36v17'),
  glasses:rect(8,40,48,43,16,'pink')+rect(72,40,48,43,16,'pink')+rect(15,47,34,29,11,'blue')+rect(79,47,34,29,11,'blue')+line('M56 54q8-8 16 0')+gleam('m24 55 9-3m55 3 9-3'),
  outfit:path('m41 16-29 17 16 28 16-8v61h40V53l16 8 16-28-29-17c-8 18-38 18-46 0Z','blue')+path('M47 20q17 30 34 0')+gleam('M52 52v39')+`<g transform="translate(53 58) scale(.19)">${heart}</g>`,
  wallpaper:rect(20,13,83,103,7,'cream')+rect(30,24,63,58,3,'blue')+circle(78,39,8,'gold')+path('m30 73 21-23 16 17 12-9 14 15v9H30Z','green')+line('M32 97h57m-57 9h37'),
};

for(const [name,glyph] of Object.entries({fullness:food(),health:cross,fun:face('green'),energy:bolt})){
  definitions[`status-${name}`]=path('M16 5h96q11 0 11 11v96q0 11-11 11H16q-11 0-11-11V16Q5 5 16 5ZM18 18v92h92V18Z','metal','fill-rule="evenodd"')+rect(17,17,94,94,4,'none')+`<g transform="translate(21 21) scale(.67)">${glyph}</g>`+gleam('M12 34V18q0-6 6-6h16');
}
const potionSymbols=[cross,bolt,path('M45 33v51H30l34 25 34-25H83V33Z','cream'),star,food(),path('M37 70q27-33 54 0v15H37Z','pink')+circle(64,48,15,'cream')+circle(64,98,12,'none'),path('M64 63c-15-24-35-14-42 11 12 6 32 4 42-9 10 13 30 15 42 9-7-25-27-35-42-11Z','dark'),face('pink')];
for(let i=0;i<8;i++)definitions[`potion-${i+1}`]=bottle(['pink','gold','teal','purple','green','blue','cream','pink'][i],potionSymbols[i]);

const gameIcons={
  'food-drop':gameTile(smallPou(40,64,49)+`<g transform="translate(41 14) scale(.42)">${food()}</g>`+line('M31 33v22m-6-6 6 6 6-6m60-17v22m-6-6 6 6 6-6'),'green'),
  'sky-jump':gameTile(platform(14,93,48)+platform(71,45,43)+smallPou(24,40,48)+path('m51 31 12-13 12 13M63 18v29'),'blue'),
  'free-fall':gameTile(cloud(11,78,.6)+cloud(75,78,.6)+smallPou(37,19,54)+path('M64 75v30m-10-10 10 10 10-10'),'blue'),
  'jet-pou':gameTile(path('m76 81 10 31 11-34Z','gold')+rect(78,45,20,42,5,'metal')+smallPou(25,23,65)+cloud(12,93,.4),'blue'),
  'cliff-jump':gameTile(platform(10,93,41)+platform(80,93,38)+smallPou(35,28,56)+path('M26 64q38-51 74 0m-12-3 12 3-2-13'),'green'),
  memory:gameTile(`<g transform="rotate(-12 48 64)">${rect(19,28,48,71,8,'purple')}${circle(43,63,11,'cream')}</g>`+rect(62,25,48,71,8,'cream')+`<g transform="translate(64 36) scale(.34)">${flower()}</g>`,'teal'),
  'find-pou':gameTile(smallPou(38,52,54)+path('m28 60 8-36h56l9 36Z','pink')+path('M24 60h82v11H24Z','pink')+path('m64 84-8 10h16Z','gold'),'purple'),
  'tic-tac-pou':gameTile(line('M46 23v82m36-82v82M23 46h82M23 82h82')+circle(34,34,8,'pink')+line('m56 56 17 17m0-17L56 73')+smallPou(82,82,24),'cream'),
  'four-pous':gameTile(rect(18,24,92,80,7,'blue')+Array.from({length:12},(_,i)=>circle(31+(i%4)*22,39+Math.floor(i/4)*25,8,i>=8?'pink':i%3?'cream':'gold')).join(''),'purple'),
  'color-tap':gameTile(smallPou(15,14,48,'pink')+smallPou(65,14,48,'blue')+smallPou(15,65,48,'green')+smallPou(65,65,48,'gold'),'cream'),
  'sad-tap':gameTile(smallPou(26,19,76,'blue',true)+path('m91 74-5 9c-8 11 13 14 9 2Z','teal'),'purple'),
  'pou-sounds':gameTile(smallPou(12,43,61)+path('M78 68V27l25-6v34m-25-16 25-6')+circle(70,73,10,'pink')+circle(95,60,10,'gold'),'blue'),
  'match-tap':gameTile(smallPou(8,46,43,'pink')+smallPou(43,28,43,'pink')+smallPou(78,46,43,'pink')+line('M27 104h75m-67-6-8 6 8 6m59-12 8 6-8 6'),'cream'),
  'food-swap':gameTile(`<g transform="translate(11 14) scale(.47)">${food()}</g><g transform="translate(64 59) scale(.42)">${flower()}</g>`+path('M83 26h23v24m-9-10 9 10 9-10M45 103H22V79m-9 10 9-10 9 10'),'teal'),
  goal:gameTile(path('M23 83V28h82v55','none','stroke="#fff9e7" stroke-width="8"')+path('M32 36h64v45H32ZM48 36v45m16-45v45m16-45v45M32 51h64M32 66h64','none','stroke="#547e78" stroke-width="2"')+`<g transform="translate(31 58) scale(.53)">${soccer()}</g>`,'green'),
  hoops:gameTile(rect(38,18,69,43,4,'cream')+rect(58,30,27,23,2,'none')+path('m57 64 6 28h21l6-28M62 72l22 16m3-16L64 88','none','stroke="#fff9e9"')+`<ellipse cx="73" cy="62" rx="26" ry="6" fill="${fill('red')}"/>`+`<g transform="translate(8 58) scale(.43)">${basketball()}</g>`,'pink'),
};
for(const [name,svg] of Object.entries(gameIcons))definitions[`game-${name}`]=svg;
for(const [id,name] of [['100','food'],['200','soap'],['300','games'],['400','heart'],['500','coin']])definitions[`achievement-${id}`]=definitions[name];
Object.assign(definitions,createFoodIcons({path,circle,rect,line,gleam,fill,burger:food()},FOOD_ICON_NAMES));
Object.assign(definitions,{
  'decor-sofa':rect(22,24,84,56,17,'purple')+rect(12,59,104,43,12,'purple')+rect(6,52,25,49,10,'pink')+rect(97,52,25,49,10,'pink')+line('M31 79h66M25 103v14m78-14v14')+gleam('M34 37h26'),
  'decor-plant':path('m38 76 9 42h34l9-42Z','gold')+path('M64 78V17M64 58Q18 52 21 25q32-2 43 33Zm0 10q43-5 45-35-33-3-45 35Z','green')+gleam('M33 36 14 12'),
  'decor-rug':`<ellipse cx="64" cy="78" rx="56" ry="28" fill="${fill('pink')}"/>`+`<ellipse cx="64" cy="78" rx="43" ry="19" fill="${fill('purple')}"/>`+path('m64 66 20 12-20 12-20-12Z','gold')+line('M10 74 3 76m9 8-7 3m111-13 8 3m-10 8 8 3'),
  'decor-table':rect(17,41,94,23,7,'gold')+path('M28 64v52h13V64m46 0v52h13V64','cocoa')+gleam('M29 49h29'),
  'decor-bookcase':rect(19,10,90,108,7,'gold')+rect(27,20,74,88,2,'cream')+line('M28 65h72')+rect(36,29,14,33,2,'pink')+rect(53,34,13,28,2,'teal')+rect(71,27,18,35,2,'blue')+rect(39,76,17,29,2,'purple')+rect(61,72,16,33,2,'green')+rect(81,79,12,26,2,'pink'),
  'decor-aquarium':rect(13,27,102,78,12,'blue')+rect(10,20,108,15,4,'metal')+path('M28 103q-7-17 0-30m8 31q14-23 4-37','none','stroke="#468d68"')+path('M52 64q28-25 40 0-13 26-40 0Zm40 0 15-12v24Z','gold')+circle(64,61,3,'#202c32','stroke="none"')+circle(84,46,4,'cream')+gleam('M23 43v20'),
  'explorer-hat':definitions.hat.replaceAll('url(#purple)','url(#gold)').replaceAll('url(#pink)','url(#teal)'),
});

const svg=content=>{
  const gradients=Object.entries(colors).filter(([name])=>content.includes(`url(#${name})`)).map(([name,[start,end]])=>`<linearGradient id="${name}" x1=".15" y1="0" x2=".85" y2="1"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs>${gradients}</defs><g stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>\n`;
};
const directory='public/assets/images/icons/modern';
await mkdir(directory,{recursive:true});
const catalogPath='public/assets/catalog.json';
const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
for(const name of MODERN_ICON_NAMES){
  if(!definitions[name])throw new Error(`Missing icon artwork: ${name}`);
  await writeFile(`${directory}/${name}.svg`,svg(definitions[name]));
  catalog.images[`icons/modern/${name}.svg`]=[128,128];
}
await writeFile(catalogPath,JSON.stringify(catalog));

// Maskable assets keep all essential character details inside the central 80%.
await mkdir('public/icons',{recursive:true});
for(const [filename,size,padding] of [['icon-192',192,.14],['icon-512',512,.14],['apple-touch-icon',180,.14],['maskable-512',512,.2]]){
  const edge=Math.round(size*padding),contentSize=size-edge*2;
  await sharp(Buffer.from(svg(definitions.app))).resize(contentSize,contentSize).extend({top:edge,bottom:edge,left:edge,right:edge,background:'#cfeb87'}).png().toFile(`public/icons/${filename}.png`);
}

const preview=process.argv.find(arg=>arg.startsWith('--preview='))?.slice(10);
if(preview){
  const names=[...MODERN_ICON_NAMES,'poison','spin','drowsy','antidote','antidote-max','infinite'];
  const columns=8,cell=136,rows=Math.ceil(names.length/columns),images=[];
  for(let i=0;i<names.length;i++){
    const name=names[i],file=definitions[name]?`${directory}/${name}.svg`:`public/assets/images/potions/custom/${name}.svg`;
    images.push({input:await sharp(file).resize(100,100).png().toBuffer(),left:i%columns*cell+18,top:Math.floor(i/columns)*cell+6});
  }
  const labels=names.map((name,i)=>`<text x="${i%columns*cell+cell/2}" y="${Math.floor(i/columns)*cell+123}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#303745">${name}</text>`).join('');
  images.push({input:Buffer.from(`<svg width="${columns*cell}" height="${rows*cell}" xmlns="http://www.w3.org/2000/svg">${labels}</svg>`),left:0,top:0});
  await sharp({create:{width:columns*cell,height:rows*cell,channels:4,background:'#f7ebd5'}}).composite(images).png().toFile(preview);
}
console.log(`Modern icons: ${MODERN_ICON_NAMES.length} SVGs and 4 install icons prepared.`);
