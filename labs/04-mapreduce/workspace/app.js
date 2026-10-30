(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const e = Object.fromEntries(['task-list','total','counter','question-title','question','hint-container','hint-toggle','hint','previous','next','code','scratch','note','save-button','download-code','download-notes','download-output','download-example','download-example-output','save-status','save-error','load-error','test-button','example-button','results','example-results'].map(id => [id, $(id)]));
  let tasks=[], draft={code:'',notes:{},scratch:''}, saved='', rev='', index=0, saving=false, running=false, lastOutput='', lastExampleOutput='';
  const snap=()=>JSON.stringify(draft);
  const dirty=()=>snap()!==saved;
  const task=()=>tasks[index];
  async function request(path, options) {
    let response; try { response=await fetch(path, options); } catch (_) { throw new Error('Cannot reach the workspace server. Check that it is running.'); }
    let data; try { data=await response.json(); } catch (_) { throw new Error('The workspace returned an unexpected response.'); }
    if (!response.ok || data.error) { const error=new Error(data.error || `Request failed (${response.status}).`); error.status=response.status; throw error; } return data;
  }
  function status() { e['save-status'].textContent=saving?'Saving work…':dirty()?'Unsaved changes':'No unsaved changes'; }
  function taskList() {
    e['task-list'].replaceChildren();
    tasks.forEach((item,i)=>{ const li=document.createElement('li'),button=document.createElement('button'),label=document.createElement('span'),n=document.createElement('span'),dot=document.createElement('span');
      button.type='button'; button.dataset.index=String(i); n.className='question-number'; n.textContent=String(item.id).padStart(2,'0'); label.append(n,document.createTextNode('Task '+item.id)); dot.className='draft-dot'; dot.textContent='•'; dot.setAttribute('aria-label','Has a note'); dot.hidden=!String(draft.notes[String(item.id)]||'').trim(); button.append(label,dot); button.addEventListener('click',()=>open(i)); li.append(button); e['task-list'].append(li); });
  }
  function open(i) {
    if(i<0 || i>=tasks.length)return; index=i; const item=task();
    e['question-title'].textContent='Task '+item.id; e.counter.textContent=`${i+1} / ${tasks.length}`; e.question.textContent=item.question;
    e['hint-container'].hidden=!item.hint; e.hint.textContent=item.hint||''; e.hint.hidden=true; e['hint-toggle'].setAttribute('aria-expanded','false'); e['hint-toggle'].textContent='Show hint +';
    e.note.value=draft.notes[String(item.id)]||''; e.note.setAttribute('aria-label',`Notes for task ${item.id}`);
    e.previous.disabled=i===0; e.next.disabled=i===tasks.length-1;
    e['task-list'].querySelectorAll('button').forEach((b,j)=>{if(i===j)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  }
  function download(name,text,type) {const url=URL.createObjectURL(new Blob([text],{type})); const a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function saveWork() {
    if(saving||!tasks.length)return; const pending=snap(); saving=true; e['save-button'].disabled=true; e['save-error'].hidden=true; status();
    try {const data=await request('/api/draft',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:JSON.parse(pending),revision:rev})}); if(typeof data.revision!=='string')throw new Error('The server did not return a save revision.'); rev=data.revision;saved=pending;}
    catch(err){e['save-error'].textContent=(err.status===409?'Work changed in another tab or the original file changed. ':`Could not save: ${err.message} `)+'Download your current work before reloading; your edits remain in this page.';e['save-error'].hidden=false;}
    finally {saving=false;e['save-button'].disabled=false;status();}
  }
  async function runTests() {
    if(running||!tasks.length)return; running=true; e.code.disabled=true;e.scratch.disabled=true;e['example-button'].disabled=true;e['download-output'].disabled=true;lastOutput='';e['test-button'].disabled=true;e['test-button'].textContent='Running tests…';e.results.replaceChildren(); const msg=document.createElement('p');msg.className='empty-state';msg.textContent='Running the lab tests on the code in the editor…';e.results.append(msg);
    try {const data=await request('/api/tests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:draft.code})}); const summary=document.createElement('p');summary.className='test-status';summary.textContent=data.timed_out?'Test run stopped after the time limit.':`Test run finished (exit code ${data.exit_code}).`;const output=document.createElement('pre');output.className='test-output';output.textContent=(data.output||'No output.')+(data.truncated?'\n[Output truncated]':'');lastOutput=summary.textContent+'\n\n'+output.textContent;e['download-output'].disabled=false; e.results.replaceChildren(summary,output);}
    catch(err){msg.className='query-error';msg.textContent=err.message;}
    finally{running=false;e.code.disabled=false;e.scratch.disabled=false;e['example-button'].disabled=false;e['test-button'].disabled=false;e['test-button'].textContent='Run tests';}
  }
  async function runExample() {
    if(running||!tasks.length)return;
    if(!draft.scratch.trim()){e['example-results'].textContent='Write an example before running it.';return;}
    running=true;e.code.disabled=true;e.scratch.disabled=true;e['test-button'].disabled=true;e['example-button'].disabled=true;e['example-button'].textContent='Running…';e['download-example-output'].disabled=true;lastExampleOutput='';
    e['example-results'].replaceChildren();const msg=document.createElement('p');msg.className='empty-state';msg.textContent='Running your example…';e['example-results'].append(msg);
    try{const data=await request('/api/example',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:draft.code,scratch:draft.scratch})});const summary=document.createElement('p');summary.className='test-status';summary.textContent=data.timed_out?'Example stopped after the time limit.':`Example finished (exit code ${data.exit_code}).`;const output=document.createElement('pre');output.className='test-output';output.textContent=(data.output||'No output.')+(data.truncated?'\n[Output truncated]':'');lastExampleOutput=summary.textContent+'\n\n'+output.textContent;e['download-example-output'].disabled=false;e['example-results'].replaceChildren(summary,output);}
    catch(err){msg.className='query-error';msg.textContent=err.message;}
    finally{running=false;e.code.disabled=false;e.scratch.disabled=false;e['test-button'].disabled=false;e['example-button'].disabled=false;e['example-button'].textContent='Run example';}
  }
  async function init(){try{const [q,d]=await Promise.all([request('/api/questions'),request('/api/draft')]);if(!Array.isArray(q.questions)||!q.questions.length||!d.draft||typeof d.draft.code!=='string'||!d.draft.notes||typeof d.draft.scratch!=='string'||typeof d.revision!=='string')throw new Error('Workspace data is incomplete.');tasks=q.questions;draft=d.draft;rev=d.revision;saved=snap();e.total.textContent=String(tasks.length);e.code.value=draft.code;e.scratch.value=draft.scratch;for(const id of ['code','scratch','note','save-button','download-code','download-notes','download-example','test-button','example-button'])e[id].disabled=false;taskList();open(0);status();}catch(err){e['load-error'].textContent=`Unable to open the workspace: ${err.message} Check that the server is running, then reload.`;e['load-error'].hidden=false;e['save-status'].textContent='Workspace unavailable';}}
  e.previous.addEventListener('click',()=>open(index-1));e.next.addEventListener('click',()=>open(index+1));
  e['hint-toggle'].addEventListener('click',()=>{const on=e['hint-toggle'].getAttribute('aria-expanded')!=='true';e['hint-toggle'].setAttribute('aria-expanded',String(on));e.hint.hidden=!on;e['hint-toggle'].textContent=on?'Hide hint −':'Show hint +';});
  e.code.addEventListener('input',()=>{draft.code=e.code.value;status();});
  e.scratch.addEventListener('input',()=>{draft.scratch=e.scratch.value;status();});
  e.note.addEventListener('input',()=>{const key=String(task().id);if(e.note.value)draft.notes[key]=e.note.value;else delete draft.notes[key];const dot=e['task-list'].querySelector(`button[data-index="${index}"] .draft-dot`);if(dot)dot.hidden=!e.note.value.trim();status();});
  e['save-button'].addEventListener('click',saveWork);e['test-button'].addEventListener('click',runTests);e['example-button'].addEventListener('click',runExample);
  e['download-code'].addEventListener('click',()=>download('student_tasks.py',draft.code,'text/x-python;charset=utf-8'));
  e['download-output'].addEventListener('click',()=>{if(lastOutput)download('lab04-test-output.txt',lastOutput,'text/plain;charset=utf-8');});
  e['download-example'].addEventListener('click',()=>download('lab04-example.py',draft.scratch,'text/x-python;charset=utf-8'));
  e['download-example-output'].addEventListener('click',()=>{if(lastExampleOutput)download('lab04-example-output.txt',lastExampleOutput,'text/plain;charset=utf-8');});
  e['download-notes'].addEventListener('click',()=>download('lab04-notes.md',tasks.map(q=>`## Task ${q.id}\n\n${q.question}\n\n${draft.notes[String(q.id)]||'(No notes yet)'}\n`).join('\n'),'text/markdown;charset=utf-8'));
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});init();
})();
