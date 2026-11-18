/* Anblox worlds, cosmetic rewards and family learning report. No accounts, ads or external connections. */
(()=>{'use strict';
const KEY='anblox-v3-progress', PARENT_KEY='anblox-parent-pass-v1', $=id=>document.getElementById(id), choose=a=>a[Math.floor(Math.random()*a.length)];
const DEFINITIONS=(Array.isArray(window.AnbloxWorldCatalog?.maps)&&window.AnbloxWorldCatalog.maps.length?window.AnbloxWorldCatalog.maps:[
{id:'themepark',emoji:'🎡',name:'Theme Park',description:'Rides · candy colors · cheerful platforms',skyTop:'#55b8ff',skyMid:'#b8efff',skyBottom:'#ffe9fa',platform:'#ffc1de'},
{id:'lava',emoji:'🌋',name:'Lava Island',description:'Dark volcano · glowing lava · first aid',skyTop:'#241b38',skyMid:'#593348',skyBottom:'#fd7441',platform:'#655b75',dark:true,hazard:'lava'},
{id:'angel',emoji:'👼',name:'Angel Island',description:'Above the stars · glowing skyways',skyTop:'#131747',skyMid:'#4b4b9c',skyBottom:'#c5b1f9',platform:'#e6dcff',dark:true},
{id:'maldives',emoji:'🏝️',name:'Maldives',description:'Jump between boats · island hopping · swim',skyTop:'#53c7ff',skyMid:'#c3efff',skyBottom:'#2bd6d1',platform:'#e8c99c',hazard:'water'},
{id:'tiny',emoji:'🏠',name:'Tiny House',description:'Giant bed · giant cups · tiny runner',skyTop:'#cba5ef',skyMid:'#fce7d7',skyBottom:'#f9d7ec',platform:'#e8b9a6'},
{id:'halloween',emoji:'🎃',name:'Halloween',description:'Haunted towers · spooky but friendly',skyTop:'#171335',skyMid:'#443061',skyBottom:'#d57a4f',platform:'#a487c4',dark:true}
]);
const CATEGORIES={dress:[['👗','Twinkle Dress'],['🎀','Princess Party'],['🧥','Sky Pop Star']],face:[['🥰','Rosy Sparkle'],['🤓','Smart Glasses'],['✨','Starry Glow']],body:[['🧍','Classic Cutie'],['🧸','Pocket Chibi'],['🦸','Hero Star']],accessory:[['🎀','Big Bow'],['👑','Royal Crown'],['🦋','Dream Wings']],hair:[['🌸','Rose Waves'],['💜','Lavender Twintails'],['🌟','Golden Braid']]};
let state={world:'themepark',runs:{},gate:{},cosmetics:{},answers:[],quizzes:[],deaths:0,levels:[],sessions:[],wear:{},totalSeconds:0,timeBreakdown:{gameplay:0,quizzes:0,wardrobe:0,menus:0,idle:0},globalGate:{}};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&typeof s==='object')state={...state,...s}}catch(e){}
if(!DEFINITIONS.some(w=>w.id===state.world))state.world=DEFINITIONS[0].id;
for(const w of DEFINITIONS){state.runs[w.id]??={stage:1,checkpointStage:1,score:0,lives:3};state.gate[w.id]??={};}
// One global Level 5 graduation; preserve a graduation earned in any older release.
state.timeBreakdown??={gameplay:0,quizzes:0,wardrobe:0,menus:0,idle:0};state.globalGate??={};for(const g of Object.values(state.gate)){if(g.complete){state.globalGate.complete=true;for(let i=0;i<4;i++)state.globalGate[i]=true}}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function activeId(){return state.world}function theme(){return DEFINITIONS.find(w=>w.id===state.world)||DEFINITIONS[0]}
function getRun(){return state.runs[state.world]||{stage:1,checkpointStage:1,score:0,lives:3}}
function getWorldRun(id){return state.runs[id]||{stage:1,bestStage:1,checkpointStage:1,score:0,lives:3}}
function saveRun(run){const prev=getWorldRun(state.world);state.runs[state.world]={...prev,...run,bestStage:Math.max(Number(prev.bestStage||prev.stage||1),Number(run.bestStage||run.stage||1))};persist()}
function setWorld(id){if(!DEFINITIONS.some(w=>w.id===id))return;state.world=id;persist()}
function hazard(){return theme().hazard||null}const AVATAR_KEY='anblox-avatar-profile-v1';
const SKIN_TONES=['#f7d8bf','#eac29d','#c9946e','#9d674c','#67412e','#3b261f'];
let avatarProfile={type:'girl',skin:2};
try{const saved=JSON.parse(localStorage.getItem(AVATAR_KEY)||'null');if(saved){avatarProfile.type=saved.type==='boy'?'boy':'girl';avatarProfile.skin=Math.max(0,Math.min(5,Number(saved.skin)||0))}}catch(e){}
function getAvatarProfile(){return {...avatarProfile,skinColor:SKIN_TONES[avatarProfile.skin]}}
function setAvatarProfile(type,skin){avatarProfile.type=type==='boy'?'boy':'girl';avatarProfile.skin=Math.max(0,Math.min(5,Number(skin)||0));try{localStorage.setItem(AVATAR_KEY,JSON.stringify(avatarProfile))}catch(e){}}
function getWear(){return {...state.wear}}
function recordAnswer(r){state.answers.push({when:new Date().toISOString(),world:theme().name,topic:r.topic||'mixed',subtopic:r.subtopic||'',question:r.question||'',answer:r.answer||'',selected:r.selected??'',correct:!!r.correct,mode:r.mode||'quiz',grade:window.SkyQuiz?.getGrade?.()||4});state.answers=state.answers.slice(-2000);persist()}
function recordQuiz(q){state.quizzes.push({...q,when:new Date().toISOString(),world:theme().name});state.quizzes=state.quizzes.slice(-300);persist()}
function recordDeath(){state.deaths++;persist()}
function recordLevel(st){state.levels.push({when:new Date().toISOString(),world:theme().name,stage:st});state.levels=state.levels.slice(-300);persist()}
// Play time: wall-clock sessions with actual start/end, excluding background tabs.
let hooks=null,modalReturn=null,sessionOpen=null,sessionTimer=null,lastUserAction=Date.now();
for(const ev of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(ev,()=>{lastUserAction=Date.now()},{passive:true});
function startSession(){if(sessionTimer)return;if(!document.hidden)resumeSession();sessionTimer=setInterval(()=>{if(document.hidden)pauseSession();else if(!sessionOpen)resumeSession();else flushSession(false)},1000);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseSession();else resumeSession()});window.addEventListener('pagehide',pauseSession);}
function resumeSession(){if(!sessionTimer||sessionOpen||document.hidden)return;let stamp=new Date().toISOString();sessionOpen={start:stamp,end:stamp,seconds:0,byActivity:{gameplay:0,quizzes:0,wardrobe:0,menus:0,idle:0}};state.sessions.push(sessionOpen);state.sessions=state.sessions.slice(-1000);sessionOpen._last=Date.now();persist()}
function flushSession(force){if(!sessionOpen)return;let now=Date.now();let delta=Math.max(0,Math.min(3,(now-sessionOpen._last)/1000));const activity=window.anbloxActivityMode?.()||'menus';const activelyMoving=activity==='gameplay'&&!!window.anbloxHasActiveInput?.();if(activelyMoving)lastUserAction=now;const idleAfter=activity==='gameplay'?45000:activity==='quizzes'?120000:60000;const mode=now-lastUserAction>idleAfter?'idle':activity;
 sessionOpen.byActivity??={};sessionOpen.byActivity[mode]=Math.round(((sessionOpen.byActivity[mode]||0)+delta)*10)/10;
 state.timeBreakdown[mode]=Math.round(((state.timeBreakdown[mode]||0)+delta)*10)/10;
 if(mode!=='idle'){sessionOpen.seconds=Math.round((sessionOpen.seconds+delta)*10)/10;state.totalSeconds=Math.round((state.totalSeconds+delta)*10)/10;}
 sessionOpen.end=new Date(now).toISOString();sessionOpen._last=now;if(force||Math.floor(now/10000)!==Math.floor((now-1000)/10000))persist()}
function pauseSession(){if(!sessionOpen)return;flushSession(true);delete sessionOpen._last;sessionOpen=null;persist()}
// Client-side password discourages casual access, but cannot resist technical inspection.
const initialHash=''+passHash('android');
function passHash(value){let n=2166136261;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return (n>>>0).toString(16)}
function passwordIs(value){let stored;try{stored=localStorage.getItem(PARENT_KEY)}catch(e){}return passHash(value)===(stored||initialHash)}
function changePassword(value){try{localStorage.setItem(PARENT_KEY,passHash(value))}catch(e){return false}return true}

function panel(content,back){const overlay=$('overlay'),dialog=$('dialog');overlay.classList.add('active');dialog.classList.remove('angel-dialog');dialog.innerHTML=content;const btn=$('world-back');if(btn)btn.onclick=back||(()=>close())}
function close(){ $('overlay').classList.remove('active');if(modalReturn){const f=modalReturn;modalReturn=null;f()}}
function openScreen(builder,done){modalReturn=done;builder()}
function bind(h){hooks=h;for(const [id,fn] of [['hubbutton',worldMenu],['dressbutton',wardrobe],['parentbutton',parentLogin]])$(id)?.addEventListener('click',()=>h.open(done=>openScreen(fn,done)));
}
function worldMenu(){panel(`<h2>🌎 CHOOSE A WORLD</h2><p class="sub">Switch any time! Every world saves its own level.</p><div class="world-grid">${DEFINITIONS.map(w=>`<button class="world-btn ${w.id===activeId()?'selected':''}" data-world="${w.id}"><span class="big">${w.emoji}</span>${w.name}<div class="world-note">Level ${Math.max(state.runs[w.id]?.bestStage||1,state.runs[w.id]?.stage||1)}</div></button>`).join('')}</div><button id="world-back" class="primary">🏃 PLAY!</button>`);$('dialog').querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>{let id=b.dataset.world;hooks?.switchWorld(id);worldMenu()})}
// Full SVG character previews are static illustrations; matching cosmetics are applied to the runner too.
function avatarSVG(wear={},uid="a"){
 const outfit=wear.dress??0,face=wear.face??0,body=wear.body??0,acc=wear.accessory??0,hairStyle=wear.hair??0;
 const palettes=[
  {dress:'#b38cff',dark:'#7a55dc',light:'#efe3ff',hair:'#5a3a84',trim:'#ffffff'},
  {dress:'#ff9ac7',dark:'#db5ea3',light:'#ffe6f1',hair:'#8a4a6d',trim:'#fff7fb'},
  {dress:'#76c6ff',dark:'#3c88d2',light:'#e4f4ff',hair:'#4b4a90',trim:'#f8fdff'}
 ][outfit];
 const hairColor=['#704071','#8764c1','#d4a04b'][hairStyle];
 const bodyScale=body===1?1.13:body===2?.92:1;
 const bodyLabel=body===1?'Pocket Chibi':body===2?'Hero Star':'Classic Cutie';
 const hairDetail=hairStyle===0?`<path d="M51 66 Q44 110 53 146 Q70 151 72 125 M128 66 Q140 111 125 145 Q113 151 109 126" stroke="${hairColor}" stroke-width="13" fill="none" stroke-linecap="round"/>`:hairStyle===1?`<path d="M53 53 Q24 38 26 70 Q31 100 45 102 M127 53 Q157 38 154 70 Q149 100 136 102" fill="${hairColor}" stroke="${hairColor}" stroke-width="9"/><circle cx="49" cy="55" r="10" fill="#ffc4ef"/><circle cx="132" cy="55" r="10" fill="#ffc4ef"/>`:`<path d="M119 60 Q153 95 128 144 Q142 153 132 172 Q118 160 121 145 Q138 105 117 79" stroke="${hairColor}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M121 112l16 9-17 8 13 8" stroke="#f9d887" stroke-width="4" fill="none"/>`;
 const faceDeco=face===0
   ? `<circle cx="67" cy="98" r="8" fill="#f9a1b8" opacity=".9"/><circle cx="113" cy="98" r="8" fill="#f9a1b8" opacity=".9"/><path d="M61 91c5-9 12-7 15 0M104 91c5-9 12-7 15 0" stroke="#d76083" stroke-width="2" fill="none" stroke-linecap="round"/>`
   : face===1
   ? `<g fill="none" stroke="#65408f" stroke-width="4"><circle cx="76" cy="84" r="13"/><circle cx="104" cy="84" r="13"/><path d="M89 84h2"/></g><path d="M70 69c6-6 13-5 18 0M92 69c6-6 13-5 18 0" stroke="#5f417f" stroke-width="3" fill="none" stroke-linecap="round"/>`
   : `<path d="M63 95l3 -7 4 7 7 1 -5 5 1 7 -6 -4 -6 4 1 -7 -5 -5Z M110 95l3 -7 4 7 7 1 -5 5 1 7 -6 -4 -6 4 1 -7 -5 -5Z" fill="#ff87cb"/><path d="M80 104 Q90 113 101 104" fill="none" stroke="#c25d7d" stroke-width="3" stroke-linecap="round"/>`;
 const accDeco=acc===0
   ? `<path d="M90 33 C74 10 57 12 61 34 C63 46 78 46 90 39 C102 46 117 46 119 34 C123 12 106 10 90 33Z" fill="#ff7dbb" stroke="#cc5193" stroke-width="3"/><circle cx="90" cy="34" r="7" fill="#fff4a8" stroke="#cc5193" stroke-width="2"/>`
   : acc===1
   ? `<path d="M64 40 L73 20 L84 40 L90 16 L96 40 L107 19 L116 40 Z" fill="#ffd960" stroke="#d59b25" stroke-width="3"/><circle cx="74" cy="30" r="3.2" fill="#ff8ab7"/><circle cx="90" cy="25" r="3.2" fill="#8fd5ff"/><circle cx="106" cy="30" r="3.2" fill="#b8ffa8"/>`
   : `<path d="M34 120 C20 100 24 83 47 87 C63 91 72 108 73 126 C63 136 49 138 34 120Z" fill="#f4f2ff" stroke="#b29be7" stroke-width="3" opacity=".95"/><path d="M146 120 C160 100 156 83 133 87 C117 91 108 108 107 126 C117 136 131 138 146 120Z" fill="#f4f2ff" stroke="#b29be7" stroke-width="3" opacity=".95"/>`;
 const dressDeco=outfit===0
   ? `<path d="M62 130 Q90 120 118 130" stroke="#fff8b8" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M90 145 l6 10 11 1 -8 7 2 11 -11 -6 -10 6 2 -11 -8 -7 11 -1Z" fill="#fff49b" stroke="#e9d35f" stroke-width="2"/><path d="M70 183 Q90 196 110 183" stroke="#ffffff" stroke-width="5" fill="none" stroke-linecap="round"/>`
   : outfit===1
   ? `<path d="M64 130 Q90 116 116 130" stroke="#fff" stroke-width="5" fill="none"/><path d="M70 150 Q90 135 110 150" stroke="#fff5fb" stroke-width="4" fill="none"/><path d="M66 170 Q90 186 114 170" stroke="#fff" stroke-width="4" fill="none"/><circle cx="90" cy="134" r="6" fill="#fff7ff"/><path d="M83 125 L90 116 L97 125" fill="#fff7ff"/>`
   : `<path d="M71 139 H109" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/><path d="M90 126 V183" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><rect x="97" y="148" width="16" height="12" rx="3" fill="#ffe07b" stroke="#d7a73c" stroke-width="2"/><path d="M60 165 Q76 156 90 165 Q104 156 120 165" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`;
 return `<svg class="avatar-art" viewBox="0 0 180 250" role="img" aria-label="Dressed-up character illustration: ${bodyLabel}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g${uid}" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${palettes.dress}"/><stop offset="1" stop-color="${palettes.dark}"/></linearGradient><linearGradient id="g2${uid}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${palettes.light}"/><stop offset="1" stop-color="${palettes.trim}"/></linearGradient></defs><g transform="translate(90 118) scale(${bodyScale}) translate(-90 -118)">
 <ellipse cx="90" cy="234" rx="52" ry="10" fill="#7c65aa" opacity=".18"/>
 ${accDeco}
 <path d="M71 173 L64 219 Q67 225 78 220 L87 173M105 173 L103 220 Q113 227 120 220 L114 170" fill="${identity.skinColor}" stroke="#c98d79" stroke-width="2"/>
 <path d="M58 218 Q74 209 87 220 L88 232 L58 232 Z M101 220 Q114 209 124 222 L126 233 L100 233 Z" fill="#ffffff" stroke="#8d75cb" stroke-width="2"/>
 ${identity.type==='boy'?`<path d="M59 124 Q90 109 121 124 L119 175 Q90 185 61 175Z" fill="url(#g${uid})" stroke="${palettes.dark}" stroke-width="3"/>`:`<path d="M59 124 Q90 109 121 124 L132 189 Q91 213 48 189Z" fill="url(#g${uid})" stroke="${palettes.dark}" stroke-width="3"/>`}
 <path d="M70 123 Q90 134 110 123 L110 111 L70 111 Z" fill="url(#g2${uid})" stroke="${palettes.trim}" stroke-width="2"/>
 <path d="M61 186 Q90 201 119 186" stroke="${palettes.trim}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>
 ${dressDeco}
 <path d="M58 124 Q43 141 39 172" fill="none" stroke="#f6c8a4" stroke-width="15" stroke-linecap="round"/>
 <path d="M122 124 Q137 141 141 172" fill="none" stroke="#f6c8a4" stroke-width="15" stroke-linecap="round"/>
 <path d="M54 67 Q40 92 49 131 L59 123 Q66 106 66 84 M126 66 Q139 92 128 132 L117 126 L116 80" fill="${hairColor}"/>
 <ellipse cx="90" cy="78" rx="40" ry="45" fill="${identity.skinColor}" stroke="#d49d86" stroke-width="2"/>
 <path d="M49 77 Q42 24 90 27 Q138 23 131 77 L122 65 Q111 48 93 49 Q71 50 58 69Z" fill="${hairColor}"/>
 <path d="M58 73 Q64 123 78 129" stroke="${hairColor}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M121 73 Q116 125 102 130" stroke="${hairColor}" stroke-width="8" fill="none" stroke-linecap="round"/>
 <ellipse cx="76" cy="84" rx="6.5" ry="9" fill="#382c55"/><ellipse cx="104" cy="84" rx="6.5" ry="9" fill="#382c55"/><circle cx="78" cy="80" r="2.3" fill="white"/><circle cx="106" cy="80" r="2.3" fill="white"/><path d="M80 103 Q91 113 102 103" fill="none" stroke="#bf5c75" stroke-width="3" stroke-linecap="round"/>
 ${faceDeco}
 ${hairDetail}
 </g></svg>`}
function wardrobe(){
 const gateUnlocked=passedGate();
 panel(`<div class="fashion-studio"><h2>💖 ANBLOX ROYAL STYLE 💖</h2><p class="sub">${gateUnlocked?'✨ Mix your magical look!':'🔒 Finish your Level 5 exams to unlock your style palace!'}</p><div class="style-stage"><div class="wardrobe-stars" aria-hidden="true">✦ ✧ ✦ ✧ ✦ ✧</div><div class="style-curtain left"></div><div class="style-curtain right"></div><div class="style-floor"></div><div id="outfit-avatar"></div><div class="style-stage-name">🌟 YOUR SUPERSTAR 🌟</div></div><div id="wardrobe-tabs" class="style-tabs"></div><div id="wardrobe-items"></div><p class="help">🎓 Level 5 gift · 🌸 Normal quest · 🔥 Tough quest</p><button id="world-back" class="primary">🏃 BACK TO ADVENTURE</button></div>`);
 const tabs=$('wardrobe-tabs');let cat='dress';const labels={dress:'👗 Dresses',face:'😊 Faces',body:'🧸 Body',accessory:'🎀 Extras',hair:'💇 Hair Salon'};
 Object.keys(CATEGORIES).forEach(id=>{let b=document.createElement('button');b.className='mini';b.textContent=labels[id];b.onclick=()=>{cat=id;draw()};tabs.append(b)});
 function draw(){document.querySelectorAll('#wardrobe-tabs button').forEach((b,i)=>b.classList.toggle('active',Object.keys(CATEGORIES)[i]===cat));
 $('outfit-avatar').innerHTML=avatarSVG(state.wear,'hero');const items=$('wardrobe-items');items.innerHTML=`<div class="shop-grid style-grid">${CATEGORIES[cat].map(([emoji,name],i)=>{const unlocked=gateUnlocked&&(i===0||state.cosmetics[cat+'-'+i]);const equipped=(state.wear[cat]??0)===i;let appearance={...state.wear,[cat]:i};return `<button class="shop-item style-item ${unlocked?'':'locked'} ${equipped&&unlocked?'equipped':''}" data-item="${i}"><div class="style-mini">${avatarSVG(appearance,cat+i)}</div><div class="style-name">${emoji} ${esc(name)}</div><small>${unlocked?(equipped?'✓ Wearing':'✨ Wear'):(i===0?'🎓 Level 5':i===1?'🌸 Normal quiz':'🔥 Tough quiz')}</small>${!unlocked?'<span class="style-lock">🔒</span>':''}</button>`}).join('')}</div>`;
 items.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.item);if(!gateUnlocked){panel('<h2>🔒 LEVEL 5 FIRST!</h2><p class="sub">Complete your exams to open Dress-Up!</p><button id="world-back" class="primary">BACK</button>',wardrobe);return}if(i===0||state.cosmetics[cat+'-'+i]){const was=(state.wear[cat]??0)===i;state.wear[cat]=i;persist();draw();if(!was)hooks?.celebrate();return}sideQuest(cat,i)})}draw()}
function sideQuest(cat,i){const hard=i===2,topic=hard?'math':choose(['math','geography','science','history','bangladesh']),required=hard?8:4,total=hard?10:5;panel(`<h2>${hard?'🔥 TOUGH':'🌸 NORMAL'} SIDE QUEST</h2><div class="mascot">${CATEGORIES[cat][i][0]} ✨</div><p class="sub">${total} questions · Get ${required} right to unlock ${esc(CATEGORIES[cat][i][1])}!</p><button id="quest-start" class="primary">▶ START</button><button id="world-back" class="mini">BACK</button>`,wardrobe);$('quest-start').onclick=()=>{window.SkyQuiz.start({topic,count:total,sprint:false,level:5,onClose:()=>{wardrobe()}});questWatch={cat,i,correct:0,required,total,topic}}}
let questWatch=null;
function celebrateFashion(label){
 const el=document.createElement('div');el.className='fashion-win';el.setAttribute('role','status');
 const safe=esc(label);el.innerHTML=`<div class="fashion-win-inner"><div class="fashion-sparkles">🌟 ✨ 💖 ✨ 🌟</div><div class="fashion-gift">🎁</div><h2>YOU UNLOCKED IT!</h2><strong>${safe}</strong><p>✨ FABULOUS! ✨</p><button class="primary" type="button">YAY! 💕</button></div>`;
 document.body.append(el);hooks?.celebrate();let id=setTimeout(()=>el.remove(),4800);el.querySelector('button').onclick=()=>{clearTimeout(id);el.remove()};
}
function onQuizResults(r){if(questWatch){let q=questWatch;questWatch=null;if(r.correct>=q.required){state.cosmetics[q.cat+'-'+q.i]=true;persist();celebrateFashion(CATEGORIES[q.cat][q.i][1])}else hooks?.toast('💗 TRY AGAIN!')}if(gateWatch){const g=gateWatch;gateWatch=null;const passed=r.correct>=g.required;const rec=state.globalGate;if(passed)rec[g.exam]=true;persist();if(passed)hooks?.celebrate();hooks?.toast(passed?'✅ EXAM PASSED!':'💗 TRY AGAIN!')}}
function passedGate(){return !!state.globalGate?.complete}
let gateWatch=null;function level5Gate(done=()=>{}){const rec=state.globalGate;if(rec.complete){done();return}const exams=[['math','Math Exam',5,4],['geography','World Explorer Exam',5,3],['science','Science Exam',5,3],['math','Super Fast Math',20,15]];
if(exams.every((_,i)=>rec[i])){rec.complete=true;persist();celebrateFashion('Royal Style Studio');panel('<h2>🏆 LEVEL 5 CLEARED!</h2><div class="mascot">🎉 👗 💖</div><p class="sub">Dress-up studio unlocked! Four exams completed!</p><button id="claim-prize" class="primary">👗 DRESS UP!</button><button id="world-back" class="mini">🏃 RUN</button>',done);$('claim-prize').onclick=()=>{modalReturn=done;wardrobe()};return}
const index=exams.findIndex((_,i)=>!rec[i]),[topic,title,total,required]=exams[index];panel(`<h2>🏆 LEVEL 5 EXAMS</h2><div class="mascot">📚 🌟 👗</div><p class="sub">Exam ${index+1} of 4 · ${esc(title)}</p><p class="help">Get ${required} out of ${total} correct. Finish all exams to unlock your first dress, face, body and accessory choices.</p><button id="exam-start" class="primary">▶ START EXAM</button><button id="world-back" class="mini">🏃 BACK TO RUNNING</button>`,done);
$('exam-start').onclick=()=>{gateWatch={exam:index,required,done};window.SkyQuiz.start({topic,count:total,sprint:total===20,level:5,onClose:()=>{if(!gateWatch)level5Gate(done)}})};}
// Lava/water rescue is handled only in game.js (hazardFall + 30-second escape).
// Do not add a second rescue timer here: one question and one escape countdown.
function authorizeParentEditor(onClose){
 panel(`<h2>🔐 PARENT EDITOR</h2><p class="sub">Ask a parent before editing subjects or questions.</p><form id="editor-login-form" class="parent-login-form"><label for="editor-password">Parent password</label><input id="editor-password" type="password" autocomplete="off" required/><div id="editor-error" class="parent-error" role="alert"></div><button class="primary" type="submit">🔓 OPEN EDITOR</button></form><button id="world-back" class="mini">BACK</button>`,onClose);
 $('editor-login-form').onsubmit=e=>{e.preventDefault();if(passwordIs($('editor-password').value))window.AnbloxContent?.editor(onClose);else{$('editor-error').textContent='Not quite — try again.';$('editor-password').value=''}};
}
function parentLogin(){panel(`<h2>🔐 PARENT AREA</h2><p class="sub">Private learning report</p><form id="parent-login-form" class="parent-login-form"><label for="parent-password">Parent password</label><input id="parent-password" type="password" autocomplete="off" required placeholder="Enter password"/><div id="parent-error" class="parent-error" role="alert"></div><button class="primary" type="submit">🔓 OPEN REPORT</button></form><button id="world-back" class="mini">🏃 BACK</button>`);
 $('parent-login-form').onsubmit=e=>{e.preventDefault();if(passwordIs($('parent-password').value)){parentDashboard()}else{$('parent-password').value='';$('parent-error').textContent='Not quite — try again.'}}}
const niceDate=iso=>{if(!iso)return '—';let d=new Date(iso);return Number.isNaN(d.valueOf())?'—':d.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'})};
const duration=s=>{s=Math.floor(Number(s)||0);return `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`};
function raceAnswers(){try{const r=JSON.parse(localStorage.getItem('anblox-race-learning-v1')||'[]');return Array.isArray(r)?r.slice(-2000):[]}catch(e){return []}}
function parentDashboard(){flushSession(true);let a=state.answers,total=a.length,correct=a.filter(x=>x.correct).length,incorrect=a.filter(x=>!x.correct).slice().reverse(),byTopic={},bySubtopic={};a.forEach(x=>{let p=byTopic[x.topic]??={total:0,correct:0};p.total++;if(x.correct)p.correct++;let id=x.topic+' → '+(x.subtopic||'General');let t=bySubtopic[id]??={total:0,correct:0};t.total++;if(x.correct)t.correct++});const worldsHtml=DEFINITIONS.map(w=>`<tr><td>${w.emoji} ${w.name}</td><td>${Math.max(state.runs[w.id]?.bestStage||1,state.runs[w.id]?.stage||1)}</td></tr>`).join('');
 const sessions=(state.sessions||[]).slice().reverse(),from=sessions.length?sessions[sessions.length-1].start:null,to=sessions.length?sessions[0].end:null;
 panel(`<h2>📊 FAMILY LEARNING REPORT</h2><p class="sub">🔐 Parent only · Stored on this device</p><div class="topic-grid"><div class="world-btn">⏱️ ${duration(state.totalSeconds)}<br><small>Active play time</small></div><div class="world-btn">🧠 ${total}<br><small>Answers recorded</small></div><div class="world-btn">⭐ ${total?Math.round(correct/total*100):0}%<br><small>Accuracy</small></div><div class="world-btn">❤️ ${state.deaths}<br><small>Respawns</small></div></div>
 <h3>⏱️ Activity breakdown</h3><p class="world-note">Estimated active time excludes background tabs and idle periods after 45 seconds in-game or 60 seconds in menus (2 minutes in quizzes). Continuous movement counts as activity. Times before this update are included in the historical total but cannot be split retroactively.</p><table class="parent-table"><tr><th>Activity</th><th>Time</th></tr>${Object.entries(state.timeBreakdown||{}).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(duration(v))}</td></tr>`).join('')}</table><h3>⏰ Play history</h3><p class="parent-time-range"><strong>First:</strong> ${esc(niceDate(from))}<br><strong>Last:</strong> ${esc(niceDate(to))}<br><strong>Total:</strong> ${esc(duration(state.totalSeconds))} · ${sessions.length} session${sessions.length===1?'':'s'}</p><div class="parent-scroll"><table class="parent-table"><thead><tr><th>Started</th><th>Ended</th><th>Active time</th></tr></thead><tbody>${sessions.slice(0,150).map(t=>`<tr><td>${esc(niceDate(t.start))}</td><td>${esc(niceDate(t.end))}</td><td>${esc(duration(t.seconds))}</td></tr>`).join('')||'<tr><td colspan="3">No sessions yet</td></tr>'}</tbody></table></div>
 <h3>🗺️ Worlds and Level 5 graduation</h3><p class="sub">${passedGate()?'🏆 All four Level 5 exams completed':'📚 Level 5 exams: '+[0,1,2,3].filter(i=>state.globalGate[i]).length+'/4 passed'}</p><table class="parent-table"><tr><th>World</th><th>Level</th></tr>${worldsHtml}</table>
 <h3>📚 Subject accuracy</h3><table class="parent-table"><tr><th>Subject</th><th>Right</th><th>Total</th><th>Accuracy</th></tr>${Object.entries(byTopic).map(([t,r])=>`<tr><td>${esc(t)}</td><td>${r.correct}</td><td>${r.total}</td><td>${Math.round(r.correct/r.total*100)}%</td></tr>`).join('')||'<tr><td colspan="4">Play to collect results</td></tr>'}</table>
 <h3>📖 Topic-by-topic accuracy</h3><div class="parent-scroll"><table class="parent-table"><tr><th>Subject → Topic</th><th>Right / Total</th><th>Accuracy</th></tr>${Object.entries(bySubtopic).map(([t,r])=>`<tr><td>${esc(t)}</td><td>${r.correct} / ${r.total}</td><td>${Math.round(r.correct/r.total*100)}%</td></tr>`).join('')||'<tr><td colspan="3">No questions yet</td></tr>'}</table></div><h3>📝 Every missed question</h3><p class="world-note">Includes the exact answer tapped, or whether the question was skipped/timed out. Up to the most recent 2,000 total answers are retained.</p><div class="parent-scroll missed-scroll"><table class="parent-table"><thead><tr><th>Date & time</th><th>World / type</th><th>Subject</th><th>Question</th><th>Her answer</th><th>Correct answer</th></tr></thead><tbody>${incorrect.map(q=>`<tr><td>${esc(niceDate(q.when))}</td><td>${esc(q.world)}<br><small>${esc(q.mode)}</small></td><td>${esc(q.topic)}${q.subtopic?'<br><small>'+esc(q.subtopic)+'</small>':''}</td><td>${esc(q.question)}</td><td class="incorrect-answer">${esc(q.selected||'(no response)')}</td><td>${esc(q.answer)}</td></tr>`).join('')||'<tr><td colspan="6">No missed questions yet!</td></tr>'}</tbody></table></div>
 <h3>🏁 30 Meter Sprint learning</h3><p class="world-note">Answers on this device only. Other racers' answers stay on their own devices. ${raceAnswers().length} sprint answer${raceAnswers().length===1?'':'s'} recorded.</p><div class="parent-scroll missed-scroll"><table class="parent-table"><thead><tr><th>Date</th><th>Subject / Topic</th><th>Question</th><th>Chosen</th><th>Correct answer</th></tr></thead><tbody>${raceAnswers().filter(a=>!a.correct).slice().reverse().map(q=>`<tr><td>${esc(niceDate(q.when))}</td><td>${esc(q.topic)} / ${esc(q.subtopic||'General')}</td><td>${esc(q.question)}</td><td class="incorrect-answer">${esc(q.selected)}</td><td>${esc(q.answer)}</td></tr>`).join('')||'<tr><td colspan="5">No sprint mistakes recorded</td></tr>'}</tbody></table></div>
 <div class="menu-actions"><button class="mini" id="export-progress">⬇ EXPORT REPORT</button><button class="mini" id="change-password">🔑 CHANGE PASSWORD</button><button id="world-back" class="primary">🔒 CLOSE</button></div>`);
 $('export-progress').onclick=()=>{flushSession(true);const clean=JSON.parse(JSON.stringify(state));const blob=new Blob([JSON.stringify({...clean,raceAnswers:raceAnswers(),exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='anblox-parent-progress.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)};
 $('change-password').onclick=()=>{panel(`<h2>🔑 CHANGE PARENT PASSWORD</h2><form id="change-parent-form" class="parent-login-form"><label>New password</label><input id="new-password" type="password" minlength="6" required autocomplete="new-password"/><label>Confirm new password</label><input id="confirm-password" type="password" minlength="6" required autocomplete="new-password"/><div id="change-error" class="parent-error"></div><button class="primary" type="submit">SAVE PASSWORD</button></form><button class="mini" id="world-back">BACK</button>`,parentDashboard);$('change-parent-form').onsubmit=e=>{e.preventDefault();let a=$('new-password').value,b=$('confirm-password').value;if(a!==b){$('change-error').textContent='Passwords do not match';return}if(!changePassword(a)){$('change-error').textContent='Could not save the password';return}parentDashboard();hooks?.toast('🔐 PASSWORD UPDATED')}};
}
window.AnbloxWorlds={DEFINITIONS,CATEGORIES,theme,activeId,getWorldRun,getWear,getAvatarProfile,setAvatarProfile,SKIN_TONES,getRun,saveRun,setWorld,hazard,recordAnswer,recordQuiz,recordDeath,recordLevel,bind,passedGate,level5Gate,onQuizResults,startSession,authorizeParentEditor};
})();
