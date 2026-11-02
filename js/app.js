import {api,configured,loadPlays,setToken,catalog,loadPlay,coverAddress} from './api.js';
import {askAI} from './ai.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const params=new URLSearchParams(location.search),page=document.body.dataset.page;
const criteria=['Сөздік қор','Байланыстырып сөйлеу','Диалог жүргізу','Кейіпкер әрекетін дәлелдеу','Сенімді сөйлеу'];
const stateKey='erketai-v1';let state={};
try{state=JSON.parse(localStorage.getItem(stateKey)||'{}')||{};}catch{}
if(typeof state!=='object'||Array.isArray(state))state={};
function save(){try{localStorage.setItem(stateKey,JSON.stringify(state));return true;}catch{alert('Браузер сақтау мүмкіндігін шектеді. Өзгеріс сақталмады.');return false;}}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function status(selector,text,error=false){const node=$(selector);if(node){node.textContent=text;node.classList.toggle('error-text',error);}}
function button(text,fn,cls='light'){const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;}
function link(text,url,cls='textlink'){const a=el('a',text,cls);a.href=url;return a;}
function coverUrl(p){if(p.has_cover)return coverAddress(p);return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(p.cover||'')?p.cover:'assets/erketai-theatre.png';}
function image(p){const n=el('img');n.alt=p.title+' — қойылым мұқабасы';n.src=coverUrl(p);n.className='play-cover';n.loading='lazy';return n;}
function videoId(value){try{const u=new URL(value);if(u.protocol!=='https:')return null;let id;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})\/?$/)?.[1];return /^[\w-]{11}$/.test(id||'')?id:null;}catch{return null;}}
function scriptDetails(p){const d=el('details'),pre=el('pre',p.script||'Сценарий жүктелуде…','script-text');d.append(el('summary','Толық оқу сценарийі'),pre);d.addEventListener('toggle',async()=>{if(!d.open||p.script)return;try{pre.textContent=(await loadPlay(p.id)).script;}catch(e){pre.textContent=e.message;}});return d;}
let plays=[],replicaIndex=0;
function currentPlay(){return plays.find(p=>p.id===$('#play')?.value);}
function selected(){return {play_id:$('#play')?.value,character:$('#character')?.value,difficulty:$('#difficulty')?.value,level:$('#level')?.value};}
function remember(){state.context=selected();save();}
function updateCharacter(preferred){const p=currentPlay();$('#character').replaceChildren(...(p?.characters||[]).map(x=>new Option(x,x)));if(p?.characters.includes(preferred))$('#character').value=preferred;}
const fallbackTasks={
 'Сөздік қор':['Кейіпкерді сипаттайтын 4 сөз таңда.','Сол сөздермен екі сөйлем айт.','Екі кейіпкерді салыстыр.'],
 'Сөйлем құрау':['«Менің кейіпкерім…» сөйлемін аяқта.','«Ол… себебі…» үлгісімен сөйлем құра.','Оқиғаны үш байланысқан сөйлеммен айт.'],
 'Диалог жүргізу':['Кейіпкерге бір сұрақ қой.','Жауапқа нақтылау сұрағын қос.','Төрт репликадан тұратын диалог құра.'],
 'Пікірді дәлелдеу':['«Менің ойымша…» деп баста.','«Себебі…» деп дәлелде.','Екі шешімді салыстырып, бірін дәлелде.'],
 'Сенімді сөйлеу':['Бір сөйлемді баяу айт.','Жұбыңа екі сөйлемді анық айт.','30 секунд ішінде ойыңды түсіндір.']
};
function renderExercise(){const p=currentPlay();if($('#exercise')){const level=Number($('#level').value[0])-1;$('#exercise').textContent=p?'Қойылым тапсырмасы: '+p.tasks[level]+'\n\nҚолдау: '+fallbackTasks[$('#difficulty').value][level]+'\n\nТірек сөздер: '+p.keywords.join(', '):'Қойылымды таңдаңыз.';$('#exercise').style.whiteSpace='pre-wrap';$('#student-script').textContent=p?.script||'Сценарий жүктелуде…';if(p&&!p.script)loadPlay(p.id).then(full=>{if(currentPlay()?.id===p.id)$('#student-script').textContent=full.script;}).catch(e=>{if(currentPlay()?.id===p.id)$('#student-script').textContent=e.message;});replicaIndex=0;renderReplica();}}
function renderReplica(){if($('#replica')){const p=currentPlay();$('#replica').textContent=p?.replicas?.[replicaIndex%(p.replicas.length||1)]||'Алдымен қойылым таңдаңыз.';}}
function initSelectors(){
 const saved=state.context||{};
 $('#play').replaceChildren(...plays.map(p=>new Option(p.title,p.id)));
 const desired=params.get('play')||saved.play_id;
 if(plays.some(p=>p.id===desired))$('#play').value=desired;
 updateCharacter(saved.character);
 for(const id of ['difficulty','level']){const choice=params.get(id)||saved[id];if([...$('#'+id).options].some(o=>o.value===choice))$('#'+id).value=choice;}
 $('#play').onchange=()=>{updateCharacter();remember();renderExercise();if($('#draft'))$('#draft').value=state.drafts?.[$('#play').value]||'';document.dispatchEvent(new Event('chat-context-change'));};
 for(const id of ['character','difficulty','level'])$('#'+id).onchange=()=>{remember();renderExercise();document.dispatchEvent(new Event('chat-context-change'));};
 renderExercise();
 if(!plays.length){for(const id of ['play','character'])$('#'+id).disabled=true;status('#content-status','Жарияланған қойылым әзірге жоқ.');}
}
let libraryOffset=0,libraryRequest=0;
async function renderLibrary(){
 const request=++libraryRequest;$('#prev-page').disabled=true;$('#next-page').disabled=true;status('#content-status','Жүктелуде…');
 try{const result=await catalog({q:$('#search').value.trim(),category:$('#category-filter').value,offset:libraryOffset,limit:8});if(request!==libraryRequest)return;
 const list=result.plays;$('#play-list').replaceChildren();
 for(const p of list){const card=el('article',undefined,'card play-card');card.append(image(p));const tags=el('div',undefined,'tags');tags.append(el('span',p.category||'Ертегі'),el('span',p.minutes+' минут'));card.append(tags,el('h2',p.title),el('p',p.summary));const tasks=el('ol');p.tasks.forEach(t=>tasks.append(el('li',t)));card.append(tasks,scriptDetails(p),link('Қойылыммен жұмыс →','student.html?play='+encodeURIComponent(p.id),'button'));$('#play-list').append(card);}
 $('#play-count').textContent=result.total+' қойылым';$('#no-results').hidden=list.length>0;$('#page-info').textContent=result.total?(Math.floor(libraryOffset/8)+1)+' / '+Math.ceil(result.total/8)+' бет':'0 нәтиже';$('#prev-page').disabled=libraryOffset===0;$('#next-page').disabled=libraryOffset+8>=result.total;status('#content-status','');
 }catch(e){if(request===libraryRequest){$('#play-list').replaceChildren();$('#play-count').textContent='';$('#page-info').textContent='';$('#no-results').hidden=true;status('#content-status',e.message,true);$('#prev-page').disabled=libraryOffset===0;}}
}
async function initPublic(){
 try{if(page==='plays'){let timer;$('#search').oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{libraryOffset=0;renderLibrary();},250);};$('#category-filter').onchange=()=>{libraryOffset=0;renderLibrary();};$('#prev-page').onclick=()=>{libraryOffset=Math.max(0,libraryOffset-8);renderLibrary();};$('#next-page').onclick=()=>{libraryOffset+=8;renderLibrary();};await renderLibrary();return;}plays=await loadPlays();if(!Array.isArray(plays))throw new Error('Қойылымдар тізімі дұрыс емес.');
  if($('#play'))initSelectors();
  if(page==='media'){
   const grid=$('#media-grid');grid.replaceChildren();for(const p of plays){const card=el('article',undefined,'card');card.append(image(p),el('h2',p.title));const id=videoId(p.video);if(id){const details=el('details');details.append(el('summary','Бейнежазбаны көру'));details.addEventListener('toggle',()=>{if(details.open&&!details.querySelector('iframe')){const frame=el('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+id;frame.title=p.title+' — бейнежазба';frame.className='video-embed';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');details.append(frame);}});card.append(details);}else card.append(el('p','Бұл қойылымның бейнежазбасы әзірге қосылмаған.'));card.append(link('Қойылымға өту →','student.html?play='+encodeURIComponent(p.id)));grid.append(card);}
   if(configured){try{const s=await api('/api/settings');if(s.channel){const u=new URL(s.channel);if(u.protocol==='https:'&&['www.youtube.com','youtube.com','m.youtube.com'].includes(u.hostname)){$('#channel-link').href=u.href;$('#channel-link').hidden=false;}}}catch{status('#content-status','Арна сілтемесі жүктелмеді. Қойылымдар төменде қолжетімді.');}}
  }
 }catch(e){status('#content-status',e.message,true);if($('#send'))$('#send').disabled=true;}
}
if(['student','ai','plays','media'].includes(page))await initPublic();
if($('#draft')){
 if(!state.drafts||typeof state.drafts!=='object'||Array.isArray(state.drafts))state.drafts={};if(!state.drafts[$('#play').value]&&state.context?.play_id===$('#play').value&&state.draft)state.drafts[$('#play').value]=state.draft;$('#draft').value=state.drafts[$('#play').value]||'';$('#reflection').value=state.reflection||'';
 $('#save-draft').onclick=()=>{state.draft=$('#draft').value;state.drafts[$('#play').value]=state.draft;state.context=selected();if(save())status('#save-status','Жауабың осы браузерде сақталды.');};
 $('#help-ai').onclick=()=>{if(!currentPlay()){status('#save-status','Алдымен жарияланған қойылым таңдаңыз.',true);return;}state.draft=$('#draft').value;state.drafts[$('#play').value]=state.draft;state.context=selected();if(save())location.href='ai.html?mode=feedback&play='+encodeURIComponent($('#play').value);};
 $('#next-replica').onclick=()=>{replicaIndex++;renderReplica();};
 $$('[data-mood]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.mood===state.mood));b.onclick=()=>{state.mood=b.dataset.mood;if(save()){$$('[data-mood]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));status('#mood-status','Сезімің сақталды. Өз қарқыныңмен жүр.');}};});
 $('#save-reflection').onclick=()=>{state.reflection=$('#reflection').value;if(save())status('#mood-status','Рефлексия сақталды.');};
}
if($('#chat-form')){
 const history=[];let busy=false;
 if([...$('#mode').options].some(o=>o.value===params.get('mode')))$('#mode').value=params.get('mode');
 if(params.get('mode')==='feedback')$('#prompt').value=state.draft||'';
 function clear(){if(busy)return;history.length=0;$('#messages').replaceChildren();status('#ai-status','');}
 document.addEventListener('chat-context-change',()=>{history.length=0;$('#messages').replaceChildren(el('div','Тапсырма өзгерді. Жаңа диалогті бастайық.','message assistant'));});
 $('#mode').onchange=()=>document.dispatchEvent(new Event('chat-context-change'));
 function bubble(text,role){const n=el('div',text,'message '+role);$('#messages').append(n);n.scrollIntoView({block:'nearest'});}
 $('#clear-chat').onclick=clear;
 $('#chat-form').onsubmit=async e=>{e.preventDefault();if(busy)return;const message=$('#prompt').value.trim();if(!message)return;if(!currentPlay()){status('#ai-status','Алдымен қойылым таңдаңыз.',true);return;}
 if(/(?:https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s()-]*){10,})/i.test(message)){status('#ai-status','Телефон, сілтеме немесе жеке деректі алып тастаңыз.',true);return;}
 busy=true;$('#send').disabled=true;$('#clear-chat').disabled=true;for(const n of $$('.fields select, #mode'))n.disabled=true;status('#ai-status','Жаңа жауап құрастырылуда…');bubble(message,'user');
 try{const answer=await askAI({message,...selected(),mode:$('#mode').value,history:history.slice(-6)});bubble(answer,'assistant');history.push({role:'user',content:message},{role:'assistant',content:answer.slice(0,3500)});$('#prompt').value='';status('#ai-status','Жауап дайын.');}catch(err){bubble(err.message,'error');status('#ai-status','Жауап алынбады. Сұрағыңызды қайталап жіберуге болады.',true);}finally{busy=false;$('#send').disabled=false;$('#clear-chat').disabled=false;for(const n of $$('.fields select, #mode'))n.disabled=false;}
 };
}
$$('[data-home]').forEach(x=>{x.checked=!!state.home?.[x.dataset.home];x.onchange=()=>{state.home={...state.home,[x.dataset.home]:x.checked};save();};});
if($('#print'))$('#print').onclick=()=>window.print();
// Authenticated teacher sections. No hardcoded credentials in the browser.
async function protectedInit(){if(page==='admin')await initAdmin();if(page==='teacher')await initTeacher();if(page==='results')await initResults();}
function showGate(){if(!$('#auth-gate'))return;$('#auth-gate').hidden=false;$('#protected-content').hidden=true;$('#auth-controls').hidden=true;}
async function showProtected(){await api('/api/me',{auth:true});$('#auth-gate').hidden=true;$('#protected-content').hidden=false;$('#auth-controls').hidden=false;await protectedInit();}
if($('#auth-gate')){
 document.addEventListener('auth-expired',showGate);
 $('#login-form').onsubmit=async e=>{e.preventDefault();$('#login-submit').disabled=true;status('#login-status','Тексерілуде…');
 try{const d=await api('/api/login',{method:'POST',body:{user:$('#login-user').value.trim(),password:$('#login-password').value}});setToken(d.token);$('#login-password').value='';await showProtected();status('#login-status','');}catch(e){status('#login-status',e.message,true);}finally{$('#login-submit').disabled=false;}};
 $('#logout').onclick=async()=>{try{await api('/api/logout',{method:'POST',auth:true});setToken('');showGate();}catch(e){status('#login-status',e.message,true);alert('Шығу серверде расталмады. Желі қосылғанда қайта басыңыз.');}};
 try{await showProtected();}catch(e){showGate();if(e.status!==401)status('#login-status',e.message,true);}
}
async function initTeacher(){
 $('#assessment').onsubmit=async e=>{e.preventDefault();const submit=$('#assessment button');submit.disabled=true;status('#assessment-status','Сақталуда…');
 try{const record={code:$('#student-code').value.trim(),phase:$('#phase').value,scores:$$('.score').map(x=>Number(x.value))};await api('/api/admin/assessments',{method:'POST',auth:true,body:record});status('#assessment-status','Ортақ базаға сақталды: '+record.scores.reduce((a,b)=>a+b,0)+' / 15 балл.');}catch(e){status('#assessment-status',e.message,true);}finally{submit.disabled=false;}};
 try{
  const available=await loadPlays();$('#plan-play').replaceChildren(...available.map(p=>new Option(p.title,p.id)));let plans=(await api('/api/admin/plans',{auth:true})).plans;
  function planUrl(){const u=new URL('student.html',location.href);u.search=new URLSearchParams({play:$('#plan-play').value,difficulty:$('#plan-difficulty').value,level:$('#plan-level').value});return u.href;}
  function exposeLink(){$('#plan-links').hidden=false;$('#open-plan').href=planUrl();}
  function renderPlans(){const node=$('#plan-list');node.replaceChildren();for(const p of plans){const b=button(p.code+' · '+p.difficulty+' · '+p.level,()=>{$('#plan-code').value=p.code;$('#plan-play').value=p.play_id;$('#plan-difficulty').value=p.difficulty;$('#plan-level').value=p.level;$('#plan-note').value=p.note;exposeLink();},'plan-item');node.append(b);}if(!plans.length)node.append(el('p','Әзірге жеке жоспар жоқ.'));}
  renderPlans();
  $('#plan-form').oninput=()=>{$('#plan-links').hidden=true;};
  $('#plan-form').onsubmit=async e=>{e.preventDefault();$('#save-plan').disabled=true;status('#plan-status','Сақталуда…');try{const plan={code:$('#plan-code').value.trim(),play_id:$('#plan-play').value,difficulty:$('#plan-difficulty').value,level:$('#plan-level').value,note:$('#plan-note').value.trim()};await api('/api/admin/plans',{method:'PUT',auth:true,body:plan});plans=(await api('/api/admin/plans',{auth:true})).plans;renderPlans();exposeLink();status('#plan-status','Жоспар ортақ базаға сақталды. Сілтемені оқушыға бере аласыз.');}catch(e){status('#plan-status',e.message,true);}finally{$('#save-plan').disabled=false;}};
  $('#copy-plan').onclick=async()=>{try{await navigator.clipboard.writeText(planUrl());status('#plan-status','Сілтеме көшірілді.');}catch{status('#plan-status','Көшіру қолжетімсіз. «Тапсырманы ашу» сілтемесін қолмен көшіріңіз.',true);}};
 }catch(e){status('#plan-status',e.message,true);}

}
async function initResults(){
 let records=[];try{records=(await api('/api/admin/assessments',{auth:true})).assessments;}catch(e){$('#result-panel').replaceChildren(el('p',e.message,'error-text'));return;}
 const total=r=>r.scores.reduce((a,b)=>a+b,0);
 const codes=[...new Set(records.map(r=>r.code))];$('#result-code').replaceChildren(...codes.map(c=>new Option(c,c)));
 function render(){const rs=records.filter(r=>r.code===$('#result-code').value),before=rs.filter(r=>r.phase==='before').at(-1),after=rs.filter(r=>r.phase==='after').at(-1);$('#export').disabled=!rs.length;const panel=$('#result-panel');panel.replaceChildren();if(!rs.length){const card=el('section',undefined,'card');card.append(el('h2','Алғашқы қадамды тіркейік'),el('p','Әзірге бағалау жоқ. Мұғалім кабинетінде бастапқы көрсеткіштерді енгізіңіз.'));panel.append(card);return;}
 const stats=el('div',undefined,'grid three');const gain=before&&after?total(after)-total(before):null;for(const [title,value]of [['Бастапқы',before?total(before)+' / 15':'Әлі жоқ'],['Қорытынды',after?total(after)+' / 15':'Әлі жоқ'],['Өзгеріс',gain===null?'Бағалау күтілуде':(gain>0?'+':'')+gain+' балл']]){const card=el('section',undefined,'card');card.append(el('span',title,'eyebrow'),el('div',value,'stat'));stats.append(card);}
 const card=el('section',undefined,'card');card.append(el('h2','Сөйлеу көрсеткіштері'),el('p','Сол жақ — бастапқы, оң жақ — қорытынды. Әр өлшем 0–3 балл.'));criteria.forEach((title,i)=>{const row=el('div',undefined,'score-row');row.append(el('strong',title));const bars=el('div',undefined,'scorebar');[before,after].forEach((r,j)=>{const col=el('div');col.append(el('small',r?r.scores[i]+' / 3':'Өлшенбеген'));const bar=el('div',undefined,'bar'+(j?' after':'')),fill=el('span');fill.style.width=(r?r.scores[i]/3*100:0)+'%';bar.append(fill);col.append(bar);bars.append(col);});row.append(bars);card.append(row);});panel.append(stats,card);
 }
 $('#result-code').onchange=render;render();
 $('#export').onclick=()=>{const data=[['code','phase',...criteria,'date'],...records.filter(r=>r.code===$('#result-code').value).map(r=>[r.code,r.phase,...r.scores,r.at])];const csv='\uFEFF'+data.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=link('','');a.href=url;a.download='erketai-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
async function resizedCover(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw new Error('JPG, PNG немесе WebP таңдаңыз, көлемі 12 МБ-тан аспасын.');
 const bitmap=await createImageBitmap(file);try{const ratio=Math.min(1,1000/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f5ef';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);for(const q of [.82,.65,.45]){const data=canvas.toDataURL('image/jpeg',q);if(data.length<=500000)return data;}throw new Error('Сурет тым үлкен. Кішірек суретті таңдаңыз.');}finally{bitmap.close();}
}
async function initAdmin(){
 let list=(await api('/api/admin/plays',{auth:true})).plays;let editing=null,cover='assets/erketai-theatre.png',coverBusy=false;
 const names={draft:'Жоба',published:'Жарияланған',archived:'Мұрағат'};
 const fields=['title','category','summary','characters','keywords','replicas','script','video','minutes','status'];
 function render(){const box=$('#admin-list');box.replaceChildren();const filter=$('#admin-filter').value;for(const p of list.filter(p=>filter==='all'||p.status===filter)){const b=button(p.title,()=>edit(p),'admin-item');b.append(el('small',names[p.status]+' · v'+p.version));box.append(b);}if(!box.children.length)box.append(el('p','Бұл күйде қойылым жоқ.'));}
 function edit(p){editing=p||null;$('#play-editor').reset();cover=p?.cover||'assets/erketai-theatre.png';$('#cover-preview').src=cover;$('#editor-title').textContent=p?'Қойылымды өңдеу':'Жаңа қойылым';for(const id of fields){let v=p?.[id];if(Array.isArray(v))v=v.join('\n');$('#edit-'+id).value=v??(id==='minutes'?12:id==='status'?'draft':id==='category'?'Ертегі':'');}for(let i=0;i<3;i++)$('#edit-task-'+(i+1)).value=p?.tasks[i]||'';$('#publish-consent').checked=false;status('#editor-status','');}
 $('#refresh-plays').onclick=async()=>{$('#refresh-plays').disabled=true;try{list=(await api('/api/admin/plays',{auth:true})).plays;render();status('#editor-status','Тізім жаңартылды. Соңғы нұсқаны ашу үшін қойылымды қайта таңдаңыз.');}catch(e){status('#editor-status',e.message,true);}finally{$('#refresh-plays').disabled=false;}};$('#admin-filter').onchange=render;$('#new-play').onclick=()=>edit(null);render();edit(null);
 $('#edit-cover').onchange=async()=>{const file=$('#edit-cover').files[0];if(!file)return;coverBusy=true;$('#save-play').disabled=true;status('#editor-status','Мұқаба дайындалуда…');try{cover=await resizedCover(file);$('#cover-preview').src=cover;status('#editor-status','Мұқаба дайын. Қойылымды сақтаңыз.');}catch(e){status('#editor-status',e.message,true);}finally{coverBusy=false;$('#save-play').disabled=false;}};
 $('#play-editor').onsubmit=async e=>{e.preventDefault();if(coverBusy)return;$('#save-play').disabled=true;status('#editor-status','Ортақ базаға сақталуда…');
 try{const d={};for(const id of fields)d[id]=$('#edit-'+id).value.trim();for(const id of ['characters','keywords','replicas'])d[id]=d[id].split('\n').map(x=>x.trim()).filter(Boolean);d.tasks=[1,2,3].map(i=>$('#edit-task-'+i).value.trim());d.minutes=Number(d.minutes);d.cover=cover;d.consent=$('#publish-consent').checked;if(editing)d.version=editing.version;
 const response=await api('/api/admin/plays'+(editing?'/'+encodeURIComponent(editing.id):''),{method:editing?'PUT':'POST',auth:true,body:d});const p=response.play;list=list.filter(x=>x.id!==p.id);list.unshift(p);render();edit(p);status('#editor-status',p.status==='published'?'Жарияланды. Кітапхана, оқушы және ЖИ бөлімдерінде қолжетімді.':'Сақталды: '+names[p.status]+'.');}catch(e){status('#editor-status',e.message,true);}finally{$('#save-play').disabled=false;}};
 try{const s=await api('/api/settings');$('#channel-url').value=s.channel||'';}catch{}
 $('#save-channel').onclick=async()=>{$('#save-channel').disabled=true;try{await api('/api/admin/settings',{method:'PUT',auth:true,body:{channel:$('#channel-url').value.trim()}});status('#channel-status','Арна сілтемесі сақталды.');}catch(e){status('#channel-status',e.message,true);}finally{$('#save-channel').disabled=false;}};
}
