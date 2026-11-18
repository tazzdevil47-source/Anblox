/* ANBLOX CURRICULUM — FUTURE LEARNING UPDATES ONLY REPLACE THIS FILE.
   Format: subjects → topics → questions.
   Each question: ["Question", "Correct answer", "Wrong 1", "Wrong 2", "Wrong 3"].
   To add new material: add a subject with a UNIQUE permanent id, then a topic with
   a UNIQUE id within the subject, then its questions. Keep ids stable so past
   reports continue matching the same subjects/topics. No engine changes needed.
   Math topics use generator: arithmetic / times / shapes / mixed.
   The player's progress, nickname, wardrobe and parent records live separately.
*/
(()=>{'use strict';
const choose=a=>a[Math.floor(Math.random()*a.length)];
const between=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){let j=between(0,i);[b[i],b[j]]=[b[j],b[i]]}return b};
const subjects =
[
  {
    "id": "math",
    "label": "🔢 Mathematics",
    "topics": [
      {
        "id": "arithmetic",
        "label": "Addition & Subtraction",
        "generator": "arithmetic"
      },
      {
        "id": "times",
        "label": "Multiplication & Division",
        "generator": "times"
      },
      {
        "id": "shapes",
        "label": "Area & Perimeter",
        "generator": "shapes"
      },
      {
        "id": "mixed",
        "label": "Mixed Math",
        "generator": "mixed"
      }
    ]
  },
  {
    "id": "geography",
    "label": "🌍 Geography",
    "topics": [
      {
        "id": "countries",
        "label": "Countries & Capitals",
        "questions": [
          [
            "🇧🇩 Capital of Bangladesh?",
            "Dhaka",
            "Khulna",
            "Sylhet",
            "Rajshahi"
          ],
          [
            "🗼 Capital of France?",
            "Paris",
            "Rome",
            "Berlin",
            "Madrid"
          ],
          [
            "🌏 Which continent is Bangladesh in?",
            "Asia",
            "Europe",
            "Africa",
            "Australia"
          ],
          [
            "🌎 Brazil is in…",
            "South America",
            "Europe",
            "Africa",
            "Asia"
          ],
          [
            "🗺️ Which is a continent?",
            "Africa",
            "Bangladesh",
            "Pacific Ocean",
            "Dhaka"
          ],
          [
            "🗾 Japan is an…",
            "Island country",
            "Desert",
            "Ocean",
            "Continent"
          ]
        ]
      },
      {
        "id": "earth",
        "label": "Earth & Oceans",
        "questions": [
          [
            "🌍 Which is the largest ocean?",
            "Pacific",
            "Atlantic",
            "Indian",
            "Arctic"
          ],
          [
            "🧊 What covers most of Antarctica?",
            "Ice",
            "Sand",
            "Forest",
            "Grass"
          ],
          [
            "🌊 Which sea is south of Bangladesh?",
            "Bay of Bengal",
            "Red Sea",
            "Black Sea",
            "Caspian Sea"
          ],
          [
            "🧭 The sun rises in the…",
            "East",
            "West",
            "North",
            "South"
          ],
          [
            "🌏 The Equator divides Earth into…",
            "North and South",
            "East and West",
            "Land and Sea",
            "Day and Night"
          ],
          [
            "🌍 How many continents are there?",
            "7",
            "5",
            "6",
            "8"
          ],
          [
            "🌐 Earth has how many oceans?",
            "5",
            "4",
            "6",
            "7"
          ]
        ]
      },
      {
        "id": "landmarks",
        "label": "Landmarks & Landscapes",
        "questions": [
          [
            "🗺️ Where is the Sahara Desert?",
            "Africa",
            "Asia",
            "Europe",
            "South America"
          ],
          [
            "🏔️ Mount Everest is in which mountain range?",
            "Himalayas",
            "Alps",
            "Andes",
            "Rockies"
          ],
          [
            "🌋 A volcano releases…",
            "Lava",
            "Snow",
            "Wood",
            "Salt"
          ],
          [
            "🌳 Amazon rainforest is mostly in…",
            "South America",
            "Europe",
            "Antarctica",
            "Australia"
          ],
          [
            "🏞️ Which river flows through Egypt?",
            "Nile",
            "Amazon",
            "Thames",
            "Padma"
          ]
        ]
      }
    ]
  },
  {
    "id": "bangladesh",
    "label": "🇧🇩 Bangladesh",
    "topics": [
      {
        "id": "history",
        "label": "Independence & History",
        "questions": [
          [
            "🇧🇩 Bangladesh became independent in…",
            "1971",
            "1947",
            "1952",
            "1990"
          ],
          [
            "🗣️ Language Movement Day?",
            "21 February",
            "26 March",
            "16 December",
            "1 January"
          ],
          [
            "🎉 Victory Day in Bangladesh?",
            "16 December",
            "26 March",
            "21 February",
            "14 April"
          ],
          [
            "🇧🇩 Independence Day in Bangladesh?",
            "26 March",
            "16 December",
            "21 February",
            "1 May"
          ],
          [
            "📖 The 1952 Language Movement defended…",
            "Bangla language rights",
            "A new bridge",
            "A mountain",
            "A sports team"
          ]
        ]
      },
      {
        "id": "culture",
        "label": "Language & Culture",
        "questions": [
          [
            "🌺 National flower of Bangladesh?",
            "Water lily",
            "Rose",
            "Tulip",
            "Sunflower"
          ],
          [
            "🗣️ Main language of Bangladesh?",
            "Bangla",
            "Hindi",
            "Arabic",
            "French"
          ],
          [
            "🪶 National bird of Bangladesh?",
            "Oriental magpie-robin",
            "Eagle",
            "Parrot",
            "Peacock"
          ],
          [
            "🎶 Who wrote Amar Sonar Bangla?",
            "Rabindranath Tagore",
            "Kazi Nazrul Islam",
            "Jasimuddin",
            "Begum Rokeya"
          ],
          [
            "📅 Bangla New Year is called…",
            "Pohela Boishakh",
            "Eid-ul-Fitr",
            "Victory Day",
            "Language Day"
          ],
          [
            "📚 Who is known as the Rebel Poet?",
            "Kazi Nazrul Islam",
            "Michael Madhusudan Dutt",
            "Rabindranath Tagore",
            "Sufia Kamal"
          ]
        ]
      },
      {
        "id": "land",
        "label": "Nature & Symbols",
        "questions": [
          [
            "🐅 National animal of Bangladesh?",
            "Royal Bengal tiger",
            "Elephant",
            "Lion",
            "Panda"
          ],
          [
            "🏛️ What is the capital of Bangladesh?",
            "Dhaka",
            "Barishal",
            "Rangpur",
            "Cumilla"
          ],
          [
            "🏞️ Which is a major river of Bangladesh?",
            "Padma",
            "Nile",
            "Seine",
            "Danube"
          ],
          [
            "🌳 What is the Sundarbans famous for?",
            "Mangrove forest",
            "Snowy mountains",
            "Desert dunes",
            "Volcanoes"
          ],
          [
            "🇧🇩 The red circle on Bangladesh’s flag is on…",
            "Green",
            "Blue",
            "White",
            "Orange"
          ]
        ]
      }
    ]
  },
  {
    "id": "history",
    "label": "🏛️ World History",
    "topics": [
      {
        "id": "ancient",
        "label": "Ancient Civilizations",
        "questions": [
          [
            "🏺 Ancient pyramids are famous in…",
            "Egypt",
            "Norway",
            "Japan",
            "Brazil"
          ],
          [
            "🏛️ Ancient Romans built…",
            "The Colosseum",
            "The Taj Mahal",
            "The Great Wall",
            "Angkor Wat"
          ],
          [
            "🏯 The Great Wall is in…",
            "China",
            "Italy",
            "Mexico",
            "India"
          ],
          [
            "🏺 Ancient Greek city known for democracy?",
            "Athens",
            "Tokyo",
            "Lima",
            "Sydney"
          ],
          [
            "🗿 The ancient Maya lived in…",
            "Mesoamerica",
            "Scandinavia",
            "Antarctica",
            "Australia"
          ],
          [
            "👑 Cleopatra ruled ancient…",
            "Egypt",
            "China",
            "France",
            "Japan"
          ],
          [
            "📜 Before paper, Egyptians wrote on…",
            "Papyrus",
            "Plastic",
            "Glass",
            "Steel"
          ]
        ]
      },
      {
        "id": "world",
        "label": "World Events",
        "questions": [
          [
            "🚀 First humans landed on the Moon in…",
            "1969",
            "1492",
            "1914",
            "2001"
          ],
          [
            "🚂 Steam engines helped start the…",
            "Industrial Revolution",
            "Stone Age",
            "Ice Age",
            "Space Age"
          ],
          [
            "📜 The printing press helped spread…",
            "Books and ideas",
            "Rainfall",
            "Electricity",
            "Volcanoes"
          ],
          [
            "🌍 World War II ended in…",
            "1945",
            "1918",
            "1776",
            "2000"
          ],
          [
            "⛵ Christopher Columbus sailed across the…",
            "Atlantic Ocean",
            "Pacific Ocean",
            "Indian Ocean",
            "Arctic Ocean"
          ],
          [
            "⚔️ The First World War began in…",
            "1914",
            "1939",
            "1969",
            "1815"
          ],
          [
            "🏰 Medieval castles were built for…",
            "Defense",
            "Space travel",
            "Submarines",
            "Cars"
          ],
          [
            "🌍 The Silk Road connected trade between…",
            "Asia and Europe",
            "Earth and Moon",
            "Africa and Antarctica",
            "Only islands"
          ]
        ]
      },
      {
        "id": "discoveries",
        "label": "Ideas & Discoveries",
        "questions": [
          [
            "🔬 Who developed the theory of gravity?",
            "Isaac Newton",
            "Albert Einstein",
            "Marie Curie",
            "Ada Lovelace"
          ]
        ]
      }
    ]
  },
  {
    "id": "science",
    "label": "🔬 Science",
    "topics": [
      {
        "id": "life",
        "label": "Living Things & Human Body",
        "questions": [
          [
            "🌱 What do plants need for photosynthesis?",
            "Sunlight",
            "Plastic",
            "Sand only",
            "Moon rocks"
          ],
          [
            "🫀 Which organ pumps blood?",
            "Heart",
            "Lungs",
            "Stomach",
            "Brain"
          ],
          [
            "🌬️ Humans breathe in oxygen using…",
            "Lungs",
            "Kidneys",
            "Ears",
            "Bones"
          ],
          [
            "🦋 A caterpillar changes into a…",
            "Butterfly",
            "Fish",
            "Frog",
            "Bee"
          ],
          [
            "🦴 What protects the brain?",
            "Skull",
            "Ribs",
            "Pelvis",
            "Knee"
          ],
          [
            "🐝 Bees help flowers by…",
            "Pollination",
            "Freezing",
            "Erosion",
            "Reflection"
          ],
          [
            "🍎 Which nutrient helps build muscles?",
            "Protein",
            "Water only",
            "Salt",
            "Air"
          ]
        ]
      },
      {
        "id": "matter",
        "label": "Matter & Energy",
        "questions": [
          [
            "💧 Water freezes at…",
            "0°C",
            "10°C",
            "50°C",
            "100°C"
          ],
          [
            "⚡ Which material is a good conductor?",
            "Copper",
            "Rubber",
            "Wood",
            "Plastic"
          ],
          [
            "🌡️ A thermometer measures…",
            "Temperature",
            "Speed",
            "Weight",
            "Sound"
          ],
          [
            "🧲 A magnet attracts…",
            "Iron",
            "Paper",
            "Wood",
            "Glass"
          ],
          [
            "🌊 Water changing to vapor is…",
            "Evaporation",
            "Freezing",
            "Melting",
            "Condensation"
          ],
          [
            "🔋 Which is a source of electrical energy?",
            "Battery",
            "Stone",
            "Pencil",
            "Leaf"
          ],
          [
            "🧊 Solid ice turning to liquid is…",
            "Melting",
            "Condensation",
            "Freezing",
            "Rusting"
          ],
          [
            "♻️ Which is renewable energy?",
            "Sunlight",
            "Coal",
            "Oil",
            "Natural gas"
          ],
          [
            "🪨 Rocks are broken down by…",
            "Weathering",
            "Photosynthesis",
            "Digestion",
            "Magnetism"
          ]
        ]
      },
      {
        "id": "space",
        "label": "Earth & Space",
        "questions": [
          [
            "🪐 Which planet has famous rings?",
            "Saturn",
            "Mars",
            "Venus",
            "Mercury"
          ],
          [
            "🌙 The Moon orbits…",
            "Earth",
            "Mars",
            "Jupiter",
            "The Sun"
          ],
          [
            "🔆 Earth gets light from the…",
            "Sun",
            "Moon",
            "Mars",
            "Stars only"
          ],
          [
            "🔭 A telescope helps us see…",
            "Distant objects",
            "Bacteria only",
            "Inside rocks",
            "Underground roots"
          ],
          [
            "🌎 Earth turns once about every…",
            "24 hours",
            "1 hour",
            "7 days",
            "365 days"
          ]
        ]
      }
    ]
  },
  {
    "id": "nature",
    "label": "🌿 Nature",
    "topics": [
      {
        "id": "animals",
        "label": "Animals",
        "questions": [
          [
            "🐬 Which animal is a mammal?",
            "Dolphin",
            "Shark",
            "Trout",
            "Goldfish"
          ],
          [
            "🦋 What does a caterpillar become?",
            "Butterfly",
            "Dragonfly",
            "Ant",
            "Bee"
          ],
          [
            "🦒 Which animal has the longest neck?",
            "Giraffe",
            "Horse",
            "Elephant",
            "Zebra"
          ]
        ]
      },
      {
        "id": "planet",
        "label": "Our Planet",
        "questions": [
          [
            "🌋 What comes out of an erupting volcano?",
            "Lava",
            "Snow",
            "Ice",
            "Cotton"
          ],
          [
            "🌧️ What do clouds sometimes produce?",
            "Rain",
            "Sand",
            "Coal",
            "Glass"
          ]
        ]
      }
    ]
  }
];
const bank={};
const topics=[];
for(const subject of subjects){
 if(!subject.id||!subject.label||!Array.isArray(subject.topics))continue;
 topics.push([subject.id,subject.label]);
 bank[subject.id]=subject.topics.flatMap(t=>Array.isArray(t.questions)?t.questions:[]);
}
function questionFor(subjectId,topicId,grade=4){
 const s=subjects.find(x=>x.id===subjectId);if(!s)return null;
 const topic=s.topics.find(x=>x.id===topicId);
 const available=topic?[topic]:s.topics;
 const pools=available.flatMap(t=>(t.questions||[]).map(row=>({row,topic:t})));
 const generated=available.filter(t=>t.generator);
 if(pools.length && (!generated.length || Math.random()<.85)){
   const item=choose(pools),row=item.row;
   return {prompt:String(row[0]),answer:String(row[1]),options:shuffle(row.slice(1,5).map(String)),subtopic:item.topic.label,topicId:item.topic.id,topic:subjectId};
 }
 if(generated.length){const t=choose(generated);return {...mathQuestion(grade,false,t.generator),subtopic:t.label,topicId:t.id,topic:subjectId}}
 return null;
}
function mathQuestion(grade,hard=false,mathTopic='mixed'){const modes={arithmetic:[0,1],times:[2,3],shapes:[4,5],mixed:hard?[0,1,2,3,4,5,6,7,8]:[0,1,2,3,4,5,6]};let mode=choose(modes[mathTopic]||modes.mixed),a,b,right,prompt;let high=grade===5?120:60;
if(mode===0){a=between(8,high);b=between(6,high);right=a+b;prompt=`${a} + ${b} = ?`}
else if(mode===1){a=between(18,high*2);b=between(4,a);right=a-b;prompt=`${a} − ${b} = ?`}
else if(mode===2){a=between(2,12);b=between(2,12);right=a*b;prompt=`${a} × ${b} = ?`}
else if(mode===3){b=between(2,12);right=between(2,12);a=b*right;prompt=`${a} ÷ ${b} = ?`}
else if(mode===4){a=between(1,9);b=between(1,9);right=(a+b)*2;prompt=`▭ ${a} by ${b}: perimeter?`}
else if(mode===5){a=between(2,12);b=between(2,12);right=a*b;prompt=`▭ ${a} × ${b}: area?`}
else if(mode===6){a=between(2,12);b=between(2,9);right=a+b*2;prompt=`${a} + ${b} × 2 = ?`}
else if(mode===7){a=between(2,8);right=a*25;prompt=`${a} × 25 = ?`}
else {a=between(2,9);b=between(2,9);right=a*b*10;prompt=`${a*10} × ${b} = ?`}
let opts=new Set([right]);for(let tries=0;opts.size<4&&tries<100;tries++){let n=right+choose([-20,-10,-8,-5,-4,-3,-2,-1,1,2,3,4,5,8,10,20]);if(n>=0)opts.add(n)}for(let d=1;opts.size<4;d++)opts.add(right+d);return {prompt,answer:String(right),options:shuffle([...opts].map(String))}}


window.ANBLOX_QUESTION_BANK={subjects,bank,topics,questionFor,mathQuestion,version:2};
})();
