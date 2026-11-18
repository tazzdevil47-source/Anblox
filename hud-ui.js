/* Optional compact iPhone HUD; all original gameplay button IDs remain unchanged. */
(()=>{'use strict';const more=document.getElementById('hud-more'),tools=document.getElementById('hud-tools');if(!more||!tools)return;
function set(open){tools.classList.toggle('open',!!open);more.setAttribute('aria-expanded',String(!!open))}
more.addEventListener('click',e=>{e.stopPropagation();set(!tools.classList.contains('open'))});
tools.addEventListener('click',e=>{if(e.target.closest('button'))set(false)});
document.addEventListener('pointerdown',e=>{if(!tools.contains(e.target)&&e.target!==more)set(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')set(false)});
})();
