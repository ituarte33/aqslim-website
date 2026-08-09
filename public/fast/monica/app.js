const DEFAULT_START = new Date('2026-08-09T22:00:00-07:00');
const DURATION = 36*60*60*1000;
const profiles=['Mónica Santander'];
let current='Mónica Santander';
let deferredPrompt=null;
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function key(){return `fast001:${current}`}
function load(){return JSON.parse(localStorage.getItem(key())||'{}')}
function save(data){localStorage.setItem(key(),JSON.stringify({...load(),...data}))}
function getStart(){const d=load(); return d.startISO?new Date(d.startISO):DEFAULT_START}
function getEnd(){return new Date(getStart().getTime()+DURATION)}
function fmt(d){return new Intl.DateTimeFormat('es-MX',{weekday:'long',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d)}
function localInputValue(d){const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`}
function renderStatic(){ const START=getStart(), END=getEnd(); $('#startText').textContent=fmt(START); $('#endText').textContent=fmt(END); $('#profile').value=current; $('#startDateTime').value=localInputValue(START); const d=load();
  $$('#moodGrid button').forEach(b=>b.classList.toggle('active',b.dataset.mood===d.mood));
  $$('[data-check]').forEach(c=>c.checked=!!(d.checks||{})[c.dataset.check]);
  ['startWeight','currentWeight','startWaist','currentWaist','notes'].forEach(id=>$('#'+id).value=d[id]??'');
  renderWeeks(d);
}
function renderWeeks(d){const wrap=$('#weeks');wrap.innerHTML=''; const completed=d.completedWeeks||[]; const base=getStart(); for(let i=1;i<=6;i++){const weekStart=new Date(base.getTime()+(i-1)*7*24*60*60*1000);const weekEnd=new Date(weekStart.getTime()+DURATION);const row=document.createElement('div');row.className='week-row '+(completed.includes(i)?'completed':'');row.innerHTML=`<div class="week-num">${completed.includes(i)?'✓':i}</div><div><strong>Semana ${i}</strong><div class="muted">${fmt(weekStart)} → ${fmt(weekEnd)}</div></div><button data-week="${i}">${completed.includes(i)?'Reabrir':'Completar'}</button>`;wrap.appendChild(row)}
  wrap.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{let arr=[...(load().completedWeeks||[])];const n=+btn.dataset.week;arr=arr.includes(n)?arr.filter(x=>x!==n):[...arr,n];save({completedWeeks:arr});renderWeeks(load())})
}
function tick(){const START=getStart(), END=getEnd(), now=new Date();let remaining=END-now;const elapsed=Math.max(0,Math.min(DURATION,now-START));const pct=Math.max(0,Math.min(100,elapsed/DURATION*100));$('#progressBar').style.width=pct+'%';
 if(now<START){$('#statusText').textContent='Programado';remaining=DURATION;}
 else if(now>=END){$('#statusText').textContent='Completado';remaining=0;}
 else $('#statusText').textContent='En progreso';
 const h=Math.floor(remaining/3600000),m=Math.floor((remaining%3600000)/60000),s=Math.floor((remaining%60000)/1000);$('#countdown').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('#elapsedText').textContent=`${(elapsed/3600000).toFixed(1)} de 36 horas completadas`;
}
$('#profile').onchange=e=>{current=e.target.value;renderStatic()};
$('#scheduleBtn').onclick=()=>{const raw=$('#startDateTime').value;if(!raw)return;const d=new Date(raw);save({startISO:d.toISOString()});renderStatic();tick();$('#scheduleSaved').classList.remove('hidden');setTimeout(()=>$('#scheduleSaved').classList.add('hidden'),1800)};
$$('#moodGrid button').forEach(b=>b.onclick=()=>{save({mood:b.dataset.mood,moodAt:new Date().toISOString()});renderStatic()});
$$('[data-check]').forEach(c=>c.onchange=()=>{const d=load(),checks=d.checks||{};checks[c.dataset.check]=c.checked;save({checks})});
$('#saveBtn').onclick=()=>{const data={};['startWeight','currentWeight','startWaist','currentWaist','notes'].forEach(id=>data[id]=$('#'+id).value);data.updatedAt=new Date().toISOString();save(data);$('#savedMsg').classList.remove('hidden');setTimeout(()=>$('#savedMsg').classList.add('hidden'),1800)};
$('#exportBtn').onclick=()=>{const START=getStart(),END=getEnd();const payload={exportedAt:new Date().toISOString(),start:START.toISOString(),end:END.toISOString(),profile:current,data:load()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='AQSLIM_FAST-001_Monica_datos.json';a.click();URL.revokeObjectURL(a.href)};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden')};
if('serviceWorker' in navigator)navigator.serviceWorker.register('/fast/monica/sw.js',{scope:'/fast/monica/'});renderStatic();tick();setInterval(tick,1000);
