/* Anblox 30 Meter Sprint - independent server. No adventure data is read or written. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const PORT=Number(process.env.PORT||8080),ADMIN_KEY=process.env.ADMIN_KEY||'';
const allow=new Set((process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean));
function cors(req,res){const origin=req.headers.origin;if(origin&&allow.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Admin-Key');res.setHeader('Access-Control-Allow-Methods','GET,PUT,OPTIONS')}return !origin||allow.has(origin)}
function loadJson(file){return JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'))}
// Configure QUESTION_STORE_PATH to a mounted persistent volume in production.
// Default is the bundled demo file (which may reset on ephemeral hosting).
const questionStore=process.env.QUESTION_STORE_PATH?path.resolve(process.env.QUESTION_STORE_PATH):path.join(__dirname,'questions.json');
if(process.env.QUESTION_STORE_PATH&&!fs.existsSync(questionStore)){
  fs.mkdirSync(path.dirname(questionStore),{recursive:true});
  fs.copyFileSync(path.join(__dirname,'questions.json'),questionStore);
}
let questions=JSON.parse(fs.readFileSync(questionStore,'utf8')),tracks=loadJson('tracks.json');
function validQuestions(rows){return Array.isArray(rows)&&rows.length===20&&rows.every((q,i)=>q&&typeof q.question==='string'&&q.question.trim().length>0&&q.question.length<=400&&Array.isArray(q.choices)&&q.choices.length===4&&q.choices.every(c=>typeof c==='string'&&c.trim()&&c.length<=160)&&Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<4)}
if(!validQuestions(questions))throw Error('questions.json must contain exactly 20 valid multiple-choice questions');
if(!Array.isArray(tracks)||!tracks.length||tracks.some(t=>!t||typeof t.id!=='string'||typeof t.name!=='string'||!Number.isFinite(t.length)||t.length<30||t.length>1000||!Array.isArray(t.obstacles)||t.obstacles.some(o=>!Number.isFinite(o.meter)||o.meter<0||o.meter>t.length||![0,1,2].includes(o.lane))))throw Error('tracks.json must contain valid tracks and obstacles');
function safeQuestion(q,i){return {id:q.id||String(i+1),number:i+1,question:q.question,choices:q.choices,subject:q.subject||'mixed',topic:q.topic||''}}
const courseFor=room=>tracks.find(t=>t.id===room.track)||tracks[0];
const gateStep=room=>(courseFor(room).length-3)/20;
const rooms=new Map();const say=(ws,p)=>{if(ws?.readyState===WebSocket.OPEN)try{ws.send(JSON.stringify(p))}catch(e){}};
function all(room,p){for(const player of room.players.values())say(player.ws,p)}
const now=()=>Date.now();
const randCode=()=>crypto.randomInt(0,1000000).toString().padStart(6,'0');
const playerNames=new Set();
function snapshot(room){return {type:'state',code:room.code,host:room.host,status:room.status,track:room.track,courseLength:courseFor(room).length,courseName:courseFor(room).name,countdownEnds:room.countdownEnds||0,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,position:+p.pos.toFixed(2),lane:p.lane,jumpUntil:p.jumpUntil,answered:p.answered,slowUntil:p.slowUntil,place:p.place,connected:p.ws?.readyState===WebSocket.OPEN,ready:p.ready,moving:p.moving,penalties:p.penalties})),now:now()}}
function emit(room){all(room,snapshot(room))}
function fail(ws,message){say(ws,{type:'error',message})}
function ownMessage(p){const i=p.answered;if(i>=20)return;const threshold=i*gateStep(rooms.get(p.code));if(p.pos>=threshold-.01&&!p.pending){p.pending=true;say(p.ws,{type:'question',...safeQuestion(questions[i],i)})}}
function publicMsg(room,p){const data={type:'joined',code:room.code,id:p.id,host:room.host===p.id,track:room.track,tracks:tracks.map(t=>({id:t.id,name:t.name,emoji:t.emoji,kind:t.kind,length:t.length,description:t.description,sky:t.sky,ground:t.ground,obstacles:t.obstacles})),maxPlayers:4};say(p.ws,data);emit(room);if(room.status==='running'){if(p.pending){const i=p.answered;say(p.ws,{type:'question',...safeQuestion(questions[i],i)})}else ownMessage(p)}}
function getPlayer(ws){return ws.player&&rooms.get(ws.player.code)?.players.get(ws.player.id)}
function validName(n){return String(n||'Racer').trim().replace(/[<>\x00-\x1f]/g,'').slice(0,18)||'Racer'}
function newPlayer(ws,code,name){return {id:crypto.randomUUID(),code,ws,name:validName(name),pos:0,lane:1,moving:false,ready:false,answered:0,pending:false,slowUntil:0,jumpUntil:0,place:0,penalties:0,lastObstacle:new Set(),reconnectToken:crypto.randomBytes(20).toString('hex'),lastSeen:now(),lastInputAt:0}}
function leave(ws){const p=getPlayer(ws);if(!p||p.ws!==ws)return;const room=rooms.get(p.code);if(!room)return;p.ws=null;p.moving=false;p.lastInputAt=0;p.lastSeen=now();emit(room)}
function handle(ws,m){if(typeof m!=='object'||!m)return;let p=getPlayer(ws),room=p&&rooms.get(p.code);
 if(m.type==='create'||m.type==='join'){
  if(p)return fail(ws,'Already in a room. Leave first.');let code=m.type==='create'?'':String(m.code||'').replace(/\D/g,'').slice(0,6);
  if(m.type==='create'){do{code=randCode()}while(rooms.has(code));room={code,status:'lobby',track:'rainbow',players:new Map(),host:null,created:now(),countdownEnds:0,finishedAt:0};rooms.set(code,room)}else room=rooms.get(code);
  if(!room)return fail(ws,'Room not found. Ask your friend for the code.');if(room.players.size>=4)return fail(ws,'Room is full (4 players).');if(room.status!=='lobby')return fail(ws,'Race already started. Reconnect if you were playing.');
  p=newPlayer(ws,code,m.name);room.players.set(p.id,p);ws.player={code,id:p.id};if(!room.host)room.host=p.id;say(ws,{type:'token',token:p.reconnectToken});publicMsg(room,p);return
 }
 if(m.type==='reconnect'){const code=String(m.code||''),r=rooms.get(code);const found=r&&[...r.players.values()].find(q=>q.reconnectToken===m.token);if(!found)return fail(ws,'Reconnection expired.');if(found.ws&&found.ws!==ws)try{found.ws.close()}catch(e){}found.ws=ws;found.moving=false;found.lastInputAt=0;found.lastSeen=now();ws.player={code,id:found.id};say(ws,{type:'token',token:found.reconnectToken});publicMsg(r,found);return}
 if(!room)return fail(ws,'Join or create a room first');
 if(m.type==='leave'){room.players.delete(p.id);delete ws.player;if(!room.players.size)rooms.delete(room.code);else{if(room.host===p.id)room.host=[...room.players.keys()][0];emit(room)}return}
 if(m.type==='track'&&room.status==='lobby'&&room.host===p.id){if(!tracks.some(t=>t.id===m.id))return fail(ws,'Unknown course');room.track=m.id;emit(room);return}
 if(m.type==='ready'&&room.status==='lobby'){p.ready=!!m.value;emit(room);return}
 if(m.type==='start'&&room.status==='lobby'&&room.host===p.id){if(room.players.size<2)return fail(ws,'At least two racers required');if(![...room.players.values()].every(q=>q.ready&&q.ws?.readyState===WebSocket.OPEN))return fail(ws,'All players must be online and READY');room.status='countdown';room.countdownEnds=now()+3500;emit(room);return}
 if(m.type==='input'&&room.status==='running'&&!p.place){p.moving=!!m.moving;p.lastInputAt=now();const lane=Number(m.lane);if(Number.isInteger(lane)&&lane>=0&&lane<=2)p.lane=lane;if(m.jump&&now()>p.jumpUntil+250)p.jumpUntil=now()+700;return}
 if(m.type==='answer'&&room.status==='running'&&p.pending){const index=Number(m.choice),i=p.answered;
  if(m.number!==i+1||!Number.isInteger(index)||index<0||index>3){ownMessage(p);return}
  const q=questions[i],correct=index===q.correctIndex;
  p.answered++;p.pending=false;
  if(!correct){p.slowUntil=now()+2000;p.penalties++}
  say(ws,{type:'answer-result',correct,number:p.answered,slowMs:correct?0:2000,
   question:q.question,subject:q.subject||'mixed',topic:q.topic||'',selected:q.choices[index],
   correctAnswer:q.choices[q.correctIndex],raceCode:room.code,track:room.track});
  ownMessage(p);emit(room);return}
 }
const server=http.createServer((req,res)=>{const authorized=cors(req,res);if(req.method==='OPTIONS'){res.writeHead(authorized?204:403);return res.end()}if(!authorized){res.writeHead(403);return res.end('Forbidden origin')}let url=new URL(req.url,'http://localhost');if(req.method==='GET'&&url.pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,rooms:rooms.size}))}if(req.method==='GET'&&url.pathname==='/tracks'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(tracks))}
 if((req.method==='GET'||req.method==='PUT')&&url.pathname==='/admin/questions'){
  if(!ADMIN_KEY||ADMIN_KEY==='replace-this-with-a-very-long-random-secret'||req.headers['x-admin-key']!==ADMIN_KEY){res.writeHead(403);return res.end('Admin key required')}
  if(req.method==='GET'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(questions))}
  let body='';req.on('data',chunk=>{body+=chunk;if(body.length>50000)req.destroy()});req.on('end',()=>{let rows;try{rows=JSON.parse(body)}catch(e){}if(!validQuestions(rows)){res.writeHead(400);return res.end('Exactly 20 questions, each with four choices and a correct index, are required')}
  // Replace atomic on disk; already-started races use original pack? Locked to same published pack: prohibit publish during active races.
  if([...rooms.values()].some(r=>r.status==='running'||r.status==='countdown')){res.writeHead(409);return res.end('Finish active races before publishing a new question pack')}
  try{const temp=questionStore+'.tmp-'+process.pid;fs.mkdirSync(path.dirname(questionStore),{recursive:true});fs.writeFileSync(temp,JSON.stringify(rows,null,2));fs.renameSync(temp,questionStore);questions=rows;res.end('Published 20 questions')}catch(e){res.writeHead(500);res.end('Storage is not writable. Update questions.json on the server and redeploy.')}});return}
 res.writeHead(404);res.end('Not found')});
const wss=new WebSocketServer({server,maxPayload:16000,verifyClient:({origin},done)=>done(!origin||allow.has(origin))});
wss.on('connection',ws=>{ws.on('message',raw=>{let data;try{data=JSON.parse(String(raw))}catch(e){return fail(ws,'Invalid message')}try{handle(ws,data)}catch(e){console.error(e);fail(ws,'Server error')}});ws.on('close',()=>leave(ws))});
let last=now();const timer=setInterval(()=>{const t=now(),dt=Math.max(0,Math.min(.2,(t-last)/1000));last=t;for(const room of rooms.values()){
 if(room.status==='countdown'&&t>=room.countdownEnds){room.status='running';room.startedAt=t;all(room,{type:'go'});for(const p of room.players.values())ownMessage(p);}
 if(room.status==='running'){const track=courseFor(room);for(const p of room.players.values()){
 if(p.place||!p.ws||p.ws.readyState!==WebSocket.OPEN)continue;
 if(p.moving&&t-p.lastInputAt>650)p.moving=false; // iOS suspend / lost pointer / lost input
 // A question appears at the start of each segment. The runner can move slowly while answering,
 // but cannot cross the next gate until the answer is submitted.
 const limit=p.answered<20?(p.answered+1)*gateStep(room):track.length;
 let speed=p.pending?.6:(t<p.slowUntil?1.4:4.6);if(!p.moving)speed=0;
 const before=p.pos;p.pos=Math.min(limit,p.pos+speed*dt);
 for(const [index,o] of (track.obstacles||[]).entries()){if(o.lane===p.lane&&before<o.meter+.2&&p.pos>=o.meter-.3&&!p.lastObstacle.has(index)){p.lastObstacle.add(index);if(t>p.jumpUntil){p.slowUntil=Math.max(p.slowUntil,t+700);p.penalties++;say(p.ws,{type:'obstacle',message:'Hurdle hit! Keep jumping!'});}}}
 ownMessage(p);
 if(p.answered===20&&p.pos>=track.length&&!p.place){p.place=[...room.players.values()].filter(q=>q.place).length+1;all(room,{type:'finish',id:p.id,place:p.place,name:p.name})}
 }
 if([...room.players.values()].every(p=>p.place||(!p.ws&&t-p.lastSeen>60000))){room.status='finished';room.finishedAt=t}
 }
 if(t-room.created>2*60*60*1000||room.status==='finished'&&t-room.finishedAt>3*60*1000){rooms.delete(room.code);continue}
 for(const [id,p] of room.players)if(!p.ws&&t-p.lastSeen>3*60*1000&&room.status==='lobby'){room.players.delete(id);if(room.host===id)room.host=[...room.players.keys()][0]}
 if(room.players.size===0)rooms.delete(room.code);else emit(room)
 }},100);
server.listen(PORT,()=>console.log(`Anblox race server listening on ${PORT}`));
function shutdown(){clearInterval(timer);wss.close();server.close()};process.on('SIGTERM',shutdown);
