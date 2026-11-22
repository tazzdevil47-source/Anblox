'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),EventEmitter=require('node:events'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
const questions=require('../questions.json');
function harness(){
 let clock=100000,step,websocketServer;
 class FakeWS extends EventEmitter{constructor(){super();this.readyState=1;this.out=[]}send(payload){this.out.push(JSON.parse(payload))}close(){this.readyState=3;this.emit('close')}get(type){return this.out.filter(x=>x.type===type)}latest(type){return this.get(type).at(-1)}sendToServer(msg){this.emit('message',JSON.stringify(msg))}}
 FakeWS.OPEN=1;
 class FakeWSS extends EventEmitter{constructor(){super();websocketServer=this}close(){}}
 const fakeHttp={createServer:()=>({listen:()=>{},close:()=>{}})};
 const context={console,process:{env:{PORT:'8080',ADMIN_KEY:'integration-test-only-key',ALLOWED_ORIGINS:'https://example.test'},on:()=>{}},URL,Buffer,require:(name)=>name==='ws'?{WebSocketServer:FakeWSS,WebSocket:FakeWS}:name==='node:http'?fakeHttp:require(name),__dirname:path.join(__dirname,'..'),Date:class extends Date{static now(){return clock}},setInterval:callback=>{step=callback;return 1},clearInterval:()=>{}};
 vm.runInNewContext(code,context,{filename:'server.js'});
 return {connect(){const s=new FakeWS;websocketServer.emit('connection',s);return s},tick(ms=100){clock+=ms;step()},get now(){return clock}};
}
function createRace(h,playerCount=2){const users=[];for(let i=0;i<playerCount;i++){const s=h.connect();if(i===0)s.sendToServer({type:'create',name:'Player A'});else s.sendToServer({type:'join',code:users[0].latest('joined').code,name:'Player '+(i+1)});assert.ok(s.latest('joined'));users.push(s)}for(const s of users)s.sendToServer({type:'ready',value:true});users[0].sendToServer({type:'start'});h.tick(3600);assert.equal(users[0].latest('state').status,'running');return users}
test('private room allows three players, host-only start and controls',()=>{const h=harness(),u=createRace(h,3);const code=u[0].latest('joined').code;assert.match(code,/^\d{6}$/);assert.equal(u[2].latest('state').players.length,3);assert.equal(u[1].latest('joined').host,false);assert.equal(u[0].latest('joined').host,true);assert.equal(u[0].latest('state').host,u[0].latest('joined').id)});
test('twenty questions cannot be skipped and wrong answer slows for exactly 2000ms',()=>{
 const h=harness(),[runner,other]=createRace(h);let expectedQuestion=1;
 assert.equal(runner.latest('question').number,1,'first question is required at start');
 runner.sendToServer({type:'input',moving:true,lane:1});
 for(let i=0;i<45;i++){runner.sendToServer({type:'input',moving:true,lane:1});h.tick()};
 assert.ok(runner.latest('state').players[0].position<=1.35+1e-5,'first gate blocks progress');
 for(let q=1;q<=20;q++){
  let received=runner.latest('question');assert.equal(received.number,q,`question ${q} delivered`);
  const answer=q===1?(questions[q-1].correctIndex+1)%4:questions[q-1].correctIndex;
  runner.sendToServer({type:'answer',number:q,choice:answer});
  const result=runner.latest('answer-result');assert.equal(result.number,q);if(q===1){assert.equal(result.correct,false);assert.equal(result.slowMs,2000);assert.ok(runner.latest('state').players[0].slowUntil-h.now<=2000)}
  if(q<20){let ticks=0;while(runner.latest('question').number===q&&ticks++<300){runner.sendToServer({type:'input',moving:true,lane:1});h.tick()};assert.ok(ticks<300,`reached next question ${q+1}`)}
 }
 assert.equal(runner.latest('state').players[0].answered,20);
 for(let i=0;i<200;i++){runner.sendToServer({type:'input',moving:true,lane:1});h.tick()};
 assert.equal(runner.latest('finish').place,1);
 assert.equal(runner.latest('state').players[0].position,30);
 assert.equal(runner.latest('state').players[0].answered,20);
 assert.equal(other.latest('state').players[1].answered,0,'opponent remains independent');
});
test('host only can start and course selection cannot be changed after countdown',()=>{const h=harness(),a=h.connect(),b=h.connect();a.sendToServer({type:'create',name:'A'});b.sendToServer({type:'join',code:a.latest('joined').code,name:'B'});a.sendToServer({type:'ready',value:true});b.sendToServer({type:'ready',value:true});b.sendToServer({type:'start'});assert.equal(a.latest('state').status,'lobby');a.sendToServer({type:'start'});assert.equal(a.latest('state').status,'countdown');b.sendToServer({type:'track',id:'island'});assert.equal(a.latest('state').track,'rainbow')});

test('stale input automatically stops racing and reconnect never resumes RUN',()=>{
 const h=harness(),[runner]=createRace(h);runner.sendToServer({type:'input',moving:true,lane:1});
 for(let i=0;i<10;i++)h.tick();const pos=runner.latest('state').players[0].position;
 for(let i=0;i<25;i++)h.tick();const stopped=runner.latest('state').players[0].position;
 for(let i=0;i<25;i++)h.tick();assert.equal(runner.latest('state').players[0].position,stopped);
 assert.ok(stopped>=pos);const token=runner.latest('token').token,code=runner.latest('joined').code;
 runner.close();const reconnected=h.connect();reconnected.sendToServer({type:'reconnect',code,token});
 assert.equal(reconnected.latest('state').players[0].position,stopped);
 for(let i=0;i<15;i++)h.tick();assert.equal(reconnected.latest('state').players[0].position,stopped);
});
test('answer acknowledgement carries grade/topic and selected/correct answer for parent report',()=>{
 const h=harness(),[runner]=createRace(h);runner.sendToServer({type:'answer',number:1,choice:0});
 const m=runner.latest('answer-result');assert.equal(m.number,1);assert.equal(m.question,questions[0].question);
 assert.equal(m.selected,questions[0].choices[0]);assert.equal(m.correctAnswer,questions[0].choices[questions[0].correctIndex]);
 assert.equal(m.subject,questions[0].subject);
});

for(const [id,distance] of [['sky-jump',75],['grand-marathon',300]]){
 test(`${id}: selected course keeps all twenty mandatory gates and finishes at ${distance}m`,()=>{
  const h=harness(),[runner]=createRace(h);
  // Track selection is lobby-only, so start another room and select it before readiness.
  const h2=harness(),a=h2.connect(),b=h2.connect();
  a.sendToServer({type:'create',name:'Jumping racer'});b.sendToServer({type:'join',code:a.latest('joined').code,name:'Friend'});
  a.sendToServer({type:'track',id});assert.equal(a.latest('state').track,id);
  a.sendToServer({type:'ready',value:true});b.sendToServer({type:'ready',value:true});a.sendToServer({type:'start'});h2.tick(3600);
  assert.equal(a.latest('state').courseLength,distance);
  assert.equal(a.latest('question').number,1);
  let completed=0;
  for(let q=1;q<=20;q++){
   assert.equal(a.latest('question').number,q);
   a.sendToServer({type:'answer',number:q,choice:questions[q-1].correctIndex});
   completed++;
   if(q<20){let ticks=0;while(a.latest('question').number===q&&ticks++<1000){a.sendToServer({type:'input',moving:true,lane:1});h2.tick()};assert.ok(ticks<1000,`checkpoint ${q+1}`)}
  }
  assert.equal(completed,20);assert.ok(a.latest('state').players[0].position<distance);
  let ticks=0;while(!a.latest('finish')&&ticks++<2000){a.sendToServer({type:'input',moving:true,lane:1});h2.tick()}
  assert.ok(a.latest('finish'),`finished ${id}`);
  assert.equal(a.latest('state').players[0].position,distance);
  assert.equal(a.latest('state').players[0].answered,20);
 });
}
