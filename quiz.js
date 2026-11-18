/* ANBLOX learning adventures: offline, self-contained question engine. */
(()=>{'use strict';
const $=id=>document.getElementById(id), overlay=$('overlay'),dialog=$('dialog');
const choose=a=>a[Math.floor(Math.random()*a.length)], between=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){let j=between(0,i);[b[i],b[j]]=[b[j],b[i]]}return b};
const bank=window.ANBLOX_QUESTION_BANK.bank;
const TOPICS=window.ANBLOX_QUESTION_BANK.topics;
const QB=window.ANBLOX_QUESTION_BANK;
function allTopics(){return [...TOPICS,...(window.AnbloxContent?.available()||[]).map(s=>[s.id,s.label])];}
const activeNow=()=>window.AnbloxClock?.now?.()??performance.now();
const state={grade:4,topic:'math',stats:{},level:1};try{state.grade=localStorage.getItem('skyhop-grade')==='5'?5:4}catch(e){}
function mathQuestion(grade,hard=false){return window.ANBLOX_QUESTION_BANK.mathQuestion(grade,hard)}
function nonMath(topic,subtopic=null){if(QB.subjects?.some(s=>s.id===topic))return QB.questionFor(topic,subtopic,state.grade)||mathQuestion(state.grade);if(!bank[topic])return window.AnbloxContent?.question(topic)||mathQuestion(state.grade);let row=choose(bank[topic]);return {prompt:row[0],answer:row[1],options:shuffle(row.slice(1))}}
let session=null,timeout=null;
function logQuestion(topic,q,selected,correct,mode){window.AnbloxWorlds?.recordAnswer({topic,subtopic:q.subtopic||'',question:q.prompt,answer:q.answer,selected,correct,mode});}function stopTimer(){if(timeout){clearInterval(timeout);timeout=null}}
function announce(text){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.rate=.9;u.pitch=1.12;window.speechSynthesis.speak(u)}
function show(html){overlay.classList.add('active');dialog.innerHTML=html}
function button(label,click,extra='primary'){let b=document.createElement('button');b.className=extra;b.textContent=label;b.onclick=click;return b}
function splash(onClose,info={}){stopTimer();show(`<h2>🌈 ANBLOX LEARNING CLUB 🌈</h2><div class="mascot">🦄 🌟 🐣</div><p class="sub">Choose your adventure!</p><div class="topic-grid" id="topics"></div><div class="grade-switch" id="grade-switch"></div><div class="menu-actions" id="menu-actions"></div><div class="help">🤖 Rivals are computer characters, not real people.</div>`);
const g=$('grade-switch');[4,5].forEach(n=>g.appendChild(button(`Grade ${n}`,()=>{state.grade=n;try{localStorage.setItem('skyhop-grade',String(n))}catch(e){}splash(onClose,info)},state.grade===n?'mini active':'mini')));
const topics=$('topics');allTopics().forEach(([id,title])=>topics.appendChild(button(title,()=>subjectMenu(id,onClose,info), 'topic-btn')));
const actions=$('menu-actions');actions.appendChild(button('🛠️ PARENT EDITOR',()=>window.AnbloxWorlds.authorizeParentEditor(()=>splash(onClose,info)),'mini'));actions.appendChild(button('⚡ 20-QUESTION SPRINT',()=>start({topic:'math',count:20,sprint:true,onClose,level:info.level||state.level}),'primary sprint-btn'));actions.appendChild(button('▶ JUMP!',onClose,'primary play-btn'));
}
function subjectMenu(id,onClose,info={}){
 const subject=QB.subjects?.find(s=>s.id===id);
 if(!subject){start({topic:id,count:5,sprint:false,onClose,level:info.level||state.level});return}
 show(`<h2>${subject.label}</h2><p class="sub">🌟 Pick a topic to practise!</p><div class="topic-grid" id="subject-topics"></div><div class="menu-actions" id="subject-back"></div>`);
 const grid=$('subject-topics');
 grid.appendChild(button('🎲 All topics',()=>start({topic:id,count:5,sprint:false,onClose,level:info.level||state.level}),'topic-btn'));
 subject.topics.filter(t=>(t.questions?.length||0)>0||t.generator).forEach(t=>grid.appendChild(button(t.label,()=>start({topic:id,subtopic:t.id,count:5,sprint:false,onClose,level:info.level||state.level}),'topic-btn')));
 $('subject-back').appendChild(button('⬅ BACK',()=>splash(onClose,info),'mini'));
}
function start({topic='math',subtopic=null,count=5,sprint=false,onClose=()=>{},level=1}){stopTimer();state.topic=topic;state.level=level;session={topic,subtopic,count,sprint,onClose,level,idx:0,correct:0,streak:0,best:0,wrong:0,startedAt:activeNow(),seconds:sprint?120:0,deadline:sprint?activeNow()+120000:Infinity,questions:[],lock:false};for(let i=0;i<count;i++)session.questions.push(topic==='math'?(subtopic?{...QB.mathQuestion(state.grade,sprint,subtopic),subtopic:QB.subjects?.find(s=>s.id==='math')?.topics.find(t=>t.id===subtopic)?.label,topicId:subtopic}:mathQuestion(state.grade,sprint)):nonMath(topic,subtopic));
showQuestion();if(sprint){timeout=setInterval(()=>{if(!session)return;session.seconds=Math.max(0,Math.ceil((session.deadline-activeNow())/1000));let el=$('timer');if(el)el.textContent=`⏱️ ${session.seconds}s`;if(session.seconds===0)finish()},150)}}
function showQuestion(){if(!session)return;let s=session,q=s.questions[s.idx];show(`<div class="quiz-progress"><span>⭐ ${s.correct}</span><span>${s.idx+1} / ${s.count}</span><span id="timer">${s.sprint?'⏱️ '+s.seconds+'s':'💫'}</span></div><div class="progress-rail"><div style="width:${s.idx/s.count*100}%"></div></div><div class="topic-title">${allTopics().find(t=>t[0]===s.topic)?.[1]||s.topic}${q.subtopic?' · '+q.subtopic:''} · Grade ${state.grade}</div><div class="question">${q.prompt}</div><div class="choices" id="quiz-choices"></div><div class="quiz-bottom"><button id="speak" class="mini">🔊 Hear it</button><button id="skip" class="mini">⏭ Skip</button></div>`);
$('speak').onclick=()=>announce(q.prompt.replaceAll('▭','Rectangle'));
$('skip').onclick=()=>{if(session&&!session.lock){logQuestion(session.topic,q,'(skipped)',false,session.sprint?'sprint':'practice');session.wrong++;session.lock=true;advance(false)}};
const choices=$('quiz-choices');q.options.forEach((o,i)=>{const b=button(o,()=>{if(!session||session.lock)return;const right=o===q.answer;logQuestion(s.topic,q,o,right,s.sprint?'sprint':'practice');b.classList.add(right?'correct':'wrong');if(right){s.correct++;s.streak++;s.best=Math.max(s.streak,s.best)}else{s.wrong++;s.streak=0;[...choices.children].forEach(el=>{if(el.textContent===q.answer)el.classList.add('correct')})}s.lock=true;const fx=$('feedback');if(fx)fx.textContent=right?choose(['✨ YES!','🎉 WOW!','🌟 GREAT!','💖 SUPER!']):'💗 KEEP GOING!';setTimeout(()=>advance(right),s.sprint?340:700)},'choice');b.dataset.index=i;choices.appendChild(b)});
let f=document.createElement('div');f.id='feedback';f.className='feedback';dialog.appendChild(f)}
function advance(correct){if(!session||session.idx>=session.count)return;session.idx++;session.lock=false;if(session.idx>=session.count)finish();else showQuestion()}
function league(s){/* All opponents are clearly labeled simulated NPCs; never imply real children. */
const maximum=s.count;let actual=s.correct;let bots=[{name:'🦊 Fox Bot',value:Math.min(maximum,actual+between(1,2))},{name:'🐼 Panda Bot',value:Math.min(maximum,actual+1)},{name:'🐱 Kitty Bot',value:Math.max(0,actual-1)},{name:'🐢 Turtle Bot',value:Math.max(0,actual-3)},{name:'🐸 Froggy Bot',value:Math.max(0,actual-5)},{name:'🐻 Teddy Bot',value:Math.max(0,actual-7)}];let all=[{name:'🌟 YOU',value:actual,self:true},...bots].sort((a,b)=>b.value-a.value);return `<div class="league-title">🤖 FUN BOT LEAGUE</div><div class="league-note">Computer characters · just for fun</div><div class="league">${all.map((b,i)=>`<div class="league-row ${b.self?'me':''}"><span>${i+1}. ${b.name}</span><strong>${b.value}/${maximum}</strong></div>`).join('')}</div>`}
function finish(){if(!session)return;stopTimer();const s=session;if(s.sprint&&s.seconds===0&&!s.lock&&s.idx<s.count){const pending=s.questions[s.idx];logQuestion(s.topic,pending,'(timed out)',false,'sprint');s.wrong++;s.lock=true;}session=null;let pct=Math.round(s.correct/s.count*100),earned=s.correct+(s.correct===s.count?10:0)+(s.sprint?5:0),seconds=Math.round((activeNow()-s.startedAt)/1000);let key=s.topic+'-'+state.grade;state.stats[key]=Math.max(state.stats[key]||0,s.correct);let title=pct===100?'🏆 PERFECT!':pct>=80?'🌈 SUPERSTAR!':pct>=50?'🎉 GREAT TRY!':'💗 BRAVE EXPLORER!';
show(`<h2>${title}</h2><div class="celebrate-stars">✨ 🎊 ⭐ 🎉 💎</div><div class="results-score">${s.correct}<small> / ${s.count}</small></div><p class="sub">+${earned} ⭐ · 🔥 Best streak ${s.best} ${s.sprint?'· ⏱ '+seconds+'s':''}</p>${league(s)}<div class="menu-actions" id="done-actions"></div>`);
window.AnbloxWorlds?.recordQuiz({topic:s.topic,subtopic:s.subtopic||'',correct:s.correct,total:s.count,sprint:s.sprint,seconds,grade:state.grade});window.AnbloxWorlds?.onQuizResults({topic:s.topic,correct:s.correct,total:s.count});
if(typeof window.skyhopConfetti==='function')window.skyhopConfetti();if(typeof window.skyhopReward==='function')window.skyhopReward(earned,{topic:s.topic,grade:state.grade,correct:s.correct,total:s.count,sprint:s.sprint});
let actions=$('done-actions');actions.appendChild(button('🔁 AGAIN!',()=>start({topic:s.topic,subtopic:s.subtopic,count:s.count,sprint:s.sprint,onClose:s.onClose,level:s.level}),'primary'));actions.appendChild(button('🏃‍♀️ BACK TO JUMPING',()=>{overlay.classList.remove('active');s.onClose({topic:s.topic,correct:s.correct,total:s.count,timedOut:s.sprint&&s.seconds===0})},'primary play-btn'))}
function challenge(level,onClose){state.level=level;if(level%5===0)start({topic:'math',count:20,sprint:true,onClose,level});else {let topics=TOPICS.map(t=>t[0]);let topic=topics[Math.floor(level/3)%topics.length];start({topic,count:5,sprint:false,onClose,level})}}
function chaseQuestion(stage,encounter){const choices=['math',...TOPICS.map(t=>t[0]),...(window.AnbloxContent?.available()||[]).map(s=>s.id)];const topic=choices[(stage+encounter)%choices.length];return {...(topic==='math'?mathQuestion(state.grade,true):nonMath(topic)),topic,subtopic:topic==='math'?'Mixed Math':undefined}}
function surpriseQuestion(){let topics=['math',...TOPICS.map(t=>t[0]),...(window.AnbloxContent?.available()||[]).map(s=>s.id)],topic=choose(topics);return {...(topic==='math'?mathQuestion(state.grade):nonMath(topic)),topic,subtopic:topic==='math'?'Mixed Math':undefined}}
window.SkyQuiz={menu:splash,challenge,start,chaseQuestion,surpriseQuestion,getGrade:()=>state.grade};
})();
