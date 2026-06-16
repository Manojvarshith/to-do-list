

import { loadState, saveTheme, resetStorage } from './js/storage.js';
import { GamificationManager, BADGES } from './js/gamification.js';
import { NotificationManager } from './js/notifications.js';
import { FocusManager } from './js/focus.js';
import { CalendarManager } from './js/calendar.js';
import { HabitManager, getLocalDateStr } from './js/habits.js';
import { TaskManager, CATEGORIES } from './js/tasks.js';
import { AnimationController } from './js/animations.js';

document.addEventListener('DOMContentLoaded', () => {
    
    let appState = loadState();

    
    const gamificationManager = new GamificationManager(appState, updateGamificationUI);
    
    const taskManager = new TaskManager(
        appState,
        () => { 
            appState.tasks = taskManager.getTasks();
            calendarManager.setTasks(appState.tasks);
            renderAll();
        },
        gamificationManager
    );

    const habitManager = new HabitManager(
        appState,
        () => { 
            appState.habits = habitManager.getHabits();
            renderAll();
        },
        gamificationManager
    );

    const focusManager = new FocusManager(gamificationManager);
    const notificationManager = new NotificationManager();

    
    const animationController = new AnimationController({
        onResetChart: () => {
            if (performanceChart) {
                performanceChart.destroy();
                performanceChart = null;
            }
        },
        onResetHeatmap: () => {
            window.shouldAnimateHeatmapOnce = true;
        }
    });

    
    const calendarManager = new CalendarManager(
        appState,
        (dateStr, timeStr) => {
            
            openAddTaskModalWithDate(dateStr, timeStr);
        },
        (taskId, dateStr, timeStr) => {
            
            const updateData = { dueDate: dateStr };
            if (timeStr !== undefined) {
                updateData.dueTime = timeStr || null;
            }
            taskManager.updateTask(taskId, updateData);
        }
    );

    
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const viewportTitle = document.getElementById('viewport-title');
    const headerDate = document.getElementById('header-date');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const appSidebar = document.getElementById('app-sidebar');
    const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
    const themeToggleBtn = document.getElementById('theme-toggle');

    
    const isDark = appState.theme === 'dark';
    document.body.classList.toggle('dark-theme', isDark);
    themeToggleBtn.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun"></i> <span>Toggle Theme</span>' 
        : '<i class="fa-solid fa-moon"></i> <span>Toggle Theme</span>';


    
    const addTaskModal = document.getElementById('add-task-modal');
    const addTaskForm = document.getElementById('add-task-form');
    const editTaskModal = document.getElementById('edit-task-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    
    
    const fabTriggerHeader = document.getElementById('fab-trigger-header');
    const openAddModalBtn = document.getElementById('open-add-modal-btn');

    
    let performanceChart = null;

    
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    headerDate.textContent = new Date().toLocaleDateString('en-US', dateOptions);

    
    
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
            
            
            navItems.forEach(i => {
                i.classList.remove('active');
                i.setAttribute('aria-selected', 'false');
            });
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');

            
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add('active');
                    animationController.onNavigation(targetTab, pane);
                }
            });

            
            const pageNames = {
                dashboard: 'Productivity Dashboard',
                tasks: 'Task Manager',
                habits: 'Habit Tracker',
                calendar: 'Calendar Planner',
                focus: 'Focus Arena',
                gamification: 'Achievements & Badges'
            };
            viewportTitle.textContent = pageNames[targetTab] || 'TaskFlow';
            
            
            appSidebar.classList.remove('active');

            
            if (targetTab === 'calendar') {
                calendarManager.render();
                animationController.replayStaggerAnimations(document.getElementById('tab-calendar'));
            } else if (targetTab === 'dashboard') {
                renderAll();
            } else if (targetTab === 'habits') {
                renderAll();
            }
        });
    });

    
    sidebarToggleBtn.addEventListener('click', () => appSidebar.classList.add('active'));
    mobileSidebarClose.addEventListener('click', () => appSidebar.classList.remove('active'));

    
    
    themeToggleBtn.addEventListener('click', () => {
        const isDarkToggled = document.body.classList.toggle('dark-theme');
        saveTheme(isDarkToggled ? 'dark' : 'light');
        themeToggleBtn.innerHTML = isDarkToggled 
            ? '<i class="fa-solid fa-sun"></i> <span>Toggle Theme</span>' 
            : '<i class="fa-solid fa-moon"></i> <span>Toggle Theme</span>';
        
        
        renderAll();
    });

    
    let activeChartView = 'weekly';
    const chartToggleWeekly = document.getElementById('chart-toggle-weekly');
    const chartToggleMonthly = document.getElementById('chart-toggle-monthly');
    const chartTitleText = document.getElementById('chart-title-text');
    
    if (chartToggleWeekly && chartToggleMonthly) {
        chartToggleWeekly.addEventListener('click', () => {
            chartToggleWeekly.classList.add('active');
            chartToggleMonthly.classList.remove('active');
            if (chartTitleText) chartTitleText.textContent = 'Weekly Performance';
            activeChartView = 'weekly';
            
            
            if (performanceChart) {
                performanceChart.destroy();
                performanceChart = null;
            }
            
            renderPerformanceChart();
        });
        chartToggleMonthly.addEventListener('click', () => {
            chartToggleMonthly.classList.add('active');
            chartToggleWeekly.classList.remove('active');
            if (chartTitleText) chartTitleText.textContent = 'Monthly Performance';
            activeChartView = 'monthly';
            
            
            if (performanceChart) {
                performanceChart.destroy();
                performanceChart = null;
            }
            
            renderPerformanceChart();
        });
    }

    
    
    
    
    
    const addRecurringToggle = document.getElementById('add-recurring-toggle');
    const addRecurrenceOptions = document.getElementById('add-recurrence-options');
    
    addRecurringToggle.addEventListener('change', () => {
        addRecurrenceOptions.classList.toggle('hidden', !addRecurringToggle.checked);
    });

    
    const editRecurringToggle = document.getElementById('edit-recurring-toggle');
    const editRecurrenceOptions = document.getElementById('edit-recurrence-options');
    
    editRecurringToggle.addEventListener('change', () => {
        editRecurrenceOptions.classList.toggle('hidden', !editRecurringToggle.checked);
    });

    
    fabTriggerHeader.addEventListener('click', () => openModal(addTaskModal));
    openAddModalBtn.addEventListener('click', () => openModal(addTaskModal));
    
    document.getElementById('close-add-modal-btn').addEventListener('click', () => closeModal(addTaskModal));
    document.getElementById('close-add-modal-btn2').addEventListener('click', () => closeModal(addTaskModal));
    document.getElementById('close-edit-modal-btn').addEventListener('click', () => closeModal(editTaskModal));
    document.getElementById('close-edit-modal-btn2').addEventListener('click', () => closeModal(editTaskModal));

    function openModal(modal) {
        modal.classList.add('active');
        
        const todayStr = getLocalDateStr(new Date());
        const dateInput = modal.querySelector('input[type="date"]');
        if (dateInput) dateInput.min = todayStr;
        
        
        animationController.animateModal(modal);
    }

    function closeModal(modal) {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
        const recurSub = modal.querySelector('.recurrence-subform');
        if (recurSub) recurSub.classList.add('hidden');
    }

    
    function openAddTaskModalWithDate(dateString, timeString = '') {
        openModal(addTaskModal);
        document.getElementById('add-date').value = dateString;
        if (timeString) {
            document.getElementById('add-time').value = timeString;
        }
    }

    
    addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('add-title').value.trim();
        const category = document.getElementById('add-category').value;
        const priority = document.getElementById('add-priority').value;
        const dueDate = document.getElementById('add-date').value;
        const dueTime = document.getElementById('add-time').value;
        const isRecurring = addRecurringToggle.checked;
        
        const errorText = document.getElementById('add-title-error');
        if (!title) {
            errorText.style.display = 'block';
            return;
        }
        errorText.style.display = 'none';

        const recurrence = {
            type: document.getElementById('add-recur-type').value,
            value: document.getElementById('add-recur-value').value,
            startTime: document.getElementById('add-recur-start').value,
            endTime: document.getElementById('add-recur-end').value
        };

        taskManager.addTask(title, category, priority, dueDate, dueTime, isRecurring, recurrence);
        closeModal(addTaskModal);
    });

    
    window.openEditModal = function(id) {
        const todo = appState.tasks.find(t => t.id === id);
        if (!todo) return;

        document.getElementById('edit-task-id').value = todo.id;
        document.getElementById('edit-title').value = todo.title;
        document.getElementById('edit-category').value = todo.category;
        document.getElementById('edit-priority').value = todo.priority;
        document.getElementById('edit-date').value = todo.dueDate || '';
        document.getElementById('edit-time').value = todo.dueTime || '';
        
        const isRecur = !!todo.isRecurring;
        editRecurringToggle.checked = isRecur;
        editRecurrenceOptions.classList.toggle('hidden', !isRecur);
        
        if (isRecur && todo.recurrence) {
            document.getElementById('edit-recur-type').value = todo.recurrence.type;
            document.getElementById('edit-recur-value').value = todo.recurrence.value;
            document.getElementById('edit-recur-start').value = todo.recurrence.startTime || '07:00';
            document.getElementById('edit-recur-end').value = todo.recurrence.endTime || '23:00';
        }

        openModal(editTaskModal);
    };

    
    editTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = document.getElementById('edit-task-id').value;
        const title = document.getElementById('edit-title').value.trim();
        const category = document.getElementById('edit-category').value;
        const priority = document.getElementById('edit-priority').value;
        const dueDate = document.getElementById('edit-date').value;
        const dueTime = document.getElementById('edit-time').value;
        const isRecurring = editRecurringToggle.checked;

        if (!title) return;

        const recurrence = isRecurring ? {
            type: document.getElementById('edit-recur-type').value,
            value: parseInt(document.getElementById('edit-recur-value').value) || 1,
            startTime: document.getElementById('edit-recur-start').value,
            endTime: document.getElementById('edit-recur-end').value,
            isPaused: false
        } : null;

        taskManager.updateTask(id, {
            title,
            category,
            priority,
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            isRecurring,
            recurrence
        });

        closeModal(editTaskModal);
    });

    
    window.deleteTask = function(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        if (taskItem && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            taskItem.classList.remove('task-item-new');
            taskItem.classList.add('task-item-delete');
            taskItem.addEventListener('animationend', () => {
                taskManager.deleteTask(id, () => {
                    renderAll();
                });
            });
        } else {
            taskManager.deleteTask(id, () => {
                renderAll();
            });
        }
    };

    
    window.toggleComplete = function(id) {
        const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
        if (taskItem && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const isChecking = !taskItem.classList.contains('completed');
            if (isChecking) {
                taskItem.classList.remove('task-item-new');
                taskItem.classList.add('completed');
                setTimeout(() => {
                    taskManager.toggleComplete(id);
                }, 450);
            } else {
                taskItem.classList.remove('completed');
                taskManager.toggleComplete(id);
            }
        } else {
            taskManager.toggleComplete(id);
        }
    };

    
    window.togglePauseRecurrence = function(id) {
        taskManager.togglePauseRecurrence(id);
        renderAll();
    };

    
    
    
    const habitForm = document.getElementById('habit-form');
    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('habit-title-input').value.trim();
        const category = document.getElementById('habit-category-select').value;
        
        if (title) {
            habitManager.addHabit(title, category);
            habitForm.reset();
        }
    });

    window.toggleHabitDate = function(id, dateStr) {
        habitManager.toggleHabitDate(id, dateStr);
    };

    window.deleteHabit = function(id) {
        if (confirm('Delete this habit permanently?')) {
            habitManager.deleteHabit(id);
        }
    };

    
    
    
    const timerTimeDisplay = document.getElementById('timer-time-display');
    const timerModeLabel = document.getElementById('timer-mode-label');
    const timerPlayBtn = document.getElementById('timer-play-btn');
    const timerPauseBtn = document.getElementById('timer-pause-btn');
    const timerResetBtn = document.getElementById('timer-reset-btn');
    const timerFullscreenBtn = document.getElementById('timer-fullscreen-btn');
    const timerProgressRing = document.getElementById('timer-progress-ring');
    const timerModeBtns = document.querySelectorAll('.timer-mode-btn');

    
    const fullscreenOverlay = document.getElementById('fullscreen-focus-overlay');
    const fsTimerTime = document.getElementById('fs-timer-time');
    const fsTimerLabel = document.getElementById('fs-timer-label');
    const fsPlayBtn = document.getElementById('fs-play-btn');
    const fsPauseBtn = document.getElementById('fs-pause-btn');
    const fsResetBtn = document.getElementById('fs-reset-btn');
    const exitFullscreenBtn = document.getElementById('exit-fullscreen-focus');

    
    timerModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timerModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-focus-mode');
            focusManager.setMode(mode);
            
            
            animationController.replayStaggerAnimations(document.getElementById('tab-focus'));
        });
    });

    
    function playTimer() {
        focusManager.start(
            (tickState) => { 
                const minStr = String(tickState.minutes).padStart(2, '0');
                const secStr = String(tickState.seconds).padStart(2, '0');
                const timeText = `${minStr}:${secStr}`;
                
                
                timerTimeDisplay.textContent = timeText;
                fsTimerTime.textContent = timeText;
                
                
                const offset = 552.9 - (552.9 * tickState.percentage / 100);
                timerProgressRing.style.strokeDashoffset = offset;

                
                const labels = {
                    work: 'FOCUS ON WORK',
                    short: 'SHORT BREAK',
                    long: 'LONG BREAK'
                };
                timerModeLabel.textContent = labels[tickState.mode];
                fsTimerLabel.textContent = labels[tickState.mode];
            },
            (completedMode) => { 
                
                timerPlayBtn.classList.remove('hidden');
                timerPauseBtn.classList.add('hidden');
                fsPlayBtn.classList.remove('hidden');
                fsPauseBtn.classList.add('hidden');
            }
        );
        
        timerPlayBtn.classList.add('hidden');
        timerPauseBtn.classList.remove('hidden');
        fsPlayBtn.classList.add('hidden');
        fsPauseBtn.classList.remove('hidden');
    }

    
    function pauseTimer() {
        focusManager.stop();
        timerPlayBtn.classList.remove('hidden');
        timerPauseBtn.classList.add('hidden');
        fsPlayBtn.classList.remove('hidden');
        fsPauseBtn.classList.add('hidden');
    }

    
    function resetTimer() {
        focusManager.reset();
        timerPlayBtn.classList.remove('hidden');
        timerPauseBtn.classList.add('hidden');
        fsPlayBtn.classList.remove('hidden');
        fsPauseBtn.classList.add('hidden');
        timerProgressRing.style.strokeDashoffset = 0;
    }

    timerPlayBtn.addEventListener('click', playTimer);
    fsPlayBtn.addEventListener('click', playTimer);
    timerPauseBtn.addEventListener('click', pauseTimer);
    fsPauseBtn.addEventListener('click', pauseTimer);
    timerResetBtn.addEventListener('click', resetTimer);
    fsResetBtn.addEventListener('click', resetTimer);

    
    timerFullscreenBtn.addEventListener('click', () => {
        fullscreenOverlay.classList.add('active');
        animationController.animateModal(fullscreenOverlay);
    });
    exitFullscreenBtn.addEventListener('click', () => {
        fullscreenOverlay.classList.remove('active');
    });

    
    const soundSelectBtns = document.querySelectorAll('.sound-select-btn');
    const volumeSlider = document.getElementById('ambient-volume-slider');

    soundSelectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            soundSelectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-sound');
            focusManager.startAmbientNoise(type);
        });
    });

    volumeSlider.addEventListener('input', (e) => {
        focusManager.setAmbientVolume(parseFloat(e.target.value));
    });

    
    document.getElementById('apply-durations-btn').addEventListener('click', () => {
        const w = document.getElementById('dur-work').value;
        const s = document.getElementById('dur-short').value;
        const l = document.getElementById('dur-long').value;
        focusManager.setCustomDuration(w, s, l);
        resetTimer();
        alert('Timer lengths customized!');
    });

    
    
    
    const alarmModal = document.getElementById('alarm-trigger-modal');
    const alarmTaskTitle = document.getElementById('alarm-task-title');
    const alarmTaskTime = document.getElementById('alarm-task-time');
    const alarmDismissBtn = document.getElementById('alarm-dismiss-btn');
    const alarmSnoozeBtn = document.getElementById('alarm-snooze-btn');
    const alarmSnoozeSelect = document.getElementById('alarm-snooze-select');
    let currentAlarmTaskId = null;

    function triggerReminderPopup(task) {
        currentAlarmTaskId = task.id;
        alarmTaskTitle.textContent = task.title;
        alarmTaskTime.textContent = task.dueTime;
        alarmModal.classList.add('active');
        animationController.animateModal(alarmModal);
    }

    alarmDismissBtn.addEventListener('click', () => {
        notificationManager.stopAlarmSound();
        alarmModal.classList.remove('active');
        currentAlarmTaskId = null;
    });

    alarmSnoozeBtn.addEventListener('click', () => {
        if (!currentAlarmTaskId) return;
        const minutes = parseInt(alarmSnoozeSelect.value) || 5;
        
        notificationManager.stopAlarmSound();
        taskManager.snoozeTask(currentAlarmTaskId, minutes);
        
        alarmModal.classList.remove('active');
        currentAlarmTaskId = null;
        alert(`Task reminder snoozed for ${minutes} minutes!`);
    });

    
    notificationManager.startReminderCheckLoop(
        () => taskManager.getTasks(),
        (triggeredTask) => triggerReminderPopup(triggeredTask)
    );

    
    
    
    document.getElementById('cal-btn-prev').addEventListener('click', () => calendarManager.prev());
    document.getElementById('cal-btn-next').addEventListener('click', () => calendarManager.next());
    document.getElementById('cal-btn-today').addEventListener('click', () => calendarManager.today());
    
    document.querySelectorAll('.cal-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cal-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calendarManager.setView(btn.getAttribute('data-view'));
            
            
            animationController.replayStaggerAnimations(document.getElementById('tab-calendar'));
        });
    });

    
    
    
    const taskSearch = document.getElementById('task-search');
    const filterCategory = document.getElementById('filter-category');
    const filterPriority = document.getElementById('filter-priority');
    const taskSort = document.getElementById('task-sort');
    const statusTabs = document.querySelectorAll('.status-tab');
    
    let activeStatusTab = 'all';

    taskSearch.addEventListener('input', renderAll);
    filterCategory.addEventListener('change', renderAll);
    filterPriority.addEventListener('change', renderAll);
    taskSort.addEventListener('change', renderAll);
    
    statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            statusTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            activeStatusTab = tab.getAttribute('data-status');
            renderAll();
            
            
            animationController.replayStaggerAnimations(document.getElementById('tab-tasks'));
        });
    });

    
    
    
    function calculateProductivityScore() {
        const total = appState.tasks.length;
        const completed = appState.tasks.filter(t => t.completed).length;
        const overdue = countOverdueTasks();
        
        let score = 50; 

        if (total > 0) {
            score += (completed / total) * 35; 
        }
        
        
        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        score += maxStreak * 2;
        
        
        const todayStr = getLocalDateStr(new Date());
        let completedHabitsToday = 0;
        appState.habits.forEach(h => {
            if (h.history && h.history[todayStr]) completedHabitsToday++;
        });
        score += completedHabitsToday * 3;

        
        score -= overdue * 8;

        
        const roundedScore = Math.max(0, Math.min(100, Math.round(score)));
        appState.productivityScore = roundedScore;
        
        const scoreValText = document.getElementById('score-value');
        const prevScore = scoreValText ? (parseInt(scoreValText.getAttribute('data-score')) || 0) : 0;

        
        const scoreRing = document.getElementById('score-ring');
        if (scoreRing) {
            const offset = 263.8 - (263.8 * roundedScore / 100);
            scoreRing.style.strokeDashoffset = offset;
        }

        
        const ringWrap = document.querySelector('.progress-ring-wrap');
        if (ringWrap && roundedScore > prevScore) {
            ringWrap.classList.remove('pulse-effect');
            void ringWrap.offsetWidth; 
            ringWrap.classList.add('pulse-effect');
        }

        if (scoreValText) {
            animateCounter('score-value', prevScore, roundedScore);
            scoreValText.setAttribute('data-score', roundedScore);
        }

        return roundedScore;
    }

    function countOverdueTasks() {
        const todayStr = getLocalDateStr(new Date());
        return appState.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
    }

    
    
    
    function renderAll() {
        const isDarkTheme = document.body.classList.contains('dark-theme');
        
        
        renderTasksList();
        
        
        renderHabitsBoard();

        
        const shouldAnimateHeatmap = window.shouldAnimateHeatmapOnce || false;
        habitManager.drawHeatmap('habit-heatmap', isDarkTheme, shouldAnimateHeatmap);
        window.shouldAnimateHeatmapOnce = false;

        
        calculateProductivityScore();
        updateDashboardCards();
        updateProductivityReports();

        
        gamificationManager.recalculateBadges(appState);

        
        updateProfileXPPanel();

        
        renderPerformanceChart();

        
        renderCalendarInbox();
        
        
        renderProfileStatsPanel();
    }

    
    function updateGamificationUI() {
        updateProfileXPPanel();
        updateDashboardCards();
        renderAchievementsTab();
        renderProfileStatsPanel();
    }

    function updateProfileXPPanel() {
        document.getElementById('user-level').textContent = gamificationManager.level;
        document.getElementById('ach-level-title').textContent = getRankTitle(gamificationManager.level);
        
        const xpNeeded = gamificationManager.getXpForNextLevel();
        const percent = Math.min(100, (gamificationManager.xp / xpNeeded) * 100);
        
        document.getElementById('user-xp-fill').style.width = `${percent}%`;
        document.getElementById('user-xp-text').textContent = `XP: ${gamificationManager.xp} / ${xpNeeded} (${xpNeeded - gamificationManager.xp} XP remaining)`;
        
        const nextXpText = document.getElementById('ach-xp-to-go');
        if (nextXpText) {
            nextXpText.textContent = `${xpNeeded - gamificationManager.xp} XP`;
        }
    }

    function renderProfileStatsPanel() {
        const levelEl = document.getElementById('stat-current-level');
        const xpEl = document.getElementById('stat-current-xp');
        const totalXpEl = document.getElementById('stat-total-xp');
        const createdEl = document.getElementById('stat-tasks-created');
        const completedEl = document.getElementById('stat-tasks-completed');
        const currentStreakEl = document.getElementById('stat-current-streak');
        const longestStreakEl = document.getElementById('stat-longest-streak');
        const prodScoreEl = document.getElementById('stat-prod-score');

        if (levelEl) levelEl.textContent = gamificationManager.level;
        if (xpEl) xpEl.textContent = gamificationManager.xp;
        if (totalXpEl) totalXpEl.textContent = gamificationManager.totalXpEarned;
        if (createdEl) createdEl.textContent = appState.totalTasksCreated || 0;
        if (completedEl) completedEl.textContent = appState.totalTasksCompleted || 0;
        
        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        const longestStreak = Math.max(0, ...appState.habits.map(h => h.longestStreak || 0));
        if (currentStreakEl) currentStreakEl.textContent = maxStreak;
        if (longestStreakEl) longestStreakEl.textContent = longestStreak;
        if (prodScoreEl) prodScoreEl.textContent = appState.productivityScore || 50;
    }

    function getRankTitle(level) {
        if (level < 3) return 'Novice Astronaut';
        if (level < 6) return 'Focus Voyager';
        if (level < 10) return 'Streak Explorer';
        return 'Productivity Titan';
    }

    
    function animateCounter(elementId, startValue, endValue, duration = 1000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        let start = parseInt(el.getAttribute('data-value')) || startValue;
        let end = parseInt(endValue) || 0;
        
        if (start === end) {
            el.textContent = end;
            el.setAttribute('data-value', end);
            return;
        }
        
        let startTime = null;
        
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const value = Math.floor(start + easeProgress * (end - start));
            el.textContent = value;
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                el.textContent = end;
                el.setAttribute('data-value', end);
            }
        }
        
        requestAnimationFrame(animation);
    }

    
    function animateStreakCounter(elementId, startValue, endValue, duration = 1000) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        let start = parseInt(el.getAttribute('data-value')) || startValue;
        let end = parseInt(endValue) || 0;
        
        if (start === end) {
            el.textContent = `${end} ${end === 1 ? 'Day' : 'Days'}`;
            el.setAttribute('data-value', end);
            return;
        }
        
        let startTime = null;
        
        function animation(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const value = Math.floor(start + easeProgress * (end - start));
            el.textContent = `${value} ${value === 1 ? 'Day' : 'Days'}`;
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            } else {
                el.textContent = `${end} ${end === 1 ? 'Day' : 'Days'}`;
                el.setAttribute('data-value', end);
            }
        }
        
        requestAnimationFrame(animation);
    }

    
    function updateDashboardCards() {
        const total = appState.tasks.length;
        const completed = appState.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const overdue = countOverdueTasks();

        animateCounter('dash-total', 0, total);
        animateCounter('dash-pending', 0, pending);
        animateCounter('dash-completed', 0, completed);
        animateCounter('dash-overdue', 0, overdue);

        
        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        animateStreakCounter('dash-streak-count', 0, maxStreak);

        
        const remindersList = document.getElementById('dash-reminders-list');
        if (remindersList) {
            const upcomingTasks = appState.tasks
                .filter(t => !t.completed && t.dueDate && t.dueTime)
                .sort((a,b) => new Date(`${a.dueDate}T${a.dueTime}`) - new Date(`${b.dueDate}T${b.dueTime}`))
                .slice(0, 3);
            
            const currentIds = upcomingTasks.map(t => t.id);
            
            if (upcomingTasks.length === 0) {
                remindersList.innerHTML = '<li class="reminder-item slide-in-notification"><span class="rem-title">No upcoming alerts scheduled</span></li>';
            } else {
                
                const childrenArray = Array.from(remindersList.children);
                childrenArray.forEach(child => {
                    const id = child.getAttribute('data-id');
                    if (id && !currentIds.includes(id)) {
                        child.classList.remove('slide-in-notification');
                        child.classList.add('slide-out-notification');
                        setTimeout(() => {
                            try { child.remove(); } catch(e) {}
                        }, 500);
                    }
                });

                
                upcomingTasks.forEach((t, index) => {
                    let existingItem = remindersList.querySelector(`li[data-id="${t.id}"]`);
                    if (!existingItem) {
                        const li = document.createElement('li');
                        li.className = 'reminder-item slide-in-notification';
                        li.setAttribute('data-id', t.id);
                        li.innerHTML = `
                            <div>
                                <span class="rem-title">${escapeHTML(t.title)}</span>
                                <span class="rem-time"><i class="fa-solid fa-clock"></i> ${t.dueDate} at ${t.dueTime}</span>
                            </div>
                            <span class="badge badge-${t.priority}">${t.priority}</span>
                        `;
                        if (index < remindersList.children.length) {
                            remindersList.insertBefore(li, remindersList.children[index]);
                        } else {
                            remindersList.appendChild(li);
                        }
                    } else {
                        
                        existingItem.innerHTML = `
                            <div>
                                <span class="rem-title">${escapeHTML(t.title)}</span>
                                <span class="rem-time"><i class="fa-solid fa-clock"></i> ${t.dueDate} at ${t.dueTime}</span>
                            </div>
                            <span class="badge badge-${t.priority}">${t.priority}</span>
                        `;
                    }
                });
            }
        }

        
        const showcaseFlex = document.getElementById('dash-badges-flex');
        if (showcaseFlex) {
            showcaseFlex.innerHTML = BADGES.map(badge => {
                const isUnlocked = gamificationManager.unlockedBadges.includes(badge.id);
                return `
                    <div class="badge-showcase-tile ${isUnlocked ? 'unlocked' : ''}" title="${badge.name}: ${badge.desc}">
                        <i class="fa-solid ${badge.icon}"></i>
                    </div>
                `;
            }).join('');
        }
    }

    
    
    
    function renderTasksList() {
        const query = taskSearch.value.toLowerCase().trim();
        const catFilter = filterCategory.value;
        const priorityFilter = filterPriority.value;
        const sortBy = taskSort.value;
        
        const todayStr = getLocalDateStr(new Date());

        
        let filtered = appState.tasks.filter(task => {
            
            const matchesQuery = !query || 
                task.title.toLowerCase().includes(query) ||
                task.priority.toLowerCase().includes(query) ||
                task.category.toLowerCase().includes(query);
            
            if (!matchesQuery) return false;

            
            if (catFilter !== 'all' && task.category !== catFilter) return false;

            
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

            
            if (activeStatusTab === 'pending' && task.completed) return false;
            if (activeStatusTab === 'completed' && !task.completed) return false;

            return true;
        });

        
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'created-asc':
                    return a.createdAt - b.createdAt;
                case 'created-desc':
                    return b.createdAt - a.createdAt;
                case 'due-asc':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'due-desc':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(b.dueDate) - new Date(a.dueDate);
                case 'priority-desc':
                    return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
                case 'priority-asc':
                    return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                default:
                    return b.createdAt - a.createdAt;
            }
        });

        
        const emptyState = document.getElementById('tasks-empty-state');
        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            document.querySelectorAll('.task-group-container').forEach(c => c.style.display = 'none');
            return;
        }
        emptyState.classList.add('hidden');

        
        const overdueGroup = filtered.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr);
        const todayGroup = filtered.filter(t => !t.completed && t.dueDate === todayStr);
        const upcomingGroup = filtered.filter(t => !t.completed && t.dueDate && t.dueDate > todayStr);
        const nodateGroup = filtered.filter(t => t.completed || !t.dueDate);

        renderGroup('list-overdue', overdueGroup, 'tasks-group-overdue');
        renderGroup('list-today', todayGroup, 'tasks-group-today');
        renderGroup('list-upcoming', upcomingGroup, 'tasks-group-upcoming');
        renderGroup('list-nodate', nodateGroup, 'tasks-group-nodate');
    }

    function renderGroup(listId, groupTasks, containerId) {
        const list = document.getElementById(listId);
        const container = document.getElementById(containerId);
        
        if (groupTasks.length === 0) {
            container.style.display = 'none';
            list.innerHTML = '';
            return;
        }
        
        container.style.display = 'block';
        const todayStr = getLocalDateStr(new Date());

        list.innerHTML = groupTasks.map(task => {
            const catInfo = CATEGORIES[task.category] || { label: 'Personal', icon: 'fa-user' };
            const priorityBadge = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            
            
            let recurHTML = '';
            if (task.isRecurring && task.recurrence) {
                const pausedClass = task.recurrence.isPaused ? 'paused' : '';
                const titleStr = task.recurrence.isPaused ? 'Recurring task is paused' : 'Recurring: ' + task.recurrence.type;
                recurHTML = `
                    <span class="badge recur-badge ${pausedClass}" title="${titleStr}">
                        <i class="fa-solid fa-rotate"></i> ${task.recurrence.type}
                    </span>
                `;
            }

            
            let dateHTML = '';
            if (task.dueDate) {
                const isOverdue = !task.completed && task.dueDate < todayStr;
                dateHTML = `
                    <span class="badge date-badge ${isOverdue ? 'overdue' : ''}">
                        <i class="fa-regular fa-calendar"></i> ${task.dueDate} ${task.dueTime ? `at ${task.dueTime}` : ''}
                    </span>
                `;
            }

            
            let pauseBtnHTML = '';
            if (task.isRecurring) {
                const isPaused = task.recurrence?.isPaused;
                pauseBtnHTML = `
                    <button class="action-btn pause-btn" onclick="togglePauseRecurrence('${task.id}')" title="${isPaused ? 'Resume recurring schedule' : 'Pause recurring schedule'}">
                        <i class="fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}"></i>
                    </button>
                `;
            }

            const isNew = (Date.now() - task.createdAt) < 1500;
            const newClass = isNew ? 'task-item-new' : '';

            return `
                <li class="task-item ${task.completed ? 'completed' : ''} ${newClass}" data-id="${task.id}">
                    <div class="task-item-left">
                        <label class="checkbox-wrapper" aria-label="Mark task complete">
                            <input type="checkbox" ${task.completed ? 'checked' : ''} onclick="toggleComplete('${task.id}')">
                            <span class="checkmark"></span>
                        </label>
                        <div class="task-content">
                            <span class="task-title">${escapeHTML(task.title)}</span>
                            <div class="task-meta">
                                <span class="badge category-badge">
                                    <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.label}
                                </span>
                                <span class="badge badge-${task.priority}">
                                    <i class="fa-solid fa-circle" style="font-size: 0.5rem; margin-right: 2px;"></i> ${priorityBadge}
                                </span>
                                ${dateHTML}
                                ${recurHTML}
                            </div>
                        </div>
                    </div>
                    <div class="task-actions">
                        ${pauseBtnHTML}
                        <button class="action-btn edit-btn" onclick="openEditModal('${task.id}')" aria-label="Modify Task Details">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTask('${task.id}')" aria-label="Remove Task">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </li>
            `;
        }).join('');
    }

    function getPriorityWeight(priority) {
        const weights = { critical: 4, high: 3, medium: 2, low: 1 };
        return weights[priority] || 2;
    }

    
    
    
    function renderHabitsBoard() {
        const habitsEmptyState = document.getElementById('habits-empty-state');
        const habitsTableWrap = document.getElementById('habits-table-wrap');
        
        if (appState.habits.length === 0) {
            habitsEmptyState.classList.remove('hidden');
            habitsTableWrap.classList.add('hidden');
            return;
        }

        habitsEmptyState.classList.add('hidden');
        habitsTableWrap.classList.remove('hidden');

        
        const headersTr = document.getElementById('habits-table-headers');
        
        const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const datesArray = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            datesArray.push(d);
        }

        let headersHTML = '<th>Habit details</th>';
        datesArray.forEach(d => {
            headersHTML += `
                <th class="habit-chk-cell">
                    ${weekdayNames[d.getDay()]}<br>
                    <span style="font-size: 0.7rem; color: var(--text-light);">${d.getDate()}</span>
                </th>
            `;
        });
        headersHTML += '<th style="text-align: center;">Streak</th>';
        headersHTML += '<th style="text-align: center;">Rate</th>';
        headersHTML += '<th></th>';
        headersTr.innerHTML = headersHTML;

        
        const tbody = document.getElementById('habits-table-body');
        tbody.innerHTML = appState.habits.map(habit => {
            const catInfo = CATEGORIES[habit.category] || { label: 'Health', icon: 'fa-heart-pulse' };
            const stats = habitManager.getHabitStats(habit);

            let checkboxesHTML = '';
            datesArray.forEach(d => {
                const dateStr = getLocalDateStr(d);
                const isChecked = !!habit.history[dateStr];
                
                checkboxesHTML += `
                    <td class="habit-chk-cell">
                        <button class="habit-checkbox ${isChecked ? 'checked' : ''}" onclick="toggleHabitDate('${habit.id}', '${dateStr}')">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    </td>
                `;
            });

            return `
                <tr>
                    <td class="habit-name-cell">
                        <div class="habit-title">${escapeHTML(habit.title)}</div>
                        <div class="habit-cell-cat">
                            <i class="fa-solid ${catInfo.icon}" style="color: ${catInfo.color}"></i> ${catInfo.label}
                        </div>
                    </td>
                    ${checkboxesHTML}
                    <td style="text-align: center;">
                        <span class="habit-streak-badge">
                            <i class="fa-solid fa-fire"></i> ${habit.streak}d
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <span class="habit-completion-percent">${stats.completionRate}%</span>
                    </td>
                    <td>
                        <button class="habit-delete-btn" onclick="deleteHabit('${habit.id}')" aria-label="Delete Habit">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    
    
    
    function renderAchievementsTab() {
        const gallery = document.getElementById('achievements-gallery-container');
        if (!gallery) return;

        gallery.innerHTML = BADGES.map(badge => {
            const isUnlocked = gamificationManager.unlockedBadges.includes(badge.id);
            return `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                    <div class="badge-status-stamp">
                        ${isUnlocked ? '<span class="stamp-unlocked"><i class="fa-solid fa-circle-check"></i> Unlocked</span>' : '<span class="stamp-locked"><i class="fa-solid fa-lock"></i> Locked</span>'}
                    </div>
                    <div class="ach-icon-circle">
                        <i class="fa-solid ${badge.icon}"></i>
                    </div>
                    <h4>${badge.name}</h4>
                    <p>${badge.desc}</p>
                    <span class="ach-xp-reward">+${badge.xp} XP Reward</span>
                </div>
            `;
        }).join('');
    }

    
    
    
    
    
    
    function renderPerformanceChart() {
        const canvas = document.getElementById('analytics-chart');
        if (!canvas) return;

        const labels = [];
        const data = [];
        const daysToRender = activeChartView === 'weekly' ? 7 : 30;
        
        for (let i = daysToRender - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getLocalDateStr(d);
            
            
            if (activeChartView === 'weekly') {
                labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            } else {
                
                if (i % 5 === 0 || i === daysToRender - 1 || i === 0) {
                    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                } else {
                    labels.push('');
                }
            }
            
            
            const completedCount = appState.tasks.filter(t => t.completed && t.dueDate === dateStr).length;
            data.push(completedCount);
        }

        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
        const labelColor = isDark ? '#94a3b8' : '#64748b';

        const ctx = canvas.getContext('2d');
        
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

        
        if (performanceChart) {
            performanceChart.data.labels = labels;
            performanceChart.data.datasets[0].data = data;
            performanceChart.data.datasets[0].pointRadius = activeChartView === 'weekly' ? 4 : 2;
            performanceChart.data.datasets[0].backgroundColor = gradient;
            performanceChart.options.scales.y.grid.color = gridColor;
            performanceChart.options.scales.y.ticks.color = labelColor;
            performanceChart.options.scales.x.ticks.color = labelColor;
            performanceChart.update();
            return;
        }

        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data: data,
                    borderColor: '#6366f1',
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: activeChartView === 'weekly' ? 4 : 2,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                },
                animations: {
                    y: {
                        duration: 1000,
                        easing: 'easeOutQuart',
                        from: 150
                    }
                },
                scales: {
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: labelColor,
                            font: { family: 'Outfit', size: 10 },
                            stepSize: 1,
                            precision: 0
                        },
                        border: { dash: [4, 4] }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: labelColor,
                            font: { family: 'Outfit', size: 10 }
                        }
                    }
                }
            }
        });
    }

    
    function renderCalendarInbox() {
        const inboxList = document.getElementById('calendar-unscheduled-list');
        if (!inboxList) return;

        const unscheduledTasks = appState.tasks.filter(t => !t.dueDate);
        
        if (unscheduledTasks.length === 0) {
            inboxList.innerHTML = '<li class="sidebar-p-hint">No unscheduled tasks</li>';
            return;
        }

        inboxList.innerHTML = unscheduledTasks.map(task => {
            const catInfo = CATEGORIES[task.category] || { label: 'Personal', icon: 'fa-user', color: '#ec4899' };
            return `
                <li class="calendar-drag-item" draggable="true" data-task-id="${task.id}">
                    <span class="drag-item-title">${escapeHTML(task.title)}</span>
                    <span class="badge badge-${task.priority}" style="font-size: 0.65rem; padding: 1px 6px;">${task.priority}</span>
                </li>
            `;
        }).join('');

        
        inboxList.querySelectorAll('.calendar-drag-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const taskId = item.getAttribute('data-task-id');
                e.dataTransfer.setData('text/plain', taskId);
                e.dataTransfer.effectAllowed = 'move';
            });
        });
    }

    
    function updateProductivityReports() {
        const reportsSummary = document.getElementById('dash-reports-summary');
        if (!reportsSummary) return;

        let completedLast7Days = 0;
        let completedLast30Days = 0;
        
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        for (let i = 0; i < 7; i++) {
            const d = new Date(now - i * oneDayMs);
            const dateStr = getLocalDateStr(d);
            completedLast7Days += appState.tasks.filter(t => t.completed && t.dueDate === dateStr).length;
        }

        for (let i = 0; i < 30; i++) {
            const d = new Date(now - i * oneDayMs);
            const dateStr = getLocalDateStr(d);
            completedLast30Days += appState.tasks.filter(t => t.completed && t.dueDate === dateStr).length;
        }

        const maxStreak = Math.max(0, ...appState.habits.map(h => h.streak));
        const totalHabits = appState.habits.length;

        reportsSummary.innerHTML = `
            <div class="report-section">
                <h4 class="report-subheader"><i class="fa-solid fa-calendar-week"></i> Weekly Report</h4>
                <p>Completed <strong>${completedLast7Days}</strong> tasks in the last 7 days.</p>
            </div>
            <div class="report-section" style="margin-top: 15px;">
                <h4 class="report-subheader"><i class="fa-solid fa-calendar-month"></i> Monthly Report</h4>
                <p>Completed <strong>${completedLast30Days}</strong> tasks in the last 30 days.</p>
                <p>Peak habit streak: <strong>${maxStreak}</strong> days across <strong>${totalHabits}</strong> active habits.</p>
            </div>
        `;
    }

    
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    
    function triggerTabAnimations(activePane) {
        if (!activePane || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        
        const cards = activePane.querySelectorAll('.metric-card, .dashboard-welcome, .dashboard-card, .analytics-card, .task-item, .habit-item, .calendar-grid-container-card, .calendar-sidebar-panel, .focus-arena-card, .badge-card, .achievement-card');
        
        cards.forEach((card, index) => {
            card.classList.remove('stagger-in');
            void card.offsetWidth; 
            card.style.animationDelay = `${index * 0.06}s`;
            card.classList.add('stagger-in');
        });
    }

    
    const mouseGlow = document.getElementById('mouse-glow');
    if (mouseGlow) {
        document.addEventListener('mousemove', (e) => {
            mouseGlow.style.left = `${e.clientX}px`;
            mouseGlow.style.top = `${e.clientY}px`;
        });
    }

    
    document.addEventListener('mousemove', (e) => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        
        const card = e.target.closest('.metric-card, .dashboard-card, .analytics-card, .achievement-card');
        if (card) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * 10; 
            const rotateY = -((x - centerX) / centerX) * 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.008)`;
            card.style.transition = 'transform 0.08s ease-out';
        }
        
        
        const btn = e.target.closest('.primary-btn, .secondary-btn, .sidebar-theme-btn, .timer-mode-btn, .cal-view-btn, .timer-control-btn');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;
            
            const strength = 0.3; 
            const mx = deltaX * strength;
            const my = deltaY * strength;
            
            btn.style.transform = `translate(${mx}px, ${my}px) scale(1.02)`;
            btn.style.transition = 'transform 0.08s ease-out';
        }
    });

    
    document.addEventListener('mouseout', (e) => {
        const card = e.target.closest('.metric-card, .dashboard-card, .analytics-card, .achievement-card');
        if (card && (!e.relatedTarget || !card.contains(e.relatedTarget))) {
            card.style.transform = '';
            card.style.transition = 'transform 0.4s ease';
        }
        
        const btn = e.target.closest('.primary-btn, .secondary-btn, .sidebar-theme-btn, .timer-mode-btn, .cal-view-btn, .timer-control-btn');
        if (btn && (!e.relatedTarget || !btn.contains(e.relatedTarget))) {
            btn.style.transform = '';
            btn.style.transition = 'transform 0.4s ease';
        }
    });

    
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsModal = document.getElementById('settings-modal');
    
    if (settingsToggle && settingsModal) {
        settingsToggle.addEventListener('click', () => openModal(settingsModal));
        document.getElementById('close-settings-modal-btn').addEventListener('click', () => closeModal(settingsModal));
        document.getElementById('close-settings-modal-btn2').addEventListener('click', () => closeModal(settingsModal));
    }

    const confirmResetModal = document.getElementById('confirm-reset-modal');
    const confirmResetMessage = document.getElementById('confirm-reset-message');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    let activeResetType = null;

    const resetMessages = {
        xp: 'This will reset your current XP and total XP earned to 0. Are you sure?',
        level: 'This will reset your current level back to 1. Are you sure?',
        badges: 'This will lock all achievements and badges. Are you sure?',
        habits: 'This will delete all of your habits and their check-in histories. Are you sure?',
        analytics: 'This will reset your tasks created and completed statistics counters, and set all tasks status back to pending. Are you sure?',
        all: 'This will permanently delete all tasks, habits, stats, and achievements data. This action is irreversible. Are you sure?'
    };

    document.querySelectorAll('.reset-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-reset');
            activeResetType = type;
            confirmResetMessage.textContent = resetMessages[type] || 'Are you sure you want to reset this data?';
            openModal(confirmResetModal);
        });
    });

    if (confirmCancelBtn) {
        confirmCancelBtn.addEventListener('click', () => closeModal(confirmResetModal));
    }

    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', () => {
            if (activeResetType) {
                resetStorage(activeResetType);
                closeModal(confirmResetModal);
                closeModal(settingsModal);
                alert('Data successfully reset!');
                window.location.reload();
            }
        });
    }

    // Backup & Portability handlers
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const backup = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                backup[key] = localStorage.getItem(key);
            }
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `taskflow_backup_${Date.now()}.json`);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
        });
    }

    const importTriggerBtn = document.getElementById('import-data-trigger-btn');
    const fileInput = document.getElementById('import-data-file');
    
    if (importTriggerBtn && fileInput) {
        importTriggerBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    localStorage.clear();
                    for (const [key, val] of Object.entries(backup)) {
                        localStorage.setItem(key, val);
                    }
                    alert('Data successfully imported!');
                    window.location.reload();
                } catch(err) {
                    alert('Error: Invalid backup file format.');
                }
            };
            reader.readAsText(file);
        });
    }

    
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
            
            
            const activePane = document.querySelector('.tab-pane.active');
            animationController.onNavigation('dashboard', activePane);
            
            
            renderAll();
            renderAchievementsTab();
        }
    }, 1000);
});
