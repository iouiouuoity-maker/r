// Тек сайт иесі өзгертеді: осы жобаға арналған ЖАҢА Worker-дің нақты HTTPS URL-і.
// /api/chat немесе репозиторий жолын қоспаңыз.
export const AI_API_URL = 'https://erketai-speaking-ai.ccocokokococo.workers.dev';
export const configured = AI_API_URL.startsWith('https://');
const SESSION_KEY='erketai-teacher-session-v2';
let token='';try{token=sessionStorage.getItem(SESSION_KEY)||'';}catch{}
export function setToken(value){token=value;try{value?sessionStorage.setItem(SESSION_KEY,value):sessionStorage.removeItem(SESSION_KEY);}catch{}}
export async function api(path,{method='GET',body,auth=false}={}){
 if(!configured)throw new Error('Ортақ қызмет әзірге іске қосылмаған. Кейінірек қайталаңыз.');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
 try{
  const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(auth&&token)headers.Authorization='Bearer '+token;
  const response=await fetch(AI_API_URL.replace(/\/$/,'')+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,credentials:'omit'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||'Қызмет уақытша қолжетімсіз.');error.status=response.status;if(auth&&response.status===401){setToken('');document.dispatchEvent(new Event('auth-expired'));}throw error;}
  return data;
 }catch(e){if(e.name==='AbortError')throw new Error('Күту уақыты аяқталды. Қайталап көріңіз.');if(e instanceof TypeError)throw new Error('Желімен байланыс орнамады. Кейінірек қайталаңыз.');throw e;}finally{clearTimeout(timer);}
}
export async function loadPlays(){
 if(!configured)return localDefaults();
 const all=[];let offset=0;while(true){const data=await catalog({limit:100,offset});all.push(...data.plays);offset+=data.plays.length;if(offset>=data.total||!data.plays.length)break;}return all;
}
let defaults;
async function localDefaults(){if(!defaults){const r=await fetch(new URL('../data/plays.json',import.meta.url));if(!r.ok)throw new Error('Оқу материалдары жүктелмеді.');defaults=await r.json();}return defaults;}
export async function catalog({q='',category='',offset=0,limit=8}={}){
 if(configured){const query=new URLSearchParams({q,category,offset,limit});return api('/api/catalog?'+query);}
 const rows=(await localDefaults()).filter(p=>(!category||p.category===category)&&(p.title+' '+p.summary).toLocaleLowerCase().includes(q.toLocaleLowerCase()));return {plays:rows.slice(offset,offset+limit),total:rows.length,offset,limit};
}
const details=new Map();
export async function loadPlay(id){
 if(!details.has(id)){const p=configured?(await api('/api/plays/'+encodeURIComponent(id))).play:(await localDefaults()).find(p=>p.id===id);if(!p)throw new Error('Қойылым табылмады.');details.set(id,p);}return details.get(id);
}
export function coverAddress(p){return configured&&p.has_cover?AI_API_URL.replace(/\/$/,'')+'/api/covers/'+encodeURIComponent(p.id)+'?v='+p.version:'assets/erketai-theatre.png';}
