/* ANBLOX V15 — free exploration, safe zones, contextual learning, animated movement.
   Rendering is native Canvas with 3D projection (no network dependencies). */
(()=>{'use strict';
// Shared gameplay clock: browser-background time never counts against quiz or rescue deadlines.
let hiddenSince=document.hidden?performance.now():null,hiddenAccumulated=0;
const clockNow=()=>performance.now()-hiddenAccumulated-(hiddenSince===null?0:performance.now()-hiddenSince);
window.AnbloxClock={now:clockNow};
function clockVisibility(){
 if(document.hidden){if(hiddenSince===null)hiddenSince=performance.now();}
 else if(hiddenSince!==null){hiddenAccumulated+=performance.now()-hiddenSince;hiddenSince=null;}
}
document.addEventListener('visibilitychange',clockVisibility);
const companions=window.AnbloxCompanions;
const $=id=>document.getElementById(id), canvas=$('world'),ctx=canvas.getContext('2d',{alpha:false}),overlay=$('overlay'),dialog=$('dialog'),worlds=window.AnbloxWorlds;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
let W=innerWidth,H=innerHeight,dpr=1,playing=false,paused=true,last=0,sessionActive=false,toastUntil=0,toastText='',fps=0;
let stage=1,lives=3,score=0,checkpointStage=1,missions=0,questActive=false;
const MISSION_PREFIX='anblox-v14-discoveries-';
function missionKey(){return MISSION_PREFIX+worlds.activeId()+'-'+stage}
function completedMissions(){try{return JSON.parse(localStorage.getItem(missionKey())||'[]').filter(x=>typeof x==='string')}catch(e){return []}}
const NAME_KEY='anblox-player-nickname-v1', LEVEL_KEY='anblox-world-level-unlocks-v1';
let playerName=localStorage.getItem(NAME_KEY)||'Adventurer';
let unlockedLevels={};try{unlockedLevels=JSON.parse(localStorage.getItem(LEVEL_KEY)||'{}')||{}}catch(e){}
let pickedWorld=worlds?.activeId()||'themepark',pickedLevel=1;
function cleanName(s){return String(s||'').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,18)||'Adventurer'}
function nameHUD(){const b=$('player-name');if(b){b.textContent='⭐ '+playerName;b.title='Change your name';b.style.pointerEvents='auto';b.style.cursor='pointer'}}
function maxLevel(world){const saved=worlds?.getWorldRun?.(world);return Math.max(1,Number(unlockedLevels[world]||1),Number(saved?.bestStage||saved?.stage||1))}
function unlockLevel(world,lv){unlockedLevels[world]=Math.max(Number(unlockedLevels[world]||1),lv);localStorage.setItem(LEVEL_KEY,JSON.stringify(unlockedLevels))}
const player={x:0,y:0,z:0,vx:0,vy:0,vz:0,grounded:true,face:0,walk:0,stance:'idle',gaitBlend:0};
const keys=new Set(),joy={x:0,y:0},pad=$('pad'),stick=$('stick');let jumpRequested=false,jumpBuffer=0,coyote=0,camAngle=0,camPitch=.37,interact=null,encounterCooldown=0,escape=null;
let cameraPos=null,camDrag=null,camLastFrame=0;
const CAMERA_DEFAULT_PITCH=.37,CAMERA_MIN_PITCH=.18,CAMERA_MAX_PITCH=.92;
// Place the camera in front of solid walls, rather than allowing it to orbit through rooms.
function cameraClippedTarget(focus,desired){
 const vx=desired.x-focus.x,vy=desired.y-focus.y,vz=desired.z-focus.z;
 let closest=1;
 for(const o of obstacles){
   // The avatar can start near an obstacle; only block camera rays entering it.
   const minX=o.x-o.w/2-.35,maxX=o.x+o.w/2+.35;
   const minZ=o.z-o.d/2-.35,maxZ=o.z+o.d/2+.35;
   if(focus.x>minX&&focus.x<maxX&&focus.z>minZ&&focus.z<maxZ)continue;
   let enter=0,exit=1;
   for(const [f,v,lo,hi] of [[focus.x,vx,minX,maxX],[focus.z,vz,minZ,maxZ]]){
     if(Math.abs(v)<1e-6){if(f<lo||f>hi){exit=-1;break}}
     else {const a=(lo-f)/v,b=(hi-f)/v;enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b))}
   }
   if(exit<enter||enter>=closest)continue;
   // Interior walls are about 5m tall; look over them if the camera ray clears the top.
   if(focus.y+vy*enter>5.25)continue;
   closest=Math.min(closest,Math.max(.17,enter-.035));
 }
 return closest<1?{x:focus.x+vx*closest,y:focus.y+vy*closest,z:focus.z+vz*closest}:desired;
}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)';camDrag=null;}
 last=clockNow();camLastFrame=clockNow();
});
const safeZone={x:0,z:0,r:20},hazardZone={x:35,z:31,r:15};
const activities=[
 {id:'salon',x:-12,z:4,emoji:'👗',name:'Fashion Boutique',type:'wardrobe',color:'#ffabdf'},
 {id:'angel',x:12,z:5,emoji:'👼',name:'Angel Garden',type:'angel',color:'#fff7a8'},
 {id:'arcade',x:-12,z:31,emoji:'🎮',name:'Game Arcade',type:'arcade',color:'#a9d3ff'},
 {id:'treasure',x:12,z:31,emoji:'🎁',name:'Treasure House',type:'treasure',color:'#ffcf7b'},
 {id:'park',x:0,z:51,emoji:'🏁',name:'Discovery Park',type:'park',color:'#bceca0'},
 {id:'danger',x:35,z:31,emoji:'😡',name:'Danger Woods',type:'danger',color:'#ff858f'},
 {id:'pet',x:-25,z:-6,emoji:'🐾',name:'Pet Meadow',type:'pet',color:'#ffd6ec'}];
const obstacles=[];
function coll(x,z,w,d,top=5){obstacles.push({x,z,w,d,top})}
// Interiors are entered through open front sides. Walls are solid; furnishings have collision.
for(const a of activities.slice(0,4)){
 const x=a.x,z=a.z;
 coll(x-7,z,1.2,14);coll(x+7,z,1.2,14);coll(x,z+6.5,14,1.2);
 coll(x-5.1,z-6.5,3.5,1.2);coll(x+5.1,z-6.5,3.5,1.2);
 coll(x-3.5,z+2.5,2.4,2.4,1.5);coll(x+3.6,z+3.5,2.2,2.2,1.2)
}
const props=[];
const addProp=(x,z,kind)=>props.push({x,z,kind});
for(let z=-18;z<=65;z+=8){for(let x=-38;x<=38;x+=9){const road=Math.abs(x)<5||Math.abs(z-18)<5||Math.abs(z-43)<5;const inside=activities.some(a=>Math.abs(x-a.x)<9&&Math.abs(z-a.z)<9);if(!road&&!inside&&((x*7+z*13)%4!==0))addProp(x+.8*Math.sin(x+z),z, 'tree')}}
for(let n=0;n<11;n++){let a=n*2.399,rad=3+(n%4)*2;addProp(Math.cos(a)*rad,Math.sin(a)*rad,'flower')}
// Real, climbable platforms are shared physics objects, but each world can customize
// or disable its sky course independently in world-catalog.js.
function skyPlatforms(){
 const th=worlds.theme(); if(th.skyCourse===false)return [];
 const cfg=th.skyCourse&&typeof th.skyCourse==='object'?th.skyCourse:{};
 const steps=Math.max(4,Math.min(28,Number(cfg.steps)||16));
 const startX=Number.isFinite(cfg.startX)?cfg.startX:-46;
 const startZ=Number.isFinite(cfg.startZ)?cfg.startZ:63;
 const stepX=Number.isFinite(cfg.stepX)?cfg.stepX:3.65;
 const rise=Math.max(.6,Math.min(1.5,Number(cfg.rise)||1.08));
 const result=[];
 for(let i=0;i<steps;i++)result.push({x:startX+i*stepX,z:startZ,y:(i+1)*rise,w:3.8,d:4.8,kind:'step'});
 result.push({x:startX+steps*stepX,z:startZ,y:steps*rise,w:7,d:7,kind:'summit'});
 return result;
}
// Check both horizontal and vertical overlap: high flyers can jump above walls.
function solidAt(x,z,feet,head){
 for(const o of obstacles){if(feet<o.top-.04&&head>.1&&Math.abs(x-o.x)<o.w/2+.32&&Math.abs(z-o.z)<o.d/2+.32)return true;}
 const all=[...props,...(Array.isArray(worlds.theme().decorations)?worlds.theme().decorations:[])];
 for(const prop of all){if(prop.kind!=='tree'&&prop.kind!=='tower')continue;
   const radius=prop.kind==='tree'?.46:1.35,top=prop.kind==='tree'?3:7;
   if(feet<top-.04&&head>.05&&Math.hypot(x-prop.x,z-prop.z)<radius+.32)return true;
 }
 return false;
}
const NPCS=[{name:'Luna',x:0,z:8,t:0,col:'#ffc6e7'},{name:'Max',x:3,z:17,t:1.4,col:'#88dcff'},{name:'Sunny',x:-3,z:44,t:3,col:'#ffd076'},{name:'Nova',x:12,z:28,t:4.5,col:'#c7a7ff'},{name:'Pip',x:-12,z:29,t:2.3,col:'#9be4aa'}];
const enemy={x:35,z:45,awake:false,freeze:0,route:[],repathAt:0};
const petPosition={x:-1.5,z:-2.5,walk:0},friendPosition={x:1.6,z:-3,walk:0};
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}addEventListener('resize',resize);resize();
function save(){worlds?.saveRun({stage,score,lives,checkpointStage,bestStage:maxLevel(worlds.activeId())})}
function load(){let r=worlds?.getRun();stage=Math.max(1,r?.stage||1);score=Math.max(0,r?.score||0);lives=r?.lives||3;checkpointStage=r?.checkpointStage||1;unlockLevel(worlds.activeId(),Math.max(r?.bestStage||1,stage));updateHUD()};load();nameHUD();
function updateHUD(){$('level').textContent='🌟 Level '+stage+' · 🌈 '+completedMissions().length+'/3';$('hearts').textContent='❤️ '+lives;$('stars').textContent='⭐ '+score;$('chase-status').textContent=dist(player,hazardZone)<hazardZone.r?'😡 DANGER':'🛡️ SAFE';$('angel-status').textContent='👼 VISIT ANGEL'}
function toast(t){const e=$('levelpop');e.textContent=t;e.classList.add('show');toastUntil=clockNow()+2200}
function confetti(){const choices=['✨','🌸','⭐','🎉','💖'];for(let i=0;i<30;i++){let e=document.createElement('span');e.className='confetti';e.textContent=choices[i%5];e.style.left=(Math.random()*100)+'%';e.style.animationDelay=(Math.random()*.35)+'s';document.body.append(e);setTimeout(()=>e.remove(),3200)}}
window.skyhopConfetti=confetti;window.skyhopReward=n=>{score+=n;updateHUD();save()};
function begin(){playing=true;paused=false;overlay.classList.remove('active');dialog.classList.remove('select-dialog');if(!sessionActive){worlds?.startSession();sessionActive=true}last=clockNow();toast('🌈 GO EXPLORE!')}
function chooseAdventure(){paused=true;overlay.classList.add('active');dialog.classList.add('select-dialog');pickedWorld=worlds.activeId();pickedLevel=Math.min(stage,maxLevel(pickedWorld));renderSelect()}
function renderSelect(){
 const definitions=worlds.DEFINITIONS||[];
 dialog.innerHTML=`<h2>🌈 ANBLOX ADVENTURES 🌈</h2><div class="select-hero">⭐ Hello, superstar! ⭐</div><label class="select-label" for="nickname-field">YOUR NAME</label><input id="nickname-field" maxlength="18" autocomplete="off" placeholder="Your name" /><div class="avatar-customize"><strong>🧍 CHOOSE YOUR CHARACTER</strong><div class="avatar-picks" id="avatar-types"></div><strong>🎨 SKIN TONE</strong><div class="avatar-picks" id="avatar-skins"></div><small>All looks and dress-up rewards are available to every character.</small></div><div class="select-label">🌎 CHOOSE YOUR WORLD</div><div class="select-worlds" id="select-worlds"></div><div class="select-label">🏆 CHOOSE A LEVEL</div><div class="select-levels" id="select-levels"></div><p class="select-note">🌸 New levels unlock through adventures and missions. You can revisit any unlocked level.</p><button id="select-launch" class="primary">✨ LET'S GO!</button>`;
 $('nickname-field').value=playerName;
 const profile=worlds.getAvatarProfile();
 for(const kind of ['girl','boy']){const b=document.createElement('button');b.textContent=kind==='girl'?'👧 Girl':'👦 Boy';b.classList.toggle('active',profile.type===kind);b.onclick=()=>{playerName=cleanName($('nickname-field').value);worlds.setAvatarProfile(kind,worlds.getAvatarProfile().skin);renderSelect()};$('avatar-types').append(b)}
 worlds.SKIN_TONES.forEach((tone,i)=>{const b=document.createElement('button');b.className='avatar-swatch'+(profile.skin===i?' active':'');b.style.background=tone;b.title='Skin tone '+(i+1);b.setAttribute('aria-label','Skin tone '+(i+1));b.onclick=()=>{playerName=cleanName($('nickname-field').value);worlds.setAvatarProfile(worlds.getAvatarProfile().type,i);renderSelect()};$('avatar-skins').append(b)});

 const buttonBox=$('select-worlds');
 for(const w of definitions){const b=document.createElement('button');b.type='button';b.classList.toggle('active',w.id===pickedWorld);b.innerHTML='<b>'+w.emoji+'</b>'+w.name;b.onclick=()=>{playerName=cleanName($('nickname-field').value);pickedWorld=w.id;pickedLevel=Math.min(Math.max(1,worlds.activeId()===w.id?stage:1),maxLevel(w.id));renderSelect()};buttonBox.append(b)}
 const lvBox=$('select-levels'),maximum=maxLevel(pickedWorld);pickedLevel=Math.max(1,Math.min(pickedLevel,maximum));
 // Page unlocked levels rather than stopping at Level 30 or drawing thousands of buttons.
 // The number field also makes any previously unlocked level directly accessible.
 let page=Math.floor((pickedLevel-1)/8);
 const drawLevels=()=>{
  lvBox.replaceChildren();const totalPages=Math.max(1,Math.ceil(maximum/8));page=clamp(page,0,totalPages-1);
  const caption=document.createElement('div');caption.className='select-note';caption.textContent='🏆 Unlocked through Level '+maximum+' · Page '+(page+1)+' of '+totalPages;lvBox.append(caption);
  const holder=document.createElement('div');holder.className='select-level-buttons';holder.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin:9px 0';lvBox.append(holder);
  const start=page*8+1;
  for(let lv=start;lv<=Math.min(maximum,start+7);lv++){
   const b=document.createElement('button');b.textContent='⭐ '+lv;b.classList.toggle('active',lv===pickedLevel);
   b.onclick=()=>{pickedLevel=lv;drawLevels()};holder.append(b)
  }
  const navigation=document.createElement('div');navigation.style.cssText='display:flex;justify-content:center;align-items:center;gap:9px;flex-wrap:wrap';lvBox.append(navigation);
  const prev=document.createElement('button');prev.className='mini';prev.textContent='◀ Previous';prev.disabled=page===0;prev.onclick=()=>{page--;drawLevels()};navigation.append(prev);
  const entry=document.createElement('input');entry.type='number';entry.min='1';entry.max=String(maximum);entry.value=String(pickedLevel);entry.setAttribute('aria-label','Jump to unlocked level');entry.style.cssText='width:78px;max-width:30%;padding:8px;border-radius:12px;text-align:center';navigation.append(entry);
  const go=document.createElement('button');go.className='mini';go.textContent='Go';go.onclick=()=>{const requested=Number(entry.value);if(!Number.isSafeInteger(requested)||requested<1||requested>maximum){entry.value=String(pickedLevel);return}pickedLevel=requested;page=Math.floor((pickedLevel-1)/8);drawLevels()};navigation.append(go);
  entry.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go.click()}});
  const next=document.createElement('button');next.className='mini';next.textContent='Next ▶';next.disabled=page>=totalPages-1;next.onclick=()=>{page++;drawLevels()};navigation.append(next);
  const locked=document.createElement('small');locked.style.cssText='display:block;text-align:center;margin-top:7px';locked.textContent='🔒 Next level: '+(maximum+1)+' · Discover more to unlock it';lvBox.append(locked)
 };
 drawLevels();
 $('select-launch').onclick=()=>{playerName=cleanName($('nickname-field').value);localStorage.setItem(NAME_KEY,playerName);nameHUD();if(pickedWorld!==worlds.activeId()){save();worlds.setWorld(pickedWorld);load()}stage=pickedLevel;checkpointStage=stage;player.x=player.y=player.z=0;player.vx=player.vy=player.vz=0;enemy.awake=false;enemy.route=[];save();updateHUD();begin()};
}
$('start').addEventListener('click',chooseAdventure);
$('player-name')?.addEventListener('click',()=>{if(playing)chooseAdventure()});
$('reset').addEventListener('click',()=>{player.x=0;player.z=0;player.y=0;player.vx=player.vy=player.vz=0;enemy.awake=false;toast('🏠 BACK TO PLAZA')});
function openModal(fn){paused=true;keys.clear();joy.x=joy.y=0;fn(()=>{overlay.classList.remove('active');paused=false;last=clockNow()})}
worlds?.bind({open:openModal,switchWorld:id=>{save();worlds.setWorld(id);load();player.x=player.z=player.y=0;player.vx=player.vy=player.vz=0;enemy.awake=false;toast('🌎 '+worlds.theme().name)},toast,celebrate:confetti});
$('menu').addEventListener('click',()=>openModal(done=>window.SkyQuiz.menu(done,{level:stage})));
$('sprint').addEventListener('click',()=>openModal(done=>window.SkyQuiz.start({topic:'math',count:20,sprint:true,level:stage,onClose:done})));
function updateAction(){let a=activities.find(a=>Math.hypot(player.x-a.x,player.z-(a.z-4))<6.5)||null;
 const nearFriend=NPCS.find(n=>Math.hypot(player.x-(n.x+Math.sin(n.t*.8)*2.6),player.z-(n.z+Math.cos(n.t*.8)*2.6))<3.2);
 if(nearFriend)a={type:'friend',name:nearFriend.name};
 const label=a?({angel:'👼 TALK TO ANGEL',wardrobe:'👗 DRESS UP',arcade:'🎮 PLAY ARCADE',treasure:'🎁 OPEN TREASURE',park:'🏁 DISCOVER',danger:'😡 ENTER DANGER',pet:'🐾 MEET PETS',friend:'🤝 TALK TO '+a.name}[a.type]):'';
 interact=a;const b=$('interact-action');if(b){b.style.display=a?'block':'none';b.textContent=label}}
function award(n,msg){score+=n;updateHUD();save();toast(msg);confetti()}
function interactNow(){if(!playing||paused||!interact)return;const a=interact;
 if(a.type==='wardrobe'){$('dressbutton').click();return}
 if(a.type==='pet'){openPetMeadow();return}
 if(a.type==='friend'){openFriend(a.name);return}
 if(a.type==='angel'){
  paused=true;overlay.classList.add('active');dialog.innerHTML='<h2>👼 THE ANGEL HAS A GAME!</h2><p class="sub">20 seconds of quick questions for bonus stars. You may say no.</p><div class="menu-actions"><button id="angel-yes" class="primary">✨ PLAY</button><button id="angel-no" class="mini">🏃 NOT NOW</button></div>';
  $('angel-no').onclick=()=>{overlay.classList.remove('active');paused=false};
  $('angel-yes').onclick=()=>angelChallenge();return;
 }
 if(a.type==='arcade') {paused=true;overlay.classList.add('active');dialog.innerHTML='<h2>🎮 ARCADE</h2><p class="sub">Super Fast Math: 20 questions! Answer at least 15 correctly to earn this discovery. You can retry.</p><button id="arcade-go" class="primary">⚡ LET’S PLAY</button><button id="arcade-no" class="mini">BACK</button>';$('arcade-no').onclick=()=>{overlay.classList.remove('active');paused=false};$('arcade-go').onclick=()=>window.SkyQuiz.start({topic:'math',count:20,sprint:true,level:stage,onClose:result=>{overlay.classList.remove('active');paused=false;if(result?.total===20&&result.correct>=15){completeMission('arcade')}else{toast('🎮 SCORE 15/20 TO COMPLETE ARCADE · TRY AGAIN!')}}});return}
 if(a.type==='treasure'){paused=true;overlay.classList.add('active');dialog.innerHTML='<h2>🎁 MYSTERY TREASURE</h2><p class="sub">How would you like to open this treasure?</p><div class="menu-actions"><button id="puzzle-treasure" class="primary">🧩 VISUAL PUZZLE</button><button id="question-treasure" class="mini">📚 KNOWLEDGE QUESTION</button><button id="close-treasure" class="mini">🏃 NOT NOW</button></div>';
 $('close-treasure').onclick=closeAdventureModal;
 $('puzzle-treasure').onclick=()=>visualPuzzle();
 $('question-treasure').onclick=()=>singleQuestion('treasure',null,()=>{award(8,'🎁 TREASURE +8!');completeMission('treasure')});return}
 if(a.type==='park'){completeMission('park');return}
 if(a.type==='danger'){toast('😡 WATCH OUT!');return}
}
function closeAdventureModal(){overlay.classList.remove('active');paused=false;last=clockNow()}
function openPetMeadow(){paused=true;overlay.classList.add('active');const c=companions.get();dialog.innerHTML='<h2>🐾 PET MEADOW</h2><p class="sub">Choose a friend to travel with! Explore to meet more pets.</p><div class="menu-actions" id="pet-choices"></div><button id="pet-back" class="mini">🏃 BACK</button>';
 for(const p of companions.PETS){const b=document.createElement('button');b.className='mini';const locked=p.id==='dragon'&&c.puzzlesSolved<2;b.textContent=p.emoji+' '+p.name+(locked?' 🔒 Solve 2 treasure puzzles':c.activePet===p.id?' ✓ Following':' · Take along');b.disabled=locked;b.onclick=()=>{companions.choosePet(p.id);closeAdventureModal();completeMission('pet');toast(p.emoji+' '+p.name+' JOINED!');confetti()};$('pet-choices').append(b)}$('pet-back').onclick=closeAdventureModal}
function openFriend(name){paused=true;overlay.classList.add('active');const active=companions.get().activeFriend===name;dialog.innerHTML='<h2>🤝 HELLO, '+name.toUpperCase()+'!</h2><p class="sub">'+(active?'Want to explore on your own?':'Want to explore together?')+'</p><div class="menu-actions"><button id="friend-join" class="primary">'+(active?'👋 SAY GOODBYE':'🌈 COME WITH ME!')+'</button><button id="friend-back" class="mini">NOT NOW</button></div>';
 $('friend-back').onclick=closeAdventureModal;$('friend-join').onclick=()=>{companions.friend(name);closeAdventureModal();if(!active)completeMission('friend');toast(active?'👋 SEE YOU LATER!':'🤝 '+name+' JOINED!')}}
function visualPuzzle(){// Untimed visual recognition: no reading or question-bank dependency.
 const patterns=[{tiles:['⭐','🌙','⭐','🌙','⭐'],correct:'🌙',options:['🌙','⭐','🌸','💎']},{tiles:['🔴','🔵','🔵','🔴','🔵','🔵','🔴'],correct:'🔵',options:['🟢','🔵','🔴','🟡']},{tiles:['🌸','🌸','🍀','🌸','🌸'],correct:'🍀',options:['🍀','⭐','🌸','🌙']}];
 const q=patterns[Math.floor(Math.random()*patterns.length)];paused=true;overlay.classList.add('active');dialog.innerHTML='<h2>🧩 MAGIC PATTERN</h2><p class="sub">What comes next? No timer!</p><div class="question">'+q.tiles.join('  ')+'  ❓</div><div class="choices" id="pattern-options"></div><button id="pattern-leave" class="mini">🏃 TRY LATER</button>';$('pattern-leave').onclick=closeAdventureModal;
 for(const option of q.options){const b=document.createElement('button');b.className='choice';b.textContent=option;b.onclick=()=>{const correct=option===q.correct;worlds.recordAnswer({topic:'visual patterns',question:q.tiles.join(' ')+' ?',answer:q.correct,selected:option,correct,mode:'treasure-puzzle'});if(correct){companions.solvePuzzle();closeAdventureModal();award(8,'🧩 PUZZLE +8!');completeMission('treasure')}else{b.disabled=true;b.style.opacity='.45';toast('💗 TRY ANOTHER SHAPE')}};$('pattern-options').append(b)}}
function advanceLevel(){stage++;checkpointStage=stage;unlockLevel(worlds.activeId(),stage);worlds.recordLevel(stage);save();updateHUD();confetti();toast('🏆 LEVEL '+stage+' UNLOCKED!')}
function runGraduation(){paused=true;worlds.level5Gate(()=>{paused=false;last=clockNow();if(worlds.passedGate())advanceLevel()})}
function completeMission(kind){
 const done=completedMissions();
 // Respect park discoveries earned in the previous game version.
 if(kind==='park'&&localStorage.getItem('anblox-v10-mission-'+worlds.activeId()+'-park-'+stage)&&!done.includes('park'))done.push('park');
 if(done.includes(kind)){updateHUD();if(stage===5&&done.length>=3&&!worlds.passedGate()){runGraduation();return}toast('✨ ALREADY DISCOVERED!');return}
 done.push(kind);localStorage.setItem(missionKey(),JSON.stringify(done));
 award(5,'🌟 DISCOVERY '+done.length+'/3!');updateHUD();
 if(done.length<3)return;
 if(stage===5&&!worlds.passedGate()){runGraduation();return;}advanceLevel();
}
function singleQuestion(mode,limit,onPass,onFail){let q=window.SkyQuiz.chaseQuestion(stage,Math.floor(Math.random()*300)),done=false;paused=true;overlay.classList.add('active');dialog.innerHTML='<h2>'+({enemy:'😡 ESCAPE THE MONSTER!',treasure:'🎁 UNLOCK THE CHEST',rescue:'🛟 RESCUE QUIZ'}[mode]||'QUESTION')+'</h2><div class="chase-clock" id="encounter-timer"></div><div class="question" id="encounter-q"></div><div class="choices" id="encounter-options"></div>';$('encounter-q').textContent=q.prompt;
 const deadline=limit?clockNow()+limit*1000:Infinity;const finish=(picked,timedOut=false)=>{if(done)return;done=true;clearInterval(interval);const correct=!timedOut&&picked===q.answer;worlds.recordAnswer({topic:q.topic||'math',subtopic:q.subtopic||'',question:q.prompt,answer:q.answer,selected:timedOut?'(timed out)':picked||'(no answer)',correct,mode});overlay.classList.remove('active');paused=false;encounterCooldown=clockNow()/1000+9;last=clockNow();if(correct)onPass?.();else onFail?.()};
 for(let opt of q.options){const b=document.createElement('button');b.className='choice';b.textContent=opt;b.onclick=()=>finish(opt);$('encounter-options').append(b)}
 const interval=setInterval(()=>{if(!limit)return;let n=Math.max(0,Math.ceil((deadline-clockNow())/1000));let label=$('encounter-timer');if(label)label.textContent='⏳ '+n+'s';if(n===0)finish(null,true)},100);if(!limit)$('encounter-timer').textContent='✨ TAKE YOUR TIME';}
function angelChallenge(){let correct=0,asked=0,deadline=clockNow()+20000,done=false,lock=false,currentQuestion=null;paused=true;overlay.classList.add('active');function finish(){if(done)return;done=true;if(currentQuestion&&!lock){worlds.recordAnswer({topic:currentQuestion.topic||'mixed',subtopic:currentQuestion.subtopic||'',question:currentQuestion.prompt,answer:currentQuestion.answer,selected:'(timed out)',correct:false,mode:'angel'});lock=true;}clearInterval(timer);overlay.classList.remove('active');paused=false;last=clockNow();if(correct){award(correct*2,'👼 +'+(correct*2)+' STARS!');completeMission('angel')}worlds.recordQuiz({topic:'mixed',correct,total:asked,sprint:true,seconds:20,grade:window.SkyQuiz?.getGrade?.()||4})}
 function next(){if(done||clockNow()>=deadline){finish();return}const q=window.SkyQuiz.surpriseQuestion();currentQuestion=q;asked++;lock=false;dialog.innerHTML='<h2>👼 ANGEL CHALLENGE!</h2><div id="angel-count" class="angel-clock"></div><div id="angel-question" class="question"></div><div id="angel-options" class="choices"></div>';$('angel-question').textContent=q.prompt;for(let opt of q.options){let b=document.createElement('button');b.className='choice';b.textContent=opt;b.onclick=()=>{if(lock||done||clockNow()>=deadline){if(clockNow()>=deadline)finish();return;}lock=true;const ok=opt===q.answer;if(ok)correct++;worlds.recordAnswer({topic:q.topic||'mixed',subtopic:q.subtopic||'',question:q.prompt,answer:q.answer,selected:opt,correct:ok,mode:'angel'});setTimeout(next,180)};$('angel-options').append(b)}}
 const timer=setInterval(()=>{let n=Math.max(0,Math.ceil((deadline-clockNow())/1000));if($('angel-count'))$('angel-count').textContent='⏳ '+n+'s  ⭐ '+correct;if(n===0)finish()},100);next()}
function loseLife(){worlds.recordDeath();lives--;if(lives<1)lives=3;player.x=player.z=player.y=0;player.vx=player.vy=player.vz=0;enemy.awake=false;escape=null;save();updateHUD();toast('❤️ BACK TO SAFE PLAZA')}
function hazardFall(){if(escape||paused)return;const kind=worlds.hazard();if(!kind)return;singleQuestion('rescue',8,()=>{escape={until:clockNow()/1000+30,kind};player.y=Math.max(0,player.y);player.vy=Math.max(0,player.vy);toast('🛟 ESCAPE IN 30s!')},loseLife)}
// Local obstacle-aware navigation: grid A* in the monster's danger territory.
const enemyStep=1.8;
function blockedAt(x,z,r=.47){return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)}
function enemyPath(start,target){
 const x0=hazardZone.x-hazardZone.r-2,z0=hazardZone.z-hazardZone.r-2,size=Math.ceil((hazardZone.r*2+4)/enemyStep),max=size*size;
 const cell=(x,z)=>[Math.max(0,Math.min(size-1,Math.round((x-x0)/enemyStep))),Math.max(0,Math.min(size-1,Math.round((z-z0)/enemyStep)))];
 const toId=(x,z)=>z*size+x,fromId=id=>[id%size,Math.floor(id/size)],toPoint=id=>{const [cx,cz]=fromId(id);return{x:x0+cx*enemyStep,z:z0+cz*enemyStep}};
 const [sx,sz]=cell(start.x,start.z),[tx,tz]=cell(target.x,target.z),src=toId(sx,sz),dest=toId(tx,tz);
 const blocked=id=>{const p=toPoint(id);return (Math.hypot(p.x-hazardZone.x,p.z-hazardZone.z)>hazardZone.r+1||blockedAt(p.x,p.z))&&id!==src&&id!==dest};
 const distances=new Float32Array(max).fill(Infinity),prev=new Int32Array(max).fill(-1),closed=new Uint8Array(max),open=[src];distances[src]=0;
 let solved=false,iterations=0;
 while(open.length&&iterations++<max){let bi=0,best=Infinity;for(let i=0;i<open.length;i++){const [xx,zz]=fromId(open[i]);const estimate=distances[open[i]]+Math.hypot(xx-tx,zz-tz);if(estimate<best){best=estimate;bi=i}}const node=open.splice(bi,1)[0];if(closed[node])continue;closed[node]=1;if(node===dest){solved=true;break}const [x,z]=fromId(node);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>=size||nz<0||nz>=size)continue;const next=toId(nx,nz);if(closed[next]||blocked(next))continue;const value=distances[node]+1;if(value<distances[next]){distances[next]=value;prev[next]=node;open.push(next)}}}
 if(!solved)return [];
 const result=[];let cursor=dest;for(let n=0;n<max&&cursor!==src;n++){result.push(toPoint(cursor));cursor=prev[cursor];if(cursor<0)return []}result.reverse();return result;
}
function updateEnemy(dt){const now=clockNow()/1000;if(escape||now<encounterCooldown||now<enemy.freeze){enemy.awake=false;return}enemy.awake=true;
 if(now>=enemy.repathAt||!enemy.route.length){enemy.route=enemyPath(enemy,player);enemy.repathAt=now+.42}
 while(enemy.route.length&&dist(enemy,enemy.route[0])<.75)enemy.route.shift();
 const goal=enemy.route[0]||(!blockedAt(player.x,player.z)?player:null);
 if(goal){const dd=dist(enemy,goal);if(dd>.001){const step=Math.min(8.4*dt,dd),nx=enemy.x+(goal.x-enemy.x)/dd*step,nz=enemy.z+(goal.z-enemy.z)/dd*step;if(!blockedAt(nx,nz)){enemy.x=nx;enemy.z=nz}else enemy.repathAt=0}}
 if(dist(enemy,player)<1.7)singleQuestion('enemy',4,()=>{enemy.freeze=clockNow()/1000+10;enemy.awake=false;award(2,'🧊 ENEMY FROZEN!')},loseLife);
}
function updatePhysics(dt){if(!playing||paused||document.hidden)return;
 const X=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+joy.x;
 const Z=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))-joy.y;
 const mag=Math.hypot(X,Z),ax=mag?X/Math.max(1,mag):0,az=mag?Z/Math.max(1,mag):0;
 // Character motion follows camera heading; forward on the joystick means forward on screen.
 const dx=ax*Math.cos(camAngle)+az*Math.sin(camAngle),dz=az*Math.cos(camAngle)-ax*Math.sin(camAngle);
 const speed=keys.has('ShiftLeft')?9.1:6.8,acc=player.grounded?19:7;
 player.vx=lerp(player.vx,dx*speed,Math.min(1,dt*acc/8));player.vz=lerp(player.vz,dz*speed,Math.min(1,dt*acc/8));if(mag<.08){player.vx*=Math.exp(-dt*10);player.vz*=Math.exp(-dt*10)}
 if(mag>.12){const target=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(target-player.face),Math.cos(target-player.face));player.face+=delta*Math.min(1,dt*10)}
 if(jumpRequested){jumpBuffer=.15;jumpRequested=false}jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=player.grounded?.13:Math.max(0,coyote-dt);
 if(jumpBuffer>0&&coyote>0){player.vy=9.9;player.grounded=false;coyote=0;jumpBuffer=0}
 // Keep the collision body above the floor, independent of camera orientation.
 const previousY=player.y;
 player.vy-=23*dt;player.y+=player.vy*dt;
 const moveAxis=(axis,step)=>{const target=player[axis]+step;if(Math.abs(target)>75)return;const testX=axis==='x'?target:player.x,testZ=axis==='z'?target:player.z;
  if(solidAt(testX,testZ,player.y,player.y+2.4)){player[axis==='x'?'vx':'vz']=0;return}player[axis]=target};
 moveAxis('x',player.vx*dt);moveAxis('z',player.vz*dt);
 // Platform tops physically support the avatar after a downward crossing.
 let landing=0;
 if(player.vy<=0){for(const p of skyPlatforms()){
   if(previousY>=p.y-.09&&player.y<=p.y+.02&&Math.abs(player.x-p.x)<p.w/2+.20&&Math.abs(player.z-p.z)<p.d/2+.20){landing=Math.max(landing,p.y)}
 }}
 if(player.y<=landing){player.y=landing;player.vy=0;player.grounded=true}else player.grounded=false;
 // Lava and water are surface hazards. Trigger rescue but never lower the avatar
 // into invisible negative ground. The 30-second escape rules remain the same.
 const inHazard=dist(player,hazardZone)<hazardZone.r-1&&!!worlds.hazard()&&player.y<.45;
 if(inHazard&&!escape)hazardFall();
 if(paused)return; // rescue overlay owns this frame; do not also trigger the enemy
 if(escape){const remaining=escape.until-clockNow()/1000;if(remaining<=0){loseLife()}else if(!inHazard){escape=null;enemy.awake=false;enemy.route=[];encounterCooldown=clockNow()/1000+6;award(5,'🛟 SAFE! +5')}}
 // No spawn/teleport or camera angle can ever change the avatar's floor height.
 if(!Number.isFinite(player.y)||player.y<0){player.y=0;player.vy=0;player.grounded=true}
 const motion=Math.hypot(player.vx,player.vz);player.stance=!player.grounded?'jump':motion>4?'run':motion>.3?'walk':'idle';
 // Distance-based strides: stepping slows naturally as the player decelerates.
 const gaitTarget=player.grounded?clamp(motion/3.6,0,1):.15;
 player.gaitBlend=lerp(player.gaitBlend,gaitTarget,Math.min(1,dt*10));
 if(motion>.08)player.walk+=dt*motion*1.58;
 updateAction();let inDanger=dist(player,hazardZone)<hazardZone.r;
 if(!inDanger){enemy.awake=false;enemy.x=hazardZone.x;enemy.z=hazardZone.z+10;enemy.route=[]}
 else if(escape){enemy.awake=false;enemy.route=[]}else updateEnemy(dt);
 if(enemy.freeze>clockNow()/1000)enemy.awake=false;
 for(let n of NPCS)n.t+=dt;
 const pets=companions?.get();if(pets?.activePet){petPosition.x=lerp(petPosition.x,player.x-1.25,Math.min(1,dt*3.6));petPosition.z=lerp(petPosition.z,player.z-2.2,Math.min(1,dt*3.6));petPosition.walk+=dt*9}
 if(pets?.activeFriend){friendPosition.x=lerp(friendPosition.x,player.x+1.55,Math.min(1,dt*2.7));friendPosition.z=lerp(friendPosition.z,player.z-3.2,Math.min(1,dt*2.7));friendPosition.walk+=dt*8}
 updateHUD();}
// Perspective painter with actual 3D coordinates; no sprite-only motion.
const faces=[];let camera,forward,right,up,focal;
const subv=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z,unit=a=>{let d=Math.hypot(a.x,a.y,a.z)||1;return{x:a.x/d,y:a.y/d,z:a.z/d}},cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
function project(p){let r=subv(p,camera),d=dot(r,forward);if(d<.20)return null;return{x:W/2+dot(r,right)*focal/d,y:H*.51-dot(r,up)*focal/d,d}}
function quad(points,color){
 // Clip polygon against near camera plane rather than dropping the entire face
 // whenever one corner passes close to the lens (the disappearing-avatar bug).
 const near=.22;let clipped=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  const da=dot(subv(a,camera),forward),db=dot(subv(b,camera),forward);
  if(da>=near)clipped.push(a);
  if((da>=near)!==(db>=near)){
    const t=(near-da)/(db-da);
    clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
  }
 }
 if(clipped.length<3)return;
 const projected=clipped.map(project);
 if(projected.some(p=>!p))return;
 const d=projected.reduce((sum,p)=>sum+p.d,0)/projected.length;
 faces.push({projected,color,d});
}
function box(x,y,z,w,h,d,top,front,side){const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,f=y+h;
 quad([{x:a,y:f,z:c},{x:b,y:f,z:c},{x:b,y:f,z:e},{x:a,y:f,z:e}],top);
 quad([{x:a,y,z:e},{x:b,y,z:e},{x:b,y:f,z:e},{x:a,y:f,z:e}],front);
 quad([{x:a,y,z:c},{x:a,y,z:e},{x:a,y:f,z:e},{x:a,y:f,z:c}],side);
 quad([{x:b,y,z:e},{x:b,y,z:c},{x:b,y:f,z:c},{x:b,y:f,z:e}],side);
 quad([{x:b,y,z:c},{x:a,y,z:c},{x:a,y:f,z:c},{x:b,y:f,z:c}],front)}
function orientedBox(cx,cy,cz,w,h,d,yaw,top,front,side){
 const c=Math.cos(yaw),s=Math.sin(yaw),v=(a,b,e)=>({x:cx+a*c+e*s,y:cy+b,z:cz-a*s+e*c});
 const a=-w/2,b=w/2,l=-d/2,r=d/2;
 quad([v(a,h,l),v(b,h,l),v(b,h,r),v(a,h,r)],top);
 quad([v(a,0,r),v(b,0,r),v(b,h,r),v(a,h,r)],front);
 quad([v(a,0,l),v(a,0,r),v(a,h,r),v(a,h,l)],side);
 quad([v(b,0,r),v(b,0,l),v(b,h,l),v(b,h,r)],side);
 quad([v(b,0,l),v(a,0,l),v(a,h,l),v(b,h,l)],front);
}
function groundTile(x,z,w,d,color){quad([{x:x-w/2,y:-.07,z:z-d/2},{x:x+w/2,y:-.07,z:z-d/2},{x:x+w/2,y:-.07,z:z+d/2},{x:x-w/2,y:-.07,z:z+d/2}],color);if(faces.length)faces[faces.length-1].d+=6; // ground never paints over avatar feet
}
function background(){const th=worlds.theme(),g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,th.skyTop);g.addColorStop(.7,th.skyMid);g.addColorStop(1,th.skyBottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle=th.dark?'#ffffff30':'#ffffff88';for(let n=0;n<12;n++){let px=(n*179+40)%Math.max(W,1),py=(n*57)%(H*.45);ctx.beginPath();ctx.ellipse(px,py,28+n%4*13,11,0,0,Math.PI*2);ctx.fill()}}
function labelAt(x,y,z,s){const p=project({x,y,z});if(!p||p.d>56)return;const size=clamp(450/p.d,12,19);ctx.font='900 '+size+'px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#372b69';ctx.strokeText(s,p.x,p.y);ctx.fillStyle='white';ctx.fillText(s,p.x,p.y)}
// Joint-driven block character. Every forearm, shin and foot has its own animated position.
function limbPrism(a,b,width,depth,color){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,length=Math.hypot(dx,dy,dz)||1;
 const along={x:dx/length,y:dy/length,z:dz/length};let side=unit(cross(along,{x:0,y:0,z:1}));if(Math.hypot(side.x,side.y,side.z)<.05)side={x:1,y:0,z:0};let back=unit(cross(along,side));
 const vertex=(center,s,t)=>({x:center.x+side.x*s*width/2+back.x*t*depth/2,y:center.y+side.y*s*width/2+back.y*t*depth/2,z:center.z+side.z*s*width/2+back.z*t*depth/2});
 const top=[vertex(a,-1,-1),vertex(a,1,-1),vertex(a,1,1),vertex(a,-1,1)],bot=[vertex(b,-1,-1),vertex(b,1,-1),vertex(b,1,1),vertex(b,-1,1)];
 quad([top[0],top[1],bot[1],bot[0]],color);quad([top[1],top[2],bot[2],bot[1]],color);quad([top[2],top[3],bot[3],bot[2]],color);quad([top[3],top[0],bot[0],bot[3]],color);quad(top,color);quad(bot,color);
}
function drawAvatar(x,y,z,walk,wear,npc=false,faceDir=0){
 const profile=npc?{type:'girl',skinColor:'#f3c6a5'}:worlds.getAvatarProfile(),skin=profile.skinColor;
 const hair=['#64417e','#9362c3','#c59a51'][wear.hair||0],costume=['#ad83f6','#ff91c2','#6bbff2'][wear.dress||0];
 const moving=npc||player.gaitBlend>.02,airborne=!npc&&!player.grounded,cycle=walk,phase=Math.sin(cycle),gait=npc?1:player.gaitBlend,scale=wear.body===1?.87:wear.body===2?1.1:1;
 // Body orientation and appendage swing use local forward/right axes. Canvas follows from behind.
 const yaw=npc?0:faceDir;const local=(right,up,front)=>({x:x+Math.cos(yaw)*right+Math.sin(yaw)*front,y:y+up,z:z-Math.sin(yaw)*right+Math.cos(yaw)*front});
 const swing=airborne?.25:phase*.42*gait;
 for(const side of [-1,1]){
  // Each leg has a stance and swing phase; the stance shoe stays near the ground,
  // while the opposite shoe lifts and the knee bends forward for a visible step.
  const legPhase=cycle+(side===1?Math.PI:0),stride=airborne?0:Math.cos(legPhase)*.45*gait;
  const lift=airborne?.26:Math.max(0,Math.sin(legPhase))*.25*gait;
  const hip=local(side*.25,.77,0);
  const knee=local(side*.25,.40+lift*.48,stride*.40+lift*.45+.035);
  const ankle=local(side*.25,.12+lift,stride+.065);
  limbPrism(hip,knee,.31,.32,'#e6cbf2');limbPrism(knee,ankle,.27,.29,'#c4a9db');
  const toe=local(side*.25,.09+lift,stride+.34);
  limbPrism(ankle,toe,.42,.30,'#fff3fa');
  const shoulder=local(side*.61,1.42,0),elbow=local(side*.65,1.12,-side*swing*.34),hand=local(side*.65, .84,-side*swing*.7);
  limbPrism(shoulder,elbow,.23,.30,skin);limbPrism(elbow,hand,.22,.26,skin);
  const palm=local(side*.65,.73,-side*swing*.77);limbPrism(hand,palm,.23,.23,skin);
 }
 orientedBox(x,y+.70,z,.95*scale,.35,.64,yaw,costume,costume,'#7258ae');orientedBox(x,y+.95,z,.96*scale,.78,.62,yaw,costume,costume,'#7258ae');
 if(profile.type==='girl')orientedBox(x,y+.62,z,1.18*scale,.20,.79,yaw,costume,'#edc9ff','#8666d7');
 orientedBox(x,y+1.67,z,.78,.73,.70,yaw,skin,skin,skin);orientedBox(x,y+2.09,z-.04,.87,.31,.79,yaw,hair,hair,'#42285d');
 for(const side of [-1,1]){const h=local(side*.38,1.63,-.25);box(h.x,h.y,h.z,.22,.68,.40,hair,hair,'#42285d')}
 const back=local(0,1.02,-.39);orientedBox(back.x,back.y,back.z,.6,.70,.18,yaw,'#ffd9a3','#ff9ac7','#d064a4');
 if(wear.accessory===1)box(x,y+2.42,z,.62,.19,.3,'#ffe074','#f8c348','#cd9025');
 if(wear.accessory===2){const left=local(-.65,1.05,-.45),right=local(.65,1.05,-.45);box(left.x,left.y,left.z,.52,.82,.15,'#f9f5ff','#ddd1f9','#b5a2e7');box(right.x,right.y,right.z,.52,.82,.15,'#f9f5ff','#ddd1f9','#b5a2e7')}
 if(wear.accessory===0||wear.accessory==null)box(x,y+2.42,z-.14,.45,.15,.21,'#ff8abf','#ef5ba7','#c64492');
}
function render(t){background();const angle=camAngle;
 const focus={x:player.x,y:player.y+1.35,z:player.z};
 const distance=15.5,horiz=distance*Math.cos(camPitch),vert=distance*Math.sin(camPitch);
 const orbitTarget={x:focus.x-Math.sin(angle)*horiz,y:focus.y+vert,z:focus.z-Math.cos(angle)*horiz};
 const desired=cameraClippedTarget(focus,orbitTarget);
 const dtCamera=Math.min(.05,Math.max(0,(clockNow()-camLastFrame)/1000));camLastFrame=clockNow();
 const follow=1-Math.exp(-dtCamera*14);
 if(!cameraPos)cameraPos={...desired};else for(const axis of ['x','y','z'])cameraPos[axis]=lerp(cameraPos[axis],desired[axis],follow);
 // Smoothing may cross a wall during a quick turn; enforce line-of-sight after smoothing too.
 cameraPos=cameraClippedTarget(focus,cameraPos);
 camera={...cameraPos};forward=unit(subv(focus,camera));right=unit(cross({x:0,y:1,z:0},forward));up=unit(cross(forward,right));focal=Math.min(W*1.2,H*1.42);faces.length=0;
 const world=worlds.activeId(),mapTheme=worlds.theme(),colors={themepark:'#a8e9c7',lava:'#65526a',angel:'#d2c5fa',maldives:'#70dfc8',tiny:'#f9c5d9',halloween:'#786592'},floor=mapTheme.ground||colors[world]||'#a8e9c7';
 for(let z=-32;z<87;z+=8)for(let x=-74;x<78;x+=8){if(Math.abs(x-player.x)>53||Math.abs(z-player.z)>53)continue;groundTile(x+4,z+4,8.1,8.1,(((x+z)/8)%2===0)?floor:world==='lava'?'#59455e':world==='halloween'?'#6b5987':'#b9ecd5')}
 // broad running roads, plaza, intersecting paths.
 for(let z=-25;z<78;z+=8){groundTile(0,z+4,10,8.1,'#fff0d6');groundTile(0,z+4,1,8.1,'#f8d7ba')}
 for(let x=-43;x<45;x+=8){groundTile(x+4,18,8.1,10,'#fff0d6');groundTile(x+4,43,8.1,10,'#fff0d6')}
 for(let a of activities){const {x,z,color}=a;if(Math.hypot(x-player.x,z-player.z)>54)continue;
 if(['park','danger'].includes(a.type))continue;
 // open-front explorable room, no roof; doorway has real collision gaps.
 box(x,-.12,z,13,0.14,13,'#fff8ef','#e6d0ee','#c69dcc');box(x-7,.1,z,1.2,4.9,14,color,'#a88cc9','#8970b4');box(x+7,.1,z,1.2,4.9,14,color,'#a88cc9','#8970b4');box(x,.1,z+6.5,14,4.9,1.1,color,'#c8a2e5','#a98bc9');box(x-5,.1,z-6.5,3.4,4.9,1.1,color,color,'#a98bc9');box(x+5,.1,z-6.5,3.4,4.9,1.1,color,color,'#a98bc9');
 box(x-3.5,.1,z+2.5,2.4,1.4,2.4,'#ffecb5','#e8c995','#b88f80');box(x+3.6,.1,z+3.5,2.2,1.1,2.2,'#efc8ff','#bc93df','#9c75c6');
 box(x,.1,z+5.2,3,2,1.1,'#ffffff','#ffe9f3','#eab8db');
 }
 for(let p of [...props,...(Array.isArray(mapTheme.decorations)?mapTheme.decorations:[])]){if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.hypot(p.x-player.x,p.z-player.z)>51)continue;if(p.kind==='tree'){box(p.x,0,p.z,.68,3,.68,'#9d775f','#9d775f','#755642');box(p.x,2.6,p.z,3.4,3.4,3.4,p.color||mapTheme.treeColor||(world==='lava'?'#bf6057':world==='halloween'?'#654980':'#81d9a6'),'#65b897','#52987c')}else if(p.kind==='tower'){box(p.x,0,p.z,2.2,7,2.2,p.color||'#cda7ed','#a788cd','#8567ae')}else if(p.kind==='flower'){box(p.x,.05,p.z,.54,.53,.54,p.color||'#ffe781','#ffbce8','#d381c9')}}
 // Climbable sky course in every map: visible platforms have matching physics.
 const skyColor=mapTheme.platform||'#e9b9ef';
 for(const p of skyPlatforms()){
   if(Math.hypot(p.x-player.x,p.z-player.z)>58)continue;
   const thickness=.43;
   box(p.x,p.y-thickness,p.z,p.w,thickness,p.d,p.kind==='summit'?'#fff6b7':skyColor,skyColor,'#9573be');
   if(p.kind==='summit')labelAt(p.x,p.y+2.1,p.z,'☁️ SKY SUMMIT!');
 }
 // Surface hazard visual matches collision physics: no invisible pit underneath.
 if(worlds.hazard()){
   const hazardColor=worlds.hazard()==='lava'?'#ff7841':'#37b7ec';
   for(let i=0;i<24;i++){
     const theta=i*Math.PI/12,theta2=(i+1)*Math.PI/12;
     quad([{x:hazardZone.x,y:.01,z:hazardZone.z},{x:hazardZone.x+Math.cos(theta)*hazardZone.r,y:.01,z:hazardZone.z+Math.sin(theta)*hazardZone.r},{x:hazardZone.x+Math.cos(theta2)*hazardZone.r,y:.01,z:hazardZone.z+Math.sin(theta2)*hazardZone.r}],hazardColor);
   }
 }
 for(let n of NPCS){const x=n.x+Math.sin(n.t*.8)*2.6,z=n.z+Math.cos(n.t*.8)*2.6;drawAvatar(x,0,z,n.t*8,{dress:Math.floor(n.t)%3,accessory:0,body:0,hair:1},true);if(Math.hypot(x-player.x,z-player.z)<25)labelAt(x,2.8,z,n.name);}
 const buddy=companions?.get();if(buddy?.activeFriend){drawAvatar(friendPosition.x,0,friendPosition.z,friendPosition.walk,{dress:2,body:0,hair:1,accessory:0},true);labelAt(friendPosition.x,2.8,friendPosition.z,'🤝 '+buddy.activeFriend)}
 if(buddy?.activePet){const pet=companions.PETS.find(p=>p.id===buddy.activePet);if(pet){const hop=Math.abs(Math.sin(petPosition.walk))*.16;box(petPosition.x,hop+.12,petPosition.z,.84,.65,.85,pet.color,pet.color,pet.dark);box(petPosition.x,hop+.69,petPosition.z+.21,.69,.64,.6,pet.color,pet.color,pet.dark);box(petPosition.x-.23,hop+1.16,petPosition.z+.19,.23,.25,.2,pet.dark,pet.color,pet.dark);box(petPosition.x+.23,hop+1.16,petPosition.z+.19,.23,.25,.2,pet.dark,pet.color,pet.dark);labelAt(petPosition.x,1.75+hop,petPosition.z,pet.emoji+' '+pet.name)}}
 if(enemy.awake){drawAvatar(enemy.x,0,enemy.z,t*13,{dress:1,accessory:1,body:2,hair:0},true)}
 drawAvatar(player.x,player.y,player.z,player.walk,worlds.getWear(),false,player.face);
 faces.sort((a,b)=>b.d-a.d);for(let f of faces){const p=f.projected;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let k=1;k<p.length;k++)ctx.lineTo(p[k].x,p[k].y);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle='#ffffff29';ctx.lineWidth=.8;ctx.stroke()}
 for(let a of activities)labelAt(a.x,5.5,a.z, a.emoji+' '+a.name);
 if(escape){ctx.fillStyle='#fff9';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.fillText('🛟 ESCAPE! '+Math.ceil(Math.max(0,escape.until-clockNow()/1000))+'s',W/2,H*.22)}
 // direction hint and minimap
 ctx.fillStyle='#fffcee';ctx.strokeStyle='#785c9b';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(W-124,H-150,108,120,16);ctx.fill();ctx.stroke();ctx.fillStyle='#ff86b6';ctx.beginPath();ctx.arc(W-70+player.x*.56,H-94-player.z*.55,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e46d79';ctx.fillRect(W-70+hazardZone.x*.56-5,H-94-hazardZone.z*.55-5,10,10);ctx.font='800 10px system-ui';ctx.fillStyle='#765c94';ctx.fillText('MAP',W-70,H-132)
}
window.anbloxActivityMode=()=>!playing?'menus':(!paused?'gameplay':dialog.querySelector('.question,.quiz-progress,.chase-clock,.angel-clock')?'quizzes':dialog.querySelector('.style-stage,.style-tabs')?'wardrobe':'menus');
window.anbloxHasActiveInput=()=>keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||keys.has('ArrowUp')||keys.has('ArrowDown')||keys.has('ArrowLeft')||keys.has('ArrowRight')||Math.hypot(joy.x,joy.y)>.1||Math.hypot(player.vx,player.vz)>.25;
const action=document.createElement('button');action.id='interact-action';action.style.cssText='display:none;position:fixed;right:20px;bottom:185px;z-index:12;padding:12px 16px;border:3px solid white;border-radius:22px;background:#fff3b7;color:#6e3b86;font:900 15px system-ui;box-shadow:0 5px 0 #bdb0d4;touch-action:manipulation';document.body.append(action);action.onclick=interactNow;
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpRequested=true;if(e.code==='KeyE'&&!e.repeat)interactNow()});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();joy.x=joy.y=0;stick.style.transform='translate(0px,0px)'});
function joyMove(e){const b=pad.getBoundingClientRect(),r=b.width*.32,dx=(e.clientX-b.left-b.width/2)/r,dz=(e.clientY-b.top-b.height/2)/r,m=Math.max(1,Math.hypot(dx,dz));joy.x=clamp(dx/m,-1,1);joy.y=clamp(dz/m,-1,1);stick.style.transform=`translate(${joy.x*r}px,${joy.y*r}px)`}
pad.addEventListener('pointerdown',e=>{pad.setPointerCapture(e.pointerId);joyMove(e)});pad.addEventListener('pointermove',e=>{if(pad.hasPointerCapture(e.pointerId))joyMove(e)});for(const t of ['pointerup','pointercancel'])pad.addEventListener(t,()=>{joy.x=joy.y=0;stick.style.transform='translate(0px,0px)'});$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jumpRequested=true});
// Drag the scenery (not the joystick) to orbit around the character.
canvas.addEventListener('pointerdown',e=>{if(!playing||paused||document.hidden)return;
 camDrag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!camDrag||e.pointerId!==camDrag.id||!playing||paused)return;
 const dx=e.clientX-camDrag.x,dy=e.clientY-camDrag.y;camDrag.x=e.clientX;camDrag.y=e.clientY;
 // Swipe left = look left, swipe right = look right (not the reverse).
 camAngle+=dx*.006;camPitch=clamp(camPitch+dy*.0035,CAMERA_MIN_PITCH,CAMERA_MAX_PITCH);});
for(const eventName of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(eventName,e=>{if(camDrag?.id===e.pointerId)camDrag=null});
addEventListener('blur',()=>{camDrag=null});
canvas.addEventListener('dblclick',()=>{camAngle=0;camPitch=CAMERA_DEFAULT_PITCH;cameraPos=null;});
function frame(){const now=clockNow(),dt=Math.min(.04,Math.max(0,(now-last)/1000||0));last=now;
 if(!window.AnbloxRaceActive)updatePhysics(dt);if(!document.hidden&&!window.AnbloxRaceActive)render(now/1000);
 if(toastUntil&&now>toastUntil){toastUntil=0;$('levelpop').classList.remove('show')}
 requestAnimationFrame(frame)}requestAnimationFrame(frame);
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
})();
