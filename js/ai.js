import {api} from './api.js';
export async function askAI(payload){const data=await api('/api/chat',{method:'POST',body:payload});if(typeof data.answer!=='string'||!data.answer.trim())throw new Error('Жауап алынбады. Қайталап көріңіз.');return data.answer;}
