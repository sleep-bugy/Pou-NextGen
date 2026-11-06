import { spawn } from 'node:child_process';
const processes=[spawn(process.execPath,['server/index.mjs'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','0.0.0.0'],{stdio:'inherit'})];
let stopping=false;
function stop(){if(stopping)return;stopping=true;processes.forEach(child=>child.kill('SIGTERM'));}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of processes){child.on('error',error=>{console.error(error.message);stop();process.exitCode=1;});child.on('exit',code=>{if(!stopping){process.exitCode=code??1;stop();}});}
