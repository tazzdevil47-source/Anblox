/* ANBLOX V12: private, offline companion collection. Separate from the replaceable question bank. */
(()=>{'use strict';
const KEY='anblox-companions-v1';
const PETS=[{id:'kitty',name:'Mochi',emoji:'🐱',color:'#ffd7e8',dark:'#d58db4'},{id:'puppy',name:'Biscuit',emoji:'🐶',color:'#eac59e',dark:'#9f744e'},{id:'dragon',name:'Spark',emoji:'🐉',color:'#a9e8e1',dark:'#55a89f'}];
const FRIENDS=['Luna','Max','Sunny','Nova','Pip'];
let state={pets:[],activePet:null,friends:[],activeFriend:null,puzzlesSolved:0};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&typeof saved==='object')state={...state,...saved}}catch{}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
function choosePet(id){const p=PETS.find(x=>x.id===id);if(!p)return false;if(!state.pets.includes(id)){if(id==='dragon'&&state.puzzlesSolved<2)return false;state.pets.push(id)}state.activePet=id;persist();return true}
function friend(id){if(!FRIENDS.includes(id))return false;if(!state.friends.includes(id))state.friends.push(id);state.activeFriend=state.activeFriend===id?null:id;persist();return true}
function solvePuzzle(){state.puzzlesSolved++;persist()}
function get(){return {...state,pets:[...state.pets],friends:[...state.friends]}}
window.AnbloxCompanions={PETS,FRIENDS,get,choosePet,friend,solvePuzzle};
})();
