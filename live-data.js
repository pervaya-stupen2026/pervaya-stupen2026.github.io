// Read the public conference spreadsheet without requiring visitors to sign in.
const conferenceSpreadsheet='18klu0pb7C2n2dF9_NVjX3e7GnrkhomQu';
const syncStatus=document.querySelector('#sync-status');
const cacheKey='conference-program-v2';
let refreshInProgress=false,requestNumber=0;

function sectionData(response){
  if(response?.status!=='ok'||!Array.isArray(response.table?.rows))throw new Error('Spreadsheet unavailable');
  const rows=[];
  const team={moderators:[],experts:[]};
  let group=null,moderatorHeading=false,expertHeading=false;
  let foundHeader=false;
  for(const source of response.table.rows){
    const row=[0,1,2].map(i=>String(source.c?.[i]?.v??'').trim());
    if(!foundHeader){
      const first=normalize(row[0]);
      if(first.startsWith('научные руководители')||first.startsWith('модераторы')){moderatorHeading=true;group='moderators';continue;}
      if(first.startsWith('эксперты')){expertHeading=true;group='experts';continue;}
      if(first.startsWith('участники дискуссии')){group=null;continue;}
      if(first.startsWith('фио')&&normalize(row[1]).includes('название доклада')){foundHeader=true;group=null;continue;}
      if(group&&row[0])team[group].push(row[0]);
      continue;
    }
    if(/^(адрес:|оргкомитет)/i.test(row[0]))break;
    if(row.some(Boolean))rows.push(row);
  }
  if(!foundHeader||!moderatorHeading||!expertHeading)throw new Error('Conference headings missing');
  return {rows,team};
}

function loadSection(sheet,index){
  return new Promise((resolve,reject)=>{
    const callback=`conferenceSheet${index}_${++requestNumber}`;
    const script=document.createElement('script');
    let timer;
    const cleanup=()=>{clearTimeout(timer);script.remove();delete window[callback];};
    window[callback]=response=>{try{resolve(sectionData(response));}catch(error){reject(error);}finally{cleanup();}};
    script.onerror=()=>{cleanup();reject(new Error('Spreadsheet connection failed'));};
    const params=new URLSearchParams({sheet,headers:'0',tq:'select A,D,F',tqx:`out:json;responseHandler:${callback}`,_:String(Date.now())});
    script.src=`https://docs.google.com/spreadsheets/d/${conferenceSpreadsheet}/gviz/tq?${params}`;
    script.referrerPolicy='no-referrer';
    timer=setTimeout(()=>{cleanup();reject(new Error('Spreadsheet connection timed out'));},20000);
    document.head.append(script);
  });
}

function useProgram(program){
  const validRow=row=>Array.isArray(row)&&row.length===3&&row.every(cell=>typeof cell==='string');
  const validPeople=people=>Array.isArray(people)&&people.every(person=>typeof person==='string');
  if(!Array.isArray(program)||program.length!==4||!program.every(section=>Array.isArray(section?.rows)&&section.rows.every(validRow)&&validPeople(section.team?.moderators)&&validPeople(section.team?.experts)))throw new Error('Invalid conference data');
  program.forEach((data,index)=>{sections[index].rows=data.rows;sections[index].team=data.team;});
  render();
}

async function refreshParticipants(){
  if(refreshInProgress||document.hidden)return;
  refreshInProgress=true;
  try{
    const program=await Promise.all(sections.map((section,index)=>loadSection(section.label,index)));
    useProgram(program);
    const updatedAt=new Date().toISOString();
    try{localStorage.setItem(cacheKey,JSON.stringify({program,updatedAt}));}catch{}
    syncStatus.className='sr-only';
    syncStatus.textContent=`Участники, руководители и эксперты обновлены из Google-таблицы: ${new Date(updatedAt).toLocaleTimeString('ru-RU')}. Выступлений: ${program.reduce((sum,section)=>sum+section.rows.length,0)}.`;
  }catch{
    syncStatus.className='sync-error';
    syncStatus.textContent='Не удалось обновить программу из Google-таблицы. Показана последняя сохранённая версия. Повторим через минуту.';
  }finally{refreshInProgress=false;}
}

try{
  const cached=JSON.parse(localStorage.getItem(cacheKey));
  if(cached?.program)useProgram(cached.program);
}catch{}
refreshParticipants();
setInterval(refreshParticipants,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshParticipants();});
