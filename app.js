
(function(){
  'use strict';
  // LocalStorage keys
  const LS = {SUB:'ss_subjects', TASK:'ss_tasks', SCHED:'ss_schedule', PREF:'ss_prefs'};

  // Helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function uid(prefix='id'){return prefix+Math.random().toString(36).slice(2,9)}
  function read(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return []}}
  function write(key,val){localStorage.setItem(key,JSON.stringify(val));}

  // Default init
  function ensureDefaults(){
    if(!localStorage.getItem(LS.SUB)) write(LS.SUB,[]);
    if(!localStorage.getItem(LS.TASK)) write(LS.TASK,[]);
    if(!localStorage.getItem(LS.SCHED)) write(LS.SCHED,[]);
    if(!localStorage.getItem(LS.PREF)) write(LS.PREF,{theme:'light'});
  }

  // Modal utilities — selectors match the HTML structure
  const modal = $('#modal');          // .modal-overlay div
  const modalBody = $('#modal-body'); // container inside .modal-box
  const modalClose = $('#modal-close');
  function showModal(html){
    modalBody.innerHTML = '';
    modalBody.appendChild(html);
    modal.classList.remove('hidden');
  }
  function hideModal(){
    modal.classList.add('hidden');
    modalBody.innerHTML = '';
  }
  modalClose.addEventListener('click', hideModal);

  // Toast
  const toast = $('#toast');
  function showToast(msg, timeout=3000){ toast.textContent = msg; toast.classList.remove('hidden'); setTimeout(()=>toast.classList.add('hidden'), timeout); }

  // ---- Mobile detection helper ----
  function isMobile(){ return window.innerWidth <= 640; }

  // ---- Hamburger menu ----
  const hamburger = $('#hamburger');
  const mainNav   = $('#main-nav');
  function closeNav(){ mainNav.classList.remove('open'); hamburger.classList.remove('open'); }
  hamburger.addEventListener('click', ()=>{
    mainNav.classList.toggle('open');
    hamburger.classList.toggle('open');
  });

  // NAV
  function setupNav(){
    $$('.nav-btn').forEach(b=>b.addEventListener('click',e=>{
      $$('.nav-btn').forEach(n=>n.classList.remove('active'));
      e.target.classList.add('active');
      showView(e.target.dataset.nav);
      closeNav();   // auto-close mobile menu on navigation
    }));
  }
  function showView(id){
    $$('.view').forEach(v=>v.classList.add('hidden'));
    $('#'+id).classList.remove('hidden');
    if(id==='dashboard') renderDashboard();
    if(id==='schedule') renderSchedule();
  }


  /* ---------------- Subjects ---------------- */
  function renderSubjects(){
    const list = $('#subjects-list'); list.innerHTML='';
    const subs = read(LS.SUB);
    subs.forEach(s=>{
      const el = document.createElement('div'); el.className='subject-item'; el.style.borderLeftColor = s.color||'#ccc';
      el.innerHTML = `<div class="subject-meta"><strong>${s.name}</strong><small class="muted">Priority: ${s.priority||'Normal'}</small></div>
        <div class="subject-actions">
          <button class="btn" data-id="${s.id}" data-action="edit">Edit</button>
          <button class="btn" data-id="${s.id}" data-action="del">Delete</button>
        </div>`;
      list.appendChild(el);
    });
    list.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click',handleSubjectAction));
    $('#total-subjects').textContent = subs.length;
    populateScheduleSelect();
  }
  function handleSubjectAction(e){
    const id = e.target.dataset.id; const action = e.target.dataset.action;
    if(action==='edit') openSubjectForm(read(LS.SUB).find(x=>x.id===id));
    if(action==='del'){
      if(!confirm('Delete subject? This also removes reference from tasks and schedule.')) return;
      const subs = read(LS.SUB).filter(s=>s.id!==id); write(LS.SUB,subs);
      // remove references from tasks and schedule
      let tasks = read(LS.TASK).map(t=> t.subjectId===id?({...t,subjectId:null}):t); write(LS.TASK,tasks);
      let sched = read(LS.SCHED).filter(e=>e.subjectId!==id); write(LS.SCHED,sched);
      renderSubjects(); renderTasks(); renderSchedule(); renderAnalytics(); showToast('Subject deleted');
    }
  }
  function openSubjectForm(item){
    const isEdit = !!item; const form = document.createElement('form');
    form.innerHTML = `
      <h3>${isEdit?'Edit':'Add'} Subject</h3>
      <label>Name <input name="name" required value="${item?item.name:''}"></label>
      <label>Priority <select name="priority"><option>Low</option><option ${item&&item.priority==='Normal'?'selected':''}>Normal</option><option>High</option></select></label>
      <label>Color <input type="color" name="color" value="${item?item.color:'#7c3aed'}"></label>
      <div style="margin-top:10px"><button class="btn primary">Save</button></div>`;
    form.addEventListener('submit',e=>{
      e.preventDefault(); const fd = new FormData(form); const name = fd.get('name').trim(); const priority = fd.get('priority'); const color = fd.get('color');
      if(!name) return;
      const subs = read(LS.SUB);
      if(isEdit){ const idx = subs.findIndex(s=>s.id===item.id); subs[idx] = {...subs[idx],name,priority,color}; }
      else subs.push({id:uid('sub_'),name,priority,color});
      write(LS.SUB,subs); renderSubjects(); hideModal(); showToast('Saved');
    });
    showModal(form);
  }


  /* ---------------- Tasks ---------------- */
  function renderTasks(){
    const list = $('#tasks-list'); list.innerHTML=''; const tasks = read(LS.TASK); const subs = read(LS.SUB);
    tasks.sort((a,b)=> new Date(a.deadline||0)-new Date(b.deadline||0));
    tasks.forEach(t=>{
      const subject = subs.find(s=>s.id===t.subjectId);
      const el = document.createElement('div'); el.className='subject-item';
      el.innerHTML = `<div class="subject-meta"><strong>${t.title}</strong><small class="muted">${t.type} — ${t.deadline?new Date(t.deadline).toLocaleDateString():'No deadline'}${subject?(' • '+subject.name):''}</small></div>
        <div class="subject-actions">
          <button class="btn" data-id="${t.id}" data-action="toggle">${t.status==='completed'?'Undo':'Done'}</button>
          <button class="btn" data-id="${t.id}" data-action="del">Delete</button>
        </div>`;
      list.appendChild(el);
    });
    list.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click',handleTaskAction));
    renderDashboard(); renderAnalytics();
  }
  function handleTaskAction(e){ const id = e.target.dataset.id; const action = e.target.dataset.action; let tasks = read(LS.TASK);
    if(action==='toggle'){ tasks = tasks.map(t=> t.id===id?{...t,status: t.status==='completed'?'pending':'completed'}:t); write(LS.TASK,tasks); renderTasks(); }
    if(action==='del'){ if(!confirm('Delete task?')) return; tasks = tasks.filter(t=>t.id!==id); write(LS.TASK,tasks); renderTasks(); showToast('Task removed'); }
  }
  function openTaskForm(){ const subs = read(LS.SUB);
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Add Task</h3>
      <label>Title <input name="title" required></label>
      <label>Type <select name="type"><option>Assignment</option><option>Exam</option></select></label>
      <label>Subject <select name="subject"><option value="">-- none --</option>${subs.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
      <label>Deadline <input type="date" name="deadline"></label>
      <div style="margin-top:10px"><button class="btn primary">Add</button></div>`;
    form.addEventListener('submit',e=>{ e.preventDefault(); const fd=new FormData(form); const title=fd.get('title').trim(); const type=fd.get('type'); const subjectId=fd.get('subject')||null; const deadline=fd.get('deadline')||null; const tasks=read(LS.TASK); tasks.push({id:uid('task_'),title,type,subjectId,deadline,status:'pending',created:Date.now()}); write(LS.TASK,tasks); hideModal(); renderTasks(); showToast('Task added'); });
    showModal(form);
  }

  
  /* ---------------- Schedule ---------------- */
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let mobileDay = (new Date().getDay() + 6) % 7;   // default to today (0=Mon)

  function populateScheduleSelect(){
    const sel = $('#schedule-subject-select');
    sel.innerHTML = '';
    sel.appendChild(new Option('-- choose subject --',''));
    read(LS.SUB).forEach(s => sel.appendChild(new Option(s.name, s.id)));
  }

  // Build day tabs for mobile view
  function renderDayTabs(){
    const container = $('#day-tabs');
    container.innerHTML = '';
    DAYS.forEach((d, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-tab' + (i === mobileDay ? ' active' : '');
      btn.textContent = d;
      btn.addEventListener('click', () => {
        mobileDay = i;
        renderSchedule();
      });
      container.appendChild(btn);
    });
  }

  function renderSchedule(){
    const grid = $('#schedule-grid');
    grid.innerHTML = '';
    const sched = read(LS.SCHED);
    const mobile = isMobile();

    // Render day tabs (visible only on mobile via CSS)
    renderDayTabs();

    if (mobile) {
      // ---- MOBILE: show single day in 2-column layout (hour | slot) ----
      const headerHour = document.createElement('div');
      headerHour.className = 'slot'; headerHour.style.fontWeight = '700';
      headerHour.textContent = 'Time';
      grid.appendChild(headerHour);

      const headerDay = document.createElement('div');
      headerDay.className = 'slot'; headerDay.style.fontWeight = '700';
      headerDay.textContent = DAYS[mobileDay];
      grid.appendChild(headerDay);

      for (let hour = 6; hour <= 22; hour++) {
        const hourCell = document.createElement('div');
        hourCell.className = 'slot'; hourCell.textContent = hour + ':00';
        grid.appendChild(hourCell);

        const slot = document.createElement('div');
        slot.className = 'slot'; slot.dataset.day = mobileDay; slot.dataset.hour = hour;
        const entry = sched.find(s => s.day === mobileDay && s.hour === hour);
        if (entry) {
          const sub = read(LS.SUB).find(x => x.id === entry.subjectId);
          slot.innerHTML = `<div class="s-title">${sub ? sub.name : 'Unknown'}</div><div class="s-sub">${sub ? sub.priority : ''}</div>`;
          slot.style.borderLeftColor = sub ? sub.color : '#ccc';
        }
        slot.addEventListener('click', () => onSlotClick(slot));
        grid.appendChild(slot);
      }
    } else {
      // ---- DESKTOP: full 8-column week view ----
      const headEmpty = document.createElement('div');
      headEmpty.className = 'slot'; headEmpty.style.fontWeight = '700';
      headEmpty.textContent = 'Hour';
      grid.appendChild(headEmpty);

      DAYS.forEach(d => {
        const h = document.createElement('div');
        h.className = 'slot'; h.style.fontWeight = '700'; h.textContent = d;
        grid.appendChild(h);
      });

      for (let hour = 6; hour <= 22; hour++) {
        const hourCell = document.createElement('div');
        hourCell.className = 'slot'; hourCell.textContent = hour + ':00';
        grid.appendChild(hourCell);

        for (let d = 0; d < 7; d++) {
          const slot = document.createElement('div');
          slot.className = 'slot'; slot.dataset.day = d; slot.dataset.hour = hour;
          const entry = sched.find(s => s.day === d && s.hour === hour);
          if (entry) {
            const sub = read(LS.SUB).find(x => x.id === entry.subjectId);
            slot.innerHTML = `<div class="s-title">${sub ? sub.name : 'Unknown'}</div><div class="s-sub">${sub ? sub.priority : ''}</div>`;
            slot.style.borderLeftColor = sub ? sub.color : '#ccc';
          }
          slot.addEventListener('click', () => onSlotClick(slot));
          grid.appendChild(slot);
        }
      }
    }
  }

  // Re-render schedule on resize (mobile <-> desktop switch)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderSchedule(), 200);
  });
  function onSlotClick(slot){ const subjSel = $('#schedule-subject-select'); const subjectId = subjSel.value; const day = Number(slot.dataset.day); const hour = Number(slot.dataset.hour);
    if(!subjectId){ // clear slot
      let sched = read(LS.SCHED).filter(e=>!(e.day===day && e.hour===hour)); write(LS.SCHED,sched); renderSchedule(); showToast('Cleared slot'); return;
    }
    // warn conflict if already filled by same subject? we allow replace but warn if other subject
    const sched = read(LS.SCHED); const existing = sched.find(e=>e.day===day && e.hour===hour);
    if(existing && existing.subjectId!==subjectId){ if(!confirm('Replace existing scheduled subject?')) return; }
    const newSched = sched.filter(e=>!(e.day===day && e.hour===hour)); newSched.push({day,hour,subjectId}); write(LS.SCHED,newSched); renderSchedule(); showToast('Scheduled'); renderDashboard(); renderAnalytics(); }

  /* ---------------- Dashboard & Analytics ---------------- */
  function renderDashboard(){ // upcoming deadlines
    const upcoming = $('#upcoming-deadlines'); upcoming.innerHTML=''; const tasks = read(LS.TASK).filter(t=>t.status!=='completed' && t.deadline);
    tasks.sort((a,b)=> new Date(a.deadline)-new Date(b.deadline)); tasks.slice(0,5).forEach(t=>{ const li=document.createElement('li'); li.textContent = `${t.title} — ${new Date(t.deadline).toLocaleDateString()}`; upcoming.appendChild(li); });
    // today's schedule
    const today = $('#today-schedule'); today.innerHTML=''; const now = new Date(); const dayIndex = (now.getDay()+6)%7; const sched = read(LS.SCHED).filter(s=>s.day===dayIndex).sort((a,b)=>a.hour-b.hour);
    sched.slice(0,6).forEach(s=>{ const sub = read(LS.SUB).find(x=>x.id===s.subjectId); const li = document.createElement('li'); li.textContent = `${s.hour}:00 — ${sub?sub.name:'Unknown'}`; today.appendChild(li); });
    $('#total-subjects').textContent = read(LS.SUB).length;
  }

  function renderAnalytics(){ const area = $('#analytics-area'); area.innerHTML=''; const subs = read(LS.SUB); const tasks = read(LS.TASK);
    if(subs.length===0){ area.innerHTML = '<p class="muted">No subjects yet. Add subjects to see analytics.</p>'; return; }
    subs.forEach(s=>{
      const subTasks = tasks.filter(t=>t.subjectId===s.id);
      const completed = subTasks.filter(t=>t.status==='completed').length; const total = subTasks.length; const pct = total?Math.round((completed/total)*100):0;
      const block = document.createElement('div'); block.style.margin='8px 0'; block.innerHTML=`<div style="display:flex;justify-content:space-between"><strong>${s.name}</strong><small class="muted">${pct}%</small></div>
        <div class="progress" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
      area.appendChild(block);
    });
    // insight: most studied subject by scheduled hours
    const sched = read(LS.SCHED); const hoursBySub = {}; sched.forEach(e=>hoursBySub[e.subjectId] = (hoursBySub[e.subjectId]||0)+1);
    const topId = Object.keys(hoursBySub).sort((a,b)=>hoursBySub[b]-hoursBySub[a])[0]; const insight = document.createElement('div'); insight.style.marginTop='12px';
    const pending = tasks.filter(t=>t.status!=='completed').length;
    insight.innerHTML = `<p><strong>Most scheduled subject:</strong> ${read(LS.SUB).find(s=>s.id===topId)?.name||'—'}</p><p><strong>Pending tasks:</strong> ${pending}</p>`;
    area.appendChild(insight);
  }

  /* ---------------- Settings ---------------- */
  function applyTheme(){
    const prefs = read(LS.PREF);
    if(prefs.theme==='dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    // Update navbar icon: sun for dark mode (click to go light), moon for light mode
    const icon = $('#nav-theme-toggle .theme-icon');
    if(icon) icon.textContent = prefs.theme==='dark' ? '☀️' : '🌙';
  }
  function toggleTheme(){
    const prefs = read(LS.PREF);
    prefs.theme = prefs.theme==='dark' ? 'light' : 'dark';
    write(LS.PREF, prefs);
    applyTheme();
    showToast(prefs.theme==='dark' ? 'Dark mode on' : 'Light mode on');
  }
  function exportData(){ const data = {subjects:read(LS.SUB), tasks:read(LS.TASK), schedule:read(LS.SCHED), prefs:read(LS.PREF)}; const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='smart-study-planner-export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
  function resetAll(){ if(!confirm('Reset all data? This cannot be undone.')) return; localStorage.removeItem(LS.SUB); localStorage.removeItem(LS.TASK); localStorage.removeItem(LS.SCHED); localStorage.removeItem(LS.PREF); ensureDefaults(); init(); showToast('All data reset'); }

  /* ---------------- Deadlines alerts (simple) ---------------- */
  function checkDeadlines(){ const tasks = read(LS.TASK); const now = new Date(); tasks.forEach(t=>{
    if(!t.deadline || t._alerted) return; const d = new Date(t.deadline); const diff = d - now; if(diff>0 && diff < (24*60*60*1000) ){ showToast(`Upcoming: ${t.title} due ${d.toLocaleDateString()}`,6000); t._alerted = true; }
  }); write(LS.TASK,tasks); }

  /* ---------------- Event bindings & init ---------------- */
  function init(){ ensureDefaults(); setupNav(); populateScheduleSelect(); renderSubjects(); renderTasks(); renderSchedule(); renderAnalytics(); applyTheme(); renderDashboard();
    // buttons
    $('#add-subject-btn').addEventListener('click',()=>openSubjectForm());
    $('#add-task-btn').addEventListener('click',openTaskForm);
    $('#schedule-subject-select').addEventListener('change',()=>{});
    $('#clear-schedule').addEventListener('click',()=>{ if(!confirm('Clear entire week schedule?')) return; write(LS.SCHED,[]); renderSchedule(); showToast('Week cleared'); });
    $('#theme-toggle').addEventListener('click',toggleTheme);
    $('#nav-theme-toggle').addEventListener('click',toggleTheme);
    $('#export-data').addEventListener('click',exportData);
    $('#reset-data').addEventListener('click',resetAll);
    // modal close with overlay
    modal.addEventListener('click',e=>{ if(e.target===modal) hideModal(); });

    // periodic checks
    setInterval(checkDeadlines, 60*60*1000); // hourly
  }

  document.addEventListener('DOMContentLoaded', init);
})();
