// Read the public conference spreadsheet without requiring visitors to sign in.
const conferenceSpreadsheet='18klu0pb7C2n2dF9_NVjX3e7GnrkhomQu';
const syncStatus=document.querySelector('#sync-status');
const cacheKey='conference-participants-v1';
let refreshInProgress=false,requestNumber=0;

function participantRows(response){
  if(response?.status!=='ok'||!Array.isArray(response.table?.rows))throw new Error('Spreadsheet unavailable');
  const rows=[];
  let foundHeader=false;
  for(const source of response.table.rows){
    const row=[0,1,2].map(i=>String(source.c?.[i]?.v??'').trim());
    if(!foundHeader){if(normalize(row[0]).startsWith('фио')&&normalize(row[1]).includes('название доклада'))foundHeader=true;continue;}
    if(/^(адрес:|оргкомитет)/i.test(row[0]))break;
    if(row.some(Boolean))rows.push(row);
  }
  if(!foundHeader)throw new Error('Participant heading missing');
  return rows;
}

function loadSection(sheet,index){
  return new Promise((resolve,reject)=>{
    const callback=`conferenceSheet${index}_${++requestNumber}`;
    const script=document.createElement('script');
    let timer;
    const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
    window[callback]=response=>{try{resolve(participantRows(response));}catch(error){reject(error);}finally{cleanup();}};
    script.onerror=()=>{cleanup();reject(new Error('Spreadsheet connection failed'));};
    const params=new URLSearchParams({sheet,headers:'0',tq:'select A,D,F',tqx:`out:json;responseHandler:${callback}`,_:String(Date.now())});
    script.src=`https://docs.google.com/spreadsheets/d/${conferenceSpreadsheet}/gviz/tq?${params}`;
    script.referrerPolicy='no-referrer';
    timer=setTimeout(()=>{cleanup();reject(new Error('Spreadsheet connection timed out'));},20000);
    document.head.append(script);
  });
}

function useRows(rows){
  if(!Array.isArray(rows)||rows.length!==4||!rows.every(section=>Array.isArray(section)&&section.every(row=>Array.isArray(row)&&row.length===3&&row.every(cell=>typeof cell==='string'))))throw new Error('Invalid participant data');
  rows.forEach((data,index)=>{sections[index].rows=data;});
  render();
}

async function refreshParticipants(){
  if(refreshInProgress||document.hidden)return;
  refreshInProgress=true;
  try{
    const rows=await Promise.all(sections.map((section,index)=>loadSection(section.label,index)));
    useRows(rows);
    const updatedAt=new Date().toISOString();
    try{localStorage.setItem(cacheKey,JSON.stringify({rows,updatedAt}));}catch{}
    syncStatus.className='sr-only';
    syncStatus.textContent=`Данные участников обновлены из Google-таблицы: ${new Date(updatedAt).toLocaleTimeString('ru-RU')}. Выступлений: ${rows.reduce((sum,section)=>sum+section.length,0)}.`;
  }catch{
    syncStatus.className='sync-error';
    syncStatus.textContent='Не удалось обновить список из Google-таблицы. Показана последняя сохранённая версия. Повторим через минуту.';
  }finally{refreshInProgress=false;}
}

try{
  const cached=JSON.parse(localStorage.getItem(cacheKey));
  if(cached?.rows)useRows(cached.rows);
}catch{}
refreshParticipants();
setInterval(refreshParticipants,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshParticipants();});
