/* Anblox: endless third-person platform chase and 4-second learning encounters. */
(()=>{'use strict';
const C=document.getElementById('world'),ctx=C.getContext('2d',{alpha:false}),overlay=document.getElementById('overlay'),dialog=document.getElementById('dialog'),levelUI=document.getElementById('level'),starUI=document.getElementById('stars'),pop=document.getElementById('levelpop');
const SEG=36, G=22, SPEED=8.6, JUMP=11.2;const worlds=window.AnbloxWorlds;let W=innerWidth,H=innerHeight,dpr=1,last=0,started=false,paused=true,score=0,stage=1,mathOpen=false,audio=null,toastClock=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);C.width=Math.round(W*dpr);C.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function sound(freq=600,len=.09,type='sine'){try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(100,freq*.7),audio.currentTime+len);v.gain.setValueAtTime(.06,audio.currentTime);v.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);o.connect(v);v.connect(audio.destination);o.start();o.stop(audio.currentTime+len)}catch(e){}}
const palette=['#fcb7db','#a5e5fd','#b8f49e','#ffe5a0','#d1befc','#ffbea7'];
let platforms=[],stars=[],builtThrough=0;
let lives=3,checkpointStage=1,enemy={x:0,z:-18,freezeUntil:0},chasePending=false,enemyInvulnerableUntil=0,chaseCount=0;let angelNext=32+Math.random()*22,angelElapsed=0,angelActive=false,angelSeen=0;let hazardEscapeUntil=0,hazardEscapeKind=null;
const heartUI=document.getElementById('hearts'), chaseUI=document.getElementById('chase-status'), angelUI=document.getElementById('angel-status');
const nowSeconds=()=>performance.now()/1000;
function updateLives(){heartUI.textContent='❤️ '+lives}
function repositionEnemy(gap=22){enemy.z=player.z-gap;enemy.x=player.x;enemyInvulnerableUntil=nowSeconds()+1.3}

function buildLevels(to){for(let st=builtThrough+1;st<=to;st++){let pathX=0;for(let i=0;i<7;i++){if(i>0&&i<6){const r=(st+i*3)%5;pathX=clamp(pathX+(r===0?1.45:r===1?-1.45:0),-3.2,3.2)}if(i===6)pathX=0;let z=(st-1)*SEG+i*5.8;let width=i===0||i===6?8.5:st<=3?6.8:st<=7?5.8:5.2;let p={x:pathX,z,w:width,d:4.4,y:0,stage:st,i,color:palette[(st+i)%palette.length]};platforms.push(p);if(i===2||i===5)stars.push({x:pathX,z,y:1.4,taken:false,stage:st})}}builtThrough=Math.max(to,builtThrough);platforms=platforms.filter(p=>p.stage>=stage-2);stars=stars.filter(p=>p.stage>=stage-2)}
buildLevels(5);
const player={x:0,y:0,z:0,vx:0,vy:0,vz:0,grounded:true,walk:0,face:0};
const keys=new Set(),joy={x:0,y:0},stick=document.getElementById('stick'),pad=document.getElementById('pad');let jumpWanted=false;
function respawn(){clearHazardEscape();player.x=0;player.y=0;player.z=(stage-1)*SEG;player.vx=player.vy=player.vz=0;player.grounded=true;keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)'}
function save(){worlds?.saveRun({stage,score,lives,checkpointStage});try{localStorage.setItem('anblox-save-v1',JSON.stringify({stage,score,lives,checkpointStage}))}catch(e){}}
try{let s=worlds?.getRun();if(s){stage=Math.max(1,Math.min(999999,Number(s.stage)||1));score=Math.max(0,Number(s.score)||0);lives=Math.max(1,Math.min(3,Number(s.lives)||3));checkpointStage=Math.max(1,Number(s.checkpointStage)||1)}}catch(e){}buildLevels(stage+4);
function updateHud(){levelUI.textContent='🏃 Stage '+stage;starUI.textContent='⭐ '+score;updateLives()}updateHud();
function toast(t){pop.textContent=t;pop.classList.add('show');toastClock=1.5}
const escapeHud=document.createElement('div');escapeHud.id='hazard-escape-hud';escapeHud.setAttribute('role','status');escapeHud.style.cssText='display:none;position:fixed;z-index:15;top:78px;left:50%;transform:translateX(-50%);background:#1b1945e8;color:white;border:3px solid #ffe36b;border-radius:18px;padding:10px 17px;font:900 18px system-ui;text-align:center;box-shadow:0 5px 18px #0005;pointer-events:none;min-width:235px;';document.body.append(escapeHud);
function clearHazardEscape(){hazardEscapeUntil=0;hazardEscapeKind=null;escapeHud.style.display='none'}
// Initialize the player only after the rescue HUD has been created.
respawn();
function startHazardEscape(kind){
 hazardEscapeKind=kind;hazardEscapeUntil=nowSeconds()+30;
 // Start just below the platforms, so the child must actively swim/climb or jump to safety.
 player.y=-1.8;player.vy=0;player.grounded=true;player.vx=0;player.vz=0;
 enemy.freezeUntil=Math.max(enemy.freezeUntil,hazardEscapeUntil+2);
 enemyInvulnerableUntil=Math.max(enemyInvulnerableUntil,hazardEscapeUntil+2);
 escapeHud.style.display='block';paused=false;last=performance.now();
}
function updateHazardEscape(){
 if(!hazardEscapeUntil)return false;
 const remaining=Math.max(0,Math.ceil(hazardEscapeUntil-nowSeconds()));
 escapeHud.textContent=(hazardEscapeKind==='lava'?'🌋 ESCAPE THE LAVA!':'🏊 REACH A BOAT / ISLAND!')+' ⏳ '+remaining+'s';
 if(player.grounded&&player.y>=-.01){
  clearHazardEscape();toast('🎉 SAFE! YOU ESCAPED!');score+=5;updateHud();save();celebrate();return false;
 }
 if(remaining===0){clearHazardEscape();loseLife();return true}
 return false;
}
function begin(){worlds?.startSession();overlay.classList.remove('active');started=true;paused=false;last=performance.now();repositionEnemy(24);sound(800,.15)}
document.getElementById('start').addEventListener('click',begin);
document.getElementById('reset').addEventListener('click',()=>{if(!paused){respawn();repositionEnemy(22);sound(320,.12)}});
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Space'&&!e.repeat)jumpWanted=true;if(e.code==='KeyR'&&!paused)respawn();keys.add(e.code)});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)'});
function joyMove(e){let b=pad.getBoundingClientRect(),dx=e.clientX-(b.left+b.width/2),dy=e.clientY-(b.top+b.height/2),r=b.width*.32;joy.x=clamp(dx/r,-1,1);joy.y=clamp(dy/r,-1,1);let m=Math.hypot(joy.x,joy.y);if(m>1){joy.x/=m;joy.y/=m}stick.style.transform=`translate(${joy.x*r}px,${joy.y*r}px)`}
pad.addEventListener('pointerdown',e=>{pad.setPointerCapture(e.pointerId);joyMove(e)});pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))joyMove(e)});function joyEnd(){joy.x=joy.y=0;stick.style.transform='translate(0px,0px)'}pad.addEventListener('pointerup',joyEnd);pad.addEventListener('pointercancel',joyEnd);
document.getElementById('jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpWanted=true});
function celebrate(){const marks=['⭐','✨','🎊','🌸','💎','🎉','🌟','💖'];for(let i=0;i<35;i++){let e=document.createElement('span');e.className='confetti';e.textContent=marks[i%marks.length];e.style.left=(Math.random()*100)+'%';e.style.animationDelay=(Math.random()*.45)+'s';e.style.animationDuration=(1.8+Math.random()*1.1)+'s';document.body.append(e);setTimeout(()=>e.remove(),3400)}}
window.skyhopConfetti=celebrate;
window.skyhopReward=(n)=>{score+=n;updateHud();save();sound(1050,.12)};
function openMenu(){paused=true;keys.clear();window.SkyQuiz.menu(()=>{overlay.classList.remove('active');paused=false},{level:stage})}
document.getElementById('menu').addEventListener('click',openMenu);
worlds?.bind({open:(fn)=>{paused=true;keys.clear();fn(()=>{paused=false;last=performance.now()})},switchWorld:(id)=>{save();worlds.setWorld(id);let data=worlds.getRun();stage=data.stage||1;checkpointStage=data.checkpointStage||1;score=data.score||0;lives=data.lives||3;platforms=[];stars=[];builtThrough=0;buildLevels(stage+4);respawn();repositionEnemy(28);updateHud();toast('🌟 '+worlds.theme().name);save();angelElapsed=0},toast,celebrate});
document.getElementById('sprint').addEventListener('click',()=>{paused=true;keys.clear();window.SkyQuiz.start({topic:'math',count:20,sprint:true,level:stage,onClose:()=>{overlay.classList.remove('active');paused=false}})});
function nextLevel(){if(stage===5&&!worlds?.passedGate()){player.z=(stage-1)*SEG+30;paused=true;worlds?.level5Gate(()=>{paused=false;last=performance.now()});return;}stage++;worlds?.recordLevel(stage);buildLevels(stage+4);if(stage%3===1){checkpointStage=Math.max(1,stage-2);toast('🏁 CHECKPOINT!')}else toast('🎉 STAGE '+stage+'!');updateHud();save();sound(920,.15);if(stage%2===0)celebrate()}
function loseLife(){worlds?.recordDeath();chaseCount++;lives--;sound(215,.3,'sawtooth');if(lives<=0){lives=3;toast('💗 NEW TRY!')}else toast('💔 BACK TO CHECKPOINT!');stage=Math.max(1,checkpointStage);buildLevels(stage+4);respawn();repositionEnemy(30);enemy.freezeUntil=nowSeconds()+3;updateHud();save()}
function caught(){if(chasePending||paused)return;chasePending=true;paused=true;keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)';sound(315,.17,'square');let q=window.SkyQuiz.chaseQuestion(stage,chaseCount);let remaining=4,lock=false;let opts=q.options.map((o,i)=>`<button class="choice chase-option" data-i="${i}">${o}</button>`).join('');overlay.classList.add('active');dialog.innerHTML=`<h2>😡 ENEMY CAUGHT YOU!</h2><div class="chase-clock" id="chase-clock">⏳ 4</div><div class="question chase-question"></div><div class="choices" id="chase-choices">${opts}</div><p class="sub">✅ Right = 10s freeze · ❌ Wrong = lose ❤️</p>`;dialog.querySelector('.chase-question').textContent=q.prompt;
const clock=dialog.querySelector('#chase-clock');let deadline=performance.now()+4000;let timer=setInterval(()=>{let left=Math.max(0,deadline-performance.now());remaining=Math.ceil(left/1000);clock.textContent='⏳ '+remaining;if(left<=0)finish(false)},75);
function finish(correct,selected='(timed out)'){if(lock)return;lock=true;worlds?.recordAnswer({topic:q.topic||'mixed',question:q.prompt,answer:q.answer,selected,correct,mode:'enemy'});clearInterval(timer);chasePending=false;overlay.classList.remove('active');paused=false;last=performance.now();if(correct){enemy.freezeUntil=nowSeconds()+10;enemyInvulnerableUntil=enemy.freezeUntil+1.5;score+=3;save();updateHud();toast('🧊 FROZEN 10 SECONDS! +3 ⭐');celebrate();sound(1150,.2)}else loseLife()}
dialog.querySelectorAll('.chase-option').forEach(b=>b.addEventListener('click',()=>finish(b.textContent===q.answer,b.textContent)));
}
function angelQuiz(){if(paused||angelActive||chasePending)return;angelActive=true;angelSeen++;paused=true;keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)';sound(890,.2);overlay.classList.add('active');dialog.classList.add('angel-dialog');let correct=0,asked=0,lock=false,deadline=performance.now()+20000,done=false;const draw=()=>{if(done)return;const q=window.SkyQuiz.surpriseQuestion();asked++;dialog.innerHTML=`<h2>👼 ANGEL CHALLENGE!</h2><div class="angel-clock" id="angel-clock">⏳ 20s</div><p class="sub" id="angel-count">⭐ ${correct} · Question ${asked}</p><div class="question" id="angel-question"></div><div class="choices" id="angel-choices"></div><p class="help">✨ Answer as many as you can! No lives lost.</p>`;document.getElementById('angel-question').textContent=q.prompt;const choices=document.getElementById('angel-choices');q.options.forEach(answer=>{let b=document.createElement('button');b.className='choice';b.textContent=answer;b.onclick=()=>{if(done||lock||performance.now()>=deadline)return;lock=true;worlds?.recordAnswer({topic:q.topic||'mixed',question:q.prompt,answer:q.answer,selected:answer,correct:answer===q.answer,mode:'angel'});if(answer===q.answer){correct++;sound(970,.08)}else sound(350,.08);setTimeout(()=>{lock=false;draw()},130)};choices.appendChild(b)})};
const finish=()=>{if(done)return;done=true;clearInterval(timer);angelActive=false;dialog.classList.remove('angel-dialog');worlds?.recordQuiz({topic:'angel',correct,total:asked-1,sprint:true,seconds:20,grade:window.SkyQuiz.getGrade()});let bonus=correct*2+(correct>=5?10:0);score+=bonus;updateHud();save();dialog.innerHTML=`<h2>👼 ANGEL BLESSING!</h2><div class="mascot">🌈 💖 ✨</div><div class="results-score">${correct} <small>answers!</small></div><p class="sub">+${bonus} ⭐ · No lives lost</p><button class="primary" id="angel-back">🏃‍♀️ RUN!</button>`;celebrate();sound(1100,.2);document.getElementById('angel-back').onclick=()=>{overlay.classList.remove('active');paused=false;last=performance.now();enemy.freezeUntil=Math.max(enemy.freezeUntil,nowSeconds()+5);enemyInvulnerableUntil=Math.max(enemyInvulnerableUntil,nowSeconds()+6);angelNext=30+Math.random()*35;angelElapsed=0;toast('👼 ANGEL MAGIC!')};};
let timer=setInterval(()=>{let remaining=Math.max(0,deadline-performance.now());let el=document.getElementById('angel-clock');if(el)el.textContent='⏳ '+Math.ceil(remaining/1000)+'s';if(remaining<=0)finish()},80);draw();}
function physics(dt){if(!hazardEscapeUntil){angelElapsed+=dt;if(angelElapsed>=angelNext){angelQuiz();return}}let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x, dz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy.y;let m=Math.hypot(dx,dz);if(m>1){dx/=m;dz/=m}player.vx=dx*SPEED;player.vz=dz*SPEED;if(jumpWanted&&player.grounded){player.vy=JUMP;player.grounded=false;sound(520,.08)}jumpWanted=false;let oldY=player.y;player.x+=player.vx*dt;player.z+=player.vz*dt;player.vy-=G*dt;player.y+=player.vy*dt;player.grounded=false;
if(player.vy<=0&&oldY>=-.15&&player.y<=0){for(let p of platforms){if(Math.abs(p.z-player.z)<p.d/2+.25&&Math.abs(p.x-player.x)<p.w/2+.25){player.y=0;player.vy=0;player.grounded=true;break}}}
if(player.grounded&&m>.15){player.walk+=dt*12;player.face=Math.atan2(dx,dz)}if(worlds?.hazard() && player.y< -2.2 && !worlds.isRescuing() && !hazardEscapeUntil){paused=true;keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)';worlds.startHazard(worlds.hazard(),()=>startHazardEscape(worlds.hazard()),()=>{paused=false;last=performance.now();loseLife()});return;}
if(hazardEscapeUntil){if(player.y<-1.8){player.y=-1.8;player.vy=0;player.grounded=true}if(updateHazardEscape())return}else if(player.y< -15){loseLife()}
for(let s of stars)if(!s.taken&&Math.abs(player.z-s.z)<1.05&&Math.abs(player.x-s.x)<1.1&&Math.abs(player.y-s.y)<1.7){s.taken=true;score++;updateHud();save();sound(1060,.13);toast('⭐ +1')}
if(!hazardEscapeUntil&&player.z>(stage-1)*SEG+35.1)nextLevel();
angelUI.textContent='👼 '+Math.max(0,Math.ceil(angelNext-angelElapsed))+'s';if(nowSeconds()>=enemy.freezeUntil){enemy.z+=12.25*dt;enemy.x+=(player.x-enemy.x)*Math.min(1,2.8*dt);chaseUI.textContent='😡 CHASING!';}else chaseUI.textContent='🧊 '+Math.ceil(enemy.freezeUntil-nowSeconds())+'s';
if(enemy.z<player.z-43)enemy.z=player.z-43;
if(nowSeconds()>enemyInvulnerableUntil&&enemy.z>=player.z-1.35&&Math.abs(enemy.x-player.x)<2.2)caught();
}
// Perspective projection, hand-coded so all game assets work offline without a 3D library.
let camera,forward,right,up,focal;
function vdot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z}function vsub(a,b){return{x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}}function norm(a){let m=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/m,y:a.y/m,z:a.z/m}}function cross(a,b){return{x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}}
function project(p){let v=vsub(p,camera),depth=vdot(v,forward);if(depth<=.14)return null;return{x:W/2+vdot(v,right)*focal/depth,y:H*.51-vdot(v,up)*focal/depth,d:depth}}
const faces=[];function quad(points,color,outline){let proj=points.map(project);if(proj.some(p=>!p))return;let depth=proj.reduce((s,p)=>s+p.d,0)/proj.length;faces.push({proj,depth,color,outline})}
function box(x,y,z,w,h,d,top,front,side){let lo=x-w/2,hi=x+w/2,back=z-d/2,ahead=z+d/2,b=y+h;
quad([{x:lo,y:b,z:back},{x:hi,y:b,z:back},{x:hi,y:b,z:ahead},{x:lo,y:b,z:ahead}],top);
quad([{x:lo,y:y,z:ahead},{x:hi,y:y,z:ahead},{x:hi,y:b,z:ahead},{x:lo,y:b,z:ahead}],front);
quad([{x:lo,y:y,z:back},{x:lo,y:y,z:ahead},{x:lo,y:b,z:ahead},{x:lo,y:b,z:back}],side);
quad([{x:hi,y:y,z:ahead},{x:hi,y:y,z:back},{x:hi,y:b,z:back},{x:hi,y:b,z:ahead}],side);
quad([{x:hi,y:y,z:back},{x:lo,y:y,z:back},{x:lo,y:b,z:back},{x:hi,y:b,z:back}],front)}
function rgba(hex,factor){let v=parseInt(hex.slice(1),16),r=(v>>16)&255,g=(v>>8)&255,b=v&255;return 'rgb('+Math.round(r*factor)+','+Math.round(g*factor)+','+Math.round(b*factor)+')'}
function drawBackground(t){let theme=worlds?.theme();let sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,theme?.skyTop||'#5ec4ff');sky.addColorStop(.65,theme?.skyMid||'#bdeeff');sky.addColorStop(1,theme?.skyBottom||'#fdf1ff');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);for(let i=0;i<(theme?.dark?5:15);i++){let x=((i*173+Math.sin(i)*87+W*3)% (W+280))-130,y=H*(.14+(i%5)*.15),s=22+(i%4)*13;ctx.fillStyle=theme?.dark?'#bda0e25a':'#ffffff9e';ctx.beginPath();ctx.ellipse(x,y,s*2.6,s*.54,0,0,Math.PI*2);ctx.ellipse(x-s*.65,y-10,s,s*.7,0,0,Math.PI*2);ctx.ellipse(x+s*.3,y-16,s*1.25,s*.85,0,0,Math.PI*2);ctx.fill()}}
function render(t){drawBackground(t);camera={x:player.x*.76,y:player.y+7.6,z:player.z-15.8};let target={x:player.x,y:player.y+1.1,z:player.z+9};forward=norm(vsub(target,camera));right=norm(cross({x:0,y:1,z:0},forward));up=norm(cross(forward,right));focal=Math.min(W*1.2,H*1.55);faces.length=0;
for(let p of platforms){if(p.z<player.z-17||p.z>player.z+90)continue;let tc=worlds?.theme()?.platform||p.color;box(p.x,-.75,p.z,p.w,.75,p.d,tc,rgba(tc,.78),rgba(tc,.68));if(p.i===0){box(p.x,-.03,p.z-.5,.72,.09,1.2,'#fff5a5','#edbc59','#cf9c4b')}}
// Moving runners are simulated NPCs; they move and jump around the course.
const theme=worlds?.theme()||{};
for(let n=0;n<9;n++){let nz=Math.floor(player.z/30)*30+n*12-28+((t*(2.4+n*.19))%20),nx=Math.sin(n*2.6+nz*.05)*2.3,ny=Math.abs(Math.sin(t*2.1+n*1.7))*.85;
if(nz>player.z-13&&nz<player.z+72){let col=['#a2e6f8','#ffdc8a','#c2a2ff','#96e6a1','#f4afcf'][n%5];box(nx,ny+.6,nz,.76,.85,.5,col,rgba(col,.78),rgba(col,.7));box(nx,ny+1.49,nz,.68,.65,.6,'#f5caa9','#e5b18e','#cea17e');box(nx-.21,ny+.12,nz,.28,.5,.35,'#5e69c1','#5660aa','#495299');box(nx+.21,ny+.12,nz,.28,.5,.35,'#5e69c1','#5660aa','#495299');}}
// World-specific oversized objects and environmental landmarks.
for(let n=0;n<7;n++){let zz=(Math.floor(player.z/26)+n-1)*26+7;if(zz<player.z-18||zz>player.z+90)continue;let xx=(n%2?9:-9);if(worlds?.activeId()==='tiny'){box(xx,0,zz,5,8,4,'#f9dfbc','#cda3d3','#b887b1');box(xx,8,zz,2,4,2,'#fce8ed','#eecfdb','#bc94c1')}else if(worlds?.activeId()==='halloween'){box(xx,0,zz,2,5,2,'#44334f','#332b46','#2e253f');box(xx,4,zz,3,1.9,2,'#ffad43','#d6762b','#9a521c')}else if(worlds?.activeId()==='themepark'){box(xx,0,zz,3,3,3,'#ffe06b','#ffa2d4','#ab88e8');box(xx,3,zz,1.5,2,1.5,'#f8c9f1','#a3e9ed','#e7a8e8')}else if(worlds?.activeId()==='maldives'){box(xx,-2,zz,7,1.5,5,'#f6e7c4','#e9c79a','#bc9e71');box(xx,0,zz,1,5,1,'#98755c','#886044','#765236')}else if(worlds?.activeId()==='lava'){box(xx,-2,zz,5,3,5,'#f24a19','#bd2f22','#9c2515')}else{box(xx,0,zz,2,6,2,'#eeeaff','#c5b6f2','#9888cf')}}
// Angry pursuer is a bright red visible NPC, faster than the runner.
if(enemy.z>player.z-19&&enemy.z<player.z+50){let ex=enemy.x,ez=enemy.z,ey=0,frozen=nowSeconds()<enemy.freezeUntil;let c=frozen?'#9adfff':'#f64f67';box(ex-.24,ey+.07,ez,.39,.75,.41,'#633f96','#51327f','#51327f');box(ex+.24,ey+.07,ez,.39,.75,.41,'#633f96','#51327f','#51327f');box(ex,ey+.8,ez,1.12,1.1,.7,c,frozen?'#78bfe8':'#df3152','#b6274b');box(ex,ey+1.78,ez,.93,.86,.83,frozen?'#b6f2ff':'#ff826e',frozen?'#83dbe9':'#f85d60','#a93460');box(ex-.22,ey+1.9,ez+.43,.18,.13,.08,'#331a46','#331a46','#331a46');box(ex+.22,ey+1.9,ez+.43,.18,.13,.08,'#331a46','#331a46','#331a46');box(ex,ey+1.58,ez+.43,.46,.1,.07,'#552442','#552442','#552442');}
// Guardian angel floats over the course, signaling bonus quizzes.
let az=player.z+14+Math.sin(t*1.7)*2,ay=5.8+Math.sin(t*2)*.5;box(player.x-.7,ay,az,.65,1.2,.2,'#ffffff','#ddf7ff','#a6dfff');box(player.x+.7,ay,az,.65,1.2,.2,'#ffffff','#ddf7ff','#a6dfff');box(player.x,ay,az,.8,1.35,.55,'#ffecad','#ffdbec','#d6d8ff');box(player.x,ay+1.3,az,.75,.68,.68,'#ffe7c0','#ffdfad','#e6c093');box(player.x,ay+1.83,az,.95,.12,.2,'#fff5a3','#ffe27b','#f3b64b');
// Player avatar with stronger dress-up differences so rewards feel visible while running.
let wearing=worlds?.getWear()||{};
let outfitPal=[
 {dress:'#b38cff',mid:'#9367eb',dark:'#6e47c6',trim:'#fff3ab',hair:'#5c3f88',shoe:'#ffffff',sock:'#f7f2ff'},
 {dress:'#ff9bc7',mid:'#f56ab2',dark:'#c94d92',trim:'#fff7ff',hair:'#8d4d71',shoe:'#fff0f6',sock:'#fff7fc'},
 {dress:'#75c6ff',mid:'#4da4ea',dark:'#327ec1',trim:'#ffe37a',hair:'#4f5298',shoe:'#f2fbff',sock:'#eff7ff'}
][wearing.dress||0];
let hairStyle=wearing.hair??0;let hairColor=['#704071','#8764c1','#d4a04b'][hairStyle];let bodyScale=wearing.body===1?.86:wearing.body===2?1.12:1;let headScale=wearing.body===1?1.08:wearing.body===2?.95:1;let torsoH=wearing.body===1?.9:wearing.body===2?1.08:1;let bob=player.grounded?Math.sin(player.walk)*.055:0;let walk=player.grounded?Math.sin(player.walk)*.24:0,x=player.x,y=player.y+bob,z=player.z;
box(x-.2,y+.12+Math.max(0,walk),z,.3,.68,.34,outfitPal.sock,rgba(outfitPal.sock,.88),rgba(outfitPal.sock,.75));box(x+.2,y+.12+Math.max(0,-walk),z,.3,.68,.34,outfitPal.sock,rgba(outfitPal.sock,.88),rgba(outfitPal.sock,.75));box(x-.2,y+.04+Math.max(0,walk),z+.13,.44,.2,.56,outfitPal.shoe,'#f1b8d6','#cf78a9');box(x+.2,y+.04+Math.max(0,-walk),z+.13,.44,.2,.56,outfitPal.shoe,'#f1b8d6','#cf78a9');
box(x,y+.78,z,.92*bodyScale,1.0*torsoH,.54,outfitPal.dress,rgba(outfitPal.mid,.96),rgba(outfitPal.dark,.9));box(x,y+.57,z+.025,1.34*bodyScale,.22,.84,outfitPal.dress,rgba(outfitPal.mid,.96),rgba(outfitPal.dark,.9));box(x,y+1.18,z+.28,.36,.26,.12,outfitPal.trim,rgba(outfitPal.trim,.94),rgba(outfitPal.trim,.86));if((wearing.dress||0)===0){box(x,y+.97,z+.26,.18,.18,.08,'#fff2a0','#ffe46f','#f0c94d');box(x,y+.79,z+.28,.68,.09,.06,'#fff8ce','#fff8ce','#fff8ce')}else if((wearing.dress||0)===1){box(x,y+.95,z+.28,.58,.14,.08,'#fff7ff','#fff7ff','#ffe7f2');box(x,y+.67,z+.29,.98,.08,.07,'#fff7ff','#fff7ff','#ffe7f2')}else {box(x,y+1.0,z+.28,.78,.08,.07,'#ffffff','#ffffff','#e4eef7');box(x,y+.86,z+.28,.08,.52,.06,'#ffffff','#ffffff','#e4eef7');box(x+.24,y+.95,z+.31,.16,.14,.08,'#ffe07b','#e6bf55','#c99b3a')}
box(x-.6,y+.95,z,.24,.7,.36,'#f5c9a6','#f0be9c','#dba183');box(x+.6,y+.95,z,.24,.7,.36,'#f5c9a6','#f0be9c','#dba183');
box(x,y+1.76,z,.78*headScale,.76*headScale,.7,'#f7d5ad','#ecc295','#ce9f79');box(x,y+2.18,z-.03,.92,.28,.82,hairColor,rgba(hairColor,.88),rgba(hairColor,.72));box(x-.44,y+1.7,z-.23,.25,.88,.48,hairColor,rgba(hairColor,.88),rgba(hairColor,.72));box(x+.44,y+1.7,z-.23,.25,.88,.48,hairColor,rgba(hairColor,.88),rgba(hairColor,.72));
// Hair Salon variants, distinct on the running character.
if(hairStyle===0){box(x-.45,y+1.25,z-.25,.22,.65,.35,hairColor,rgba(hairColor,.88),rgba(hairColor,.73));box(x+.45,y+1.25,z-.25,.22,.65,.35,hairColor,rgba(hairColor,.88),rgba(hairColor,.73))}
else if(hairStyle===1){box(x-.66,y+2.04,z-.05,.36,.38,.36,hairColor,rgba(hairColor,.88),rgba(hairColor,.73));box(x+.66,y+2.04,z-.05,.36,.38,.36,hairColor,rgba(hairColor,.88),rgba(hairColor,.73));box(x-.64,y+2.23,z,.25,.12,.32,'#ffc0ed','#eb91cc','#cb6aad');box(x+.64,y+2.23,z,.25,.12,.32,'#ffc0ed','#eb91cc','#cb6aad')}
else {box(x+.52,y+1.4,z-.3,.28,.86,.36,hairColor,rgba(hairColor,.88),rgba(hairColor,.73));box(x+.52,y+1.2,z-.23,.2,.12,.25,'#ffdf72','#e4bf52','#c79b36')}
if((wearing.accessory||0)===0){box(x,y+2.54,z,.46,.2,.22,'#ff79b9','#e75ba5','#ca458c');box(x-.22,y+2.54,z,.16,.12,.16,'#fff3a8','#f1db6f','#d3b94a');box(x+.22,y+2.54,z,.16,.12,.16,'#fff3a8','#f1db6f','#d3b94a')}else if((wearing.accessory||0)===1){box(x,y+2.56,z,.68,.18,.24,'#ffd960','#efc144','#cf9925');box(x-.2,y+2.62,z,.12,.12,.12,'#ff9ec8','#e777b3','#c55591');box(x,y+2.68,z,.12,.12,.12,'#8fd4ff','#67b8ef','#4f96cf');box(x+.2,y+2.62,z,.12,.12,.12,'#c4ffa5','#94da76','#6db457')}else if((wearing.accessory||0)===2){box(x-.7,y+1.18,z-.25,.58,.92,.18,'#f2efff','#d7cafa','#a694ea');box(x+.7,y+1.18,z-.25,.58,.92,.18,'#f2efff','#d7cafa','#a694ea')}
box(x-.17,y+1.81,z+.355,.09,.09,.04,'#342548','#342548','#342548');box(x+.17,y+1.81,z+.355,.09,.09,.04,'#342548','#342548','#342548');if((wearing.face||0)===0){box(x-.28,y+1.64,z+.38,.15,.14,.05,'#ef8db8','#ef8db8','#ef8db8');box(x+.28,y+1.64,z+.38,.15,.14,.05,'#ef8db8','#ef8db8','#ef8db8')}else if((wearing.face||0)===1){box(x,y+1.9,z+.39,.58,.14,.08,'#6d4bb1','#6d4bb1','#5b3d97')}else {box(x-.3,y+1.93,z+.39,.1,.1,.05,'#ff91ca','#ff91ca','#d86ab0');box(x+.3,y+1.93,z+.39,.1,.1,.05,'#ff91ca','#ff91ca','#d86ab0');box(x,y+1.66,z+.39,.26,.06,.05,'#c46082','#c46082','#a54567')}
for(let s of stars){if(s.taken||s.z<player.z-12||s.z>player.z+65)continue;let b=.24*Math.sin(t*3+s.z);box(s.x,s.y+b,s.z,.68,.68,.23,'#fff173','#ffcb2d','#f9a927')}
faces.sort((a,b)=>b.depth-a.depth);for(let f of faces){ctx.beginPath();ctx.moveTo(f.proj[0].x,f.proj[0].y);for(let i=1;i<f.proj.length;i++)ctx.lineTo(f.proj[i].x,f.proj[i].y);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle='#ffffff50';ctx.lineWidth=.8;ctx.stroke()}
// Guide arrows for young players.
let p=project({x:player.x,y:player.y+.05,z:player.z+6});if(p&&p.y>65&&p.y<H-110){ctx.font='bold '+clamp(W*.045,22,38)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.shadowColor='#675ab7';ctx.shadowBlur=10;ctx.fillText('➜',p.x,p.y);ctx.shadowBlur=0}}
function frame(now){let dt=Math.min((now-last)/1000||0,.04);last=now;if(started&&!paused)physics(dt);if(toastClock>0){toastClock-=dt;if(toastClock<=0)pop.classList.remove('show')}render(now/1000);requestAnimationFrame(frame)}requestAnimationFrame(frame);
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
