class ProductivityHub {
    constructor() {
        this.tasks = this.load('ph_tasks') || [];
        this.goals = this.load('ph_goals') || [];
        this.notes = this.load('ph_notes') || [];
        this.timeBlocks = this.load('ph_timeblocks') || [];
        this.activityLog = this.load('ph_activity') || [];
        this.pomodoroLog = this.load('ph_pomodoro_log') || [];
        this.streakData = this.load('ph_streak') || { lastDate: null, count: 0 };
        this.currentFilter = 'all';
        this.currentSort = 'created';
        this.searchQuery = '';
        this.editingTaskId = null;
        this.scheduleWeekOffset = 0;
        this.pomoMode = 'work';
        this.pomoRunning = false;
        this.pomoInterval = null;
        this.pomoTimeLeft = 25 * 60;
        this.pomoSession = 1;
        this.pomoSettings = this.load('ph_pomo_settings') || { work: 25, shortBreak: 5, longBreak: 15 };
        this.editingNoteId = null;
        this.noteSearchQuery = '';
        this.init();
    }

    // ===================== INIT =====================
    init() {
        this.cacheDOMElements();
        this.attachGlobalEvents();
        this.attachTaskEvents();
        this.attachScheduleEvents();
        this.attachGoalEvents();
        this.attachPomodoroEvents();
        this.attachNoteEvents();
        this.setGreeting();
        this.setCurrentDate();
        this.updateStreak();
        this.setDefaultDueDate();
        this.navigateTo('dashboard');
    }

    cacheDOMElements() {
        this.els = {
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            mainContent: document.getElementById('mainContent'),
            greeting: document.getElementById('greeting'),
            currentDate: document.getElementById('currentDate'),
            pageTitle: document.getElementById('pageTitle'),
            streakCount: document.getElementById('streakCount'),
            // Dashboard
            dashTotalTasks: document.getElementById('dashTotalTasks'),
            dashCompletedTasks: document.getElementById('dashCompletedTasks'),
            dashActiveTasks: document.getElementById('dashActiveTasks'),
            dashOverdueTasks: document.getElementById('dashOverdueTasks'),
            scoreRing: document.getElementById('scoreRing'),
            scoreLabel: document.getElementById('scoreLabel'),
            scoreMessage: document.getElementById('scoreMessage'),
            todayTasksList: document.getElementById('todayTasksList'),
            weeklyChart: document.getElementById('weeklyChart'),
            categoryChart: document.getElementById('categoryChart'),
            activityFeed: document.getElementById('activityFeed'),
            quickAddTask: document.getElementById('quickAddTask'),
            quickStartPomodoro: document.getElementById('quickStartPomodoro'),
            quickAddNote: document.getElementById('quickAddNote'),
            quickAddGoal: document.getElementById('quickAddGoal'),
            // Tasks
            taskInput: document.getElementById('taskInput'),
            prioritySelect: document.getElementById('prioritySelect'),
            categorySelect: document.getElementById('categorySelect'),
            dueDateInput: document.getElementById('dueDateInput'),
            addBtn: document.getElementById('addBtn'),
            taskList: document.getElementById('taskList'),
            searchInput: document.getElementById('searchInput'),
            sortSelect: document.getElementById('sortSelect'),
            clearCompleted: document.getElementById('clearCompleted'),
            totalTasks: document.getElementById('totalTasks'),
            activeTasks: document.getElementById('activeTasks'),
            completedTasks: document.getElementById('completedTasks'),
            // Schedule
            scheduleGrid: document.getElementById('scheduleGrid'),
            scheduleWeekLabel: document.getElementById('scheduleWeekLabel'),
            prevWeek: document.getElementById('prevWeek'),
            nextWeek: document.getElementById('nextWeek'),
            scheduleToday: document.getElementById('scheduleToday'),
            timeBlockModal: document.getElementById('timeBlockModal'),
            blockTitle: document.getElementById('blockTitle'),
            blockDate: document.getElementById('blockDate'),
            blockStart: document.getElementById('blockStart'),
            blockEnd: document.getElementById('blockEnd'),
            blockColor: document.getElementById('blockColor'),
            blockColorPicker: document.getElementById('blockColorPicker'),
            saveBlock: document.getElementById('saveBlock'),
            cancelBlock: document.getElementById('cancelBlock'),
            // Analytics
            analyticsCompletionRate: document.getElementById('analyticsCompletionRate'),
            analyticsAvgPerDay: document.getElementById('analyticsAvgPerDay'),
            analyticsPomodoroCount: document.getElementById('analyticsPomodoroCount'),
            analyticsBestDay: document.getElementById('analyticsBestDay'),
            trendChart: document.getElementById('trendChart'),
            priorityChart: document.getElementById('priorityChart'),
            heatmap: document.getElementById('heatmap'),
            insightsList: document.getElementById('insightsList'),
            // Goals
            goalInput: document.getElementById('goalInput'),
            goalTarget: document.getElementById('goalTarget'),
            goalUnit: document.getElementById('goalUnit'),
            goalDeadline: document.getElementById('goalDeadline'),
            addGoalBtn: document.getElementById('addGoalBtn'),
            goalsGrid: document.getElementById('goalsGrid'),
            // Pomodoro
            pomodoroRing: document.getElementById('pomodoroRing'),
            pomoTime: document.getElementById('pomoTime'),
            pomoStartBtn: document.getElementById('pomoStartBtn'),
            pomoResetBtn: document.getElementById('pomoResetBtn'),
            pomoSession: document.getElementById('pomoSession'),
            pomoTodayCount: document.getElementById('pomoTodayCount'),
            pomoWorkDuration: document.getElementById('pomoWorkDuration'),
            pomoShortBreak: document.getElementById('pomoShortBreak'),
            pomoLongBreak: document.getElementById('pomoLongBreak'),
            pomoLog: document.getElementById('pomoLog'),
            // Notes
            addNoteBtn: document.getElementById('addNoteBtn'),
            noteSearch: document.getElementById('noteSearch'),
            notesGrid: document.getElementById('notesGrid'),
            noteModal: document.getElementById('noteModal'),
            noteTitle: document.getElementById('noteTitle'),
            noteContent: document.getElementById('noteContent'),
            noteColor: document.getElementById('noteColor'),
            noteColorPicker: document.getElementById('noteColorPicker'),
            saveNoteBtn: document.getElementById('saveNoteBtn'),
            deleteNoteBtn: document.getElementById('deleteNoteBtn'),
            cancelNoteBtn: document.getElementById('cancelNoteBtn')
        };
    }

    // ===================== EVENTS =====================
    attachGlobalEvents() {
        // Sidebar nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                this.navigateTo(item.dataset.page);
                if (window.innerWidth <= 768) this.els.sidebar.classList.remove('open');
            });
        });
        // Mobile toggle
        this.els.sidebarToggle.addEventListener('click', () => {
            this.els.sidebar.classList.toggle('open');
        });
        // Close sidebar on outside click (mobile)
        this.els.mainContent.addEventListener('click', () => {
            if (window.innerWidth <= 768) this.els.sidebar.classList.remove('open');
        });
        // Quick actions
        this.els.quickAddTask.addEventListener('click', () => {
            this.navigateTo('tasks');
            setTimeout(() => this.els.taskInput.focus(), 200);
        });
        this.els.quickStartPomodoro.addEventListener('click', () => this.navigateTo('pomodoro'));
        this.els.quickAddNote.addEventListener('click', () => {
            this.navigateTo('notes');
            setTimeout(() => this.openNoteEditor(), 200);
        });
        this.els.quickAddGoal.addEventListener('click', () => {
            this.navigateTo('goals');
            setTimeout(() => this.els.goalInput.focus(), 200);
        });
    }

    attachTaskEvents() {
        this.els.addBtn.addEventListener('click', () => this.addTask());
        this.els.taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.addTask(); });
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });
        this.els.sortSelect.addEventListener('change', () => {
            this.currentSort = this.els.sortSelect.value;
            this.renderTasks();
        });
        this.els.searchInput.addEventListener('input', () => {
            this.searchQuery = this.els.searchInput.value.toLowerCase();
            this.renderTasks();
        });
        this.els.clearCompleted.addEventListener('click', () => this.clearCompleted());
    }

    attachScheduleEvents() {
        this.els.prevWeek.addEventListener('click', () => { this.scheduleWeekOffset--; this.renderSchedule(); });
        this.els.nextWeek.addEventListener('click', () => { this.scheduleWeekOffset++; this.renderSchedule(); });
        this.els.scheduleToday.addEventListener('click', () => { this.scheduleWeekOffset = 0; this.renderSchedule(); });
        this.els.cancelBlock.addEventListener('click', () => { this.els.timeBlockModal.style.display = 'none'; });
        this.els.saveBlock.addEventListener('click', () => this.saveTimeBlock());
        // Block color picker
        this.els.blockColorPicker.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.els.blockColorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                this.els.blockColor.value = dot.dataset.color;
            });
        });
    }

    attachGoalEvents() {
        this.els.addGoalBtn.addEventListener('click', () => this.addGoal());
        this.els.goalInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.addGoal(); });
    }

    attachPomodoroEvents() {
        this.els.pomoStartBtn.addEventListener('click', () => this.togglePomodoro());
        this.els.pomoResetBtn.addEventListener('click', () => this.resetPomodoro());
        document.querySelectorAll('.pomo-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (this.pomoRunning) return;
                document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.pomoMode = tab.dataset.mode;
                this.resetPomodoro();
            });
        });
        // Settings change
        [this.els.pomoWorkDuration, this.els.pomoShortBreak, this.els.pomoLongBreak].forEach(input => {
            input.addEventListener('change', () => {
                this.pomoSettings = {
                    work: parseInt(this.els.pomoWorkDuration.value) || 25,
                    shortBreak: parseInt(this.els.pomoShortBreak.value) || 5,
                    longBreak: parseInt(this.els.pomoLongBreak.value) || 15
                };
                this.save('ph_pomo_settings', this.pomoSettings);
                if (!this.pomoRunning) this.resetPomodoro();
            });
        });
    }

    attachNoteEvents() {
        this.els.addNoteBtn.addEventListener('click', () => this.openNoteEditor());
        this.els.cancelNoteBtn.addEventListener('click', () => this.closeNoteEditor());
        this.els.saveNoteBtn.addEventListener('click', () => this.saveNote());
        this.els.deleteNoteBtn.addEventListener('click', () => {
            if (this.editingNoteId && confirm('Delete this note?')) {
                this.deleteNote(this.editingNoteId);
                this.closeNoteEditor();
            }
        });
        this.els.noteSearch.addEventListener('input', () => {
            this.noteSearchQuery = this.els.noteSearch.value.toLowerCase();
            this.renderNotes();
        });
        // Note color picker
        this.els.noteColorPicker.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.els.noteColorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                this.els.noteColor.value = dot.dataset.color;
            });
        });
    }

    // ===================== NAVIGATION =====================
    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const pageEl = document.getElementById('page-' + page);
        const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (pageEl) pageEl.classList.add('active');
        if (navEl) navEl.classList.add('active');
        const titles = {
            dashboard: 'Dashboard',
            tasks: 'Tasks',
            schedule: 'Schedule',
            analytics: 'Analytics',
            goals: 'Goals',
            pomodoro: 'Pomodoro Timer',
            notes: 'Notes'
        };
        this.els.pageTitle.textContent = titles[page] || 'Dashboard';
        
        if (page === 'dashboard') this.renderDashboard();
        else if (page === 'tasks') this.renderTasks();
        else if (page === 'schedule') this.renderSchedule();
        else if (page === 'analytics') this.renderAnalytics();
        else if (page === 'goals') this.renderGoals();
        else if (page === 'pomodoro') this.renderPomodoro();
        else if (page === 'notes') this.renderNotes();
    }

    // ===================== DASHBOARD =====================
    renderDashboard() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const active = this.tasks.filter(t => !t.completed).length;
        const today = this.today();
        const overdue = this.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
        
        this.els.dashTotalTasks.textContent = total;
        this.els.dashCompletedTasks.textContent = completed;
        this.els.dashActiveTasks.textContent = active;
        this.els.dashOverdueTasks.textContent = overdue;
        
        this.renderScoreRing(total > 0 ? Math.round((completed / total) * 100) : 0);
        this.renderTodayFocus();
        this.renderWeeklyChart();
        this.renderCategoryChart();
        this.renderActivityFeed();
    }

    renderScoreRing(percent) {
        const canvas = this.els.scoreRing;
        const ctx = canvas.getContext('2d');
        const size = 180;
        const center = size / 2;
        const radius = 70;
        const lineWidth = 10;
        ctx.clearRect(0, 0, size, size);
        
        // Background ring
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99,115,148,0.12)';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        
        // Progress ring
        if (percent > 0) {
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#818cf8');
            ctx.beginPath();
            ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percent / 100));
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        this.els.scoreLabel.textContent = percent + '%';
        const messages = [
            [80, 'Outstanding work!'],
            [60, 'Great progress!'],
            [40, 'Keep pushing!'],
            [20, 'Getting started!'],
            [0, 'Start completing tasks!']
        ];
        for (const [threshold, msg] of messages) {
            if (percent >= threshold) { this.els.scoreMessage.textContent = msg; break; }
        }
    }

    renderTodayFocus() {
        const today = this.today();
        const todayTasks = this.tasks.filter(t => t.dueDate === today);
        if (todayTasks.length === 0) {
            this.els.todayTasksList.innerHTML = '<li><i class="lucide-info"></i> No tasks due today</li>';
            return;
        }
        this.els.todayTasksList.innerHTML = todayTasks.slice(0, 5).map(t =>
            `<li class="${t.completed ? 'completed' : ''}"><i class="lucide-${t.completed ? 'check-circle-2' : 'circle'}"></i> ${this.escapeHtml(t.text)}</li>`
        ).join('');
    }

    renderWeeklyChart() {
        const canvas = this.els.weeklyChart;
        const ctx = canvas.getContext('2d');
        const w = canvas.offsetWidth;
        const h = 220;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date();
        const dayOfWeek = (today.getDay() + 6) % 7;
        const counts = new Array(7).fill(0);
        
        this.tasks.forEach(t => {
            if (t.completed && t.completedDate) {
                const d = new Date(t.completedDate);
                const diff = Math.floor((today - d) / 86400000);
                const idx = dayOfWeek - diff;
                if (idx >= 0 && idx < 7) counts[idx]++;
            }
        });
        
        const maxVal = Math.max(...counts, 1);
        const barWidth = Math.min(40, (w - 80) / 7 - 12);
        const chartHeight = h - 50;
        const startX = (w - (7 * (barWidth + 12))) / 2;
        
        days.forEach((day, i) => {
            const x = startX + i * (barWidth + 12);
            const barH = (counts[i] / maxVal) * (chartHeight - 20);
            const y = chartHeight - barH;
            
            // Bar
            const gradient = ctx.createLinearGradient(x, y, x, chartHeight);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#818cf8');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barH, 4);
            ctx.fill();
            
            // Label
            ctx.fillStyle = i === dayOfWeek ? '#818cf8' : '#64748b';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(day, x + barWidth / 2, h - 8);
            
            // Value
            if (counts[i] > 0) {
                ctx.fillStyle = '#f0f4fc';
                ctx.font = '700 11px Inter, sans-serif';
                ctx.fillText(counts[i], x + barWidth / 2, y - 6);
            }
        });
    }

    renderCategoryChart() {
        const canvas = this.els.categoryChart;
        const ctx = canvas.getContext('2d');
        const w = canvas.offsetWidth;
        const h = 220;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        
        const cats = {};
        this.tasks.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
        const entries = Object.entries(cats);
        if (entries.length === 0) return;
        
        const colors = ['#667eea', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#06b6d4'];
        const total = entries.reduce((s, [, v]) => s + v, 0);
        const cx = w / 2 - 60;
        const cy = h / 2;
        const r = 70;
        const innerR = 45;
        let startAngle = -Math.PI / 2;
        
        entries.forEach(([cat, count], i) => {
            const sliceAngle = (count / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
            ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            startAngle += sliceAngle;
        });
        
        // Legend
        const legendX = cx + r + 30;
        entries.forEach(([cat, count], i) => {
            const y = 30 + i * 28;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.roundRect(legendX, y - 5, 12, 12, 3);
            ctx.fill();
            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${cat} (${count})`, legendX + 20, y + 5);
        });
    }

    renderActivityFeed() {
        const recent = this.activityLog.slice(-10).reverse();
        if (recent.length === 0) {
            this.els.activityFeed.innerHTML = '<div class="activity-item"><i class="lucide-info"></i> No recent activity</div>';
            return;
        }
        this.els.activityFeed.innerHTML = recent.map(a => {
            let iconClass = 'lucide-check-circle-2';
            if (a.type === 'task_add') iconClass = 'lucide-plus-circle';
            else if (a.type === 'task_delete') iconClass = 'lucide-trash-2';
            else if (a.type === 'pomodoro') iconClass = 'lucide-timer';
            else if (a.type === 'goal') iconClass = 'lucide-target';
            else if (a.type === 'note') iconClass = 'lucide-file-text';
            return `<div class="activity-item"><i class="${iconClass}"></i><span>${this.escapeHtml(a.text)}</span><span class="activity-time">${this.formatRelativeDate(a.date)}</span></div>`;
        }).join('');
    }

    // ===================== TASKS =====================
    addTask() {
        const text = this.els.taskInput.value.trim();
        if (!text) { this.els.taskInput.style.animation = 'shake 0.4s'; setTimeout(() => this.els.taskInput.style.animation = '', 400); return; }
        
        if (this.editingTaskId) {
            const task = this.tasks.find(t => t.id === this.editingTaskId);
            if (task) {
                task.text = text;
                task.priority = this.els.prioritySelect.value;
                task.category = this.els.categorySelect.value;
                task.dueDate = this.els.dueDateInput.value;
            }
            this.editingTaskId = null;
            this.els.addBtn.innerHTML = '<i class="lucide-plus"></i> Add Task';
        } else {
            this.tasks.push({
                id: Date.now(),
                text,
                priority: this.els.prioritySelect.value,
                category: this.els.categorySelect.value,
                dueDate: this.els.dueDateInput.value,
                completed: false,
                completedDate: null,
                createdAt: new Date().toISOString()
            });
            this.logActivity('task_add', `Added task: ${text}`);
        }
        
        this.els.taskInput.value = '';
        this.save('ph_tasks', this.tasks);
        this.renderTasks();
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedDate = task.completed ? new Date().toISOString() : null;
            if (task.completed) this.logActivity('task_complete', `Completed: ${task.text}`);
            this.save('ph_tasks', this.tasks);
            this.renderTasks();
        }
    }

    deleteTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) this.logActivity('task_delete', `Deleted: ${task.text}`);
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.save('ph_tasks', this.tasks);
        this.renderTasks();
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        this.editingTaskId = id;
        this.els.taskInput.value = task.text;
        this.els.prioritySelect.value = task.priority;
        this.els.categorySelect.value = task.category;
        this.els.dueDateInput.value = task.dueDate || '';
        this.els.addBtn.innerHTML = '<i class="lucide-check"></i> Update';
        this.els.taskInput.focus();
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(t => !t.completed);
        this.save('ph_tasks', this.tasks);
        this.renderTasks();
    }

    getFilteredTasks() {
        const today = this.today();
        let filtered = [...this.tasks];
        
        if (this.currentFilter === 'active') filtered = filtered.filter(t => !t.completed);
        else if (this.currentFilter === 'completed') filtered = filtered.filter(t => t.completed);
        else if (this.currentFilter === 'today') filtered = filtered.filter(t => t.dueDate === today);
        else if (this.currentFilter === 'overdue') filtered = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < today);
        
        if (this.searchQuery) {
            filtered = filtered.filter(t => t.text.toLowerCase().includes(this.searchQuery) || t.category.toLowerCase().includes(this.searchQuery));
        }
        return this.sortTasks(filtered);
    }

    sortTasks(tasks) {
        const sorters = {
            created: (a, b) => b.id - a.id,
            priority: (a, b) => { const o = { high: 0, medium: 1, low: 2 }; return (o[a.priority] || 1) - (o[b.priority] || 1); },
            dueDate: (a, b) => (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1,
            category: (a, b) => a.category.localeCompare(b.category)
        };
        return tasks.sort(sorters[this.currentSort] || sorters.created);
    }

    renderTasks() {
        const filtered = this.getFilteredTasks();
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        this.els.totalTasks.textContent = total;
        this.els.activeTasks.textContent = total - completed;
        this.els.completedTasks.textContent = completed;
        
        if (filtered.length === 0) {
            this.els.taskList.innerHTML = `<div class="empty-state"><i class="lucide-inbox"></i><p>No tasks found</p></div>`;
            return;
        }
        
        const today = this.today();
        this.els.taskList.innerHTML = filtered.map(t => {
            const isOverdue = !t.completed && t.dueDate && t.dueDate < today;
            const categoryIcons = {
                personal: 'lucide-user',
                work: 'lucide-briefcase',
                health: 'lucide-heart',
                shopping: 'lucide-shopping-cart',
                learning: 'lucide-book-open',
                other: 'lucide-folder'
            };
            const catIcon = categoryIcons[t.category] || 'lucide-folder';
            return `<li class="task-item priority-${t.priority} ${t.completed ? 'completed' : ''}">
                <label class="task-checkbox">
                    <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="app.toggleTask(${t.id})" />
                    <span class="checkmark"><i class="lucide-check"></i></span>
                </label>
                <div class="task-content">
                    <div class="task-text">${this.escapeHtml(t.text)}</div>
                    <div class="task-meta">
                        <span class="task-tag tag-priority ${t.priority}"><i class="lucide-flag"></i> ${t.priority}</span>
                        <span class="task-tag tag-category"><i class="${catIcon}"></i> ${t.category}</span>
                        ${t.dueDate ? `<span class="task-tag ${isOverdue ? 'tag-overdue' : 'tag-due'}"><i class="lucide-calendar"></i> ${this.formatDate(t.dueDate)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn" onclick="app.editTask(${t.id})" title="Edit"><i class="lucide-pencil"></i></button>
                    <button class="task-action-btn delete" onclick="app.deleteTask(${t.id})" title="Delete"><i class="lucide-trash-2"></i></button>
                </div>
            </li>`;
        }).join('');
    }

    // ===================== SCHEDULE =====================
    getWeekDates(offset = 0) {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            return d;
        });
    }

    renderSchedule() {
        const dates = this.getWeekDates(this.scheduleWeekOffset);
        const start = dates[0];
        const end = dates[6];
        const today = this.today();
        this.els.scheduleWeekLabel.textContent = `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} — ${end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        this.els.scheduleGrid.innerHTML = dates.map((d, i) => {
            const dateStr = d.toISOString().split('T')[0];
            const isToday = dateStr === today;
            const blocks = this.timeBlocks.filter(b => b.date === dateStr);
            const dayTasks = this.tasks.filter(t => t.dueDate === dateStr);
            
            return `<div class="day-card ${isToday ? 'today' : ''}" onclick="app.openTimeBlockModal('${dateStr}')">
                <div class="day-card-header">
                    <div class="day-name">${dayNames[i]}</div>
                    <div class="day-number">${d.getDate()}</div>
                </div>
                <div class="time-blocks-container">
                    ${blocks.map(b => `<div class="time-block" style="border-left-color:${b.color};color:${b.color};">
                        <div class="time-block-time">${b.start} - ${b.end}</div>
                        ${this.escapeHtml(b.title)}
                    </div>`).join('')}
                </div>
                ${dayTasks.length ? `<div class="task-dots">${dayTasks.map(t => `<div class="task-dot ${t.completed ? 'done' : ''}" style="background:${t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#22c55e'}" title="${this.escapeHtml(t.text)}"></div>`).join('')}</div>` : ''}
            </div>`;
        }).join('');
    }

    openTimeBlockModal(dateStr) {
        this.els.blockDate.value = dateStr;
        this.els.blockTitle.value = '';
        this.els.timeBlockModal.style.display = 'flex';
        this.els.blockTitle.focus();
    }

    saveTimeBlock() {
        const title = this.els.blockTitle.value.trim();
        if (!title) return;
        this.timeBlocks.push({
            id: Date.now(),
            title,
            date: this.els.blockDate.value,
            start: this.els.blockStart.value,
            end: this.els.blockEnd.value,
            color: this.els.blockColor.value
        });
        this.save('ph_timeblocks', this.timeBlocks);
        this.els.timeBlockModal.style.display = 'none';
        this.renderSchedule();
    }

    // ===================== ANALYTICS =====================
    renderAnalytics() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        this.els.analyticsCompletionRate.textContent = total > 0 ? Math.round((completed / total) * 100) + '%' : '0%';
        
        // Avg per day
        const dates = new Set();
        this.tasks.forEach(t => { if (t.completedDate) dates.add(t.completedDate.split('T')[0]); });
        this.els.analyticsAvgPerDay.textContent = dates.size > 0 ? (completed / dates.size).toFixed(1) : '0';
        
        // Pomodoro count
        const todayStr = this.today();
        const todayPomos = this.pomodoroLog.filter(p => p.date === todayStr).length;
        this.els.analyticsPomodoroCount.textContent = todayPomos;
        
        // Best day
        const dayCounts = {};
        this.tasks.forEach(t => {
            if (t.completedDate) {
                const d = t.completedDate.split('T')[0];
                dayCounts[d] = (dayCounts[d] || 0) + 1;
            }
        });
        const best = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
        this.els.analyticsBestDay.textContent = best ? this.formatDate(best[0]) : '-';
        
        this.renderTrendChart();
        this.renderPriorityChart();
        this.renderHeatmap();
        this.renderInsights();
    }

    renderTrendChart() {
        const canvas = this.els.trendChart;
        const ctx = canvas.getContext('2d');
        const w = canvas.offsetWidth;
        const h = 250;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        
        const days = 30;
        const counts = [];
        const labels = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            counts.push(this.tasks.filter(t => t.completedDate && t.completedDate.startsWith(dateStr)).length);
            labels.push(d.getDate());
        }
        
        const maxVal = Math.max(...counts, 1);
        const padding = 40;
        const chartW = w - padding * 2;
        const chartH = h - 60;
        const stepX = chartW / (days - 1);
        
        // Grid lines
        ctx.strokeStyle = 'rgba(99,115,148,0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
            ctx.stroke();
        }
        
        // Line
        const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartH);
        gradient.addColorStop(0, 'rgba(102,126,234,0.3)');
        gradient.addColorStop(1, 'rgba(102,126,234,0)');
        
        ctx.beginPath();
        counts.forEach((c, i) => {
            const x = padding + i * stepX;
            const y = padding + chartH - (c / maxVal) * chartH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        // Fill
        ctx.lineTo(padding + (days - 1) * stepX, padding + chartH);
        ctx.lineTo(padding, padding + chartH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Dots & labels
        counts.forEach((c, i) => {
            const x = padding + i * stepX;
            const y = padding + chartH - (c / maxVal) * chartH;
            if (c > 0) {
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#818cf8';
                ctx.fill();
            }
            if (i % 5 === 0) {
                ctx.fillStyle = '#64748b';
                ctx.font = '500 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i], x, h - 8);
            }
        });
    }

    renderPriorityChart() {
        const canvas = this.els.priorityChart;
        const ctx = canvas.getContext('2d');
        const w = canvas.offsetWidth;
        const h = 250;
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        
        const priorities = [
            { label: 'High', key: 'high', color: '#ef4444' },
            { label: 'Medium', key: 'medium', color: '#f59e0b' },
            { label: 'Low', key: 'low', color: '#22c55e' }
        ];
        
        const maxVal = Math.max(...priorities.map(p => this.tasks.filter(t => t.priority === p.key).length), 1);
        const barHeight = 28;
        const gap = 32;
        const startY = (h - (priorities.length * (barHeight + gap) - gap)) / 2;
        const maxBarW = w - 160;
        
        priorities.forEach((p, i) => {
            const count = this.tasks.filter(t => t.priority === p.key).length;
            const barW = (count / maxVal) * maxBarW;
            const y = startY + i * (barHeight + gap);
            
            // Label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(p.label, 16, y + barHeight / 2 + 4);
            
            // Bar bg
            ctx.fillStyle = 'rgba(99,115,148,0.08)';
            ctx.beginPath();
            ctx.roundRect(80, y, maxBarW, barHeight, 6);
            ctx.fill();
            
            // Bar
            if (barW > 0) {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.roundRect(80, y, Math.max(barW, 8), barHeight, 6);
                ctx.fill();
            }
            
            // Count
            ctx.fillStyle = '#f0f4fc';
            ctx.font = '700 12px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(count, 80 + Math.max(barW, 8) + 10, y + barHeight / 2 + 4);
        });
    }

    renderHeatmap() {
        const cells = [];
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = this.tasks.filter(t => t.completedDate && t.completedDate.startsWith(dateStr)).length;
            const maxOpacity = 1;
            const opacity = count === 0 ? 0 : Math.min(0.3 + count * 0.2, maxOpacity);
            cells.push(`<div class="heatmap-cell" title="${dateStr}: ${count} tasks" style="background:${count > 0 ? `rgba(102,126,234,${opacity})` : 'var(--bg-input)'};"></div>`);
        }
        this.els.heatmap.innerHTML = cells.join('');
    }

    renderInsights() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const insights = [];
        
        if (rate >= 80) insights.push({ icon: 'lucide-trophy', cls: 'text-success', text: `Excellent! You've completed ${rate}% of your tasks.` });
        else if (rate >= 50) insights.push({ icon: 'lucide-trending-up', cls: 'text-info', text: `Good progress! ${rate}% completion rate. Keep it up!` });
        else if (total > 0) insights.push({ icon: 'lucide-alert-circle', cls: 'text-warning', text: `${rate}% completion rate. Focus on finishing active tasks.` });
        
        const highPriority = this.tasks.filter(t => !t.completed && t.priority === 'high').length;
        if (highPriority > 0) insights.push({ icon: 'lucide-alert-triangle', cls: 'text-danger', text: `${highPriority} high-priority task${highPriority > 1 ? 's' : ''} need attention.` });
        
        const today = this.today();
        const overdue = this.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
        if (overdue > 0) insights.push({ icon: 'lucide-clock', cls: 'text-danger', text: `${overdue} task${overdue > 1 ? 's are' : ' is'} overdue. Review and reschedule.` });
        
        const todayPomos = this.pomodoroLog.filter(p => p.date === today).length;
        if (todayPomos > 0) insights.push({ icon: 'lucide-timer', cls: 'text-accent', text: `${todayPomos} Pomodoro session${todayPomos > 1 ? 's' : ''} completed today.` });
        
        if (insights.length === 0) insights.push({ icon: 'lucide-sparkles', cls: 'text-info', text: 'Add tasks and start working to see insights!' });
        
        this.els.insightsList.innerHTML = insights.map(i =>
            `<div class="insight-item"><i class="${i.icon} ${i.cls}"></i><span>${i.text}</span></div>`
        ).join('');
    }

    // ===================== GOALS =====================
    addGoal() {
        const title = this.els.goalInput.value.trim();
        const target = parseInt(this.els.goalTarget.value);
        if (!title || !target) return;
        
        this.goals.push({
            id: Date.now(),
            title,
            target,
            current: 0,
            unit: this.els.goalUnit.value,
            deadline: this.els.goalDeadline.value,
            createdAt: new Date().toISOString()
        });
        
        this.logActivity('goal', `New goal: ${title}`);
        this.els.goalInput.value = '';
        this.els.goalTarget.value = '';
        this.save('ph_goals', this.goals);
        this.renderGoals();
    }

    renderGoals() {
        if (this.goals.length === 0) {
            this.els.goalsGrid.innerHTML = `<div class="empty-state"><i class="lucide-target"></i><p>No goals yet. Set your first goal!</p></div>`;
            return;
        }
        
        this.els.goalsGrid.innerHTML = this.goals.map(g => {
            const percent = Math.min(Math.round((g.current / g.target) * 100), 100);
            const isComplete = percent >= 100;
            return `<div class="goal-card">
                <div class="goal-header">
                    <div>
                        <div class="goal-title">${isComplete ? '<i class="lucide-check-circle-2" style="color:var(--success);margin-right:6px;"></i>' : ''}${this.escapeHtml(g.title)}</div>
                        <div class="goal-meta">${g.deadline ? 'Due: ' + this.formatDate(g.deadline) : ''} • ${g.unit}</div>
                    </div>
                    <button class="goal-delete-btn" onclick="app.deleteGoal(${g.id})"><i class="lucide-trash-2"></i></button>
                </div>
                <div class="goal-progress-bar"><div class="goal-progress-fill ${isComplete ? 'complete' : ''}" style="width:${percent}%"></div></div>
                <div class="goal-footer">
                    <span class="goal-progress-text">${g.current} / ${g.target} ${g.unit} (${percent}%)</span>
                    ${!isComplete ? `<button class="goal-increment-btn" onclick="app.incrementGoal(${g.id})"><i class="lucide-plus"></i> +1</button>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    incrementGoal(id) {
        const goal = this.goals.find(g => g.id === id);
        if (goal && goal.current < goal.target) {
            goal.current++;
            this.save('ph_goals', this.goals);
            this.renderGoals();
        }
    }

    deleteGoal(id) {
        this.goals = this.goals.filter(g => g.id !== id);
        this.save('ph_goals', this.goals);
        this.renderGoals();
    }

    // ===================== POMODORO =====================
    togglePomodoro() {
        if (this.pomoRunning) {
            clearInterval(this.pomoInterval);
            this.pomoRunning = false;
            this.els.pomoStartBtn.innerHTML = '<i class="lucide-play"></i> Resume';
        } else {
            this.pomoRunning = true;
            this.els.pomoStartBtn.innerHTML = '<i class="lucide-pause"></i> Pause';
            this.pomoInterval = setInterval(() => this.tickPomodoro(), 1000);
        }
    }

    tickPomodoro() {
        this.pomoTimeLeft--;
        if (this.pomoTimeLeft <= 0) {
            clearInterval(this.pomoInterval);
            this.pomoRunning = false;
            this.els.pomoStartBtn.innerHTML = '<i class="lucide-play"></i> Start';
            
            if (this.pomoMode === 'work') {
                this.pomodoroLog.push({ date: this.today(), time: new Date().toLocaleTimeString(), mode: 'work' });
                this.save('ph_pomodoro_log', this.pomodoroLog);
                this.logActivity('pomodoro', 'Completed a Pomodoro session');
                
                // Notification
                if (Notification.permission === 'granted') {
                    new Notification('Pomodoro Complete!', { body: 'Time for a break.' });
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission();
                }
                
                this.pomoSession++;
                if (this.pomoSession > 4) this.pomoSession = 1;
                
                // Auto switch to break
                const breakMode = this.pomoSession === 1 ? 'longBreak' : 'shortBreak';
                this.pomoMode = breakMode;
                document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
                document.querySelector(`.pomo-tab[data-mode="${breakMode}"]`)?.classList.add('active');
            } else {
                this.pomoMode = 'work';
                document.querySelectorAll('.pomo-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.pomo-tab[data-mode="work"]')?.classList.add('active');
            }
            
            this.resetPomodoro();
            return;
        }
        this.renderPomodoro();
    }

    resetPomodoro() {
        clearInterval(this.pomoInterval);
        this.pomoRunning = false;
        const durations = { work: this.pomoSettings.work, shortBreak: this.pomoSettings.shortBreak, longBreak: this.pomoSettings.longBreak };
        this.pomoTimeLeft = (durations[this.pomoMode] || 25) * 60;
        this.els.pomoStartBtn.innerHTML = '<i class="lucide-play"></i> Start';
        this.renderPomodoro();
    }

    renderPomodoro() {
        const minutes = Math.floor(this.pomoTimeLeft / 60);
        const seconds = this.pomoTimeLeft % 60;
        this.els.pomoTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.els.pomoSession.textContent = this.pomoSession;
        
        const todayPomos = this.pomodoroLog.filter(p => p.date === this.today()).length;
        this.els.pomoTodayCount.textContent = todayPomos;
        
        this.renderPomodoroTimer();
        this.renderPomodoroLog();
    }

    renderPomodoroTimer() {
        const canvas = this.els.pomodoroRing;
        const ctx = canvas.getContext('2d');
        const size = 280;
        const center = size / 2;
        const radius = 120;
        const lineWidth = 8;
        ctx.clearRect(0, 0, size, size);
        
        // Background ring
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99,115,148,0.1)';
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        
        // Progress
        const durations = { work: this.pomoSettings.work, shortBreak: this.pomoSettings.shortBreak, longBreak: this.pomoSettings.longBreak };
        const totalSeconds = (durations[this.pomoMode] || 25) * 60;
        const progress = 1 - this.pomoTimeLeft / totalSeconds;
        
        if (progress > 0) {
            const colors = { work: ['#667eea', '#818cf8'], shortBreak: ['#22c55e', '#4ade80'], longBreak: ['#06b6d4', '#67e8f9'] };
            const [c1, c2] = colors[this.pomoMode] || colors.work;
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, c1);
            gradient.addColorStop(1, c2);
            ctx.beginPath();
            ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }

    renderPomodoroLog() {
        const todayLogs = this.pomodoroLog.filter(p => p.date === this.today());
        if (todayLogs.length === 0) {
            this.els.pomoLog.innerHTML = '<div class="pomo-log-item"><i class="lucide-info" style="color:var(--text-tertiary);"></i> No sessions today</div>';
            return;
        }
        this.els.pomoLog.innerHTML = todayLogs.map(p =>
            `<div class="pomo-log-item"><i class="lucide-check-circle-2" style="color:var(--success);"></i> Focus session at ${p.time}</div>`
        ).join('');
    }

    // ===================== NOTES =====================
    openNoteEditor(id = null) {
        this.editingNoteId = id;
        if (id) {
            const note = this.notes.find(n => n.id === id);
            if (!note) return;
            this.els.noteTitle.value = note.title;
            this.els.noteContent.value = note.content;
            this.els.noteColor.value = note.color || '#1e293b';
            this.els.deleteNoteBtn.style.display = 'inline-flex';
            // Set active color dot
            this.els.noteColorPicker.querySelectorAll('.color-dot').forEach(d => {
                d.classList.toggle('active', d.dataset.color === (note.color || '#1e293b'));
            });
        } else {
            this.els.noteTitle.value = '';
            this.els.noteContent.value = '';
            this.els.noteColor.value = '#1e293b';
            this.els.deleteNoteBtn.style.display = 'none';
            this.els.noteColorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            this.els.noteColorPicker.querySelector('.color-dot').classList.add('active');
        }
        this.els.noteModal.style.display = 'flex';
        this.els.noteTitle.focus();
    }

    closeNoteEditor() {
        this.els.noteModal.style.display = 'none';
        this.editingNoteId = null;
    }

    saveNote() {
        const title = this.els.noteTitle.value.trim() || 'Untitled';
        const content = this.els.noteContent.value.trim();
        if (!content && !title) return;
        
        if (this.editingNoteId) {
            const note = this.notes.find(n => n.id === this.editingNoteId);
            if (note) {
                note.title = title;
                note.content = content;
                note.color = this.els.noteColor.value;
                note.updatedAt = new Date().toISOString();
            }
        } else {
            this.notes.push({
                id: Date.now(),
                title,
                content,
                color: this.els.noteColor.value,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            this.logActivity('note', `Created note: ${title}`);
        }
        
        this.save('ph_notes', this.notes);
        this.closeNoteEditor();
        this.renderNotes();
    }

    deleteNote(id) {
        this.notes = this.notes.filter(n => n.id !== id);
        this.save('ph_notes', this.notes);
        this.renderNotes();
    }

    renderNotes() {
        let filtered = [...this.notes];
        if (this.noteSearchQuery) {
            filtered = filtered.filter(n =>
                n.title.toLowerCase().includes(this.noteSearchQuery) ||
                n.content.toLowerCase().includes(this.noteSearchQuery)
            );
        }
        
        if (filtered.length === 0) {
            this.els.notesGrid.innerHTML = `<div class="empty-state"><i class="lucide-file-text"></i><p>No notes yet. Create your first note!</p></div>`;
            return;
        }
        
        this.els.notesGrid.innerHTML = filtered.map(n =>
            `<div class="note-card" style="background:${n.color || '#1e293b'};" onclick="app.openNoteEditor(${n.id})">
                <div class="note-card-title">${this.escapeHtml(n.title)}</div>
                <div class="note-card-content">${this.escapeHtml(n.content)}</div>
                <div class="note-card-date">${this.formatRelativeDate(n.updatedAt || n.createdAt)}</div>
            </div>`
        ).join('');
    }

    // ===================== UTILITIES =====================
    save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
    today() { return new Date().toISOString().split('T')[0]; }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setGreeting() {
        const h = new Date().getHours();
        let greet = 'Good evening';
        if (h < 12) greet = 'Good morning';
        else if (h < 18) greet = 'Good afternoon';
        this.els.greeting.textContent = greet;
    }

    setCurrentDate() {
        this.els.currentDate.textContent = new Date().toLocaleDateString('en', {
            weekday: 'long', month: 'long', day: 'numeric'
        });
    }

    setDefaultDueDate() {
        this.els.dueDateInput.value = this.today();
    }

    logActivity(type, text) {
        this.activityLog.push({ type, text, date: new Date().toISOString() });
        if (this.activityLog.length > 100) this.activityLog = this.activityLog.slice(-100);
        this.save('ph_activity', this.activityLog);
    }

    updateStreak() {
        const today = this.today();
        const completedToday = this.tasks.some(t => t.completedDate && t.completedDate.startsWith(today));
        if (completedToday) {
            if (this.streakData.lastDate === today) {
                // Already counted today
            } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yStr = yesterday.toISOString().split('T')[0];
                if (this.streakData.lastDate === yStr) {
                    this.streakData.count++;
                } else {
                    this.streakData.count = 1;
                }
                this.streakData.lastDate = today;
                this.save('ph_streak', this.streakData);
            }
        }
        this.els.streakCount.textContent = `${this.streakData.count} day streak`;
    }

    formatRelativeDate(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    formatDate(dateStr) {
        return new Date(dateStr + 'T00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' });
    }
}

const app = new ProductivityHub();
