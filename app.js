
(function(){
  'use strict';

  /* ======== FIREBASE SETUP ======== */
  const firebaseConfig = {
    databaseURL: "https://smart-study-planner-142f4-default-rtdb.asia-southeast1.firebasedatabase.app"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  const FB_PATHS = {
    ss_subjects: 'subjects',
    ss_tasks:    'tasks',
    ss_schedule: 'schedule',
    ss_prefs:    'prefs'
  };

  const LS = {SUB:'ss_subjects', TASK:'ss_tasks', SCHED:'ss_schedule', PREF:'ss_prefs'};


  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function uid(prefix='id'){return prefix+Math.random().toString(36).slice(2,9)}

  // Reading from localStorage 
  function read(key){try{return JSON.parse(localStorage.getItem(key))||[];}catch(e){return []}}

  // Writing to localStorage AND syncing to Firebase
  function write(key, val){
    localStorage.setItem(key, JSON.stringify(val));
    const fbPath = FB_PATHS[key];
    if(fbPath){
      db.ref(fbPath).set(val).catch(err => console.warn('Firebase write failed:', err));
    }
  }


  function syncFromFirebase(){
    const keys = [LS.SUB, LS.TASK, LS.SCHED, LS.PREF];
    const promises = keys.map(key => {
      const fbPath = FB_PATHS[key];
      return db.ref(fbPath).once('value').then(snap => {
        const val = snap.val();
        if(val !== null){
          localStorage.setItem(key, JSON.stringify(val));
        }
      });
    });
    return Promise.all(promises)
      .then(() => { refreshAllViews(); showToast('Synced with cloud', 2000); })
      .catch(err => console.warn('Firebase sync failed (using local data):', err));
  }

  function setupRealtimeListeners(){
    Object.entries(FB_PATHS).forEach(([lsKey, fbPath]) => {
      db.ref(fbPath).on('value', snap => {
        const val = snap.val();
        if(val !== null){
          const current = localStorage.getItem(lsKey);
          const incoming = JSON.stringify(val);
          if(current !== incoming){
            localStorage.setItem(lsKey, incoming);
            refreshAllViews();
          }
        }
      });
    });
  }

  // Re-render all views based on current localStorage
  function refreshAllViews(){
    renderDashboard(); renderSubjects(); renderTasks();
    renderSchedule(); renderAnalytics(); applyTheme();
    renderRecentActivity(); renderQuote();
  }


  function ensureDefaults(){
    // Only set localStorage defaults — never push empty data to Firebase
    if(!localStorage.getItem(LS.SUB)) localStorage.setItem(LS.SUB, JSON.stringify([]));
    if(!localStorage.getItem(LS.TASK)) localStorage.setItem(LS.TASK, JSON.stringify([]));
    if(!localStorage.getItem(LS.SCHED)) localStorage.setItem(LS.SCHED, JSON.stringify([]));
    if(!localStorage.getItem(LS.PREF)) localStorage.setItem(LS.PREF, JSON.stringify({theme:'light'}));
  }

  // Modal utilities
  const modal = $('#modal');
  const modalBody = $('#modal-body');
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

  // Mobile detection
  function isMobile(){ return window.innerWidth <= 640; }

  // Hamburger menu
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
      closeNav();
    }));
  }
  function showView(id){
    $$('.view').forEach(v=>v.classList.add('hidden'));
    $('#'+id).classList.remove('hidden');
    if(id==='dashboard') renderDashboard();
    if(id==='subjects') renderSubjects();
    if(id==='schedule') renderSchedule();
    if(id==='tasks') renderTasks();
    if(id==='analytics') renderAnalytics();
  }

  // Time-based greeting
  function updateGreeting(){
    const h = new Date().getHours();
    let greet = 'Good evening';
    if(h < 12) greet = 'Good morning';
    else if(h < 17) greet = 'Good afternoon';
    const el = $('#greeting');
    const sub = $('#greeting-sub');
    if(el) el.textContent = greet + '!';
    if(sub){
      const pending = read(LS.TASK).filter(t=>t.status!=='completed').length;
      const schedToday = read(LS.SCHED).filter(s=>s.day===((new Date().getDay()+6)%7)).length;
      sub.textContent = pending > 0
        ? `You have ${pending} pending task${pending>1?'s':''} and ${schedToday} session${schedToday!==1?'s':''} today.`
        : 'All caught up! Plan your next study session.';
    }
  }


  /* ======== SUBJECTS ======== */
  function renderSubjects(){
    const list = $('#subjects-list'); list.innerHTML='';
    const emptyEl = $('#subjects-empty');
    const subs = read(LS.SUB);

    if(subs.length === 0){
      if(emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if(emptyEl) emptyEl.classList.add('hidden');

    subs.forEach(s=>{
      const prioClass = (s.priority||'Normal').toLowerCase();
      const el = document.createElement('div'); el.className='subject-item'; el.style.borderLeftColor = s.color||'#ccc';
      el.innerHTML = `<div class="subject-meta">
          <strong>${s.name}</strong>
          <small><span class="priority-pill ${prioClass}">${s.priority||'Normal'}</span></small>
        </div>
        <div class="subject-actions">
          <button class="btn" data-id="${s.id}" data-action="edit">Edit</button>
          <button class="btn danger" data-id="${s.id}" data-action="del">Delete</button>
        </div>`;
      list.appendChild(el);
    });
    list.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click',handleSubjectAction));
    populateScheduleSelect();
  }
  function handleSubjectAction(e){
    const id = e.target.dataset.id; const action = e.target.dataset.action;
    if(action==='edit') openSubjectForm(read(LS.SUB).find(x=>x.id===id));
    if(action==='del'){
      if(!confirm('Delete subject? This removes it from tasks and schedule too.')) return;
      const subs = read(LS.SUB).filter(s=>s.id!==id); write(LS.SUB,subs);
      let tasks = read(LS.TASK).map(t=> t.subjectId===id?({...t,subjectId:null}):t); write(LS.TASK,tasks);
      let sched = read(LS.SCHED).filter(e=>e.subjectId!==id); write(LS.SCHED,sched);
      renderSubjects(); showToast('Subject deleted');
    }
  }
  function openSubjectForm(item){
    const isEdit = !!item; const form = document.createElement('form');
    form.innerHTML = `
      <h3>${isEdit?'Edit':'Add'} Subject</h3>
      <label>Name <input name="name" type="text" required value="${item?item.name:''}"></label>
      <label>Priority <select name="priority">
        <option ${item&&item.priority==='Low'?'selected':''}>Low</option>
        <option ${!item||item.priority==='Normal'?'selected':''}>Normal</option>
        <option ${item&&item.priority==='High'?'selected':''}>High</option>
      </select></label>
      <label>Color <input type="color" name="color" value="${item?item.color:'#7c3aed'}"></label>
      <div style="margin-top:14px"><button class="btn primary" style="width:100%">Save Subject</button></div>`;
    form.addEventListener('submit',e=>{
      e.preventDefault(); const fd = new FormData(form); const name = fd.get('name').trim(); const priority = fd.get('priority'); const color = fd.get('color');
      if(!name) return;
      const subs = read(LS.SUB);
      if(isEdit){ const idx = subs.findIndex(s=>s.id===item.id); subs[idx] = {...subs[idx],name,priority,color}; }
      else subs.push({id:uid('sub_'),name,priority,color});
      write(LS.SUB,subs); renderSubjects(); hideModal(); showToast(isEdit?'Subject updated':'Subject added');
    });
    showModal(form);
  }


  /* ======== TASKS ======== */
  let currentFilter = 'all';

  function renderTasks(){
    const list = $('#tasks-list'); list.innerHTML='';
    const emptyEl = $('#tasks-empty');
    let tasks = read(LS.TASK); const subs = read(LS.SUB);
    tasks.sort((a,b)=> new Date(a.deadline||0)-new Date(b.deadline||0));

    // Apply filter
    let filtered = tasks;
    if(currentFilter === 'pending') filtered = tasks.filter(t=>t.status!=='completed');
    if(currentFilter === 'completed') filtered = tasks.filter(t=>t.status==='completed');

    if(filtered.length === 0){
      if(emptyEl){
        emptyEl.classList.remove('hidden');
        emptyEl.querySelector('p').textContent = currentFilter !== 'all'
          ? `No ${currentFilter} tasks.`
          : 'No tasks yet. Add a task to track your assignments and exams!';
      }
      return;
    }
    if(emptyEl) emptyEl.classList.add('hidden');

    filtered.forEach(t=>{
      const subject = subs.find(s=>s.id===t.subjectId);
      const isCompleted = t.status === 'completed';
      const isOverdue = !isCompleted && t.deadline && new Date(t.deadline) < new Date();
      let badgeClass = isCompleted ? 'completed' : (isOverdue ? 'overdue' : 'pending');
      let badgeText  = isCompleted ? 'Done' : (isOverdue ? 'Overdue' : 'Pending');

      const el = document.createElement('div');
      el.className = 'subject-item' + (isCompleted ? ' task-completed' : '');
      el.style.borderLeftColor = subject ? subject.color : (isOverdue ? '#ef4444' : '#ccc');
      el.innerHTML = `<div class="subject-meta">
          <strong>${t.title}</strong>
          <small class="muted">${t.type} — ${t.deadline?new Date(t.deadline).toLocaleDateString():'No deadline'}${subject?(' • '+subject.name):''}</small>
          <span class="task-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="subject-actions">
          <button class="btn ${isCompleted?'':'success'}" data-id="${t.id}" data-action="toggle">${isCompleted?'Undo':'Done'}</button>
          <button class="btn danger" data-id="${t.id}" data-action="del">Delete</button>
        </div>`;
      list.appendChild(el);
    });
    list.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click',handleTaskAction));
  }

  function setupTaskFilter(){
    $$('.filter-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderTasks();
      });
    });
  }

  function handleTaskAction(e){ const id = e.target.dataset.id; const action = e.target.dataset.action; let tasks = read(LS.TASK);
    if(action==='toggle'){ tasks = tasks.map(t=> t.id===id?{...t,status: t.status==='completed'?'pending':'completed'}:t); write(LS.TASK,tasks); renderTasks(); renderDashboard(); showToast('Task updated'); }
    if(action==='del'){ if(!confirm('Delete task?')) return; tasks = tasks.filter(t=>t.id!==id); write(LS.TASK,tasks); renderTasks(); renderDashboard(); showToast('Task removed'); }
  }
  function openTaskForm(){ const subs = read(LS.SUB);
    const form = document.createElement('form');
    form.innerHTML = `
      <h3>Add Task</h3>
      <label>Title <input name="title" type="text" required></label>
      <label>Type <select name="type"><option>Assignment</option><option>Exam</option><option>Project</option><option>Reading</option></select></label>
      <label>Subject <select name="subject"><option value="">-- none --</option>${subs.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
      <label>Deadline <input type="date" name="deadline"></label>
      <div style="margin-top:14px"><button class="btn primary" style="width:100%">Add Task</button></div>`;
    form.addEventListener('submit',e=>{ e.preventDefault(); const fd=new FormData(form); const title=fd.get('title').trim(); const type=fd.get('type'); const subjectId=fd.get('subject')||null; const deadline=fd.get('deadline')||null; const tasks=read(LS.TASK); tasks.push({id:uid('task_'),title,type,subjectId,deadline,status:'pending',created:Date.now()}); write(LS.TASK,tasks); hideModal(); renderTasks(); renderDashboard(); showToast('Task added'); });
    showModal(form);
  }

  
  /* ======== SCHEDULE ======== */
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let mobileDay = (new Date().getDay() + 6) % 7;

  function populateScheduleSelect(){
    const sel = $('#schedule-subject-select');
    sel.innerHTML = '';
    sel.appendChild(new Option('-- choose subject --',''));
    read(LS.SUB).forEach(s => sel.appendChild(new Option(s.name, s.id)));
  }

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

    renderDayTabs();

    if (mobile) {
      const headerHour = document.createElement('div');
      headerHour.className = 'slot'; headerHour.style.fontWeight = '700';
      headerHour.textContent = 'Time';
      grid.appendChild(headerHour);

      const headerDay = document.createElement('div');
      headerDay.className = 'slot'; headerDay.style.fontWeight = '700';
      headerDay.textContent = DAYS[mobileDay];
      grid.appendChild(headerDay);

      for (let hour = 6; hour <= 24; hour++) {
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
          slot.style.borderLeftWidth = '3px';
          slot.style.background = 'var(--accent-light)';
        }
        slot.addEventListener('click', () => onSlotClick(slot));
        grid.appendChild(slot);
      }
    } else {
      const headEmpty = document.createElement('div');
      headEmpty.className = 'slot'; headEmpty.style.fontWeight = '700';
      headEmpty.textContent = 'Hour';
      grid.appendChild(headEmpty);

      DAYS.forEach(d => {
        const h = document.createElement('div');
        h.className = 'slot'; h.style.fontWeight = '700'; h.textContent = d;
        grid.appendChild(h);
      });

      for (let hour = 6; hour <= 24; hour++) {
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
            slot.style.borderLeftWidth = '3px';
            slot.style.background = 'var(--accent-light)';
          }
          slot.addEventListener('click', () => onSlotClick(slot));
          grid.appendChild(slot);
        }
      }
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => renderSchedule(), 200);
  });

  function onSlotClick(slot){
    const subjSel = $('#schedule-subject-select'); const subjectId = subjSel.value;
    const day = Number(slot.dataset.day); const hour = Number(slot.dataset.hour);
    if(!subjectId){
      let sched = read(LS.SCHED).filter(e=>!(e.day===day && e.hour===hour)); write(LS.SCHED,sched); renderSchedule(); showToast('Cleared slot'); return;
    }
    const sched = read(LS.SCHED); const existing = sched.find(e=>e.day===day && e.hour===hour);
    if(existing && existing.subjectId!==subjectId){ if(!confirm('Replace existing scheduled subject?')) return; }
    const newSched = sched.filter(e=>!(e.day===day && e.hour===hour));
    newSched.push({day,hour,subjectId}); write(LS.SCHED,newSched);
    renderSchedule(); showToast('Scheduled'); renderDashboard();
  }


  /* ======== DASHBOARD ======== */
  function renderDashboard(){
    updateGreeting();
    const tasks = read(LS.TASK);
    const subs = read(LS.SUB);
    const sched = read(LS.SCHED);

    // Stats
    $('#total-subjects').textContent = subs.length;
    const pending = tasks.filter(t=>t.status!=='completed');
    const completed = tasks.filter(t=>t.status==='completed');
    $('#pending-tasks').textContent = pending.length;
    $('#completed-tasks').textContent = completed.length;
    $('#study-hours').textContent = sched.length;

    // Upcoming deadlines
    const upcoming = $('#upcoming-deadlines'); upcoming.innerHTML='';
    const deadlineTasks = pending.filter(t=>t.deadline).sort((a,b)=> new Date(a.deadline)-new Date(b.deadline));
    if(deadlineTasks.length === 0){
      upcoming.innerHTML = '<li style="color:var(--muted);font-style:italic">No upcoming deadlines</li>';
    } else {
      deadlineTasks.slice(0,5).forEach(t=>{
        const li=document.createElement('li');
        const daysLeft = Math.ceil((new Date(t.deadline) - new Date()) / (1000*60*60*24));
        const urgency = daysLeft <= 1 ? 'color:var(--danger);font-weight:600' : (daysLeft <= 3 ? 'color:var(--warning)' : '');
        li.innerHTML = `<span style="${urgency}">${t.title}</span> — ${new Date(t.deadline).toLocaleDateString()} <small class="muted">(${daysLeft <= 0 ? 'overdue!' : daysLeft+'d left'})</small>`;
        upcoming.appendChild(li);
      });
    }

    // Today's schedule
    const today = $('#today-schedule'); today.innerHTML='';
    const now = new Date(); const dayIndex = (now.getDay()+6)%7;
    const todaySched = sched.filter(s=>s.day===dayIndex).sort((a,b)=>a.hour-b.hour);
    if(todaySched.length === 0){
      today.innerHTML = '<li style="color:var(--muted);font-style:italic">No sessions today</li>';
    } else {
      todaySched.slice(0,6).forEach(s=>{
        const sub = subs.find(x=>x.id===s.subjectId);
        const li = document.createElement('li');
        const currentHour = now.getHours();
        const isNow = s.hour === currentHour;
        li.innerHTML = `<span style="${isNow?'font-weight:700;color:var(--accent)':''}">${s.hour}:00</span> — ${sub?sub.name:'Unknown'} ${isNow?'<small style="color:var(--accent)">(now)</small>':''}`;
        today.appendChild(li);
      });
    }

    // Refresh sidebar widgets
    renderRecentActivity();
    renderQuote();
  }


  /* ======== ANALYTICS ======== */
  function renderAnalytics(){
    const area = $('#analytics-area'); area.innerHTML='';
    const summary = $('#analytics-summary'); summary.innerHTML='';
    const subs = read(LS.SUB); const tasks = read(LS.TASK); const sched = read(LS.SCHED);

    // Summary cards
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t=>t.status==='completed').length;
    const completionRate = totalTasks ? Math.round((completedTasks/totalTasks)*100) : 0;
    const totalHours = sched.length;
    const overdue = tasks.filter(t=>t.status!=='completed' && t.deadline && new Date(t.deadline)<new Date()).length;
    const pendingCount = tasks.filter(t=>t.status!=='completed').length;

    // Calculate streak (days with scheduled sessions leading up to today)
    const todayDay = (new Date().getDay()+6)%7;
    let streak = 0;
    for(let d = todayDay; d >= 0; d--){
      if(sched.some(s=>s.day===d)) streak++;
      else break;
    }

    const summaryData = [
      {val: subs.length, label: 'Subjects'},
      {val: totalHours, label: 'Study Hrs/Wk'},
      {val: completionRate + '%', label: 'Completion'},
      {val: overdue, label: 'Overdue'},
      {val: pendingCount, label: 'Pending'},
      {val: streak + 'd', label: 'Streak'}
    ];
    summaryData.forEach(d => {
      const card = document.createElement('div');
      card.className = 'summary-card';
      card.innerHTML = `<div class="summary-val">${d.val}</div><div class="summary-label">${d.label}</div>`;
      summary.appendChild(card);
    });

    if(subs.length===0){
      area.innerHTML = '<div class="empty-state"><p>No subjects yet. Add subjects to see detailed analytics.</p></div>';
      return;
    }

    // === Subject Progress (2-column grid) ===
    const progressHeading = document.createElement('h3');
    progressHeading.style.cssText = 'font-size:1.05rem;margin-bottom:12px;color:var(--text-secondary)';
    progressHeading.textContent = 'Subject Progress';
    area.appendChild(progressHeading);

    const progressGrid = document.createElement('div');
    progressGrid.className = 'analytics-grid';

    subs.forEach(s=>{
      const subTasks = tasks.filter(t=>t.subjectId===s.id);
      const done = subTasks.filter(t=>t.status==='completed').length;
      const total = subTasks.length;
      const pct = total ? Math.round((done/total)*100) : 0;
      const schedHours = sched.filter(e=>e.subjectId===s.id).length;

      const block = document.createElement('div');
      block.className = 'analytics-item';
      block.innerHTML = `
        <div class="analytics-item-head">
          <strong><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color};margin-right:8px"></span>${s.name}</strong>
          <span class="analytics-pct">${pct}%</span>
        </div>
        <div class="progress" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
        <div style="display:flex;gap:16px;margin-top:8px;font-size:0.8125rem;color:var(--muted)">
          <span>${done}/${total} tasks</span>
          <span>${schedHours} hrs/wk</span>
        </div>`;
      progressGrid.appendChild(block);
    });
    area.appendChild(progressGrid);

    // === Two-panel row: Study Time Distribution + Task Type Breakdown ===
    const panels = document.createElement('div');
    panels.className = 'analytics-panels';

    // LEFT: Study Time Distribution (horizontal bars)
    const hoursBySub = {};
    sched.forEach(e=>hoursBySub[e.subjectId] = (hoursBySub[e.subjectId]||0)+1);
    const maxHours = Math.max(...Object.values(hoursBySub), 1);

    let distHTML = '<h3>Study Time Distribution</h3><div class="h-bar-chart">';
    subs.forEach(s=>{
      const hrs = hoursBySub[s.id] || 0;
      const pct = Math.round((hrs/maxHours)*100);
      distHTML += `<div class="h-bar-row">
        <span class="h-bar-label">${s.name}</span>
        <div class="h-bar-track"><div class="h-bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
        <span class="h-bar-val">${hrs}h</span>
      </div>`;
    });
    distHTML += '</div>';
    const distPanel = document.createElement('div');
    distPanel.className = 'analytics-panel';
    distPanel.innerHTML = distHTML;
    panels.appendChild(distPanel);

    // RIGHT: Task Type Breakdown
    const typeColors = {Assignment:'#3b82f6', Exam:'#ef4444', Project:'#8b5cf6', Reading:'#22c55e'};
    const typeCounts = {};
    tasks.forEach(t=>typeCounts[t.type] = (typeCounts[t.type]||0)+1);

    let typeHTML = '<h3>Task Type Breakdown</h3><div class="type-breakdown">';
    Object.entries(typeCounts).sort((a,b)=>b[1]-a[1]).forEach(([type, count])=>{
      const color = typeColors[type] || '#94a3b8';
      const pct = totalTasks ? Math.round((count/totalTasks)*100) : 0;
      typeHTML += `<div class="type-row">
        <div class="type-row-left"><span class="type-dot" style="background:${color}"></span>${type}</div>
        <div class="type-row-right">${count} (${pct}%)</div>
      </div>`;
    });
    if(Object.keys(typeCounts).length===0) typeHTML += '<p style="color:var(--muted);font-size:0.8125rem">No tasks yet</p>';
    typeHTML += '</div>';
    const typePanel = document.createElement('div');
    typePanel.className = 'analytics-panel';
    typePanel.innerHTML = typeHTML;
    panels.appendChild(typePanel);

    area.appendChild(panels);

    // === Second row: Weekly Schedule Load + Insights ===
    const panels2 = document.createElement('div');
    panels2.className = 'analytics-panels';

    // LEFT: Weekly Schedule Load (vertical bars)
    const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dayHours = [0,0,0,0,0,0,0];
    sched.forEach(e=>dayHours[e.day]++);
    const maxDayH = Math.max(...dayHours, 1);

    let weekHTML = '<h3>Weekly Schedule Load</h3><div class="week-chart">';
    DAYS_SHORT.forEach((d,i)=>{
      const h = dayHours[i];
      const hPct = Math.round((h/maxDayH)*100);
      weekHTML += `<div class="week-bar-col">
        <div class="week-bar" style="height:${hPct}%"></div>
        <span class="week-bar-label">${d}</span>
      </div>`;
    });
    weekHTML += '</div>';
    const weekPanel = document.createElement('div');
    weekPanel.className = 'analytics-panel';
    weekPanel.innerHTML = weekHTML;
    panels2.appendChild(weekPanel);

    // RIGHT: Insights
    const topId = Object.keys(hoursBySub).sort((a,b)=>hoursBySub[b]-hoursBySub[a])[0];
    const topName = subs.find(s=>s.id===topId)?.name || '—';
    const leastId = Object.keys(hoursBySub).sort((a,b)=>hoursBySub[a]-hoursBySub[b])[0];
    const leastName = subs.find(s=>s.id===leastId)?.name || '—';
    const avgPerSubject = subs.length ? (totalHours/subs.length).toFixed(1) : 0;
    const busyDay = DAYS_SHORT[dayHours.indexOf(Math.max(...dayHours))];
    const freeDay = DAYS_SHORT[dayHours.indexOf(Math.min(...dayHours))];

    const insightPanel = document.createElement('div');
    insightPanel.className = 'analytics-panel';
    insightPanel.innerHTML = `
      <h3>Insights</h3>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:0.875rem">
        <p><strong>Most scheduled:</strong> ${topName}</p>
        <p><strong>Least scheduled:</strong> ${leastName}</p>
        <p><strong>Avg hrs/subject:</strong> ${avgPerSubject}</p>
        <p><strong>Busiest day:</strong> ${busyDay}</p>
        <p><strong>Lightest day:</strong> ${freeDay}</p>
        <p><strong>Completion rate:</strong> ${completionRate}%</p>
        <p><strong>Overdue tasks:</strong> ${overdue}</p>
        <p><strong>Study streak:</strong> ${streak} day${streak!==1?'s':''}</p>
      </div>`;
    panels2.appendChild(insightPanel);

    area.appendChild(panels2);
  }


  /* ======== SETTINGS ======== */
  function applyTheme(){
    const prefs = read(LS.PREF);
    if(prefs.theme==='dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    const icon = $('#nav-theme-toggle .theme-icon');
    if(icon) icon.textContent = prefs.theme==='dark' ? '\u2600' : '\u263E';
  }
  function toggleTheme(){
    const prefs = read(LS.PREF);
    prefs.theme = prefs.theme==='dark' ? 'light' : 'dark';
    write(LS.PREF, prefs);
    applyTheme();
    showToast(prefs.theme==='dark' ? 'Dark mode on' : 'Light mode on');
  }
  function exportData(){
    const data = {subjects:read(LS.SUB), tasks:read(LS.TASK), schedule:read(LS.SCHED), prefs:read(LS.PREF)};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='smart-study-planner-export.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Data exported');
  }
  function resetAll(){
    if(!confirm('Reset all local data? Cloud data will be preserved.')) return;
    // Only clear localStorage — never touch Firebase
    localStorage.removeItem(LS.SUB); localStorage.removeItem(LS.TASK);
    localStorage.removeItem(LS.SCHED); localStorage.removeItem(LS.PREF);
    ensureDefaults();
    // Restore data from Firebase into the now-empty localStorage
    syncFromFirebase().then(() => {
      refreshAllViews();
      showToast('Local data reset — restored from cloud');
    }).catch(() => {
      refreshAllViews();
      showToast('Local data reset (offline — cloud sync pending)');
    });
  }

  /* ======== DEADLINE ALERTS ======== */
  function checkDeadlines(){
    const tasks = read(LS.TASK); const now = new Date();
    let changed = false;
    tasks.forEach(t=>{
      if(!t.deadline || t._alerted || t.status==='completed') return;
      const d = new Date(t.deadline); const diff = d - now;
      if(diff>0 && diff < (24*60*60*1000)){
        showToast(`Due soon: ${t.title} — ${d.toLocaleDateString()}`,6000);
        t._alerted = true;
        changed = true;
      }
    });
    // Only write back if a task was actually flagged, to avoid pushing empty data
    if(changed) write(LS.TASK,tasks);
  }


  /* ======== FOCUS TIMER (Pomodoro) ======== */
  let timerInterval = null;
  let timerSeconds = 25 * 60;
  let timerRunning = false;
  let timerPreset = 25;

  function updateTimerDisplay(){
    const el = $('#timer-display');
    if(!el) return;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function startTimer(){
    if(timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(()=>{
      if(timerSeconds <= 0){
        clearInterval(timerInterval);
        timerRunning = false;
        showToast('Timer done! Take a break.', 5000);
        return;
      }
      timerSeconds--;
      updateTimerDisplay();
    }, 1000);
  }

  function pauseTimer(){
    clearInterval(timerInterval);
    timerRunning = false;
  }

  function resetTimer(){
    pauseTimer();
    timerSeconds = timerPreset * 60;
    updateTimerDisplay();
  }

  function setupTimer(){
    const startBtn = $('#timer-start');
    const pauseBtn = $('#timer-pause');
    const resetBtn = $('#timer-reset');
    if(startBtn) startBtn.addEventListener('click', startTimer);
    if(pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if(resetBtn) resetBtn.addEventListener('click', resetTimer);

    $$('.preset-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        $$('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        timerPreset = Number(e.target.dataset.mins);
        timerSeconds = timerPreset * 60;
        pauseTimer();
        updateTimerDisplay();
      });
    });
    updateTimerDisplay();
  }


  /* ======== RECENT ACTIVITY ======== */
  function renderRecentActivity(){
    const list = $('#recent-activity');
    if(!list) return;
    list.innerHTML = '';

    const tasks = read(LS.TASK);
    const subs = read(LS.SUB);

    // Build activity items from tasks (sorted by created timestamp)
    const activities = [];

    const SVG_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const SVG_PLUS = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
    const SVG_BOOK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

    tasks.forEach(t => {
      activities.push({
        icon: t.status === 'completed' ? SVG_CHECK : SVG_PLUS,
        iconClass: t.status === 'completed' ? 'done' : 'add',
        text: t.status === 'completed'
          ? `Completed <strong>${t.title}</strong>`
          : `Added task <strong>${t.title}</strong>`,
        time: t.created || Date.now()
      });
    });

    subs.forEach(s => {
      activities.push({
        icon: SVG_BOOK,
        iconClass: 'subject',
        text: `Subject <strong>${s.name}</strong>`,
        time: s.created || Date.now()
      });
    });

    // Sort newest first, take top 6
    activities.sort((a,b) => b.time - a.time);
    const recent = activities.slice(0, 6);

    if(recent.length === 0){
      list.innerHTML = '<li style="color:var(--muted);font-style:italic;padding:8px 0">No activity yet</li>';
      return;
    }

    recent.forEach(a => {
      const li = document.createElement('li');
      const ago = timeAgo(a.time);
      li.innerHTML = `<span class="activity-icon">${a.icon}</span>
        <div><div class="activity-text">${a.text}</div><div class="activity-time">${ago}</div></div>`;
      list.appendChild(li);
    });
  }

  function timeAgo(ts){
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if(hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
  }


  /* ======== MOTIVATIONAL QUOTES ======== */
  const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
    { text: "Learning is not attained by chance, it must be sought for with ardor.", author: "Abigail Adams" },
    { text: "Education is the passport to the future.", author: "Malcolm X" },
    { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { text: "Study hard what interests you the most in the most undisciplined, irreverent way possible.", author: "Richard Feynman" },
    { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" }
  ];

  function renderQuote(){
    const quoteEl = $('#daily-quote');
    const authorEl = $('#quote-author');
    if(!quoteEl || !authorEl) return;
    // Pick quote based on day of year for consistency within a day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / (1000*60*60*24));
    const q = QUOTES[dayOfYear % QUOTES.length];
    quoteEl.innerHTML = `&ldquo;${q.text}&rdquo;`;
    authorEl.innerHTML = `&mdash; ${q.author}`;
  }


  /* ======== QUICK ACTIONS ======== */
  function setupQuickActions(){
    const qaSubject = $('#qa-add-subject');
    const qaTask = $('#qa-add-task');
    const qaSchedule = $('#qa-go-schedule');
    const qaAnalytics = $('#qa-go-analytics');

    if(qaSubject) qaSubject.addEventListener('click', () => openSubjectForm());
    if(qaTask) qaTask.addEventListener('click', () => openTaskForm());
    if(qaSchedule) qaSchedule.addEventListener('click', () => {
      $$('.nav-btn').forEach(n=>n.classList.remove('active'));
      const schedBtn = $$('.nav-btn').find(b=>b.dataset.nav==='schedule');
      if(schedBtn) schedBtn.classList.add('active');
      showView('schedule');
    });
    if(qaAnalytics) qaAnalytics.addEventListener('click', () => {
      $$('.nav-btn').forEach(n=>n.classList.remove('active'));
      const anaBtn = $$('.nav-btn').find(b=>b.dataset.nav==='analytics');
      if(anaBtn) anaBtn.classList.add('active');
      showView('analytics');
    });
  }


  /* ======== INIT ======== */
  function init(){
    ensureDefaults(); setupNav(); setupTaskFilter();

    // Sidebar features & event listeners (UI setup — doesn't depend on data)
    setupTimer(); setupQuickActions(); renderQuote();

    $('#add-subject-btn').addEventListener('click',()=>openSubjectForm());
    $('#add-task-btn').addEventListener('click',openTaskForm);
    $('#clear-schedule').addEventListener('click',()=>{
      if(!confirm('Clear entire week schedule?')) return;
      write(LS.SCHED,[]); renderSchedule(); renderDashboard(); showToast('Week cleared');
    });
    $('#theme-toggle').addEventListener('click',toggleTheme);
    $('#nav-theme-toggle').addEventListener('click',toggleTheme);
    $('#export-data').addEventListener('click',exportData);
    $('#reset-data').addEventListener('click',resetAll);
    modal.addEventListener('click',e=>{ if(e.target===modal) hideModal(); });

    // Firebase-first: pull cloud data into localStorage before rendering,
    // so a cleared localStorage never overwrites Firebase with empty data.
    syncFromFirebase().then(() => {
      refreshAllViews();
      checkDeadlines();
      setupRealtimeListeners();
    }).catch(() => {
      // Offline or Firebase error — render from whatever localStorage has
      refreshAllViews();
      checkDeadlines();
    });
    setInterval(checkDeadlines, 60*60*1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
