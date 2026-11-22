/* Adventure map registry: add/remove map entries without touching the shared game engine.
   Each map may set ground, treeColor, skyCourse (false or {steps,startX,startZ,stepX,rise}) and decorations:[{x,z,kind:"tree"|"flower"|"tower",color}].
   The shared roads, rooms, activities, enemies and physics are intentionally reused across maps.
   By default, each world has a 16-step, physical sky-climbing course.
   Keep IDs stable to preserve existing local progress. */
window.AnbloxWorldCatalog={maps:[
{id:'themepark',emoji:'🎡',name:'Theme Park',description:'Rides · candy colors · cheerful platforms',skyTop:'#55b8ff',skyMid:'#b8efff',skyBottom:'#ffe9fa',platform:'#ffc1de',ground:'#a8e9c7',decorations:[{x:-32,z:12,kind:'tower',color:'#f4a3d6'}]},
{id:'lava',emoji:'🌋',name:'Lava Island',description:'Dark volcano · glowing lava · first aid',skyTop:'#241b38',skyMid:'#593348',skyBottom:'#fd7441',platform:'#655b75',dark:true,hazard:'lava',ground:'#65526a',treeColor:'#bf6057',decorations:[{x:30,z:52,kind:'tower',color:'#a24e51'}]},
{id:'angel',emoji:'👼',name:'Angel Island',description:'Above the stars · glowing skyways',skyTop:'#131747',skyMid:'#4b4b9c',skyBottom:'#c5b1f9',platform:'#e6dcff',dark:true,ground:'#d2c5fa',decorations:[{x:-32,z:48,kind:'tower',color:'#eee4ff'}]},
{id:'maldives',emoji:'🏝️',name:'Maldives',description:'Jump between boats · island hopping · swim',skyTop:'#53c7ff',skyMid:'#c3efff',skyBottom:'#2bd6d1',platform:'#e8c99c',hazard:'water',ground:'#70dfc8',decorations:[{x:-33,z:50,kind:'flower',color:'#ffef9a'}]},
{id:'tiny',emoji:'🏠',name:'Tiny House',description:'Giant bed · giant cups · tiny runner',skyTop:'#cba5ef',skyMid:'#fce7d7',skyBottom:'#f9d7ec',platform:'#e8b9a6',ground:'#f9c5d9',decorations:[{x:29,z:-15,kind:'tower',color:'#f8cdaa'}]},
{id:'halloween',emoji:'🎃',name:'Halloween',description:'Haunted towers · spooky but friendly',skyTop:'#171335',skyMid:'#443061',skyBottom:'#d57a4f',platform:'#a487c4',dark:true,ground:'#786592',treeColor:'#654980',decorations:[{x:31,z:61,kind:'tower',color:'#493364'}]}
]};
