let selected=0;
const design=document.querySelector('#design'),input=document.querySelector('#search'),body=document.querySelector('#rows'),status=document.querySelector('#status');
const descriptions=[
'Секция 1. «Люди, команды, организации: в поисках современного менеджмента». 03.11.2026, аудитория 202, 10:10–13:20. Научный руководитель: Колесникова Виктория Юрьевна. Эксперты: Козинец Валерия, Сергеев Андрей Михайлович, Лоскутова Майя Алексеевна.',
'Секция 2. «Теория и практика: ускоренный путь в науку». Очно. 02.11.2026, аудитория 308, 10:10–13:20.',
'Секция 3. «Цифровая экономика: вызовы нового времени». 03.11.2026, 12:00–14:00.',
'Круглый стол. «День народного единства». Совместно со студенческим патриотическим клубом «Я горжусь». 03.11.2026, аудитория 302, 11:50–15:30.'
];
const normalize=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/\s+/g,' ').trim();
function choose(index,clear=false){selected=index;if(clear)input.value='';design.src=`assets/section${index+1}.svg`;design.alt=descriptions[index];document.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.section)===index)));location.hash=['section-1','section-2','section-3','round-table'][index];render();}
function render(){const query=normalize(input.value),words=query.split(' ').filter(Boolean);body.replaceChildren();let matches=[];
sections.forEach((section,index)=>{if(!query&&index!==selected)return;section.rows.forEach(row=>{const text=normalize(row.join(' '));if(words.every(word=>text.includes(word)))matches.push({row,index});});});
status.hidden=!query;status.textContent=query?`Найдено выступлений: ${matches.length}. Поиск по всем четырём разделам.`:'';
matches.forEach(({row,index})=>{const tr=document.createElement('tr');row.forEach((value,col)=>{const td=document.createElement('td');if(query&&col===0){const link=document.createElement('button');link.className='section-link';link.textContent=sections[index].label;link.addEventListener('click',()=>{choose(index,true);document.querySelector('#participants').scrollIntoView({behavior:'smooth'});});td.append(link);}td.append(document.createTextNode(value));tr.append(td);});body.append(tr);});
if(!matches.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=3;td.className='empty';td.textContent='Ничего не найдено. Проверьте написание фамилии или введите часть имени.';tr.append(td);body.append(tr);}}
document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>choose(Number(b.dataset.section),true)));input.addEventListener('input',render);
function fromHash(){const i=['#section-1','#section-2','#section-3','#round-table'].indexOf(location.hash);if(i>=0&&i!==selected)choose(i);}
window.addEventListener('hashchange',fromHash);fromHash();render();
