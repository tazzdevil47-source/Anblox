/* ANBLOX content pack — easy to expand without touching the game engine.
   Each subject has an id, label and topics. Each question: [question, correct, wrong1, wrong2, wrong3].
   You can also use the in-game PARENT EDITOR to create subjects, topics and questions.
   To ship your additions to other devices, export and import your content pack. */
window.ANBLOX_CONTENT = {
  subjects: [
    {id:'nature',label:'🌿 Nature',topics:[
      {id:'animals',label:'🐾 Animals',questions:[
        ['🐬 Which animal is a mammal?','Dolphin','Shark','Trout','Goldfish'],
        ['🦋 What does a caterpillar become?','Butterfly','Dragonfly','Ant','Bee'],
        ['🦒 Which animal has the longest neck?','Giraffe','Horse','Elephant','Zebra']
      ]},
      {id:'earth',label:'🌎 Earth',questions:[
        ['🌋 What comes out of an erupting volcano?','Lava','Snow','Ice','Cotton'],
        ['🌧️ What do clouds sometimes produce?','Rain','Sand','Coal','Glass']
      ]}
    ]}
  ]
};
