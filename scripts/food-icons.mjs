/** Food artwork uses the same outlines, highlights and gradients as the potion set. */
export function createFoodIcons({path:p,circle:c,rect:r,line:l,gleam:g,fill,burger},names){
  const ellipse=(x,y,rx,ry,color='cream')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill(color)}"/>`;
  const group=(body,x=0,y=0,scale=1,angle=0)=>`<g transform="translate(${x} ${y}) scale(${scale}) rotate(${angle} 64 64)">${body}</g>`;
  const thick=(d,color,width)=>p(d,'none',`stroke="#191b22" stroke-width="${width+4}"`)+p(d,'none',`stroke="${color}" stroke-width="${width}"`);
  const leaf=p('M64 30q-3-18 3-24m-3 21q8-22 30-16-9 22-30 16Z','green');
  const seeds=(points,color='#fff4cf')=>points.map(([x,y])=>c(x,y,2,color,'stroke="none"')).join('');
  const strawberry=p('M26 42q39-22 76 0 11 29-38 70-49-41-38-70Z','red')+p('m64 40-25-7 12-13 13 8 13-8 12 13Z','green')+seeds([[43,51],[65,50],[84,52],[52,69],[74,70],[63,90]])+g('M38 53q-2 12 8 23');
  const apple=p('M64 35C26 7 3 45 23 87c11 27 25 22 41 18 16 4 30 9 41-18 20-42-3-80-41-52Z','red')+leaf+g('M32 48q-7 16 0 31');
  const orange=c(64,72,43,'orange')+leaf+g('M34 56q6-13 18-17')+seeds([[83,83],[94,69],[80,97]],'#f9d79e');
  const raspberry=[[46,47],[64,41],[82,47],[37,64],[55,62],[74,62],[91,64],[47,81],[65,82],[82,81],[64,98]].map(([x,y])=>c(x,y,12,'pink')).join('')+p('m43 30 21 7 21-7-7-12H51Z','green');
  const fry=(x,y,angle=0)=>`<g transform="rotate(${angle} ${x} ${y})">${r(x,y,12,68,3,'gold')}${g(`M${x+4} ${y+6}v32`)}</g>`;
  const bun=p('M18 61c-9-41 94-41 94 0v28c-9 32-85 32-94 0Z','gold')+g('M31 54q9-12 26-12');
  const bowl=(color='cream',contents='')=>ellipse(64,104,46,9,'metal')+p('M17 57h94c-2 40-16 51-47 51S19 97 17 57Z',color)+ellipse(64,57,47,14,'cream')+contents+g('M28 76q4 13 14 18');
  const steam=l('M39 33q-9-9 0-18m25 18q-9-9 0-18m25 18q-9-9 0-18');
  const pastry=p('M18 43q12 36 26 33c-5-32 43-32 39 0 15 4 28-32 27-34 14 34 5 68-21 57-5 20-45 20-51 0C12 111 4 77 18 43Z','gold')+l('m37 60 3 34m19-43v55m26-44-5 33')+g('M22 63q-3 15 6 24');
  const shell=p('M64 112 14 62C-4 24 36 9 64 30c28-21 68-6 50 32Z','cream')+l('M64 107 32 34m32 73L50 26m14 81 14-81m-14 81 32-73M31 91h65');
  const shrimp=p('M88 24C34 2 8 59 38 90c19 22 55 6 42-15-8-10-25-5-20 7-27-5-19-47 15-42Z','orange')+l('M39 31 55 46M25 52l19 4M27 73l20-6m-5 28 9-17')+p('m87 24 23-11-3 21-17 9Z','red')+c(83,33,3,'#252b31','stroke="none"');
  const tentacles=thick('M28 78q-22 33-10 37 12 3 19-30m5 0q-5 40 8 32 6-6 6-32m14 0q-2 39 10 33 9-5 2-33m7-3q18 37 28 27 6-8-13-31','#cf778f',10);
  const assets={
    apple,strawberry,raspberry,orange_fruit:orange,
    apricot:c(64,73,43,'orange')+leaf+l('M63 42q-9 32 0 57')+g('M34 55q3-10 13-14'),
    pear:p('M60 20c-25 0-9 26-32 47-29 43 17 59 42 49 49-4 40-31 16-56-14-15-5-40-26-40Z','green')+leaf+g('M39 68q-12 21 0 30'),
    mango:p('M90 22c-45-22-96 59-61 86 33 26 94-57 61-86Z','orange')+group(leaf,24,-9,.8)+g('M34 63q-9 18-2 28'),
    banana:p('M96 20C73 81 47 89 19 72c18 55 91 41 91-47Z','gold')+p('m96 20 5-12 12 5-3 13Z','cocoa')+l('M28 86q38 27 68-41')+g('M48 104q27 0 45-22'),
    cherries:c(41,88,25,'red')+c(89,84,25,'pink')+p('M40 63q1-26 26-46 24 16 24 43')+p('M66 18Q89 3 110 23 87 36 66 18Z','green')+g('M28 80q2-8 9-10m39 7 5-8'),
    fig:p('M64 16c-8 31-45 33-45 67 0 44 90 44 90 0 0-34-37-36-45-67Z','purple')+p('M66 39c-7 24-34 24-34 48 0 24 61 26 63 0-2-23-23-25-29-48Z','pink')+seeds([[62,64],[50,78],[76,79],[62,92],[45,95],[82,96]],'#ffe6a3'),
    kiwi:c(64,67,47,'cocoa')+c(64,67,39,'green')+ellipse(64,67,15,27,'cream')+Array.from({length:12},(_,i)=>{const t=i*Math.PI/6;return c(64+Math.cos(t)*26,67+Math.sin(t)*29,2,'#353932','stroke="none"');}).join(''),
    pineapple:ellipse(64,80,34,39,'gold')+p('m64 46-25-23 19 3L55 7l15 17L87 8l-2 23 23-10-25 27Z','green')+l('m38 61 48 41m-54-22 40 34M82 57l-45 44m57-25-38 39')+g('M42 63v21'),
    watermelon:p('M13 37h102c-2 41-26 76-51 77-25-1-49-36-51-77Z','green')+p('M24 43h80c-8 31-24 57-40 58-16-1-32-27-40-58Z','cream')+p('M31 47h66c-8 26-20 46-33 49-13-3-25-23-33-49Z','red')+seeds([[44,58],[63,70],[82,58],[53,79],[76,79]],'#303a31'),
    tomato:p('M64 39C14 17-5 88 35 109c17 10 38 10 57-2 40-24 15-91-28-68Z','red')+p('m64 39-25-7 14-9 11 7 9-18 6 21 19-3-12 16Z','green')+g('M31 57q-6 17 1 28'),
    chili_pepper:p('M87 31c28 5 24 57-17 71-24 9-41 1-59-2 44-9 41-30 44-51 3-16 16-22 32-18Z','red')+p('M81 35q-3-21 17-25l7 10q-17 0-14 17Z','green')+g('M66 50q4-12 12-11'),
    carrot:p('m38 42 56 14-62 62Z','orange')+p('m59 45-13-29 15-5 9 29 8-34 14 7-13 32 20-18 9 12-21 20Z','green')+l('m44 66 15 6m-21 12 12 5'),
    corn:ellipse(64,63,26,48,'gold')+l('M55 23v77m18-77v77M42 40h44M40 56h48M40 72h48M43 88h42')+p('M61 115Q14 99 18 47q40 17 43 68Zm5 0q46-17 44-68-37 19-44 68Z','green'),
    cucumber:group(r(41,12,46,105,23,'green')+ellipse(64,25,17,10,'cream')+ellipse(64,25,9,5,'green')+seeds([[54,55],[73,66],[57,84],[74,97]],'#e8ec9f')+g('M51 42v35'),0,0,1,33),
    broccoli:p('m51 64-4 48h38L73 64Z','green')+c(34,49,23,'green')+c(63,29,24,'green')+c(91,48,23,'green')+c(63,58,23,'green')+l('M62 82v23m1-18 12-8')+g('M30 37q8-8 15-4'),
    cabbage:c(64,67,47,'green')+p('M18 67q24 32 46 40m45-39q-27 27-45 39M36 33q31 4 29 73m30-72Q71 47 65 106')+g('M32 55q2-16 18-20'),
    artichoke:p('M59 89v29h15V89Z','green')+p('M64 105Q14 85 26 40l24 15L42 22l23 13 18-16-2 35 24-15c13 45-18 66-41 66Z','green')+l('M26 49q30 19 38 56m40-56Q75 70 64 105M48 55l16 50 17-50'),
    burger,
    fries:fry(24,22,-11)+fry(45,13,-4)+fry(66,19,5)+fry(85,25,12)+p('m18 62 13 55h66l13-55-24 7-22-7-22 7Z','red')+group(p('m64 32 8 17 19 3-14 14 3 19-16-9-16 9 3-19-14-14 19-3Z','gold'),36,59,.45),
    hotdog:group(bun+r(25,54,78,32,16,'red')+p('M34 63q9-14 17 0t17 0 17 0 11 0','none','stroke="#f7db73" stroke-width="5"'),0,0,1,-24),
    pizza:p('M21 27q46-17 89 0L53 117Z','gold')+p('M21 27q46-17 89 0l-7 15q-38-15-76 0Z','cocoa')+c(60,53,11,'red')+c(79,76,9,'red')+c(49,89,9,'red')+l('m42 54 5 3m17 49 3-4m23-50-4 3'),
    chicken_leg:p('m76 78 27 25c19-8 24 14 11 17-3 10-20 3-15-8L72 90Z','cream')+p('M80 28c30 26-1 73-33 62C-8 80 24-9 80 28Z','orange')+g('M35 41q-9 17-2 27')+seeds([[70,48],[50,73],[71,68]],'#aa6446'),
    egg:p('M41 18c17-19 34 2 43 10 20 2 36 26 24 46 14 29-8 46-27 36-24 10-45 3-46-7-35-1-32-33-17-47-4-17 7-29 23-38Z','cream')+c(64,67,25,'gold')+g('M49 57q7-8 14-5'),
    bacon:Array.from({length:3},(_,i)=>group(p('M18 20q22-13 41 0t40 0l10 79q-20 13-41 0t-40 0Z','red')+p('M21 37q22-13 41 0t40 0M25 69q22-13 41 0t40 0','none','stroke="#f6ddbb" stroke-width="9"'),i*12,12+i*6,.65,-18)),
    sausages:group(r(15,26,95,27,13,'red')+l('M33 30 27 46m25-16-6 16m25-16-6 16m25-16-6 16'),0,0,1,-15)+group(r(16,75,96,27,13,'cocoa')+l('M37 79 30 95m25-16-6 16m25-16-6 16m25-16-6 16'),0,0,1,-15),
    pancakes:ellipse(64,97,48,17,'gold')+ellipse(64,84,48,17,'gold')+ellipse(64,70,48,17,'gold')+p('M22 66q10-12 29-10h33c26 7 25 23 8 23-5 26-14 23-14 2-10 9-14-12-18-5-14 11-15-12-24-3-6 8-18-1-14-7Z','cocoa')+p('m53 50 24 4-5 17-25-5Z','cream'),
    waffles:group(r(20,18,89,95,13,'gold')+Array.from({length:9},(_,i)=>r(31+(i%3)*23,31+Math.floor(i/3)*23,15,15,3,'orange')).join('')+r(51,49,24,20,3,'cream'),0,0,1,-8),
    noodles:bowl('blue',p('M29 53q15-20 30 0t30 0m-58 7q12-15 24 0t24 0 22 0','none','stroke="#d8a456" stroke-width="4"'))+l('M70 48 98 7m-12 44 24-37')+steam,
    dumpling:p('M16 86q2-70 48-70 46 0 48 70-49 35-96 0Z','cream')+p('M16 86q8-31 48-31 40 0 48 31')+l('m32 42 8 20m9-35 6 28m16-28-2 28m17-15-8 20')+g('M29 78q12-11 25-11'),
    potato_chips:group(ellipse(43,64,27,46,'gold')+l('M29 41q-7 27 8 46'),0,0,1,-18)+group(ellipse(83,71,27,42,'gold')+l('M75 41q-8 28 8 50'),0,0,1,19),
    tortilla_chips:p('m17 91 24-71 46 65Z','gold')+p('m43 104 63-64 8 71Z','orange')+seeds([[35,71],[42,45],[55,75],[79,94],[101,72],[98,103]],'#b98350'),
    onion_rings:ellipse(40,52,27,23,'gold')+ellipse(40,52,16,12,'cream')+ellipse(86,56,27,24,'gold')+ellipse(86,56,16,13,'cream')+ellipse(63,91,32,24,'gold')+ellipse(63,91,20,13,'cream'),
    cookie:c(64,66,48,'gold')+[[41,38],[83,42],[64,66],[35,83],[81,91],[99,68]].map(([x,y])=>c(x,y,6,'cocoa')).join('')+g('M28 54q5-16 17-21'),
    pretzel:thick('M64 82C8 95 4 28 33 25c22-4 16 30 31 42 15-12 9-46 31-42 29 3 25 70-31 57Zm0 0-20 29m20-29 20 29','#cf964f',17)+seeds([[29,40],[27,57],[43,74],[83,74],[99,55],[96,38],[52,98],[77,99]],'#fff5d5'),
    honey_cracker:r(21,24,88,85,8,'gold')+l('M33 37h64v58H33Z')+seeds([[45,49],[64,49],[83,49],[45,67],[64,67],[83,67],[45,85],[64,85],[83,85]],'#b2763e'),
    salty_cracker:group(r(24,24,83,83,4,'cream')+seeds([[44,44],[66,44],[88,44],[44,66],[66,66],[88,66],[44,88],[66,88],[88,88]],'#c49455'),0,0,1,12),
    chocolate_bar:group(r(24,16,79,99,6,'cocoa')+l('M50 17v96m27-96v96M25 47h76M25 80h76')+g('M32 25v11'),0,0,1,13),
    chocolate_balls:[[42,86],[82,86],[62,49]].map(([x,y])=>c(x,y,27,'cocoa')+g(`M${x-13} ${y-9}q5-9 13-9`)).join(''),
    candy_cane:thick('M79 111V34c0-24-37-24-37 0v14','#fff5df',22)+p('M79 111V34c0-24-37-24-37 0v14','none','stroke="#de7990" stroke-width="12" stroke-dasharray="12 14"'),
    candy_stick:p('m26 42-18-12v35l18-8m75-15 18-12v35l-18-8','pink')+r(24,33,80,66,15,'pink')+p('m39 35 22 62m0-62 22 62m0-62 16 50','none','stroke="#fff0d1" stroke-width="10"'),
    lollipop:l('M73 71 37 121')+c(72,49,36,'pink')+p('M72 75c-22 0-29-30-9-37 22-7 36 18 21 28-11 7-24-3-17-11 6-7 15 2 8 5','none','stroke="#fff0d6" stroke-width="6"'),
    marshmallow:group(r(17,38,46,65,12,'cream')+ellipse(40,39,22,9,'cream')+g('M26 54v30'),0,0,1,-13)+group(r(67,27,43,67,12,'cream')+ellipse(88,28,21,8,'cream')+g('M76 43v29'),0,0,1,15),
    gummy_bears:[[11,35,'green'],[66,14,'pink'],[69,66,'gold']].map(([x,y,color])=>group(c(28,24,10,color)+c(58,24,10,color)+c(43,38,23,color)+r(22,49,42,44,18,color)+c(22,65,10,color)+c(64,65,10,color)+c(29,93,12,color)+c(57,93,12,color)+c(36,35,2,'#3b3536','stroke="none"')+c(51,35,2,'#3b3536','stroke="none"'),x,y,.58)).join(''),
    jelly_beans:[[31,38,'pink',-30],[80,30,'green',25],[42,88,'gold',-18],[92,82,'purple',15]].map(([x,y,color,angle])=>group(p(`M${x-12} ${y-12}c-21 16-3 43 16 28 14-12-5-9-4-17 4-15-7-21-12-11Z`,color),0,0,1,angle)).join(''),
    gingerbread:p('M46 42c-28-40 62-40 34 0l27 10c22 12 2 32-14 16l-10-6v20l18 20c15 20-14 32-25 11L64 95l-12 18c-11 21-40 9-25-11l18-20V62l-10 6C19 84-1 64 21 52Z','gold')+c(55,26,3,'#382c27','stroke="none"')+c(73,26,3,'#382c27','stroke="none"')+l('M54 36q10 9 20 0')+c(64,58,4,'pink')+c(64,73,4,'teal'),
    sardine:p('M19 68 7 44v49l14-15c39 48 75 24 99-6C98 38 61 20 19 68Z','blue')+p('M83 43q-18 29 0 56m-34-49 12 22-12 23')+c(100,67,4,'#252b31','stroke="none"'),
    shrimp,
    scallop:shell,
    mussel:p('M30 110C-8 48 54-10 100 22c30 45-1 104-70 88Z','dark')+p('M40 94C15 58 56 18 88 35c20 32-3 65-48 59Z','purple')+p('M45 91C28 69 65 37 81 49c13 23-16 52-36 42Z','orange')+g('M39 48q15-20 29-14'),
    octopus:tentacles+ellipse(64,49,35,40,'pink')+c(50,51,4,'#252b31','stroke="none"')+c(78,51,4,'#252b31','stroke="none"')+l('M58 68q6 6 12 0')+g('M42 32q4-9 14-11'),
    squid:tentacles+p('M38 27 64 7l26 20-2 42c0 39-50 39-50 0Z','cream')+c(53,70,4,'#252b31','stroke="none"')+c(75,70,4,'#252b31','stroke="none"')+g('M49 35v20'),
    lobster:p('M53 43 31 29m44 14 23-14M46 67 22 57m58 10 27-10M47 82l-22 8m54-8 25 8','none','stroke="#bd6970" stroke-width="7"')+p('M19 11c-20 23-4 38 14 25l6-18-12 7Zm89 0c20 23 4 38-14 25l-6-18 12 7Z','red')+ellipse(64,71,23,43,'red')+l('M45 63h38M43 78h42M48 94h32')+p('m52 108-13 12h50l-13-12Z','red')+c(56,41,3,'#252b31','stroke="none"')+c(72,41,3,'#252b31','stroke="none"'),
    water:r(39,27,50,91,16,'blue')+r(44,12,40,19,4,'metal')+r(44,55,40,35,5,'cream')+p('M64 60c-27 30 27 30 0 0Z','blue')+g('M49 38v11'),
    milk:p('m29 34 15-22h42l14 22v82H29Z','cream')+p('m29 34 15 12 56-12m-56 12v70M44 12v34')+r(50,65,40,31,4,'blue')+g('M56 21h19'),
    coke:r(32,13,64,103,14,'red')+ellipse(64,17,29,6,'metal')+ellipse(64,112,28,5,'metal')+p('M34 72q30-30 60-7','none','stroke="#fff2de" stroke-width="12"')+g('M42 31v25'),
    soda:r(32,13,64,103,14,'teal')+ellipse(64,17,29,6,'metal')+ellipse(64,112,28,5,'metal')+c(63,67,20,'gold')+l('m63 48 1 38M45 67h36')+g('M42 31v22'),
  };
  // Each variant keeps its own ingredient/color while sharing a recognizable vessel.
  for(const name of names){
    const taste=name.split('_')[0];const color=({chocolate:'cocoa',strawberry:'pink',raspberry:'pink',blackberry:'purple',banana:'gold',orange:'orange',apple:'green',lemon:'gold',peach:'orange',peanut:'gold',vanilla:'cream'})[taste]??'gold';
    if(name.endsWith('_juice')||name==='lemonade'||name==='iced_tea'||name==='milkshake'){
      const liquid=name==='iced_tea'?'orange':name==='milkshake'?'pink':color;
      assets[name]=p('M30 28h69l-10 88H40Z','metal')+p('M35 48h59l-9 61H44Z',liquid)+p('M70 85V15l32-8','none','stroke="#485e74" stroke-width="6"')+g('M44 52v38')+r(43,55,17,17,3,'cream','opacity=".65"')+(name==='milkshake'?p('M26 37q-6-18 16-18 1-23 19-14 13-11 22 7 24-4 22 25Z','cream'):c(103,52,17,'gold')+l('m94 42 18 20m-18 0 18-20'));
    }
    if(name.endsWith('_soup')){
      const garnish=name==='ramen_soup'?p('M31 57q8-14 16 0t16 0 16 0 16 0','none','stroke="#d6ad62"')+ellipse(79,54,12,7,'cream')+c(79,54,4,'gold'):name==='wonton_soup'?p('m34 55 13-8 12 14-25 1Zm37-3 15-8 12 15-26 3Z','cream'):c(44,55,5,'green')+c(65,58,5,'orange')+c(85,54,5,'green');
      assets[name]=bowl(name==='pumpkin_soup'?'gold':'teal',ellipse(64,57,41,10,name==='pumpkin_soup'?'orange':'gold')+garnish)+steam;
    }
    if(name.endsWith('_cereal'))assets[name]=bowl('pink',[[30,53],[48,48],[66,57],[86,50],[100,59],[43,65],[81,65]].map(([x,y],i)=>c(x,y,7,name==='chocolate_cereal'?'cocoa':name==='fruit_cereal'?['pink','green','gold'][i%3]:'cream')).join(''));
    if(name.endsWith('_croissant'))assets[name]=pastry+(taste==='chocolate'?l('M44 98q20 9 41-1'):p('m49 75 23-7 8 23-28 7Z','cream'));
    if(name.endsWith('_donut'))assets[name]=ellipse(64,70,48,40,'gold')+p('M17 64c3-48 92-48 94 0 0 21-18 4-20 16-5 25-19-1-26 10-14 19-22-16-32-6-8 10-20-4-16-20Z',color)+ellipse(64,62,16,12,'gold')+l('m32 52 7 4m14-20 1 6m31 6-4 6m11 17 6-3m-54 3 5 2')+g('M31 40q8-8 19-9');
    if(name.endsWith('_cupcake'))assets[name]=p('m27 71 13 45h49l12-45Z','gold')+l('m45 82 4 24m16-24v24m19-24-4 24')+p('M24 68c-9-19 11-22 16-31-1-22 23-33 26-28 0 20 26 20 25 36 29 8 29 35 6 35H35Z',color)+g('M37 58q2-7 11-11');
    if(name.endsWith('_cake'))assets[name]=p('m21 53 61-30 28 24v62H21Z','cream')+p('m21 53 61-30 28 24-53 26Z',color)+p('M21 76h89v15H21Z',color)+l('M57 73v36')+(taste==='strawberry'?group(strawberry,55,4,.35):taste==='cheese'?c(76,87,4,'gold')+c(36,99,3,'gold'):g('M30 61h15'));
    if(name.endsWith('_icecream'))assets[name]=p('m32 64 32 55 31-55Z','gold')+l('m47 89 23 10m-16-23 27 10m-20 21 8-28')+c(45,58,24,color)+c(85,58,24,color)+c(65,30,24,color)+g('M51 20q6-8 14-8');
    if(name.endsWith('_jam')||name==='peanut_butter'||name==='chocolate_spread')assets[name]=r(29,31,70,85,13,color)+r(25,15,78,20,5,'metal')+r(36,54,56,42,7,'cream')+(taste==='strawberry'?group(strawberry,40,55,.38):taste==='peach'?group(orange,40,52,.38):c(64,74,13,color))+g('M39 40v9');
    if(name.endsWith('_maki'))assets[name]=r(24,41,80,64,9,'dark')+ellipse(64,44,40,23,'cream')+ellipse(64,44,22,13,taste==='avocado'?'green':taste==='salmon'?'orange':'pink')+g('M34 69v20');
    if(name.endsWith('_temaki'))assets[name]=p('M28 31 110 42 67 119Z','dark')+ellipse(67,35,43,19,'cream')+p('M39 31h48v13H39Z',taste==='eel'?'cocoa':taste==='salmon'?'orange':'pink')+p('M74 26h20v17H74Z','green')+g('M45 59 20 34');
    if(name.endsWith('_sushi'))assets[name]=r(21,58,87,46,18,'cream')+p('M15 58c-2-32 101-34 100-2l-4 18q-48-17-91 1Z',taste==='tuna'?'pink':taste==='octopus'?'purple':'orange')+l('m38 44-3 17m23-22-2 19m24-19-3 19m23-15-4 17');
  }
  for(const key of names){if(Array.isArray(assets[key]))assets[key]=assets[key].join('');if(!assets[key])throw new Error(`Food icon missing: ${key}`);}
  return Object.fromEntries(names.map(name=>[`food-${name}`,assets[name]]));
}
